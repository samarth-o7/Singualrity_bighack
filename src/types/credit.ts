export type ViewMode = 'desktop' | 'mobile';

export type RoleMode = 'borrower' | 'lender';

export type ProfileId = 'kirana' | 'tailor' | 'repair' | 'women-enterprise';

export type ReadinessTier = 'Strong' | 'Moderate' | 'Watchlist';

export type RepaymentSchedule = 'Daily' | 'Weekly' | 'Monthly';

export type UnderwriterStatus =
  | 'AA Verified'
  | 'In Review'
  | 'Guardrail Hold'
  | 'Pre-Approved';

/**
 * 6 tamper-resistant, system-fetched synthetic signals (Simulated RBI AA + BBPS + Udyam)
 * plus verified monthly cash flows for surplus calculation.
 */
export interface VerifiedMSMESignals {
  uniqueUpiPayersPerMonth: number; // UPI Merchant payer diversity
  nachBounces6m: number; // Bank NACH / auto-debit bounces in last 6 months
  inflowOutflowCv: number; // Cash-flow coefficient of variation (e.g. 0.15 = 15%)
  minToAvgBalanceRatio: number; // Liquidity cushion: min / avg monthly balance (0.0 - 1.0)
  bbpsOnTimeRate: number; // BBPS electricity / utility bill timeliness (0 - 100%)
  businessVintageMonths: number; // Udyam / GST operational vintage in months
  avgMonthlyInflow: number; // Verified average monthly inflow (₹)
  avgMonthlyOutflow: number; // Verified average monthly outflow (₹)
}

export interface SyntheticMSMEProfile {
  id: ProfileId;
  label: string;
  businessName: string;
  udyamId: string;
  location: string;
  sectorNote: string;
  aaSourceLabel: string;
  defaultRequestedLoan: number;
  signals: VerifiedMSMESignals;
}

export interface LoanApplication {
  id: string;
  referenceCode: string;
  profileId: ProfileId;
  businessName: string;
  businessType: string;
  udyamId: string;
  location: string;
  sectorNote: string;
  aaSourceLabel: string;
  source: 'synthetic-queue' | 'borrower-consent';
  consentGrantedAt: string;
  reviewStatus: UnderwriterStatus;
  requestedLoan: number;
  signals: VerifiedMSMESignals;
}

/**
 * Lender-only downside stress-test parameters.
 */
export interface StressTestScenario {
  inflowDipPercent: number; // 0 - 50%
  additionalNachBounces: number; // 0 - 4
  outflowShockPercent: number; // 0 - 35%
  bbpsDropPoints: number; // 0 - 30 percentage points
}

export interface ScorecardPillar {
  id: 'liquidity' | 'discipline' | 'diversity' | 'stability' | 'vintage';
  label: string;
  weightPercent: number; // 25, 25, 20, 20, 10
  observedDisplay: string;
  subScore: number; // 0 - 100
  weightedPoints: number; // contribution to 0 - 100
  status: 'Strong' | 'Moderate' | 'Watch';
  policyCode: string;
  rationale: string;
}

export interface KnockOutRuleResult {
  code: 'KO_NACH_BOUNCES_GT_2' | 'KO_NON_POSITIVE_SURPLUS';
  label: string;
  threshold: string;
  observed: string;
  triggered: boolean;
  actionTaken: string;
}

export interface PolicyReasonCode {
  code: string;
  category: 'Knock-Out' | 'Strength' | 'Watch' | 'Sizing';
  title: string;
  detail: string;
}

export interface BorrowerImprovementStep {
  title: string;
  detail: string;
  targetMetric: string;
}

export interface CreditAssessment {
  // Effective (baseline or stressed) verified signals
  effectiveSignals: VerifiedMSMESignals;
  monthlyNetSurplus: number; // avgMonthlyInflow - avgMonthlyOutflow
  expenseCoverageRatio: number; // avgMonthlyInflow / avgMonthlyOutflow
  operatingMarginPercent: number;

  // Deterministic Scorecard (0-100)
  stabilityScore: number;
  readinessTier: ReadinessTier;
  pillars: ScorecardPillar[];

  // Hard Knock-Out Rules
  knockOutTriggered: boolean;
  knockOutRules: KnockOutRuleResult[];

  // Formula-Driven Fair Loan Terms
  recommendedLoanAmount: number;
  requestedLoan: number;
  loanCoverageRatio: number;
  maxEmiRatioPercent: number; // 35-40% standard, lower under Watchlist/KO
  maxSafeMonthlyEmi: number;
  estimatedMonthlyEmi: number;
  estimatedCycleInstallment: number;
  tenureMonths: number;
  repaymentSchedule: RepaymentSchedule;
  repaymentRationale: string;
  interestMinApr: number;
  interestMaxApr: number;
  indicativeInterestRange: string;
  remainingMonthlyBuffer: number;

  // Policy Codes, Guardrails & Borrower Guidance
  policyReasonCodes: PolicyReasonCode[];
  structuringGuardrails: string[];
  borrowerImprovementSteps: BorrowerImprovementStep[];
  underwritingDecision:
    | 'Eligible — Standard AA Track'
    | 'Eligible — Right-Sized by EMI Cap'
    | 'Watchlist — Knock-Out Exposure Cap'
    | 'Watchlist — Starter Pilot Only'
    | 'Decline — Non-Positive Surplus';
}
