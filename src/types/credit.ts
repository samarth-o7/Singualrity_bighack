export type FluctuationLevel = 'Low' | 'Medium' | 'High';

export type ViewMode = 'desktop' | 'mobile';

export type PerspectiveTab = 'borrower' | 'lender';

export type PresetId = 'kirana' | 'tailor' | 'repair' | 'women-enterprise';

export interface MSMEInputs {
  dailySales: number;
  operatingDaysPerWeek: number;
  upiShare: number;
  cashFlowFluctuation: FluctuationLevel;
  paymentConsistency: number;
  monthlyFixedExpenses: number;
  requestedLoan: number;
}

export interface MSMEPreset {
  id: PresetId;
  label: string;
  businessName: string;
  location: string;
  sectorNote: string;
  inputs: MSMEInputs;
}

export type ReadinessTier = 'Strong' | 'Moderate' | 'Watchlist';

export type VerificationStatus =
  | 'Partially Corroborated'
  | 'Self-Reported · Needs Proof'
  | 'Consistency Warning';

export type RepaymentSchedule = 'Daily' | 'Weekly' | 'Monthly';

export interface KeySignal {
  id: string;
  label: string;
  weightPercent: number;
  rawDisplay: string;
  score: number; // 0-100 subscore
  contribution: number; // weighted contribution to stabilityScore
  status: 'Positive' | 'Neutral' | 'Watch';
  detail: string;
}

export interface RiskFlag {
  id: string;
  severity: 'Low' | 'Medium' | 'High';
  title: string;
  detail: string;
  mitigant: string;
}

export interface VerificationCheck {
  id: string;
  label: string;
  status: 'Passed' | 'Needs Proof' | 'Warning';
  detail: string;
  confidenceImpact: number; // positive or negative point adjustment
}

export interface BorrowerActionTip {
  title: string;
  detail: string;
  impactLabel: string;
}

export interface CreditAssessment {
  // Cash-Flow & Stability
  monthlyRevenue: number;
  monthlyFixedExpenses: number;
  monthlyNetSurplus: number; // signed: monthlyRevenue - monthlyFixedExpenses
  expenseCoverageRatio: number; // monthlyRevenue / monthlyFixedExpenses
  operatingMarginPercent: number;
  stabilityScore: number; // 0-100
  readinessTier: ReadinessTier;

  // Verification & Data Confidence
  dataConfidence: number; // 0-100
  verificationStatus: VerificationStatus;
  confidenceHaircutMultiplier: number; // 0.55 - 1.0 applied to loan capacity

  // Fair Loan Terms
  recommendedLoanAmount: number;
  loanCoverageRatio: number; // recommendedLoanAmount / requestedLoan
  tenureMonths: number; // 6-24
  repaymentSchedule: RepaymentSchedule;
  repaymentRationale: string;
  interestMinApr: number;
  interestMaxApr: number;
  indicativeInterestRange: string;
  estimatedInstallment: number;
  monthlyRepaymentTotal: number;
  repaymentToSurplusPercent: number;
  remainingMonthlyBuffer: number;

  // Signals, Checks & Guidance
  keySignals: KeySignal[];
  riskFlags: RiskFlag[];
  verificationChecks: VerificationCheck[];
  borrowerTips: BorrowerActionTip[];
  underwritingDecision:
    | 'Eligible — Standard Track'
    | 'Eligible — Right-Sized'
    | 'Conditional — Proof & Step-Up Pilot'
    | 'Decline — Insufficient Surplus';
}
