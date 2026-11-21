export type ViewMode = 'desktop' | 'mobile';

export type RoleMode = 'borrower' | 'lender';

export type AppRoute = 'landing' | 'borrower' | 'lender';

export type BorrowerStep = 'login' | 'request' | 'consent' | 'dashboard';

export type BorrowerDashboardTab = 'overview' | 'signals' | 'privacy';

export type LenderStep = 'login' | 'queue' | 'workspace';

export type LenderQueueFilter = 'All' | ReadinessTier | 'Cash-Heavy';

export type ToastVariant = 'success' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

export type ProfileId =
  | 'kirana'
  | 'tailor'
  | 'repair'
  | 'women-enterprise'
  | 'cash-heavy-vendor';

export type ReadinessTier = 'Strong' | 'Moderate' | 'Watchlist';

export type ProfileVerificationTag =
  | 'Digital-Verified · Standard AA'
  | 'Cash-Heavy · Outflow-Verified';

export type RepaymentSchedule = 'Daily' | 'Weekly' | 'Monthly';

export type UnderwriterStatus =
  | 'Pending Review'
  | 'Approved Terms'
  | 'Starter Tranche Offered'
  | 'Watchlist Hold';

/**
 * Tamper-resistant, system-fetched synthetic bank & UPI signals (Simulated RBI Account Aggregator):
 * 4 core bank/UPI signals + cashDepositRegularity for cash-heavy profiles + verified monthly cash flows.
 */
export interface VerifiedMSMESignals {
  uniqueUpiPayersPerMonth: number; // UPI Merchant payer diversity
  nachBounces6m: number; // Bank NACH / auto-debit bounces in last 6 months
  inflowOutflowCv: number; // Cash-flow coefficient of variation (e.g. 0.15 = 15%)
  minToAvgBalanceRatio: number; // Liquidity cushion: min / avg monthly balance (0.0 - 1.0)
  cashDepositRegularity: number; // Bank counter / CDM cash deposit consistency (0 - 100)
  avgMonthlyInflow: number; // Verified average monthly inflow (₹)
  avgMonthlyOutflow: number; // Verified average monthly outflow (₹)
}

export interface SyntheticMSMEProfile {
  id: ProfileId;
  label: string;
  businessName: string;
  accountMask: string;
  location: string;
  sectorNote: string;
  aaSourceLabel: string;
  defaultRequestedLoan: number;
  signals: VerifiedMSMESignals;
}

export interface BorrowerAccountProfile {
  businessName: string;
  businessType: string;
  mobileNumber: string;
  aaHandle: string;
  accountMask: string;
  location: string;
  sectorNote: string;
  aaSourceLabel: string;
  signals: VerifiedMSMESignals;
}

export interface LoanApplication {
  id: string;
  referenceCode: string;
  profileId: ProfileId | 'borrower-personal';
  businessName: string;
  businessType: string;
  accountMask: string;
  aaHandle?: string;
  mobileNumber?: string;
  location: string;
  sectorNote: string;
  aaSourceLabel: string;
  source: 'synthetic-queue' | 'borrower-consent';
  consentGrantedAt: string;
  reviewStatus: UnderwriterStatus;
  requestedLoan: number;
  preferredRepaymentSchedule?: RepaymentSchedule;
  signals: VerifiedMSMESignals;
}

/**
 * Lender-only downside stress-test parameters.
 */
export interface StressTestScenario {
  inflowDipPercent: number; // 0 - 50%
  additionalNachBounces: number; // 0 - 4
  outflowShockPercent: number; // 0 - 35%
}

export interface ScorecardPillar {
  id: 'liquidity' | 'nach-discipline' | 'diversity' | 'cash-deposit' | 'stability';
  label: string;
  weightPercent: number;
  observedDisplay: string;
  subScore: number; // 0 - 100
  weightedPoints: number;
  status: 'Strong' | 'Moderate' | 'Watch' | 'Reweighted';
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
  category: 'Knock-Out' | 'Strength' | 'Watch' | 'Sizing' | 'Inclusion';
  title: string;
  detail: string;
}

export interface TrancheStep {
  trancheNumber: 1 | 2 | 3;
  label: string;
  amount: number;
  tenureLabel: string;
  unlockCriteria: string;
  status: 'Current Cap' | 'Next Unlock' | 'Growth Tier';
}

export interface StarterTrancheLadder {
  isActive: boolean;
  programModel: string;
  reason: string;
  tranches: TrancheStep[];
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

  // Cash-Heavy / Dynamic Weighting State
  isCashHeavyProfile: boolean;
  profileTag: ProfileVerificationTag;
  weightingModeLabel: string;
  starterTrancheLadder: StarterTrancheLadder;

  // Deterministic Scorecard (0-100)
  stabilityScore: number;
  readinessTier: ReadinessTier;
  pillars: ScorecardPillar[];

  // Hard Knock-Out Rules
  knockOutTriggered: boolean;
  knockOutRules: KnockOutRuleResult[];

  // Formula-Driven Fair Credit Terms
  recommendedLoanAmount: number;
  requestedLoan: number;
  loanCoverageRatio: number;
  maxRepaymentRatioPercent: number; // 35-40% standard, lower under Watchlist/KO
  maxSafeMonthlyRepayment: number;
  estimatedMonthlyRepayment: number;
  periodicInstalment: number;
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
    | 'Eligible — Right-Sized by Repayment Capacity'
    | 'Eligible — Starter Tranche Ladder'
    | 'Watchlist — Knock-Out Exposure Cap'
    | 'Watchlist — Starter Pilot Only'
    | 'Decline — Non-Positive Surplus';
}
