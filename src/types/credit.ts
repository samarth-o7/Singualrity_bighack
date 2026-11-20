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

export type StabilityBand = 'Strong' | 'Moderate' | 'Cautious' | 'Fragile';

export interface SignalFactor {
  id: string;
  label: string;
  weightPercent: number;
  rawDisplay: string;
  score: number; // 0-100 subscore
  contribution: number; // weighted contribution to overall score
  status: 'Positive' | 'Neutral' | 'Watch';
  note: string;
}

export interface BorrowerActionTip {
  title: string;
  detail: string;
  impactLabel: string;
}

export interface RiskItem {
  severity: 'Low' | 'Medium' | 'High';
  title: string;
  mitigant: string;
}

export interface CreditAssessment {
  stabilityScore: number; // 0-100
  stabilityBand: StabilityBand;
  recommendedLoan: number;
  loanCoverageRatio: number; // recommendedLoan / requestedLoan
  tenureMonths: number;
  repaymentFrequency: 'Daily' | 'Weekly' | 'Bi-weekly';
  repaymentRationale: string;
  interestMinApr: number;
  interestMaxApr: number;
  estimatedInstallment: number;
  monthlyRepaymentTotal: number;
  monthlyRevenue: number;
  monthlyNetSurplus: number;
  operatingMarginPercent: number;
  repaymentToSurplusPercent: number;
  remainingMonthlyBuffer: number;
  factors: SignalFactor[];
  borrowerTips: BorrowerActionTip[];
  lenderRisks: RiskItem[];
  underwritingDecision: 'Eligible — Standard Track' | 'Eligible — Right-Sized' | 'Conditional — Step-Up Pilot' | 'Decline — Insufficient Surplus';
}
