import {
  BorrowerActionTip,
  CreditAssessment,
  FluctuationLevel,
  KeySignal,
  MSMEInputs,
  ReadinessTier,
  RepaymentSchedule,
  RiskFlag,
  VerificationCheck,
  VerificationStatus,
} from '../types/credit';
import { formatINR } from './format';

const FLUCTUATION_SCORES: Record<FluctuationLevel, number> = {
  Low: 92,
  Medium: 64,
  High: 32,
};

const WEEKS_PER_MONTH = 4.33;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Deterministic cash-flow underwriting engine for Problem F2 ("Credit for the credit-invisible").
 * Computes cash-flow stability, cross-signal verification & data confidence, and fair loan terms.
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

  // ---------------------------------------------------------------------------
  // 1. Cash-Flow & Expense Coverage
  // ---------------------------------------------------------------------------
  const monthlyOperatingDays = operatingDaysPerWeek * WEEKS_PER_MONTH;
  const monthlyRevenue = Math.round(dailySales * monthlyOperatingDays);
  const monthlyNetSurplus = monthlyRevenue - monthlyFixedExpenses;
  const positiveSurplus = Math.max(0, monthlyNetSurplus);

  const expenseCoverageRatio =
    monthlyFixedExpenses > 0
      ? Number((monthlyRevenue / monthlyFixedExpenses).toFixed(2))
      : monthlyRevenue > 0
        ? 10
        : 0;

  const operatingMarginPercent =
    monthlyRevenue > 0 ? clamp((monthlyNetSurplus / monthlyRevenue) * 100, -100, 100) : 0;

  const expenseRatio = monthlyRevenue > 0 ? monthlyFixedExpenses / monthlyRevenue : 1;

  // ---------------------------------------------------------------------------
  // 2. Stability Sub-Scores & Key Signals (0–100)
  // ---------------------------------------------------------------------------
  // A. Payment Consistency (30%)
  const consistencyScore = clamp(Math.round(paymentConsistency), 0, 100);

  // B. Cash-Flow Fluctuation & Trading Cadence (25%)
  const cadenceAdjustment =
    operatingDaysPerWeek >= 6 ? 6 : operatingDaysPerWeek >= 5 ? 2 : -8;
  const fluctuationScore = clamp(
    Math.round(FLUCTUATION_SCORES[cashFlowFluctuation] + cadenceAdjustment),
    10,
    100
  );

  // C. Expense Coverage & Surplus Cushion (25%)
  // 1.0x coverage = breakeven (15 pts), 2.0x = ~68 pts, 3.0x+ = 95-100 pts
  const expenseCoverageScore =
    monthlyNetSurplus <= 0
      ? clamp(Math.round(expenseCoverageRatio * 18), 5, 18)
      : clamp(Math.round(20 + Math.min(expenseCoverageRatio - 1, 2.4) * 33.3), 20, 100);

  // D. UPI Digital Verifiability (20%)
  const upiScore = clamp(Math.round(20 + upiShare * 0.8), 15, 100);

  const keySignals: KeySignal[] = [
    {
      id: 'payment-consistency',
      label: 'Payment & bill consistency',
      weightPercent: 30,
      rawDisplay: `${Math.round(paymentConsistency)}% on-time`,
      score: consistencyScore,
      contribution: Number((consistencyScore * 0.3).toFixed(1)),
      status: consistencyScore >= 80 ? 'Positive' : consistencyScore >= 60 ? 'Neutral' : 'Watch',
      detail: 'Timeliness across rent, electricity bills, and recurring supplier invoices.',
    },
    {
      id: 'expense-coverage',
      label: 'Expense coverage & surplus',
      weightPercent: 25,
      rawDisplay:
        monthlyNetSurplus > 0
          ? `${expenseCoverageRatio.toFixed(2)}x · ${Math.round(operatingMarginPercent)}% margin`
          : `${expenseCoverageRatio.toFixed(2)}x · Deficit`,
      score: expenseCoverageScore,
      contribution: Number((expenseCoverageScore * 0.25).toFixed(1)),
      status:
        expenseCoverageScore >= 72 ? 'Positive' : expenseCoverageScore >= 48 ? 'Neutral' : 'Watch',
      detail:
        monthlyNetSurplus > 0
          ? `${formatINR(monthlyNetSurplus)}/mo net surplus remaining after fixed overheads.`
          : `Fixed expenses exceed estimated monthly sales by ${formatINR(Math.abs(monthlyNetSurplus))}.`,
    },
    {
      id: 'cash-flow-steadiness',
      label: 'Cash-flow steadiness',
      weightPercent: 25,
      rawDisplay: `${cashFlowFluctuation} var · ${operatingDaysPerWeek}d/wk`,
      score: fluctuationScore,
      contribution: Number((fluctuationScore * 0.25).toFixed(1)),
      status: fluctuationScore >= 75 ? 'Positive' : fluctuationScore >= 55 ? 'Neutral' : 'Watch',
      detail: 'Resilience to week-to-week sales volatility and trading regularity.',
    },
    {
      id: 'upi-share',
      label: 'UPI digital payment share',
      weightPercent: 20,
      rawDisplay: `${Math.round(upiShare)}% UPI`,
      score: upiScore,
      contribution: Number((upiScore * 0.2).toFixed(1)),
      status: upiScore >= 72 ? 'Positive' : upiScore >= 50 ? 'Neutral' : 'Watch',
      detail: 'Fraction of turnover independently observable through UPI merchant settlements.',
    },
  ];

  const rawStability = keySignals.reduce((sum, s) => sum + s.contribution, 0);
  const stabilityScore =
    monthlyNetSurplus <= 0
      ? clamp(Math.round(rawStability * 0.42), 5, 34)
      : clamp(Math.round(rawStability), 0, 100);

  let readinessTier: ReadinessTier = 'Watchlist';
  if (stabilityScore >= 75 && monthlyNetSurplus > 0) {
    readinessTier = 'Strong';
  } else if (stabilityScore >= 55 && monthlyNetSurplus > 0) {
    readinessTier = 'Moderate';
  }

  // ---------------------------------------------------------------------------
  // 3. Verification & Data Confidence (Cross-Signal Checks)
  // ---------------------------------------------------------------------------
  const verificationChecks: VerificationCheck[] = [];
  // Start from digital-trail baseline: 0% UPI -> 46 base, 100% UPI -> 92 base
  let confidenceScore = Math.round(46 + upiShare * 0.46);
  let hasWarning = false;
  let needsProofCount = 0;

  // Check 1: UPI digital corroboration floor
  if (upiShare >= 55) {
    verificationChecks.push({
      id: 'upi-corroboration',
      label: 'UPI merchant settlement trail',
      status: 'Passed',
      detail: `${upiShare}% of collections pass through UPI, providing verifiable settlement evidence.`,
      confidenceImpact: 6,
    });
    confidenceScore += 6;
  } else if (upiShare >= 35) {
    verificationChecks.push({
      id: 'upi-corroboration',
      label: 'UPI merchant settlement trail',
      status: 'Needs Proof',
      detail: `${upiShare}% UPI share leaves majority cash sales unverified; collect 3-month bank/cashbook log.`,
      confidenceImpact: -6,
    });
    confidenceScore -= 6;
    needsProofCount += 1;
  } else {
    verificationChecks.push({
      id: 'upi-corroboration',
      label: 'UPI merchant settlement trail',
      status: 'Needs Proof',
      detail: `Low UPI share (${upiShare}%). Turnover is largely self-reported cash; require supplier bills & shop visit.`,
      confidenceImpact: -18,
    });
    confidenceScore -= 18;
    needsProofCount += 1;
  }

  // Check 2: High sales / UPI with unusually low fixed expenses
  const veryLowExpensesForSales = monthlyRevenue >= 75000 && expenseRatio < 0.12;
  if (veryLowExpensesForSales) {
    verificationChecks.push({
      id: 'expense-plausibility',
      label: 'Revenue-to-overhead plausibility',
      status: 'Warning',
      detail: `Fixed costs (${formatINR(monthlyFixedExpenses)}) are only ${Math.round(expenseRatio * 100)}% of ${formatINR(monthlyRevenue)} monthly sales. Verify unrecorded rent, staff, or inventory costs.`,
      confidenceImpact: -22,
    });
    confidenceScore -= 22;
    hasWarning = true;
  } else if (monthlyNetSurplus <= 0) {
    verificationChecks.push({
      id: 'expense-plausibility',
      label: 'Revenue-to-overhead plausibility',
      status: 'Warning',
      detail: `Reported fixed costs (${formatINR(monthlyFixedExpenses)}) equal or exceed estimated monthly revenue (${formatINR(monthlyRevenue)}). Reconcile actual turnover before underwriting.`,
      confidenceImpact: -18,
    });
    confidenceScore -= 18;
    hasWarning = true;
  } else {
    verificationChecks.push({
      id: 'expense-plausibility',
      label: 'Revenue-to-overhead plausibility',
      status: 'Passed',
      detail: `Fixed costs represent ${Math.round(expenseRatio * 100)}% of monthly sales (${expenseCoverageRatio.toFixed(2)}x coverage), consistent with micro-MSME benchmarks.`,
      confidenceImpact: 4,
    });
    confidenceScore += 4;
  }

  // Check 3: High daily sales on very few operating days
  const extremeDailyOnFewDays =
    (dailySales >= 8000 && operatingDaysPerWeek <= 3) ||
    (dailySales >= 12000 && operatingDaysPerWeek <= 4);
  if (extremeDailyOnFewDays) {
    verificationChecks.push({
      id: 'cadence-sales-alignment',
      label: 'Sales vs. operating cadence check',
      status: 'Warning',
      detail: `High daily collections (${formatINR(dailySales)}/day) across only ${operatingDaysPerWeek} operating days/week suggests lumpy bulk receipts; verify GST/invoices.`,
      confidenceImpact: -16,
    });
    confidenceScore -= 16;
    hasWarning = true;
  } else {
    verificationChecks.push({
      id: 'cadence-sales-alignment',
      label: 'Sales vs. operating cadence check',
      status: 'Passed',
      detail: `${formatINR(dailySales)}/day across ${operatingDaysPerWeek} days/week aligns with typical local MSME trading rhythm.`,
      confidenceImpact: 2,
    });
    confidenceScore += 2;
  }

  // Check 4: High volatility paired with near-100% payment consistency
  const volatilityConsistencyMismatch =
    cashFlowFluctuation === 'High' && paymentConsistency >= 90;
  if (volatilityConsistencyMismatch) {
    verificationChecks.push({
      id: 'volatility-consistency',
      label: 'Volatility vs. payment consistency',
      status: 'Warning',
      detail: `High cash-flow fluctuation paired with ${paymentConsistency}% on-time payments is atypical; verify utility/rent receipts for hidden informal borrowing.`,
      confidenceImpact: -20,
    });
    confidenceScore -= 20;
    hasWarning = true;
  } else if (cashFlowFluctuation === 'Low' && paymentConsistency < 55) {
    verificationChecks.push({
      id: 'volatility-consistency',
      label: 'Volatility vs. payment consistency',
      status: 'Warning',
      detail: `Steady sales with low payment consistency (${paymentConsistency}%) indicates possible household cash leakage or unreported obligations.`,
      confidenceImpact: -14,
    });
    confidenceScore -= 14;
    hasWarning = true;
  } else {
    verificationChecks.push({
      id: 'volatility-consistency',
      label: 'Volatility vs. payment consistency',
      status: 'Passed',
      detail: `${cashFlowFluctuation} fluctuation is coherent with ${paymentConsistency}% recurring bill timeliness.`,
      confidenceImpact: 3,
    });
    confidenceScore += 3;
  }

  // Check 5: Requested loan sizing relative to monthly net surplus
  const loanToSurplusMultiple =
    positiveSurplus > 0 ? requestedLoan / positiveSurplus : Infinity;
  if (positiveSurplus <= 0 || loanToSurplusMultiple > 10) {
    verificationChecks.push({
      id: 'ticket-surplus-fit',
      label: 'Requested ticket vs. net surplus',
      status: 'Warning',
      detail:
        positiveSurplus <= 0
          ? `Requested ${formatINR(requestedLoan)} cannot be supported without positive net cash surplus.`
          : `Requested ${formatINR(requestedLoan)} is ${loanToSurplusMultiple.toFixed(1)}x monthly net surplus (${formatINR(positiveSurplus)}), exceeding prudent thin-file leverage.`,
      confidenceImpact: -14,
    });
    confidenceScore -= 14;
    hasWarning = true;
  } else if (loanToSurplusMultiple > 6) {
    verificationChecks.push({
      id: 'ticket-surplus-fit',
      label: 'Requested ticket vs. net surplus',
      status: 'Needs Proof',
      detail: `Requested ${formatINR(requestedLoan)} is ${loanToSurplusMultiple.toFixed(1)}x monthly net surplus; invoice or purpose verification advised.`,
      confidenceImpact: -5,
    });
    confidenceScore -= 5;
    needsProofCount += 1;
  } else {
    verificationChecks.push({
      id: 'ticket-surplus-fit',
      label: 'Requested ticket vs. net surplus',
      status: 'Passed',
      detail: `Requested ${formatINR(requestedLoan)} (${loanToSurplusMultiple.toFixed(1)}x monthly surplus) sits within responsible MSME working-capital bounds.`,
      confidenceImpact: 3,
    });
    confidenceScore += 3;
  }

  const dataConfidence = clamp(Math.round(confidenceScore), 12, 98);

  let verificationStatus: VerificationStatus = 'Partially Corroborated';
  if (hasWarning) {
    verificationStatus = 'Consistency Warning';
  } else if (dataConfidence < 65 || needsProofCount > 0) {
    verificationStatus = 'Self-Reported · Needs Proof';
  }

  // ---------------------------------------------------------------------------
  // 4. Fair Loan Terms (Surplus + DataConfidence + RequestedLoan Capped)
  // ---------------------------------------------------------------------------
  // Indicative APR (% p.a.) adjusts for both stabilityScore and dataConfidence
  let interestMinApr = 22.0;
  let interestMaxApr = 25.5;
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
    interestMaxApr = 23.5;
  }

  // Small risk-pricing adjustment when data is unverified or flagged
  if (verificationStatus === 'Consistency Warning') {
    interestMinApr = Number((interestMinApr + 1.5).toFixed(1));
    interestMaxApr = Number((interestMaxApr + 2.0).toFixed(1));
  } else if (verificationStatus === 'Self-Reported · Needs Proof') {
    interestMinApr = Number((interestMinApr + 0.5).toFixed(1));
    interestMaxApr = Number((interestMaxApr + 1.0).toFixed(1));
  }

  const indicativeInterestRange = `${interestMinApr.toFixed(1)}% – ${interestMaxApr.toFixed(1)}% p.a.`;
  const midApr = (interestMinApr + interestMaxApr) / 2;

  // Tenure (6–24 months) matched to ticket size, stability, and confidence
  let tenureMonths = 12;
  if (requestedLoan <= 40000 || stabilityScore < 48 || verificationStatus === 'Consistency Warning') {
    tenureMonths = 6;
  } else if (requestedLoan <= 85000) {
    tenureMonths = 9;
  } else if (requestedLoan <= 160000) {
    tenureMonths = 12;
  } else if (requestedLoan <= 280000) {
    tenureMonths = stabilityScore >= 68 && dataConfidence >= 65 ? 18 : 12;
  } else {
    tenureMonths =
      stabilityScore >= 75 && dataConfidence >= 72
        ? 24
        : stabilityScore >= 60
          ? 18
          : 12;
  }
  tenureMonths = clamp(tenureMonths, 6, 24);

  // Repayment Schedule ("Daily", "Weekly", or "Monthly") matched to cash-flow rhythm
  let repaymentSchedule: RepaymentSchedule = 'Weekly';
  let repaymentRationale =
    'Weekly instalments match regular restocking cycles while smoothing day-to-day sales dips.';

  if (operatingDaysPerWeek >= 6 && upiShare >= 60 && cashFlowFluctuation !== 'High') {
    repaymentSchedule = 'Daily';
    repaymentRationale =
      'High daily UPI velocity supports small automated daily micro-sweeps without month-end lump sums.';
  } else if (
    (operatingDaysPerWeek <= 5 && cashFlowFluctuation === 'Low' && paymentConsistency >= 80) ||
    (tenureMonths >= 18 && cashFlowFluctuation === 'Low' && stabilityScore >= 78)
  ) {
    repaymentSchedule = 'Monthly';
    repaymentRationale =
      'Steady low-volatility collections and strong bill discipline support a clean monthly e-NACH schedule.';
  } else if (cashFlowFluctuation === 'High') {
    repaymentSchedule = 'Weekly';
    repaymentRationale =
      'Weekly collections absorb daily revenue spikes and avoid heavy month-end repayment pressure.';
  }

  // Max safe FOIR (debt service as % of monthly net surplus)
  const baseSafeFoir =
    readinessTier === 'Strong' ? 0.4 : readinessTier === 'Moderate' ? 0.33 : 0.24;

  // Data confidence haircut multiplier (0.55 to 1.0): lower confidence trims initial exposure
  const confidenceHaircutMultiplier = Number(
    clamp(0.55 + ((dataConfidence - 25) / 70) * 0.45, 0.55, 1.0).toFixed(2)
  );

  const monthlyRate = midApr / 100 / 12;
  const maxSafeMonthlyPayment = positiveSurplus * baseSafeFoir;
  const annuityFactor =
    monthlyRate > 0
      ? (1 - Math.pow(1 + monthlyRate, -tenureMonths)) / monthlyRate
      : tenureMonths;

  const surplusCappedLoan = maxSafeMonthlyPayment * annuityFactor * confidenceHaircutMultiplier;
  const revenueMultiplierCap =
    monthlyRevenue *
    (readinessTier === 'Strong' ? 2.0 : readinessTier === 'Moderate' ? 1.45 : 0.95) *
    confidenceHaircutMultiplier;

  const rawRecommended = Math.min(requestedLoan, surplusCappedLoan, revenueMultiplierCap);

  const recommendedLoanAmount =
    positiveSurplus <= 0 || rawRecommended < 5000
      ? 0
      : Math.max(5000, roundToNearest(rawRecommended, 1000));

  const loanCoverageRatio =
    requestedLoan > 0 ? clamp(recommendedLoanAmount / requestedLoan, 0, 1) : 0;

  // Amortized monthly repayment & cycle instalment
  const monthlyRepaymentTotal =
    recommendedLoanAmount > 0
      ? Math.round(
          (recommendedLoanAmount * monthlyRate) /
            (1 - Math.pow(1 + monthlyRate, -tenureMonths))
        )
      : 0;

  const cyclesPerMonth =
    repaymentSchedule === 'Daily'
      ? Math.max(1, monthlyOperatingDays)
      : repaymentSchedule === 'Weekly'
        ? WEEKS_PER_MONTH
        : 1;

  const estimatedInstallment =
    monthlyRepaymentTotal > 0 ? Math.round(monthlyRepaymentTotal / cyclesPerMonth) : 0;

  const repaymentToSurplusPercent =
    positiveSurplus > 0
      ? clamp((monthlyRepaymentTotal / positiveSurplus) * 100, 0, 100)
      : 0;

  const remainingMonthlyBuffer = Math.max(0, positiveSurplus - monthlyRepaymentTotal);

  // Overall Underwriting Decision
  let underwritingDecision: CreditAssessment['underwritingDecision'] =
    'Eligible — Standard Track';
  if (recommendedLoanAmount === 0) {
    underwritingDecision = 'Decline — Insufficient Surplus';
  } else if (
    verificationStatus === 'Consistency Warning' ||
    readinessTier === 'Watchlist'
  ) {
    underwritingDecision = 'Conditional — Proof & Step-Up Pilot';
  } else if (loanCoverageRatio < 0.92) {
    underwritingDecision = 'Eligible — Right-Sized';
  }

  // ---------------------------------------------------------------------------
  // 5. Risk Flags (Lender Diagnostics)
  // ---------------------------------------------------------------------------
  const riskFlags: RiskFlag[] = [];

  if (monthlyNetSurplus <= 0) {
    riskFlags.push({
      id: 'deficit-surplus',
      severity: 'High',
      title: 'Negative or zero monthly net surplus',
      detail: `Fixed overheads (${formatINR(monthlyFixedExpenses)}) consume 100% of estimated monthly sales (${formatINR(monthlyRevenue)}).`,
      mitigant: 'Hold disbursement until verified cash-flow demonstrates at least 1.3x expense coverage.',
    });
  }

  if (verificationStatus === 'Consistency Warning') {
    riskFlags.push({
      id: 'cross-signal-warning',
      severity: 'High',
      title: 'Cross-signal consistency anomaly flagged',
      detail: `Data confidence dropped to ${dataConfidence}/100 due to conflicting self-reported inputs; exposure trimmed to ${Math.round(confidenceHaircutMultiplier * 100)}%.`,
      mitigant: 'Require 90-day bank/UPI settlement PDF and field verification prior to sanction.',
    });
  }

  if (cashFlowFluctuation === 'High') {
    riskFlags.push({
      id: 'high-volatility',
      severity: 'High',
      title: 'High week-to-week revenue volatility',
      detail: 'Irregular customer receipts raise missed-instalment probability on rigid schedules.',
      mitigant: 'Enforce weekly repayment cadence and cap FOIR below 30% of net surplus.',
    });
  }

  if (upiShare < 45) {
    riskFlags.push({
      id: 'low-digital-trail',
      severity: 'Medium',
      title: `Thin digital footprint (${upiShare}% UPI share)`,
      detail: 'Over half of revenue is cash-settled and cannot be auto-verified via UPI settlement logs.',
      mitigant: 'Collect 3 months of supplier invoices, rent receipts, or electricity bills as corroboration.',
    });
  }

  if (paymentConsistency < 75) {
    riskFlags.push({
      id: 'weak-bill-consistency',
      severity: 'Medium',
      title: `Irregular recurring payment history (${paymentConsistency}%)`,
      detail: 'Frequent late utility or supplier payments signal tight liquidity management.',
      mitigant: 'Start with a 6-month step-up pilot tranche with UPI AutoPay pre-debit nudges.',
    });
  }

  if (loanCoverageRatio < 0.88 && recommendedLoanAmount > 0) {
    riskFlags.push({
      id: 'ticket-right-sized',
      severity: 'Low',
      title: `Requested ticket right-sized from ${formatINR(requestedLoan)}`,
      detail: `Capped at ${formatINR(recommendedLoanAmount)} (${Math.round(loanCoverageRatio * 100)}%) to keep debt service at ${Math.round(repaymentToSurplusPercent)}% of surplus.`,
      mitigant: 'Offer automatic limit step-up after 3 consecutive on-time repayment cycles.',
    });
  }

  if (riskFlags.length === 0) {
    riskFlags.push({
      id: 'clean-underwriting',
      severity: 'Low',
      title: 'No material underwriting exceptions',
      detail: 'Cash-flow coverage, UPI trail, and bill discipline sit inside standard thin-file policy.',
      mitigant: 'Standard e-NACH / UPI AutoPay mandate with quarterly cash-flow health check.',
    });
  }

  // ---------------------------------------------------------------------------
  // 6. Actionable Borrower Tips
  // ---------------------------------------------------------------------------
  const borrowerTips: BorrowerActionTip[] = [];

  if (verificationStatus === 'Consistency Warning') {
    borrowerTips.push({
      title: 'Share 90-day UPI or bank statements to verify numbers',
      detail:
        'Some reported inputs look unusual together. Uploading settlement proof removes the safety cap and can unlock a higher limit.',
      impactLabel: 'Raises data confidence',
    });
  } else if (verificationStatus === 'Self-Reported · Needs Proof') {
    borrowerTips.push({
      title: 'Attach electricity, rent, or supplier bills',
      detail:
        'Adding simple proof of business expenses corroborates cash sales and improves your pricing band.',
      impactLabel: 'Faster approval',
    });
  }

  if (upiShare < 65) {
    borrowerTips.push({
      title: 'Route more customer payments via UPI QR',
      detail: `Increasing UPI share from ${upiShare}% toward 70% creates an automatic verified sales trail without paperwork.`,
      impactLabel: '+6 to +12 confidence',
    });
  }

  if (paymentConsistency < 85) {
    borrowerTips.push({
      title: 'Keep electricity, rent & supplier payments on time',
      detail: 'Sustaining 85%+ bill timeliness strengthens your stability score and lowers your indicative APR range.',
      impactLabel: 'Lower APR range',
    });
  }

  if (loanCoverageRatio < 0.92 && recommendedLoanAmount > 0) {
    borrowerTips.push({
      title: 'Build a step-up track record with the starter limit',
      detail: `Paying ${formatINR(estimatedInstallment)} (${repaymentSchedule.toLowerCase()}) cleanly for 90 days unlocks a higher limit toward ${formatINR(requestedLoan)}.`,
      impactLabel: 'Step-up eligible',
    });
  }

  if (borrowerTips.length < 2) {
    borrowerTips.push({
      title: 'Preserve your monthly safety buffer',
      detail: `Keeping ${formatINR(remainingMonthlyBuffer)}/mo free after loan repayments protects working capital during slower weeks.`,
      impactLabel: 'Healthy headroom',
    });
  }

  return {
    monthlyRevenue,
    monthlyFixedExpenses,
    monthlyNetSurplus,
    expenseCoverageRatio,
    operatingMarginPercent,
    stabilityScore,
    readinessTier,
    dataConfidence,
    verificationStatus,
    confidenceHaircutMultiplier,
    recommendedLoanAmount,
    loanCoverageRatio,
    tenureMonths,
    repaymentSchedule,
    repaymentRationale,
    interestMinApr,
    interestMaxApr,
    indicativeInterestRange,
    estimatedInstallment,
    monthlyRepaymentTotal,
    repaymentToSurplusPercent,
    remainingMonthlyBuffer,
    keySignals,
    riskFlags,
    verificationChecks,
    borrowerTips: borrowerTips.slice(0, 3),
    underwritingDecision,
  };
}
