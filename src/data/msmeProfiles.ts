import {
  BorrowerAccountProfile,
  LoanApplication,
  SyntheticMSMEProfile,
  VerifiedMSMESignals,
} from '../types/credit';

const SEEDED_CITIES = [
  'Indore, Madhya Pradesh',
  'Pune, Maharashtra',
  'Surat, Gujarat',
  'Jaipur, Rajasthan',
  'Coimbatore, Tamil Nadu',
  'Lucknow, Uttar Pradesh',
  'Mysuru, Karnataka',
  'Kochi, Kerala',
  'Nagpur, Maharashtra',
  'Ahmedabad, Gujarat',
];

const SEEDED_BUSINESS_TYPES = [
  'Kirana & general retail',
  'Neighborhood micro-enterprise',
  'Tailoring & apparel unit',
  'Repair & service workshop',
  'Fresh produce & provisions',
];

function hashDigits(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededUnit(seed: number, salt: number): number {
  let x = (seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return (x % 10000) / 10000;
}

/**
 * Deterministically seeds a realistic synthetic bank & UPI signal profile from a borrower's
 * 10-digit mobile number so every newly created account gets its own distinct synthetic profile
 * scored purely through creditModel.ts.
 */
export function createSyntheticBorrowerAccount(
  businessName: string,
  rawMobile: string
): BorrowerAccountProfile {
  const digits = rawMobile.replace(/\D/g, '').slice(-10).padStart(10, '9');
  const cleanName = businessName.trim() || 'Micro-Business Account';
  const seed = hashDigits(digits);

  const uArchetype = seededUnit(seed, 1);
  const uInflow = seededUnit(seed, 2);
  const uMargin = seededUnit(seed, 3);
  const uPayers = seededUnit(seed, 4);
  const uCv = seededUnit(seed, 5);
  const uLiquidity = seededUnit(seed, 6);
  const uCashDep = seededUnit(seed, 7);
  const uNach = seededUnit(seed, 8);

  // Archetypes: ~18% Cash-Heavy vendor, ~12% Watch/elevated bounce risk, ~70% Digital Strong/Moderate MSME
  const isCashHeavy = uArchetype < 0.18;
  const isElevatedRisk = uArchetype >= 0.88;

  const avgMonthlyInflow =
    Math.round((68000 + uInflow * 145000) / 2000) * 2000;
  const operatingMargin = isElevatedRisk
    ? 0.18 + uMargin * 0.12
    : 0.28 + uMargin * 0.14;
  const avgMonthlyOutflow =
    Math.round((avgMonthlyInflow * (1 - operatingMargin)) / 1000) * 1000;

  const signals: VerifiedMSMESignals = {
    uniqueUpiPayersPerMonth: isCashHeavy
      ? Math.round(9 + uPayers * 12) // <25 triggers Cash-Heavy dynamic weighting
      : Math.round(48 + uPayers * 148),
    nachBounces6m: isElevatedRisk
      ? uNach > 0.45
        ? 3
        : 2
      : isCashHeavy
        ? 0
        : uNach > 0.72
          ? 1
          : 0,
    inflowOutflowCv: Number(
      (isElevatedRisk ? 0.31 + uCv * 0.14 : 0.14 + uCv * 0.16).toFixed(2)
    ),
    minToAvgBalanceRatio: Number(
      (isElevatedRisk ? 0.17 + uLiquidity * 0.1 : 0.27 + uLiquidity * 0.22).toFixed(2)
    ),
    cashDepositRegularity: Math.round(
      isCashHeavy ? 84 + uCashDep * 12 : 70 + uCashDep * 22
    ),
    avgMonthlyInflow,
    avgMonthlyOutflow,
  };

  const city = SEEDED_CITIES[seed % SEEDED_CITIES.length];
  const businessType = isCashHeavy
    ? 'Cash-heavy micro-vendor'
    : SEEDED_BUSINESS_TYPES[(seed >>> 4) % SEEDED_BUSINESS_TYPES.length];
  const last4 = digits.slice(-4);
  const aaHandle = `${digits}@finvu`;

  return {
    businessName: cleanName,
    businessType,
    mobileNumber: digits,
    aaHandle,
    accountMask: `AA-FIP · XXXX ${last4}`,
    location: city,
    sectorNote: isCashHeavy
      ? 'Synthetic Data · Cash-first merchant profile seeded from AA handle'
      : 'Synthetic Data · Bank & UPI cash-flow profile seeded from AA handle',
    aaSourceLabel: isCashHeavy
      ? 'Synthetic RBI AA (Bank FIP · Cash Deposits)'
      : 'Synthetic RBI AA (Bank FIP · NPCI UPI)',
    signals,
  };
}

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
  reviewStatus: profile.signals.nachBounces6m > 2 ? 'Watchlist Hold' : 'Pending Review',
  requestedLoan: profile.defaultRequestedLoan,
  signals: { ...profile.signals },
}));
