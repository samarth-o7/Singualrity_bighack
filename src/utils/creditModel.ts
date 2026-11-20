import {
  BorrowerActionTip,
  CreditAssessment,
  FluctuationLevel,
  MSMEInputs,
  RiskItem,
  SignalFactor,
  StabilityBand,
} from '../types/credit';
import { formatINR } from './format';

const FLUCTUATION_SCORES: Record<FluctuationLevel, number> = {
  Low: 92,
  Medium: 64,
  High: 34,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Deterministic placeholder underwriting heuristic for Problem F2 (Synthetic Data Demo).
 * Evaluates thin-file Indian MSME cash-flow resilience without traditional bureau scores.
 */
export function evaluateCreditProfile(inputs: MSMEInputs): CreditAssessment {
  const {
    dailySales,
    operatingDaysPerWeek,
    upiShare,
    cashFlowFluctuation,
    paymentConsistency,
    monthlyFixedExpenses,
    requestedLoan,
  } = inputs;

  // 1. Monthly Cash-Flow Estimation
  const monthlyOperatingDays = operatingDaysPerWeek * 4.33;
  const monthlyRevenue = Math.max(0, Math.round(dailySales * monthlyOperatingDays));
  const rawNetSurplus = monthlyRevenue - monthlyFixedExpenses;
  const monthlyNetSurplus = Math.max(0, rawNetSurplus);
  const operatingMarginPercent =
    monthlyRevenue > 0 ? clamp((rawNetSurplus / monthlyRevenue) * 100, -100, 100) : 0;

  // 2. Sub-scores (0-100)
  // A. Payment consistency (utility bills, rent, supplier invoices) - Weight 30%
  const consistencyScore = clamp(paymentConsistency, 0, 100);

  // B. Cash-flow steadiness (fluctuation + operating cadence) - Weight 25%
  const baseFluctuation = FLUCTUATION_SCORES[cashFlowFluctuation];
  const cadenceBonus = operatingDaysPerWeek >= 6 ? 8 : operatingDaysPerWeek >= 5 ? 3 : -8;
  const steadinessScore = clamp(baseFluctuation + cadenceBonus, 10, 100);

  // C. Digital verifiability (UPI payment share) - Weight 20%
  // UPI share above 65% gives near-full auditability; very low UPI reduces confidence
  const digitalScore = clamp(Math.round(25 + upiShare * 0.85), 15, 100);

  // D. Surplus cushion & margin health - Weight 25%
  // Healthy micro-enterprise net cash margin before debt service is typically 25%-60%
  const marginScore =
    rawNetSurplus <= 0
      ? 10
      : clamp(Math.round(20 + (operatingMarginPercent / 55) * 80), 15, 100);

  const factors: SignalFactor[] = [
    {
      id: 'consistency',
      label: 'Payment & bill consistency',
      weightPercent: 30,
      rawDisplay: `${Math.round(paymentConsistency)}% on-time`,
      score: Math.round(consistencyScore),
      contribution: Number((consistencyScore * 0.3).toFixed(1)),
      status: consistencyScore >= 80 ? 'Positive' : consistencyScore >= 60 ? 'Neutral' : 'Watch',
      note: 'Recurring rent, electricity, and supplier settlement discipline.',
    },
    {
      id: 'steadiness',
      label: 'Cash-flow steadiness',
      weightPercent: 25,
      rawDisplay: `${cashFlowFluctuation} · ${operatingDaysPerWeek}d/wk`,
      score: Math.round(steadinessScore),
      contribution: Number((steadinessScore * 0.25).toFixed(1)),
      status: steadinessScore >= 75 ? 'Positive' : steadinessScore >= 55 ? 'Neutral' : 'Watch',
      note: 'Sensitivity to seasonal dips and weekly trading regularity.',
    },
    {
      id: 'surplus',
      label: 'Monthly surplus buffer',
      weightPercent: 25,
      rawDisplay:
        rawNetSurplus > 0
          ? `${Math.round(operatingMarginPercent)}% margin`
          : 'Deficit',
      score: Math.round(marginScore),
      contribution: Number((marginScore * 0.25).toFixed(1)),
      status: marginScore >= 72 ? 'Positive' : marginScore >= 48 ? 'Neutral' : 'Watch',
      note: `Estimated ${formatINR(monthlyNetSurplus)}/mo left after fixed costs.`,
    },
    {
      id: 'upi',
      label: 'UPI digital verifiability',
      weightPercent: 20,
      rawDisplay: `${Math.round(upiShare)}% UPI share`,
      score: Math.round(digitalScore),
      contribution: Number((digitalScore * 0.2).toFixed(1)),
      status: digitalScore >= 75 ? 'Positive' : digitalScore >= 52 ? 'Neutral' : 'Watch',
      note: 'Share of collections traceable via verified UPI merchant settlements.',
    },
  ];

  // Overall Stability Score (0-100)
  const rawComposite = factors.reduce((acc, f) => acc + f.contribution, 0);
  // Apply penalty if fixed expenses consume all revenue
  const stabilityScore =
    rawNetSurplus <= 0
      ? clamp(Math.round(rawComposite * 0.45), 8, 35)
      : clamp(Math.round(rawComposite), 0, 100);

  let stabilityBand: StabilityBand = 'Fragile';
  if (stabilityScore >= 78) stabilityBand = 'Strong';
  else if (stabilityScore >= 60) stabilityBand = 'Moderate';
  else if (stabilityScore >= 42) stabilityBand = 'Cautious';

  // 3. Indicative Interest Range (APR % p.a., micro-MSME realistic brackets)
  let interestMinApr = 22.0;
  let interestMaxApr = 26.0;
  if (stabilityScore >= 82) {
    interestMinApr = 14.0;
    interestMaxApr = 16.0;
  } else if (stabilityScore >= 70) {
    interestMinApr = 15.5;
    interestMaxApr = 18.0;
  } else if (stabilityScore >= 55) {
    interestMinApr = 18.0;
    interestMaxApr = 21.0;
  } else if (stabilityScore >= 42) {
    interestMinApr = 20.5;
    interestMaxApr = 24.0;
  }

  const midApr = (interestMinApr + interestMaxApr) / 2;

  // 4. Tenure & Repayment Frequency aligned to MSME cash-flow rhythm
  let repaymentFrequency: 'Daily' | 'Weekly' | 'Bi-weekly' = 'Weekly';
  let repaymentRationale = 'Matches regular weekly restocking and customer receipts.';

  if (operatingDaysPerWeek >= 6 && upiShare >= 60 && cashFlowFluctuation !== 'High') {
    repaymentFrequency = 'Daily';
    repaymentRationale = 'High daily UPI velocity supports small automated daily micro-sweeps.';
  } else if (operatingDaysPerWeek <= 5 && cashFlowFluctuation === 'Low') {
    repaymentFrequency = 'Bi-weekly';
    repaymentRationale = 'Suits batch wholesale invoicing and lower weekly trading days.';
  } else if (cashFlowFluctuation === 'High') {
    repaymentFrequency = 'Weekly';
    repaymentRationale = 'Weekly cadence smooths daily sales spikes without building lump-sum pressure.';
  }

  // Max safe debt service ratio against net surplus (FOIR cap)
  const safeFoir =
    stabilityScore >= 78
      ? 0.4
      : stabilityScore >= 60
        ? 0.34
        : stabilityScore >= 42
          ? 0.26
          : 0.16;

  // Determine tenure based on requested size and stability
  let tenureMonths = 12;
  if (requestedLoan <= 40000 || stabilityScore < 48) {
    tenureMonths = 6;
  } else if (requestedLoan <= 80000) {
    tenureMonths = 9;
  } else if (requestedLoan <= 175000) {
    tenureMonths = 12;
  } else {
    tenureMonths = stabilityScore >= 72 ? 18 : 12;
  }

  // Compute max affordable principal using standard amortizing monthly payment formula
  const monthlyRate = midApr / 100 / 12;
  const maxSafeMonthlyPayment = monthlyNetSurplus * safeFoir;
  const annuityFactor =
    monthlyRate > 0
      ? (1 - Math.pow(1 + monthlyRate, -tenureMonths)) / monthlyRate
      : tenureMonths;

  const maxAffordableLoan = Math.max(0, maxSafeMonthlyPayment * annuityFactor);
  // Also cap at 2.2x monthly revenue for unsecured thin-file working capital
  const revenueCap = monthlyRevenue * (stabilityScore >= 75 ? 1.8 : 1.3);
  const rawRecommended = Math.min(requestedLoan, maxAffordableLoan, revenueCap);

  // Round cleanly to ₹1,000 increments (or ₹0 if surplus deficit / very low capacity)
  const recommendedLoan =
    rawNetSurplus <= 0 || rawRecommended < 5000
      ? 0
      : Math.max(5000, roundToNearest(rawRecommended, 1000));

  const loanCoverageRatio =
    requestedLoan > 0 ? clamp(recommendedLoan / requestedLoan, 0, 1) : 0;

  // Recompute actual installment for the recommended loan
  const monthlyRepaymentTotal =
    recommendedLoan > 0
      ? Math.round(
          (recommendedLoan * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -tenureMonths))
        )
      : 0;

  const installmentsPerMonth =
    repaymentFrequency === 'Daily'
      ? Math.max(1, operatingDaysPerWeek * 4.33)
      : repaymentFrequency === 'Weekly'
        ? 4.33
        : 2;

  const estimatedInstallment =
    monthlyRepaymentTotal > 0 ? Math.round(monthlyRepaymentTotal / installmentsPerMonth) : 0;

  const repaymentToSurplusPercent =
    monthlyNetSurplus > 0
      ? clamp((monthlyRepaymentTotal / monthlyNetSurplus) * 100, 0, 100)
      : 0;

  const remainingMonthlyBuffer = Math.max(0, monthlyNetSurplus - monthlyRepaymentTotal);

  // Underwriting decision label
  let underwritingDecision: CreditAssessment['underwritingDecision'] =
    'Eligible — Standard Track';
  if (recommendedLoan === 0) {
    underwritingDecision = 'Decline — Insufficient Surplus';
  } else if (stabilityScore < 50) {
    underwritingDecision = 'Conditional — Step-Up Pilot';
  } else if (loanCoverageRatio < 0.92) {
    underwritingDecision = 'Eligible — Right-Sized';
  }

  // 5. Dynamic Borrower Improvement Tips
  const borrowerTips: BorrowerActionTip[] = [];
  if (upiShare < 65) {
    borrowerTips.push({
      title: 'Accept more payments via UPI QR',
      detail: `Moving UPI share from ${upiShare}% toward 70% builds a verifiable digital sales history for larger limits.`,
      impactLabel: '+6 to +10 score points',
    });
  }
  if (paymentConsistency < 85) {
    borrowerTips.push({
      title: 'Keep electricity & supplier bills on schedule',
      detail: `Raising on-time payment consistency above 85% lowers your indicative interest rate band.`,
      impactLabel: 'Lower interest range',
    });
  }
  if (loanCoverageRatio < 0.92 && recommendedLoan > 0) {
    borrowerTips.push({
      title: 'Start with the right-sized pilot limit',
      detail: `Completing 3 months of clean ${repaymentFrequency.toLowerCase()} repayments unlocks a step-up toward ${formatINR(requestedLoan)}.`,
      impactLabel: 'Step-up eligibility',
    });
  }
  if (cashFlowFluctuation === 'High') {
    borrowerTips.push({
      title: 'Use smaller, more frequent repayments',
      detail: 'Matching repayments to your busiest trading days protects cash during slower weeks.',
      impactLabel: 'Lower cash stress',
    });
  }
  if (borrowerTips.length < 2) {
    borrowerTips.push({
      title: 'Maintain your steady monthly buffer',
      detail: `Keeping at least ${formatINR(Math.max(8000, Math.round(monthlyNetSurplus * 0.55)))}/mo free after loan repayments preserves resilience during lean months.`,
      impactLabel: 'Strong profile',
    });
  }

  // 6. Lender Risk Flags & Mitigants
  const lenderRisks: RiskItem[] = [];
  if (rawNetSurplus <= 0) {
    lenderRisks.push({
      severity: 'High',
      title: 'Fixed expenses exceed estimated monthly sales',
      mitigant: 'Verify unrecorded cash sales or defer credit until unit economics turn positive.',
    });
  }
  if (cashFlowFluctuation === 'High') {
    lenderRisks.push({
      severity: 'High',
      title: 'High revenue volatility across trading weeks',
      mitigant: 'Cap FOIR below 30% and structure weekly collection with flexible grace window.',
    });
  }
  if (upiShare < 45) {
    lenderRisks.push({
      severity: 'Medium',
      title: 'Limited digital audit trail (<45% UPI)',
      mitigant: 'Supplement with 3 months of utility bills, supplier invoices, or field verification.',
    });
  }
  if (paymentConsistency < 75) {
    lenderRisks.push({
      severity: 'Medium',
      title: 'Irregular historical bill & supplier payments',
      mitigant: 'Begin with a 6-month step-up pilot tranche paired with UPI AutoPay reminders.',
    });
  }
  if (loanCoverageRatio < 0.85 && recommendedLoan > 0) {
    lenderRisks.push({
      severity: 'Low',
      title: `Requested ticket (${formatINR(requestedLoan)}) exceeds safe cash-flow cap`,
      mitigant: `Right-sized to ${formatINR(recommendedLoan)} to hold repayment under ${Math.round(safeFoir * 100)}% of net surplus.`,
    });
  }
  if (lenderRisks.length === 0) {
    lenderRisks.push({
      severity: 'Low',
      title: 'No material underwriting exceptions flagged',
      mitigant: 'Standard e-NACH / UPI AutoPay mandate with quarterly cash-flow check-in.',
    });
  }

  return {
    stabilityScore,
    stabilityBand,
    recommendedLoan,
    loanCoverageRatio,
    tenureMonths,
    repaymentFrequency,
    repaymentRationale,
    interestMinApr,
    interestMaxApr,
    estimatedInstallment,
    monthlyRepaymentTotal,
    monthlyRevenue,
    monthlyNetSurplus,
    operatingMarginPercent,
    repaymentToSurplusPercent,
    remainingMonthlyBuffer,
    factors,
    borrowerTips: borrowerTips.slice(0, 3),
    lenderRisks,
    underwritingDecision,
  };
}
