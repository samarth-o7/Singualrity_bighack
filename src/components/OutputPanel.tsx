import { CreditAssessment, MSMEInputs, PerspectiveTab } from '../types/credit';
import { formatINR } from '../utils/format';
import { BorrowerView } from './BorrowerView';
import { LenderView } from './LenderView';
import { getStabilityDescriptor, StabilityGauge } from './StabilityGauge';

interface OutputPanelProps {
  inputs: MSMEInputs;
  assessment: CreditAssessment;
  activeTab: PerspectiveTab;
  isMobileFrame: boolean;
  onTabChange: (tab: PerspectiveTab) => void;
}

export function OutputPanel({
  inputs,
  assessment,
  activeTab,
  isMobileFrame,
  onTabChange,
}: OutputPanelProps) {
  const {
    stabilityScore,
    stabilityBand,
    recommendedLoan,
    tenureMonths,
    repaymentFrequency,
    interestMinApr,
    interestMaxApr,
    underwritingDecision,
    loanCoverageRatio,
  } = assessment;

  const isDeclined = recommendedLoan === 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {/* Top Hero: Stability Score (0-100) + Decision Summary */}
      <div className="p-5 sm:p-6">
        <div
          className={`flex gap-5 ${
            isMobileFrame
              ? 'flex-col items-center text-center'
              : 'flex-col items-start justify-between sm:flex-row sm:items-center'
          }`}
        >
          <div className={isMobileFrame ? 'order-2' : 'min-w-0 flex-1'}>
            <p className="text-xs font-medium text-slate-500">
              Placeholder Stability Score (0–100)
            </p>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">
              {underwritingDecision}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {getStabilityDescriptor(stabilityBand)}
            </p>
          </div>

          <div className={isMobileFrame ? 'order-1' : 'shrink-0'}>
            <StabilityGauge score={stabilityScore} band={stabilityBand} />
          </div>
        </div>

        {/* Core 4-Metric Underwriting Output Grid */}
        <div
          className={`mt-6 grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 ${
            isMobileFrame ? 'grid-cols-2' : 'grid-cols-2'
          }`}
        >
          {/* 1. Recommended Loan Amount */}
          <div className="bg-slate-50/70 p-3.5 sm:p-4">
            <p className="text-xs text-slate-500">Recommended loan</p>
            <p className="mt-1 font-mono text-lg font-bold tracking-tight text-slate-900 tabular-nums sm:text-xl">
              {isDeclined ? '₹0' : formatINR(recommendedLoan)}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500 font-mono tabular-nums">
              {isDeclined
                ? 'Insufficient surplus'
                : `${Math.round(loanCoverageRatio * 100)}% of ${formatINR(inputs.requestedLoan)}`}
            </p>
          </div>

          {/* 2. Tenure */}
          <div className="bg-slate-50/70 p-3.5 sm:p-4">
            <p className="text-xs text-slate-500">Tenure</p>
            <p className="mt-1 font-mono text-lg font-bold tracking-tight text-slate-900 tabular-nums sm:text-xl">
              {isDeclined ? '—' : `${tenureMonths} months`}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {isDeclined ? 'Not eligible' : 'Working capital cycle'}
            </p>
          </div>

          {/* 3. Repayment Frequency */}
          <div className="bg-slate-50/70 p-3.5 sm:p-4">
            <p className="text-xs text-slate-500">Repayment frequency</p>
            <p className="mt-1 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              {isDeclined ? '—' : repaymentFrequency}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {isDeclined
                ? 'N/A'
                : repaymentFrequency === 'Daily'
                  ? 'UPI micro-sweep'
                  : 'Auto-debit / UPI'}
            </p>
          </div>

          {/* 4. Indicative Interest Range */}
          <div className="bg-slate-50/70 p-3.5 sm:p-4">
            <p className="text-xs text-slate-500">Indicative interest range</p>
            <p className="mt-1 font-mono text-lg font-bold tracking-tight text-slate-900 tabular-nums sm:text-xl">
              {isDeclined
                ? '—'
                : `${interestMinApr.toFixed(1)}–${interestMaxApr.toFixed(1)}%`}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {isDeclined ? 'N/A' : 'Indicative APR p.a.'}
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

      {/* Quiet Placeholder Model Notice */}
      <div className="border-t border-slate-200 bg-slate-50/70 px-5 py-3 text-[11px] leading-relaxed text-slate-500 sm:px-6 rounded-b-xl">
        Illustrative placeholder scoring model using synthetic cash-flow inputs. Not a formal credit
        bureau score or binding loan offer.
      </div>
    </div>
  );
}
