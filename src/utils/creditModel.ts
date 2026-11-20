import {
  BorrowerImprovementStep,
  CreditAssessment,
  KnockOutRuleResult,
  PolicyReasonCode,
  ReadinessTier,
  RepaymentSchedule,
  ScorecardPillar,
  StressTestScenario,
  VerifiedMSMESignals,
} from '../types/credit';
import { formatINR } from './format';

export const DEFAULT_STRESS_SCENARIO: StressTestScenario = {
  inflowDipPercent: 0,
  additionalNachBounces: 0,
  outflowShockPercent: 0,
  bbpsDropPoints: 0,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Applies optional lender-only downside stress shocks deterministically to AA-fetched signals.
 */
export function applyStressTest(
  base: VerifiedMSMESignals,
  stress?: StressTestScenario
): VerifiedMSMESignals {
  if (!stress) return { ...base };

  const dipFactor = clamp(1 - stress.inflowDipPercent / 100, 0.3, 1);
  const outflowFactor = clamp(1 + stress.outflowShockPercent / 100, 1, 1.5);

  const stressedInflow = Math.round(base.avgMonthlyInflow * dipFactor);
  const stressedOutflow = Math.round(base.avgMonthlyOutflow * outflowFactor);

  // Lean-month inflow dips increase cash-flow CV and compress min-to-avg balance cushion
  const cvStressBump = (stress.inflowDipPercent / 100) * 0.32 + (stress.outflowShockPercent / 100) * 0.12;
  const balanceCompression = clamp(
    1 - (stress.inflowDipPercent / 100) * 0.75 - (stress.outflowShockPercent / 100) * 0.4,
    0.2,
    1
  );

  return {
    uniqueUpiPayersPerMonth: Math.max(
      1,
      Math.round(base.uniqueUpiPayersPerMonth * (1 - (stress.inflowDipPercent / 100) * 0.45))
    ),
    nachBounces6m: Math.max(0, Math.round(base.nachBounces6m + stress.additionalNachBounces)),
    inflowOutflowCv: Number(clamp(base.inflowOutflowCv + cvStressBump, 0.05, 0.95).toFixed(2)),
    minToAvgBalanceRatio: Number(
      clamp(base.minToAvgBalanceRatio * balanceCompression, 0.02, 0.95).toFixed(2)
    ),
    bbpsOnTimeRate: clamp(Math.round(base.bbpsOnTimeRate - stress.bbpsDropPoints), 0, 100),
    businessVintageMonths: base.businessVintageMonths,
    avgMonthlyInflow: stressedInflow,
    avgMonthlyOutflow: stressedOutflow,
  };
}

/**
 * 100% Deterministic Financial Underwriting Engine (Zero LLM in Math).
 * Evaluates thin-file Indian MSMEs strictly from 6 tamper-resistant signals fetched via
 * Simulated RBI Account Aggregator + BBPS + Udyam, with Hard Knock-Out Rules,
 * a 5-pillar weighted scorecard (25/25/20/20/10), formula-driven EMI loan sizing,
 * and explicit Policy Reason Codes.
 */
export function evaluateMSMECredit(
  baseSignals: VerifiedMSMESignals,
  requestedLoan: number,
  stressScenario?: StressTestScenario
): CreditAssessment {
  const effectiveSignals = applyStressTest(baseSignals, stressScenario);
  const {
    uniqueUpiPayersPerMonth,
    nachBounces6m,
    inflowOutflowCv,
    minToAvgBalanceRatio,
    bbpsOnTimeRate,
    businessVintageMonths,
    avgMonthlyInflow,
    avgMonthlyOutflow,
  } = effectiveSignals;

  // ---------------------------------------------------------------------------
  // 1. Verified Cash Flow & Surplus
  // ---------------------------------------------------------------------------
  const monthlyNetSurplus = avgMonthlyInflow - avgMonthlyOutflow;
  const positiveSurplus = Math.max(0, monthlyNetSurplus);
  const expenseCoverageRatio =
    avgMonthlyOutflow > 0
      ? Number((avgMonthlyInflow / avgMonthlyOutflow).toFixed(2))
      : avgMonthlyInflow > 0
        ? 10
        : 0;
  const operatingMarginPercent =
    avgMonthlyInflow > 0
      ? clamp((monthlyNetSurplus / avgMonthlyInflow) * 100, -100, 100)
      : 0;

  // ---------------------------------------------------------------------------
  // 2. Hard Knock-Out Rules
  // ---------------------------------------------------------------------------
  const koNachTriggered = nachBounces6m > 2;
  const koSurplusTriggered = monthlyNetSurplus <= 0;
  const knockOutTriggered = koNachTriggered || koSurplusTriggered;

  const knockOutRules: KnockOutRuleResult[] = [
    {
      code: 'KO_NACH_BOUNCES_GT_2',
      label: 'NACH / Auto-Debit Bounce Ceiling',
      threshold: '≤ 2 bounces in 6 months',
      observed: `${nachBounces6m} ${nachBounces6m === 1 ? 'bounce' : 'bounces'} (6m)`,
      triggered: koNachTriggered,
      actionTaken: koNachTriggered
        ? 'Forced Watchlist tier · Max EMI capped at 18% of surplus · 6-month pilot cap'
        : 'Pass — within acceptable mandate dishonor limit',
    },
    {
      code: 'KO_NON_POSITIVE_SURPLUS',
      label: 'Positive Verified Monthly Net Surplus',
      threshold: '> ₹0 monthly net surplus',
      observed:
        monthlyNetSurplus < 0
          ? `-${formatINR(Math.abs(monthlyNetSurplus))}/mo`
          : `${formatINR(monthlyNetSurplus)}/mo`,
      triggered: koSurplusTriggered,
      actionTaken: koSurplusTriggered
        ? 'Forced Watchlist tier · Exposure set to ₹0 until verified cash surplus turns positive'
        : 'Pass — positive verified surplus available for debt service',
    },
  ];

  // ---------------------------------------------------------------------------
  // 3. 5-Pillar Weighted Scorecard (0–100)
  //    Liquidity Cushion (25%) | Payment/Bill Discipline (25%) |
  //    Payer Diversity (20%)   | Cash-Flow Stability (20%)     | Business Vintage (10%)
  // ---------------------------------------------------------------------------

  // Pillar 1: Liquidity Cushion (25%) — driven by minToAvgBalanceRatio + surplus buffer
  const ratioPts = clamp((minToAvgBalanceRatio / 0.5) * 85, 8, 88);
  const marginBonus = monthlyNetSurplus > 0 ? clamp((operatingMarginPercent / 35) * 12, 0, 12) : -10;
  const liquiditySubScore = clamp(Math.round(ratioPts + marginBonus), 5, 100);
  const liquidityPolicyCode =
    minToAvgBalanceRatio >= 0.35
      ? 'RC_LIQ_STRONG_RESERVE'
      : minToAvgBalanceRatio >= 0.22
        ? 'RC_LIQ_ADEQUATE_RESERVE'
        : 'RC_LIQ_THIN_BUFFER';

  // Pillar 2: Payment & Bill Discipline (25%) — BBPS timeliness (60%) + NACH cleanliness (40%)
  const nachSubScore =
    nachBounces6m === 0
      ? 100
      : nachBounces6m === 1
        ? 72
        : nachBounces6m === 2
          ? 44
          : Math.max(5, 22 - (nachBounces6m - 3) * 8);
  const disciplineSubScore = clamp(
    Math.round(bbpsOnTimeRate * 0.6 + nachSubScore * 0.4),
    5,
    100
  );
  const disciplinePolicyCode =
    nachBounces6m > 2
      ? 'RC_DISC_NACH_BREACH'
      : bbpsOnTimeRate >= 90 && nachBounces6m === 0
        ? 'RC_DISC_CLEAN_MANDATES'
        : bbpsOnTimeRate >= 80
          ? 'RC_DISC_ACCEPTABLE_BILLS'
          : 'RC_DISC_DELINQUENT_BILLS';

  // Pillar 3: Payer Diversity (20%) — uniqueUpiPayersPerMonth (mitigates single-buyer concentration)
  const diversitySubScore = clamp(
    Math.round(18 + Math.min(uniqueUpiPayersPerMonth, 160) * 0.5125),
    15,
    100
  );
  const diversityPolicyCode =
    uniqueUpiPayersPerMonth >= 90
      ? 'RC_DIV_BROAD_CUSTOMER_BASE'
      : uniqueUpiPayersPerMonth >= 45
        ? 'RC_DIV_MODERATE_BASE'
        : 'RC_DIV_HIGH_CONCENTRATION';

  // Pillar 4: Cash-Flow Stability (20%) — inflowOutflowCv (lower CV = steadier cash flow)
  // CV 0.12 -> 100, CV 0.25 -> 74, CV 0.40 -> 44, CV 0.55+ -> 14
  const stabilitySubScore = clamp(Math.round(124 - inflowOutflowCv * 200), 10, 100);
  const stabilityPolicyCode =
    inflowOutflowCv <= 0.2
      ? 'RC_STAB_STEADY_FLOWS'
      : inflowOutflowCv <= 0.34
        ? 'RC_STAB_SEASONAL_SWING'
        : 'RC_STAB_VOLATILE_CV';

  // Pillar 5: Business Vintage (10%) — Udyam/GST verified business age
  // 48+ mo -> 100, 36 mo -> 85, 24 mo -> 68, 12 mo -> 48, 6 mo -> 30
  const vintageSubScore = clamp(Math.round(22 + Math.min(businessVintageMonths, 52) * 1.5), 15, 100);
  const vintagePolicyCode =
    businessVintageMonths >= 36
      ? 'RC_VINT_ESTABLISHED'
      : businessVintageMonths >= 18
        ? 'RC_VINT_GROWING'
        : 'RC_VINT_EARLY_STAGE';

  const pillars: ScorecardPillar[] = [
    {
      id: 'liquidity',
      label: 'Liquidity Cushion',
      weightPercent: 25,
      observedDisplay: `${Math.round(minToAvgBalanceRatio * 100)}% min/avg bal`,
      subScore: liquiditySubScore,
      weightedPoints: Number((liquiditySubScore * 0.25).toFixed(1)),
      status: liquiditySubScore >= 75 ? 'Strong' : liquiditySubScore >= 52 ? 'Moderate' : 'Watch',
      policyCode: liquidityPolicyCode,
      rationale: 'Minimum-to-average bank balance ratio from AA bank statements.',
    },
    {
      id: 'discipline',
      label: 'Payment / Bill Discipline',
      weightPercent: 25,
      observedDisplay: `${bbpsOnTimeRate}% BBPS · ${nachBounces6m} NACH`,
      subScore: disciplineSubScore,
      weightedPoints: Number((disciplineSubScore * 0.25).toFixed(1)),
      status:
        nachBounces6m > 2
          ? 'Watch'
          : disciplineSubScore >= 78
            ? 'Strong'
            : disciplineSubScore >= 55
              ? 'Moderate'
              : 'Watch',
      policyCode: disciplinePolicyCode,
      rationale: 'Combined BBPS electricity/utility timeliness and 6-month NACH dishonor history.',
    },
    {
      id: 'diversity',
      label: 'Payer Diversity',
      weightPercent: 20,
      observedDisplay: `${uniqueUpiPayersPerMonth} UPI payers/mo`,
      subScore: diversitySubScore,
      weightedPoints: Number((diversitySubScore * 0.2).toFixed(1)),
      status: diversitySubScore >= 72 ? 'Strong' : diversitySubScore >= 48 ? 'Moderate' : 'Watch',
      policyCode: diversityPolicyCode,
      rationale: 'Unique monthly UPI merchant counterparties reducing buyer-concentration risk.',
    },
    {
      id: 'stability',
      label: 'Cash-Flow Stability',
      weightPercent: 20,
      observedDisplay: `${inflowOutflowCv.toFixed(2)} CV`,
      subScore: stabilitySubScore,
      weightedPoints: Number((stabilitySubScore * 0.2).toFixed(1)),
      status: stabilitySubScore >= 74 ? 'Strong' : stabilitySubScore >= 50 ? 'Moderate' : 'Watch',
      policyCode: stabilityPolicyCode,
      rationale: 'Inflow-to-outflow coefficient of variation across trailing bank cycles.',
    },
    {
      id: 'vintage',
      label: 'Business Vintage',
      weightPercent: 10,
      observedDisplay: `${businessVintageMonths} mos (Udyam)`,
      subScore: vintageSubScore,
      weightedPoints: Number((vintageSubScore * 0.1).toFixed(1)),
      status: vintageSubScore >= 72 ? 'Strong' : vintageSubScore >= 48 ? 'Moderate' : 'Watch',
      policyCode: vintagePolicyCode,
      rationale: 'Verified Udyam / GST enterprise continuity.',
    },
  ];

  const rawWeightedScore = pillars.reduce((sum, pillar) => sum + pillar.weightedPoints, 0);
  // Apply hard ceiling if negative surplus or severe NACH breach
  let stabilityScore = clamp(Math.round(rawWeightedScore), 0, 100);
  if (koSurplusTriggered) {
    stabilityScore = Math.min(stabilityScore, 34);
  } else if (koNachTriggered) {
    stabilityScore = Math.min(stabilityScore, 49);
  }

  let readinessTier: ReadinessTier = 'Watchlist';
  if (!knockOutTriggered) {
    if (stabilityScore >= 75) readinessTier = 'Strong';
    else if (stabilityScore >= 55) readinessTier = 'Moderate';
  }

  // ---------------------------------------------------------------------------
  // 4. Formula-Driven Fair Loan Sizing (EMI capped at 35%–40% of Verified Surplus)
  // ---------------------------------------------------------------------------
  // Indicative APR (% p.a.)
  let interestMinApr = 21.5;
  let interestMaxApr = 24.5;
  if (readinessTier === 'Strong' && stabilityScore >= 82) {
    interestMinApr = 13.5;
    interestMaxApr = 15.5;
  } else if (readinessTier === 'Strong') {
    interestMinApr = 15.0;
    interestMaxApr = 17.0;
  } else if (readinessTier === 'Moderate') {
    interestMinApr = 17.5;
    interestMaxApr = 20.0;
  } else if (koNachTriggered) {
    interestMinApr = 22.5;
    interestMaxApr = 25.5;
  }

  const indicativeInterestRange = `${interestMinApr.toFixed(1)}% – ${interestMaxApr.toFixed(1)}% p.a.`;
  const midApr = (interestMinApr + interestMaxApr) / 2;

  // Max safe monthly EMI ratio: 40% (Strong), 35% (Moderate), 25% (Watchlist), 18% (KO NACH), 0% (KO Surplus)
  const maxEmiRatio = koSurplusTriggered
    ? 0
    : koNachTriggered
      ? 0.18
      : readinessTier === 'Strong'
        ? 0.4
        : readinessTier === 'Moderate'
          ? 0.35
          : 0.25;

  const maxEmiRatioPercent = Math.round(maxEmiRatio * 100);
  const maxSafeMonthlyEmi = Math.round(positiveSurplus * maxEmiRatio);

  // Tenure (6–24 months)
  let tenureMonths = 12;
  if (knockOutTriggered || requestedLoan <= 45000) {
    tenureMonths = 6;
  } else if (requestedLoan <= 90000) {
    tenureMonths = 9;
  } else if (requestedLoan <= 180000) {
    tenureMonths = 12;
  } else if (requestedLoan <= 320000) {
    tenureMonths = readinessTier === 'Strong' ? 18 : 12;
  } else {
    tenureMonths = readinessTier === 'Strong' ? 24 : 18;
  }
  tenureMonths = clamp(tenureMonths, 6, 24);

  // Repayment Rhythm matched to verified cash-flow & UPI velocity
  let repaymentSchedule: RepaymentSchedule = 'Weekly';
  let repaymentRationale =
    'Weekly auto-debit aligns with shop replenishment while smoothing intra-month variation.';
  if (uniqueUpiPayersPerMonth >= 110 && inflowOutflowCv <= 0.24 && !koNachTriggered) {
    repaymentSchedule = 'Daily';
    repaymentRationale =
      'High daily UPI payer velocity supports low-friction daily micro-sweeps from merchant settlements.';
  } else if (inflowOutflowCv <= 0.2 && uniqueUpiPayersPerMonth < 110 && !knockOutTriggered) {
    repaymentSchedule = 'Monthly';
    repaymentRationale =
      'Low cash-flow volatility and batch receivable cycles suit a standard monthly e-NACH schedule.';
  } else if (koNachTriggered) {
    repaymentSchedule = 'Weekly';
    repaymentRationale =
      'Weekly smaller-ticket collections reduce NACH bounce risk compared to large lump-sum debits.';
  }

  // Amortizing present-value principal limit from maxSafeMonthlyEmi
  const monthlyRate = midApr / 100 / 12;
  const annuityFactor =
    monthlyRate > 0
      ? (1 - Math.pow(1 + monthlyRate, -tenureMonths)) / monthlyRate
      : tenureMonths;

  let formulaMaxLoan = maxSafeMonthlyEmi * annuityFactor;

  // Hard knock-out exposure cap: under NACH bounce knock-out, cap pilot exposure at ₹40,000 max
  const koPilotCap = koNachTriggered ? 40000 : Infinity;
  const boundedLoan = Math.min(requestedLoan, formulaMaxLoan, koPilotCap);

  const recommendedLoanAmount =
    koSurplusTriggered || boundedLoan < 5000
      ? 0
      : Math.max(5000, roundToNearest(boundedLoan, 1000));

  const loanCoverageRatio =
    requestedLoan > 0 ? clamp(recommendedLoanAmount / requestedLoan, 0, 1) : 0;

  const estimatedMonthlyEmi =
    recommendedLoanAmount > 0
      ? Math.round(
          (recommendedLoanAmount * monthlyRate) /
            (1 - Math.pow(1 + monthlyRate, -tenureMonths))
        )
      : 0;

  const cyclesPerMonth =
    repaymentSchedule === 'Daily' ? 26 : repaymentSchedule === 'Weekly' ? 4.33 : 1;
  const estimatedCycleInstallment =
    estimatedMonthlyEmi > 0 ? Math.round(estimatedMonthlyEmi / cyclesPerMonth) : 0;

  const remainingMonthlyBuffer = Math.max(0, positiveSurplus - estimatedMonthlyEmi);

  // Underwriting Decision
  let underwritingDecision: CreditAssessment['underwritingDecision'] =
    'Eligible — Standard AA Track';
  if (koSurplusTriggered || recommendedLoanAmount === 0) {
    underwritingDecision = 'Decline — Non-Positive Surplus';
  } else if (koNachTriggered) {
    underwritingDecision = 'Watchlist — Knock-Out Exposure Cap';
  } else if (readinessTier === 'Watchlist') {
    underwritingDecision = 'Watchlist — Starter Pilot Only';
  } else if (loanCoverageRatio < 0.95) {
    underwritingDecision = 'Eligible — Right-Sized by EMI Cap';
  }

  // ---------------------------------------------------------------------------
  // 5. Explicit Policy Reason Codes
  // ---------------------------------------------------------------------------
  const policyReasonCodes: PolicyReasonCode[] = [];

  if (koSurplusTriggered) {
    policyReasonCodes.push({
      code: 'RC_KO_NON_POSITIVE_SURPLUS',
      category: 'Knock-Out',
      title: 'Verified monthly net surplus is zero or negative',
      detail: `Verified outflows (${formatINR(avgMonthlyOutflow)}) equal or exceed inflows (${formatINR(avgMonthlyInflow)}). Exposure automatically set to ₹0.`,
    });
  }

  if (koNachTriggered) {
    policyReasonCodes.push({
      code: 'RC_KO_NACH_BOUNCE_LIMIT',
      category: 'Knock-Out',
      title: `NACH bounce ceiling exceeded (${nachBounces6m} > 2 in 6m)`,
      detail:
        'Hard knock-out rule forced Watchlist tier, capped max EMI at 18% of surplus, and restricted maximum pilot exposure to ₹40,000 over 6 months.',
    });
  }

  // Add pillar-level policy codes
  for (const pillar of pillars) {
    const category =
      pillar.status === 'Strong'
        ? 'Strength'
        : pillar.status === 'Watch'
          ? 'Watch'
          : 'Strength';

    // Include all Watch pillars and strongest positive drivers
    if (pillar.status === 'Watch' || pillar.subScore >= 75) {
      policyReasonCodes.push({
        code: pillar.policyCode,
        category,
        title: `${pillar.label}: ${pillar.observedDisplay} (${pillar.subScore}/100)`,
        detail: pillar.rationale,
      });
    }
  }

  // Add sizing policy reason code
  if (!koSurplusTriggered) {
    if (recommendedLoanAmount < requestedLoan) {
      policyReasonCodes.push({
        code: koNachTriggered ? 'RC_SIZE_KO_PILOT_CAP' : 'RC_SIZE_EMI_SURPLUS_CAP',
        category: 'Sizing',
        title: `Exposure right-sized to ${formatINR(recommendedLoanAmount)} (${Math.round(loanCoverageRatio * 100)}% of request)`,
        detail: `Bounded by ${maxEmiRatioPercent}% monthly net surplus EMI ceiling (${formatINR(maxSafeMonthlyEmi)}/mo)${koNachTriggered ? ' and ₹40,000 Watchlist pilot cap' : ''}.`,
      });
    } else {
      policyReasonCodes.push({
        code: 'RC_SIZE_REQUEST_WITHIN_CAP',
        category: 'Sizing',
        title: `Full requested amount (${formatINR(requestedLoan)}) fits within EMI cap`,
        detail: `Estimated monthly EMI (${formatINR(estimatedMonthlyEmi)}) stays within ${maxEmiRatioPercent}% of verified monthly net surplus (${formatINR(monthlyNetSurplus)}).`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Lender Fair Loan Structuring Guardrails
  // ---------------------------------------------------------------------------
  const structuringGuardrails: string[] = [];
  if (koSurplusTriggered) {
    structuringGuardrails.push(
      'Decline sanction under current verified cash flow; re-evaluate after 90-day AA refresh showing positive net surplus.'
    );
  } else {
    structuringGuardrails.push(
      `Enforce ${repaymentSchedule.toLowerCase()} ${repaymentSchedule === 'Daily' ? 'UPI merchant settlement sweep' : 'e-NACH / UPI AutoPay'} capped at ${formatINR(estimatedMonthlyEmi)}/mo (≤${maxEmiRatioPercent}% of verified surplus).`
    );
    if (koNachTriggered) {
      structuringGuardrails.push(
        'Mandatory 6-month starter pilot tranche (≤₹40,000) with zero-bounce graduation requirement before limit step-up.'
      );
    }
    if (minToAvgBalanceRatio < 0.25) {
      structuringGuardrails.push(
        'Set debit execution date 24h after peak weekly UPI settlement window to protect thin liquidity buffer.'
      );
    }
    if (inflowOutflowCv > 0.34) {
      structuringGuardrails.push(
        'Enable automated lean-week grace window (up to 3 days) without penal bounce charges to prevent NACH spiral.'
      );
    }
    if (uniqueUpiPayersPerMonth < 50) {
      structuringGuardrails.push(
        'Review top-5 counterparty concentration in AA bank statement summary before second-tranche step-up.'
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Plain-Language Borrower Improvement Steps
  // ---------------------------------------------------------------------------
  const borrowerImprovementSteps: BorrowerImprovementStep[] = [];

  if (nachBounces6m > 0) {
    borrowerImprovementSteps.push({
      title: 'Maintain zero auto-debit (NACH) bounces for the next 6 months',
      detail: `Your bank statement currently shows ${nachBounces6m} NACH ${nachBounces6m === 1 ? 'bounce' : 'bounces'}. Keeping sufficient balance before scheduled debit dates lifts knock-out caps and improves your interest band.`,
      targetMetric: 'Target: 0 bounces / 6m',
    });
  }

  if (minToAvgBalanceRatio < 0.35) {
    borrowerImprovementSteps.push({
      title: 'Keep a steadier minimum balance in your business account',
      detail: `Your minimum monthly balance is ${Math.round(minToAvgBalanceRatio * 100)}% of your average balance. Retaining a 35%+ liquidity cushion directly boosts the 25%-weighted Liquidity pillar.`,
      targetMetric: 'Target: ≥ 35% cushion',
    });
  }

  if (bbpsOnTimeRate < 92) {
    borrowerImprovementSteps.push({
      title: 'Pay electricity and utility bills on time via BBPS',
      detail: `Raising BBPS on-time rate from ${bbpsOnTimeRate}% toward 95%+ strengthens verified payment discipline with zero extra paperwork.`,
      targetMetric: 'Target: ≥ 95% on-time',
    });
  }

  if (uniqueUpiPayersPerMonth < 80) {
    borrowerImprovementSteps.push({
      title: 'Route more walk-in customers through your business UPI QR',
      detail: `Growing verified monthly unique UPI payers beyond 80 reduces buyer-concentration risk and increases your Payer Diversity score.`,
      targetMetric: 'Target: 80+ payers/mo',
    });
  }

  if (borrowerImprovementSteps.length < 2) {
    borrowerImprovementSteps.push({
      title: 'Keep your verified account active through the loan cycle',
      detail: `Continuing clean UPI collections and keeping ${formatINR(remainingMonthlyBuffer)}/mo free after repayments unlocks faster step-up limits on renewal.`,
      targetMetric: 'Step-up track',
    });
  }

  return {
    effectiveSignals,
    monthlyNetSurplus,
    expenseCoverageRatio,
    operatingMarginPercent,
    stabilityScore,
    readinessTier,
    pillars,
    knockOutTriggered,
    knockOutRules,
    recommendedLoanAmount,
    requestedLoan,
    loanCoverageRatio,
    maxEmiRatioPercent,
    maxSafeMonthlyEmi,
    estimatedMonthlyEmi,
    estimatedCycleInstallment,
    tenureMonths,
    repaymentSchedule,
    repaymentRationale,
    interestMinApr,
    interestMaxApr,
    indicativeInterestRange,
    remainingMonthlyBuffer,
    policyReasonCodes,
    structuringGuardrails,
    borrowerImprovementSteps: borrowerImprovementSteps.slice(0, 3),
    underwritingDecision,
  };
}
