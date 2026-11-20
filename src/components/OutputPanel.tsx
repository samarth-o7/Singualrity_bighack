import {
  CreditAssessment,
  MSMEInputs,
  PerspectiveTab,
  VerificationStatus,
} from '../types/credit';
import { formatINR } from '../utils/format';
import { BorrowerView } from './BorrowerView';
import { LenderView } from './LenderView';
import { getReadinessDescriptor, StabilityGauge } from './StabilityGauge';

interface OutputPanelProps {
  inputs: MSMEInputs;
  assessment: CreditAssessment;
  activeTab: PerspectiveTab;
  isMobileFrame: boolean;
  onTabChange: (tab: PerspectiveTab) => void;
}

const VERIFICATION_STYLES: Record<
  VerificationStatus,
  { text: string; bar: string }
> = {
  'Partially Corroborated': {
    text: 'text-emerald-700',
    bar: 'bg-emerald-600',
  },
  'Self-Reported · Needs Proof': {
    text: 'text-amber-700',
    bar: 'bg-amber-500',
  },
  'Consistency Warning': {
    text: 'text-red-700',
    bar: 'bg-red-600',
  },
};

export function OutputPanel({
  inputs,
  assessment,
  activeTab,
  isMobileFrame,
  onTabChange,
}: OutputPanelProps) {
  const {
    stabilityScore,
    readinessTier,
    dataConfidence,
    verificationStatus,
    recommendedLoanAmount,
    tenureMonths,
    repaymentSchedule,
    indicativeInterestRange,
    underwritingDecision,
    loanCoverageRatio,
  } = assessment;

  const isDeclined = recommendedLoanAmount === 0;
  const verStyle = VERIFICATION_STYLES[verificationStatus];

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {/* Top Hero: Stability Score (0-100) + Readiness Tier + Data Confidence */}
      <div className="p-5 sm:p-6">
        <div
          className={`flex gap-5 ${
            isMobileFrame
              ? 'flex-col items-center text-center'
              : 'flex-col items-start justify-between sm:flex-row sm:items-center'
          }`}
        >
          <div className={isMobileFrame ? 'order-2 w-full' : 'min-w-0 flex-1'}>
            <p className="text-xs font-medium text-slate-500">
              Stability Score · Readiness Tier: <span className="font-semibold text-slate-800">{readinessTier}</span>
            </p>
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

        {/* Data Confidence & Verification Strip */}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
            <div className="flex items-baseline gap-2">
              <span className="font-medium text-slate-600">Data Confidence</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {dataConfidence}/100
              </span>
            </div>
            <span className={`font-semibold ${verStyle.text}`}>
              {verificationStatus}
            </span>
          </div>
          <div
            className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={dataConfidence}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Data confidence ${dataConfidence} out of 100`}
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${verStyle.bar}`}
              style={{ width: `${dataConfidence}%` }}
            />
          </div>
        </div>

        {/* Core 4-Metric Underwriting Output Grid */}
        <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200">
          {/* 1. Recommended Loan Amount */}
          <div className="bg-slate-50/70 p-3.5 sm:p-4">
            <p className="text-xs text-slate-500">Recommended loan</p>
            <p className="mt-1 font-mono text-lg font-bold tracking-tight text-slate-900 tabular-nums sm:text-xl">
              {isDeclined ? '₹0' : formatINR(recommendedLoanAmount)}
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
              {isDeclined
                ? 'Insufficient surplus'
                : `${Math.round(loanCoverageRatio * 100)}% of ${formatINR(inputs.requestedLoan)}`}
            </p>
          </div>

          {/* 2. Tenure (6-24 months) */}
          <div className="bg-slate-50/70 p-3.5 sm:p-4">
            <p className="text-xs text-slate-500">Tenure</p>
            <p className="mt-1 font-mono text-lg font-bold tracking-tight text-slate-900 tabular-nums sm:text-xl">
              {isDeclined ? '—' : `${tenureMonths} months`}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {isDeclined ? 'Not eligible' : '6–24 mo MSME band'}
            </p>
          </div>

          {/* 3. Repayment Schedule */}
          <div className="bg-slate-50/70 p-3.5 sm:p-4">
            <p className="text-xs text-slate-500">Repayment schedule</p>
            <p className="mt-1 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              {isDeclined ? '—' : repaymentSchedule}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {isDeclined
                ? 'N/A'
                : repaymentSchedule === 'Daily'
                  ? 'UPI micro-sweep'
                  : repaymentSchedule === 'Weekly'
                    ? 'Weekly auto-debit'
                    : 'Monthly e-NACH'}
            </p>
          </div>

          {/* 4. Indicative Interest Range */}
          <div className="bg-slate-50/70 p-3.5 sm:p-4">
            <p className="text-xs text-slate-500">Indicative interest</p>
            <p className="mt-1 font-mono text-base font-bold tracking-tight text-slate-900 tabular-nums sm:text-lg">
              {isDeclined ? '—' : indicativeInterestRange}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {isDeclined ? 'N/A' : 'Risk & confidence priced'}
            </p>
          </div>
        </div>
      </div>

      {/* Borrower / Lender Perspective Tabs */}
      <div className="border-t border-slate-200 px-5 pt-4 sm:px-6">
        <div
          className="grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-100 p-1"
          role="tablist"
          aria-label="Underwriting perspective"
        >
          <button
            type="button"
            role="tab"
            id="tab-borrower"
            aria-selected={activeTab === 'borrower'}
            aria-controls="panel-borrower"
            onClick={() => onTabChange('borrower')}
            className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
              activeTab === 'borrower'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Borrower View
          </button>
          <button
            type="button"
            role="tab"
            id="tab-lender"
            aria-selected={activeTab === 'lender'}
            aria-controls="panel-lender"
            onClick={() => onTabChange('lender')}
            className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
              activeTab === 'lender'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Lender View
          </button>
        </div>
      </div>

      {/* Tab Content Panel */}
      <div
        id={activeTab === 'borrower' ? 'panel-borrower' : 'panel-lender'}
        role="tabpanel"
        aria-labelledby={activeTab === 'borrower' ? 'tab-borrower' : 'tab-lender'}
        className="p-5 sm:p-6"
      >
        {activeTab === 'borrower' ? (
          <BorrowerView
            inputs={inputs}
            assessment={assessment}
            isMobileFrame={isMobileFrame}
          />
        ) : (
          <LenderView
            inputs={inputs}
            assessment={assessment}
            isMobileFrame={isMobileFrame}
          />
        )}
      </div>

      {/* Deterministic Model Disclaimer */}
      <div className="border-t border-slate-200 bg-slate-50/70 px-5 py-3 text-[11px] leading-relaxed text-slate-500 sm:px-6 rounded-b-xl">
        Deterministic cash-flow underwriting heuristic built on synthetic MSME data. For Problem F2
        demonstration only — not a formal bureau score or binding credit sanction.
      </div>
    </div>
  );
}
