import {
  BorrowerAiExplanation,
  CreditAssessment,
  LenderAiMemo,
} from '../types/credit';
import { formatINR } from './format';

interface FallbackContext {
  businessName: string;
  businessType: string;
  location: string;
  assessment: CreditAssessment;
  isStressed?: boolean;
  stressSummary?: string;
}

/**
 * Deterministic local fallback for the Borrower Explanation Layer.
 * Builds tailored plain-language guidance strictly from computed policy reason codes
 * and starter tranche status whenever the Gemini API is unavailable or rate-limited.
 */
export function buildDeterministicBorrowerFallback(
  ctx: FallbackContext
): BorrowerAiExplanation {
  const { businessName, assessment } = ctx;
  const {
    stabilityScore,
    readinessTier,
    isCashHeavyProfile,
    knockOutTriggered,
    knockOutRules,
    recommendedLoanAmount,
    tenureMonths,
    repaymentSchedule,
    indicativeInterestRange,
    starterTrancheLadder,
    borrowerImprovementSteps,
  } = assessment;

  const triggeredKo = knockOutRules.filter((r) => r.triggered);

  let readinessSummary = '';
  if (recommendedLoanAmount === 0) {
    readinessSummary = `${businessName} currently scores ${stabilityScore}/100 (${readinessTier} tier) because verified monthly outflows consume all monthly inflows. Under our deterministic safety rules, borrowing is paused until positive monthly net surplus is restored.`;
  } else if (knockOutTriggered) {
    const koLabels = triggeredKo.map((k) => k.label).join(' and ');
    readinessSummary = `${businessName} scored ${stabilityScore}/100 and was placed in the ${readinessTier} tier due to a hard safety trigger (${koLabels}). To protect your cash flow, exposure is capped at ${formatINR(recommendedLoanAmount)} over ${tenureMonths} months (${repaymentSchedule.toLowerCase()}, ${indicativeInterestRange}).`;
  } else if (isCashHeavyProfile && starterTrancheLadder.isActive) {
    readinessSummary = `${businessName} achieved a ${stabilityScore}/100 (${readinessTier} tier) under our Cash-Heavy · Outflow-Verified track—your strong utility bill and bank cash-deposit discipline replaced UPI volume so you were not unfairly excluded. You qualify for Starter Tranche 1 up to ${formatINR(recommendedLoanAmount)} over ${tenureMonths} months (${repaymentSchedule.toLowerCase()}, ${indicativeInterestRange}), with an automatic step-up path to ₹25,000 and ₹50,000.`;
  } else {
    readinessSummary = `${businessName} achieved a verified Stability Score of ${stabilityScore}/100 (${readinessTier} tier) from read-only RBI AA, BBPS, and Udyam signals. You qualify for up to ${formatINR(recommendedLoanAmount)} over ${tenureMonths} months on a ${repaymentSchedule.toLowerCase()} repayment rhythm at an indicative ${indicativeInterestRange}.`;
  }

  const actionSteps = borrowerImprovementSteps.slice(0, 3).map((step) => ({
    title: step.title,
    detail: step.detail,
  }));

  return {
    readinessSummary,
    actionSteps,
  };
}

/**
 * Deterministic local fallback for the Lender Credit Memo Layer.
 * Synthesizes an underwriting memo, structuring mitigations, and targeted field/phone
 * verification questions strictly from policy reason codes and deterministic ratios.
 */
export function buildDeterministicLenderFallback(
  ctx: FallbackContext
): LenderAiMemo {
  const { businessName, businessType, assessment, isStressed, stressSummary } = ctx;
  const {
    stabilityScore,
    readinessTier,
    profileTag,
    isCashHeavyProfile,
    knockOutTriggered,
    recommendedLoanAmount,
    tenureMonths,
    repaymentSchedule,
    indicativeInterestRange,
    maxEmiRatioPercent,
    monthlyNetSurplus,
    effectiveSignals,
    policyReasonCodes,
    structuringGuardrails,
  } = assessment;

  const topCodes = policyReasonCodes
    .slice(0, 3)
    .map((c) => c.code)
    .join(', ');

  const stressPrefix = isStressed
    ? `Under simulated downside stress (${stressSummary ?? 'custom shock'}), `
    : '';

  const underwritingMemo =
    recommendedLoanAmount === 0
      ? `${stressPrefix}${businessName} (${businessType}) scores ${stabilityScore}/100 (${readinessTier}) under ${profileTag} rules with non-positive verified surplus (${formatINR(monthlyNetSurplus)}/mo). Driven by ${topCodes}, deterministic policy recommends declining sanction until cash surplus turns positive.`
      : `${stressPrefix}${businessName} (${businessType}) evaluates at ${stabilityScore}/100 (${readinessTier}) on the ${profileTag} scorecard (${topCodes}). ${
          knockOutTriggered
            ? 'Hard knock-out rules enforced Watchlist capping; '
            : isCashHeavyProfile
              ? 'Dynamic outflow-verified weighting preserved inclusion while capping initial risk via the ₹15,000 Starter Tranche ladder; '
              : ''
        }recommended structure is ${formatINR(recommendedLoanAmount)} for ${tenureMonths} months (${repaymentSchedule}, ${indicativeInterestRange}) within the ${maxEmiRatioPercent}% net surplus EMI ceiling.`;

  const structuringMitigations = structuringGuardrails.slice(0, 3);

  const verificationQuestions: string[] = [];

  if (isCashHeavyProfile) {
    verificationQuestions.push(
      `Confirm the weekly bank counter / CDM cash-deposit routine (${effectiveSignals.cashDepositRegularity}/100 regularity) and verify primary wholesale mandi/supplier receipts.`
    );
  }
  if (effectiveSignals.nachBounces6m > 0) {
    verificationQuestions.push(
      `Clarify the root cause of the ${effectiveSignals.nachBounces6m} NACH bounce(s) over the last 6 months (timing mismatch vs. working capital shortfall) and confirm preferred debit date.`
    );
  }
  if (effectiveSignals.inflowOutflowCv > 0.3) {
    verificationQuestions.push(
      `Identify peak vs. lean operating months explaining the ${effectiveSignals.inflowOutflowCv.toFixed(2)} cash-flow CV and confirm inventory buildup timing.`
    );
  }
  if (effectiveSignals.minToAvgBalanceRatio < 0.25) {
    verificationQuestions.push(
      `Verify whether the thin minimum balance ratio (${Math.round(effectiveSignals.minToAvgBalanceRatio * 100)}%) reflects sweeping profits to a personal account or tight daily supplier credit.`
    );
  }
  if (verificationQuestions.length < 3) {
    verificationQuestions.push(
      `Verify physical shop continuity matching Udyam vintage (${effectiveSignals.businessVintageMonths} months) and confirm intended working-capital end use of ${formatINR(recommendedLoanAmount || assessment.requestedLoan)}.`
    );
  }
  if (verificationQuestions.length < 3) {
    verificationQuestions.push(
      `Confirm that no informal hand-loans or off-book chit-fund obligations compete with the ${formatINR(assessment.estimatedMonthlyEmi)}/mo scheduled repayment.`
    );
  }

  return {
    underwritingMemo,
    structuringMitigations,
    verificationQuestions: verificationQuestions.slice(0, 3),
  };
}
