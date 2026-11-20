import React, { useMemo } from 'react';
import { CheckCircle2, Lock, ShieldCheck, ShieldOff } from 'lucide-react';
import {
  LoanApplication,
  ProfileId,
  SyntheticMSMEProfile,
} from '../types/credit';
import { evaluateMSMECredit } from '../utils/creditModel';
import { formatCompactINR, formatINR } from '../utils/format';
import { AiExplanationCard } from './AiExplanationCard';
import { CashFlowChart } from './CashFlowChart';
import { getReadinessDescriptor, StabilityGauge } from './StabilityGauge';
import { StarterTrancheLadderCard } from './StarterTrancheLadderCard';

interface BorrowerPortalProps {
  profiles: SyntheticMSMEProfile[];
  selectedProfileId: ProfileId;
  requestedLoan: number;
  consentGranted: boolean;
  submittedApplication: LoanApplication | null;
  hasLoanAmountChange: boolean;
  isMobileFrame: boolean;
  onSelectProfile: (profileId: ProfileId) => void;
  onRequestedLoanChange: (amount: number) => void;
  onGrantConsent: () => void;
  onUpdateLoanRequest: () => void;
  onRevokeConsent: () => void;
}

const QUICK_LOAN_AMOUNTS = [15000, 50000, 100000, 150000];

