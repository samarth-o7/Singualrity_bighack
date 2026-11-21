import { CreditAssessment, LenderAiMemo } from '../types/credit';
import { formatINR } from './format';

interface LenderFallbackContext {
  businessName: string;
  businessType: string;
  location: string;
  assessment: CreditAssessment;
  isStressed?: boolean;
  stressSummary?: string;
}

/**
 * Deterministic local fallback for the Lender Credit Memo Layer.
 * Synthesizes an underwriting memo, structuring mitigations, and targeted field/phone
 * verification questions strictly from policy reason codes and deterministic ratios.
 */
export function buildDeterministicLenderFallback(
  ctx: LenderFallbackContext
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
    maxRepaymentRatioPercent,
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
        }recommended structure is ${formatINR(recommendedLoanAmount)} for ${tenureMonths} months (${repaymentSchedule} periodic instalments, ${indicativeInterestRange}) within the ${maxRepaymentRatioPercent}% Safe Repayment Capacity ceiling.`;

  const structuringMitigations = structuringGuardrails.slice(0, 3);

  const verificationQuestions: string[] = [];

  if (isCashHeavyProfile) {
    verificationQuestions.push(
      `Confirm the weekly bank counter / CDM cash-deposit routine (${effectiveSignals.cashDepositRegularity}/100 regularity) and verify primary wholesale supplier receipts.`
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
      `Verify physical shop continuity and confirm intended working-capital end use of ${formatINR(recommendedLoanAmount || assessment.requestedLoan)}.`
    );
  }
  if (verificationQuestions.length < 3) {
    verificationQuestions.push(
      `Confirm that no informal hand-loans or off-book chit-fund obligations compete with the ${formatINR(assessment.estimatedMonthlyRepayment)}/mo scheduled repayment.`
    );
  }

  return {
    underwritingMemo,
    structuringMitigations,
    verificationQuestions: verificationQuestions.slice(0, 3),
  };
}
