import { LoanApplication, SyntheticMSMEProfile } from '../types/credit';

/**
 * Single isolated synthetic MSME profile for the private Borrower Portal session.
 * Borrowers never see or switch between other applicants' profiles.
 */
export const BORROWER_PERSONAL_ACCOUNT = {
  businessName: 'Annapurna Provisions & General Store',
  businessType: 'Kirana store',
  accountMask: 'AA-FIP · XXXX 4819',
  location: 'Indore, Madhya Pradesh',
  sectorNote: 'Neighborhood groceries & daily household provisions',
  aaSourceLabel: 'Simulated RBI AA (Bank FIP · NPCI UPI)',
  defaultRequestedLoan: 120000,
  signals: {
    uniqueUpiPayersPerMonth: 142,
    nachBounces6m: 0,
    inflowOutflowCv: 0.17,
    minToAvgBalanceRatio: 0.39,
    cashDepositRegularity: 84,
    avgMonthlyInflow: 148000,
    avgMonthlyOutflow: 96000,
  },
};

/**
 * Multi-applicant synthetic MSME profiles used exclusively inside the Lender Portal queue.
 */
export const SYNTHETIC_MSME_PROFILES: SyntheticMSMEProfile[] = [
  {
    id: 'kirana',
    label: 'Kirana store',
    businessName: 'Shree Ganesh Kirana & Daily Needs',
    accountMask: 'AA-FIP · XXXX 3104',
    location: 'Pune, Maharashtra',
    sectorNote: 'High-frequency neighborhood groceries & daily essentials',
    aaSourceLabel: 'Simulated RBI AA (Bank FIP · NPCI UPI)',
    defaultRequestedLoan: 150000,
    signals: {
      uniqueUpiPayersPerMonth: 185,
      nachBounces6m: 0,
      inflowOutflowCv: 0.15,
      minToAvgBalanceRatio: 0.44,
      cashDepositRegularity: 82,
      avgMonthlyInflow: 192000,
      avgMonthlyOutflow: 124000,
    },
  },
  {
    id: 'cash-heavy-vendor',
    label: 'Cash-heavy vendor',
    businessName: 'Ramesh Sabzi & Produce Cart',
    accountMask: 'AA-FIP · XXXX 7721',
    location: 'Varanasi, Uttar Pradesh',
    sectorNote: 'Cash-first fresh produce vendor · zero NACH bounces & steady weekly CDM deposits',
    aaSourceLabel: 'Simulated RBI AA (Bank FIP · Cash Deposits)',
    defaultRequestedLoan: 35000,
    signals: {
      uniqueUpiPayersPerMonth: 11,
      nachBounces6m: 0,
      inflowOutflowCv: 0.21,
      minToAvgBalanceRatio: 0.36,
      cashDepositRegularity: 92,
      avgMonthlyInflow: 76000,
      avgMonthlyOutflow: 48000,
    },
  },
  {
    id: 'tailor',
    label: 'Tailor',
    businessName: 'Meera Boutique & Ladies Tailoring',
    accountMask: 'AA-FIP · XXXX 6290',
    location: 'Jaipur, Rajasthan',
    sectorNote: 'Repeat neighborhood stitching with seasonal wedding peaks',
    aaSourceLabel: 'Simulated RBI AA (Bank FIP · NPCI UPI)',
    defaultRequestedLoan: 65000,
    signals: {
      uniqueUpiPayersPerMonth: 58,
      nachBounces6m: 1,
      inflowOutflowCv: 0.29,
      minToAvgBalanceRatio: 0.31,
      cashDepositRegularity: 78,
      avgMonthlyInflow: 68000,
      avgMonthlyOutflow: 41000,
    },
  },
  {
    id: 'repair',
    label: 'Repair shop',
    businessName: 'Raju Two-Wheeler & Electrical Works',
    accountMask: 'AA-FIP · XXXX 5518',
    location: 'Nagpur, Maharashtra',
    sectorNote: 'Variable repair tickets with spare-parts working capital cycles',
    aaSourceLabel: 'Simulated RBI AA (Bank FIP · NPCI UPI)',
    defaultRequestedLoan: 85000,
    signals: {
      uniqueUpiPayersPerMonth: 46,
      nachBounces6m: 3,
      inflowOutflowCv: 0.44,
      minToAvgBalanceRatio: 0.18,
      cashDepositRegularity: 64,
      avgMonthlyInflow: 94000,
      avgMonthlyOutflow: 73000,
    },
  },
  {
    id: 'women-enterprise',
    label: 'Women-led micro-enterprise',
    businessName: 'Savitri Papad & Spice Collective',
    accountMask: 'AA-FIP · XXXX 8842',
    location: 'Nashik, Maharashtra',
    sectorNote: 'Batch wholesale orders & steady retail shelf distribution',
    aaSourceLabel: 'Simulated RBI AA (Bank FIP · NPCI UPI)',
    defaultRequestedLoan: 110000,
    signals: {
      uniqueUpiPayersPerMonth: 94,
      nachBounces6m: 0,
      inflowOutflowCv: 0.18,
      minToAvgBalanceRatio: 0.48,
      cashDepositRegularity: 88,
      avgMonthlyInflow: 118000,
      avgMonthlyOutflow: 72000,
    },
  },
];

const QUEUE_TIMESTAMPS: Record<string, string> = {
  kirana: 'Today, 10:15 AM',
  'cash-heavy-vendor': 'Today, 09:58 AM',
  tailor: 'Today, 09:42 AM',
  repair: 'Yesterday, 05:18 PM',
  'women-enterprise': 'Yesterday, 02:05 PM',
};

const QUEUE_REFS: Record<string, string> = {
  kirana: 'AA-2041',
  'cash-heavy-vendor': 'AA-2045',
  tailor: 'AA-2042',
  repair: 'AA-2043',
  'women-enterprise': 'AA-2044',
};

export const INITIAL_LENDER_QUEUE: LoanApplication[] = SYNTHETIC_MSME_PROFILES.map((profile) => ({
  id: `app-${profile.id}`,
  referenceCode: QUEUE_REFS[profile.id] ?? 'AA-2040',
  profileId: profile.id,
  businessName: profile.businessName,
  businessType: profile.label,
  accountMask: profile.accountMask,
  location: profile.location,
  sectorNote: profile.sectorNote,
  aaSourceLabel: profile.aaSourceLabel,
  source: 'synthetic-queue',
  consentGrantedAt: QUEUE_TIMESTAMPS[profile.id] ?? 'Today',
  reviewStatus: profile.signals.nachBounces6m > 2 ? 'Guardrail Hold' : 'AA Verified',
  requestedLoan: profile.defaultRequestedLoan,
  signals: { ...profile.signals },
}));