export function BorrowerPortal({
  profiles,
  selectedProfileId,
  requestedLoan,
  consentGranted,
  submittedApplication,
  hasLoanAmountChange,
  isMobileFrame,
  onSelectProfile,
  onRequestedLoanChange,
  onGrantConsent,
  onUpdateLoanRequest,
  onRevokeConsent,
}: BorrowerPortalProps) {
  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === selectedProfileId) ?? profiles[0],
    [profiles, selectedProfileId]
  );

  const assessment = useMemo(
    () => evaluateMSMECredit(activeProfile.signals, requestedLoan),
    [activeProfile.signals, requestedLoan]
  );

  const {
    effectiveSignals,
    monthlyNetSurplus,
    isCashHeavyProfile,
    profileTag,
    starterTrancheLadder,
    stabilityScore,
    readinessTier,
    knockOutTriggered,
    knockOutRules,
    recommendedLoanAmount,
    loanCoverageRatio,
    maxEmiRatioPercent,
    estimatedMonthlyEmi,
    estimatedCycleInstallment,
    tenureMonths,
    repaymentSchedule,
    repaymentRationale,
    indicativeInterestRange,
    remainingMonthlyBuffer,
    borrowerImprovementSteps,
    underwritingDecision,
  } = assessment;

  const isDeclined = recommendedLoanAmount === 0;
  const isRightSized =
    recommendedLoanAmount > 0 && recommendedLoanAmount < requestedLoan;

  const frequencyUnit =
    repaymentSchedule === 'Daily'
      ? 'operating day'
      : repaymentSchedule === 'Weekly'
        ? 'week'
        : 'month';

  const handleLoanInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      onRequestedLoanChange(10000);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) {
      onRequestedLoanChange(Math.min(500000, Math.max(0, parsed)));
    }
  };

  const handleLoanInputBlur = () => {
    if (requestedLoan < 10000) onRequestedLoanChange(10000);
    if (requestedLoan > 500000) onRequestedLoanChange(500000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (consentGranted) {
      onUpdateLoanRequest();
    } else {
      onGrantConsent();
    }
  };

  const snapshotKey = `borrower-${activeProfile.id}-${requestedLoan}-${stabilityScore}`;

  return (
    <div className={isMobileFrame ? 'space-y-4' : 'mx-auto max-w-[1320px]'}>
      {/* Workspace Heading */}
      <div
        className={
          isMobileFrame
            ? 'mb-1'
            : 'mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between'
        }
      >
        <div>
          <h1
            className={
              isMobileFrame
                ? 'text-base font-bold tracking-tight text-slate-900'
                : 'text-xl font-bold tracking-tight text-slate-900 sm:text-2xl text-balance'
            }
          >
            Consent-Based Cash-Flow Credit Application
          </h1>
          <p
            className={
              isMobileFrame
                ? 'mt-0.5 text-xs text-slate-600'
                : 'mt-1 text-sm text-slate-600'
            }
          >
            No manual financial sliders. Grant 10-minute read-only RBI Account Aggregator consent
            so verified cash-flow ratios—including cash-heavy vendor deposits &amp; BBPS bills—are
            computed in memory.
          </p>
        </div>
        {!isMobileFrame && (
          <p className="text-xs text-slate-500 whitespace-nowrap">
            Borrower Portal · Tamper-Resistant AA Flow
          </p>
        )}
      </div>

      {/* Main Layout */}
      <div
        className={
          isMobileFrame
            ? 'space-y-4'
            : 'grid grid-cols-1 items-start gap-6 lg:grid-cols-12'
        }
      >
        {/* Left: Profile Selection, Loan Request & RBI AA Consent Controls */}
        <form
          onSubmit={handleSubmit}
          className={
            isMobileFrame
              ? 'rounded-xl border border-slate-200 bg-white'
              : 'rounded-xl border border-slate-200 bg-white lg:col-span-5'
          }
        >
          {/* Step 1: Select Synthetic MSME Profile */}
          <div className="p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                1. Select your business profile
              </h2>
              <span className="text-[11px] font-medium text-amber-800">Synthetic personas</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Choose a synthetic Indian MSME profile—including a Cash-Heavy Vendor—to simulate RBI
              AA + BBPS + Udyam consent
            </p>

            <div
              className={
                isMobileFrame
                  ? 'mt-3 grid grid-cols-1 gap-2'
                  : 'mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2'
              }
            >
              {profiles.map((profile) => {
                const isSelected = profile.id === selectedProfileId;
                const isCashFirst = profile.signals.uniqueUpiPayersPerMonth < 25;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => onSelectProfile(profile.id)}
                    aria-pressed={isSelected}
                    className={`flex flex-col items-start rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                      isSelected
                        ? 'border-teal-700 bg-teal-50/70 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between gap-1">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {profile.label}
                      </span>
                      {isCashFirst && (
                        <span className="shrink-0 font-mono text-[10px] font-semibold text-teal-800">
                          Outflow-Verified
                        </span>
                      )}
                    </div>
                    <span className="mt-0.5 w-full truncate text-xs text-slate-600">
                      {profile.businessName}
                    </span>
                    <span className="mt-1 w-full truncate font-mono text-[11px] text-slate-500">
                      {profile.location}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3.5 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="font-medium text-slate-700">{activeProfile.businessName}</span>
                <span className="font-mono text-[11px] text-slate-500">
                  {activeProfile.udyamId}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">{activeProfile.sectorNote}</p>
            </div>
          </div>

          <div className="border-t border-slate-200" />

          {/* Step 2: Requested Loan Amount ONLY */}
          <div className="space-y-4 p-5 sm:p-6">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                2. Enter requested loan amount
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Applicants enter only their credit need; all financial ratios are fetched read-only
              </p>
            </div>

            <div>
              <label
                htmlFor="borrower-requested-loan-amount"
                className="block text-xs font-medium text-slate-700"
              >
                Requested Loan Amount (₹)
              </label>
              <div className="mt-1.5 flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2.5 focus-within:border-teal-700 focus-within:ring-2 focus-within:ring-teal-600/20">
                <span className="mr-2 font-mono text-sm font-semibold text-slate-500 select-none">
                  ₹
                </span>
                <input
                  id="borrower-requested-loan-amount"
                  type="number"
                  min={10000}
                  max={500000}
                  step={5000}
                  value={requestedLoan}
                  onChange={handleLoanInputChange}
                  onBlur={handleLoanInputBlur}
                  className="w-full bg-transparent font-mono text-lg font-bold text-slate-900 tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {QUICK_LOAN_AMOUNTS.map((amount) => {
                  const active = requestedLoan === amount;
                  return (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => onRequestedLoanChange(amount)}
                      className={`rounded-md border px-2 py-1.5 font-mono text-xs font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                        active
                          ? 'border-teal-700 bg-teal-50 text-teal-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {formatCompactINR(amount)}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 font-mono text-[11px] text-slate-400 tabular-nums">
                Range: ₹10,000 – ₹5,00,000 (cash-heavy profiles start on ₹15,000 Starter Tranche)
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200" />

          {/* Step 3: Privacy & Zero-Retention Badge + Simulated RBI AA Consent Action */}
          <div className="space-y-4 rounded-b-xl bg-slate-50/70 p-5 sm:p-6">
            <div
              className="flex items-start gap-2.5 rounded-lg border border-teal-200 bg-teal-50/70 p-3.5"
              role="note"
              aria-label="Privacy and zero-retention notice"
            >
              <ShieldCheck
                className="mt-0.5 h-4 w-4 shrink-0 text-teal-800"
                aria-hidden="true"
              />
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-teal-950">
                  Privacy &amp; Zero-Retention Guarantee
                </p>
                <p className="text-xs leading-relaxed text-teal-900">
                  Encrypted, revocable read-only consent. Only derived financial ratios are
                  computed in memory; raw bank statements are never stored.
                </p>
              </div>
            </div>

            {!consentGranted ? (
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 text-xs font-semibold text-white transition-colors hover:bg-teal-800 sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              >
                <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Grant 10-Min Read-Only Consent (Simulated RBI AA + BBPS + Udyam)</span>
              </button>
            ) : (
              <div className="space-y-2.5">
                <div
                  className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs"
                  role="status"
                >
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-emerald-950">
                      10-Min Read-Only AA Consent Active · Ref{' '}
                      <span className="font-mono">{submittedApplication?.referenceCode}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-emerald-900">
                      Derived ratios computed in memory and synced to Lender Queue (
                      {submittedApplication?.reviewStatus ?? 'AA Verified'}).
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {hasLoanAmountChange && (
                    <button
                      type="submit"
                      className="flex-1 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                    >
                      Update Requested Amount ({formatINR(requestedLoan)})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onRevokeConsent}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                  >
                    <ShieldOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>Revoke Consent</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Right: Verified Signals, Deterministic Score, Chart, Tranche Ladder & AI Explanation */}
        <div
          className={
            isMobileFrame
              ? 'rounded-xl border border-slate-200 bg-white'
              : 'rounded-xl border border-slate-200 bg-white lg:col-span-7'
          }
        >
          {!consentGranted ? (
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-2.5 text-teal-800">
                <Lock className="h-5 w-5 shrink-0" aria-hidden="true" />
                <h2 className="text-base font-bold tracking-tight text-slate-900">
                  Awaiting Read-Only Account Aggregator Consent
                </h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Grant 10-minute simulated RBI AA consent on the left to compute your deterministic
                Stability Score, cash-flow capacity chart, and fair loan terms from tamper-resistant
                signals. Cash-heavy vendors with thin UPI trails are automatically evaluated via
                BBPS utility timeliness, bank cash-deposit regularity, and Udyam vintage so they are
                never unfairly rejected.
              </p>

              <dl
                className={`mt-5 grid gap-3 border-t border-slate-100 pt-5 text-xs ${
                  isMobileFrame ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
                }`}
              >
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                  <dt className="font-semibold text-slate-900">UPI Payer Diversity / Cash Deposits</dt>
                  <dd className="mt-0.5 text-slate-600">
                    Dynamic weighting shifts from UPI payers to bank cash-deposit regularity for
                    cash-first vendors
                  </dd>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                  <dt className="font-semibold text-slate-900">6-Month Bank NACH Bounces</dt>
                  <dd className="mt-0.5 text-slate-600">
                    Auto-debit dishonor history governing hard knock-out safety caps
                  </dd>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                  <dt className="font-semibold text-slate-900">Cash-Flow Stability &amp; Liquidity</dt>
                  <dd className="mt-0.5 text-slate-600">
                    Inflow-to-outflow CV and minimum-to-average bank balance cushion
                  </dd>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                  <dt className="font-semibold text-slate-900">BBPS Utility Bills &amp; Udyam Vintage</dt>
                  <dd className="mt-0.5 text-slate-600">
                    Verified bill timeliness and formal enterprise continuity
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <>
              {/* Top Hero: Stability Score & Readiness Tier */}
              <div className="p-5 sm:p-6">
                <div
                  className={`flex gap-5 ${
                    isMobileFrame
                      ? 'flex-col items-center text-center'
                      : 'flex-col items-start justify-between sm:flex-row sm:items-center'
                  }`}
                >
                  <div className={isMobileFrame ? 'order-2 w-full' : 'min-w-0 flex-1'}>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                      <span className="font-medium text-slate-500">
                        Readiness Tier:{' '}
                        <strong className="font-semibold text-slate-900">{readinessTier}</strong>
                      </span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span
                        className={`font-semibold ${
                          isCashHeavyProfile ? 'text-teal-800' : 'text-slate-600'
                        }`}
                      >
                        {profileTag}
                      </span>
                    </div>
                    <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">
                      {underwritingDecision}
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {getReadinessDescriptor(readinessTier)}
                    </p>
                  </div>

                  <div className={isMobileFrame ? 'order-1' : 'shrink-0'}>
                    <StabilityGauge score={stabilityScore} tier={readinessTier} />
                  </div>
                </div>

                {/* Hard Knock-Out Notice if triggered */}
                {knockOutTriggered && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-900">
                    <p className="font-semibold text-red-950">
                      Safety Policy Cap Applied (Watchlist Tier)
                    </p>
                    <ul className="mt-1 space-y-1">
                      {knockOutRules
                        .filter((r) => r.triggered)
                        .map((rule) => (
                          <li key={rule.code}>
                            <span className="font-mono font-semibold">{rule.code}</span>:{' '}
                            {rule.observed} ({rule.actionTaken})
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {/* Recommended Fair Loan Terms 4-Metric Grid */}
                <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200">
                  <div className="bg-slate-50/70 p-3.5 sm:p-4">
                    <p className="text-xs text-slate-500">Recommended loan</p>
                    <p className="mt-1 font-mono text-lg font-bold tracking-tight text-slate-900 tabular-nums sm:text-xl">
                      {isDeclined ? '₹0' : formatINR(recommendedLoanAmount)}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                      {isDeclined
                        ? 'Non-positive surplus'
                        : starterTrancheLadder.isActive
                          ? 'Starter Tranche 1 Cap'
                          : `${Math.round(loanCoverageRatio * 100)}% of ${formatINR(requestedLoan)}`}
                    </p>
                  </div>

                  <div className="bg-slate-50/70 p-3.5 sm:p-4">
                    <p className="text-xs text-slate-500">Tenure</p>
                    <p className="mt-1 font-mono text-lg font-bold tracking-tight text-slate-900 tabular-nums sm:text-xl">
                      {isDeclined ? '—' : `${tenureMonths} months`}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {isDeclined ? 'Not eligible' : `Max EMI ≤${maxEmiRatioPercent}% surplus`}
                    </p>
                  </div>

                  <div className="bg-slate-50/70 p-3.5 sm:p-4">
                    <p className="text-xs text-slate-500">Repayment rhythm</p>
                    <p className="mt-1 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                      {isDeclined ? '—' : repaymentSchedule}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                      {isDeclined
                        ? 'N/A'
                        : `${formatINR(estimatedCycleInstallment)} / ${frequencyUnit}`}
                    </p>
                  </div>

                  <div className="bg-slate-50/70 p-3.5 sm:p-4">
                    <p className="text-xs text-slate-500">Indicative interest</p>
                    <p className="mt-1 font-mono text-base font-bold tracking-tight text-slate-900 tabular-nums sm:text-lg">
                      {isDeclined ? '—' : indicativeInterestRange}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {isDeclined ? 'N/A' : 'Tier-based APR guidance'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200" />

              {/* Body Sections: Starter Tranche Ladder, Cash-Flow Chart, Signals, AI Explanation, Tips */}
              <div className="space-y-6 p-5 sm:p-6">
                {/* PM SVANidhi-Modeled Starter Tranche Ladder (shown for Cash-Heavy profiles) */}
                {starterTrancheLadder.isActive && (
                  <StarterTrancheLadderCard
                    ladder={starterTrancheLadder}
                    recommendedLoanAmount={recommendedLoanAmount}
                    isMobileFrame={isMobileFrame}
                  />
                )}

                {/* Cash-Flow & Repayment Capacity Bar Chart */}
                <CashFlowChart assessment={assessment} />

                {/* Fetched Tamper-Resistant Signals Ledger (Read-Only) */}
                <div className="border-t border-slate-100 pt-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Fetched tamper-resistant signals (Read-Only)
                    </h3>
                    <span className="text-[11px] font-medium text-teal-800">
                      {activeProfile.aaSourceLabel}
                    </span>
                  </div>

                  <dl
                    className={`mt-3 grid gap-2.5 ${
                      isMobileFrame ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'
                    }`}
                  >
                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
                      <dt className="text-[11px] text-slate-500">Unique UPI payers</dt>
                      <dd className="mt-0.5 font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {effectiveSignals.uniqueUpiPayersPerMonth}/mo
                      </dd>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
                      <dt className="text-[11px] text-slate-500">Cash deposit reg.</dt>
                      <dd className="mt-0.5 font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {effectiveSignals.cashDepositRegularity}/100
                      </dd>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
                      <dt className="text-[11px] text-slate-500">NACH bounces (6m)</dt>
                      <dd
                        className={`mt-0.5 font-mono text-xs font-semibold tabular-nums ${
                          effectiveSignals.nachBounces6m > 2
                            ? 'text-red-700'
                            : effectiveSignals.nachBounces6m > 0
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                        }`}
                      >
                        {effectiveSignals.nachBounces6m} bounces
                      </dd>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
                      <dt className="text-[11px] text-slate-500">BBPS on-time</dt>
                      <dd className="mt-0.5 font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {effectiveSignals.bbpsOnTimeRate}%
                      </dd>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
                      <dt className="text-[11px] text-slate-500">Cash-flow CV</dt>
                      <dd className="mt-0.5 font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {effectiveSignals.inflowOutflowCv.toFixed(2)}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
                      <dt className="text-[11px] text-slate-500">Min / avg balance</dt>
                      <dd className="mt-0.5 font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {Math.round(effectiveSignals.minToAvgBalanceRatio * 100)}%
                      </dd>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
                      <dt className="text-[11px] text-slate-500">Udyam vintage</dt>
                      <dd className="mt-0.5 font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {effectiveSignals.businessVintageMonths} mos
                      </dd>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
                      <dt className="text-[11px] text-slate-500">Buffer after EMI</dt>
                      <dd className="mt-0.5 font-mono text-xs font-semibold text-emerald-700 tabular-nums">
                        {formatINR(remainingMonthlyBuffer)}/mo
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Explanation-Only Read-Only AI Layer */}
                <div className="border-t border-slate-100 pt-5">
                  <AiExplanationCard
                    role="borrower"
                    businessName={activeProfile.businessName}
                    businessType={activeProfile.label}
                    location={activeProfile.location}
                    assessment={assessment}
                    snapshotKey={snapshotKey}
                  />
                </div>

                {/* Deterministic Plain-Language Steps & Repayment Summary */}
                <div className="border-t border-slate-100 pt-5">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Deterministic improvement &amp; step-up checklist
                  </h3>
                  {!isDeclined && (
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      Estimated monthly EMI of{' '}
                      <strong className="font-mono font-semibold text-slate-900 tabular-nums">
                        {formatINR(estimatedMonthlyEmi)}
                      </strong>{' '}
                      leaves{' '}
                      <strong className="font-mono font-semibold text-emerald-700 tabular-nums">
                        {formatINR(remainingMonthlyBuffer)}/mo
                      </strong>{' '}
                      from your {formatINR(Math.max(0, monthlyNetSurplus))} verified surplus.{' '}
                      {repaymentRationale}
                      {isRightSized && !starterTrancheLadder.isActive && (
                        <>
                          {' '}
                          Exposure was right-sized to stay safely inside the {maxEmiRatioPercent}%
                          EMI ceiling.
                        </>
                      )}
                    </p>
                  )}

                  <ul className="mt-3 divide-y divide-slate-100">
                    {borrowerImprovementSteps.map((step) => (
                      <li key={step.title} className="py-2.5 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-900">
                            {step.title}
                          </span>
                          <span className="font-mono text-[11px] font-medium text-teal-700">
                            {step.targetMetric}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                          {step.detail}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="rounded-b-xl border-t border-slate-200 bg-slate-50/70 px-5 py-3 text-[11px] leading-relaxed text-slate-500 sm:px-6">
                All merchant metrics above are synthetic sample data simulating RBI Account
                Aggregators, BBPS, and Udyam APIs. Scoring and loan sizing are 100% deterministic
                TypeScript.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
