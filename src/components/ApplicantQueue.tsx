import { ChevronRight } from 'lucide-react';
import {
  CreditAssessment,
  LoanApplication,
  ReadinessTier,
} from '../types/credit';
import { formatCompactINR } from '../utils/format';

export interface EvaluatedApplication {
  application: LoanApplication;
  assessment: CreditAssessment;
}

interface ApplicantQueueProps {
  items: EvaluatedApplication[];
  selectedId: string;
  tierFilter: 'All' | ReadinessTier;
  onTierFilterChange: (tier: 'All' | ReadinessTier) => void;
  onSelectApplication: (id: string) => void;
}

const TIER_FILTERS: ('All' | ReadinessTier)[] = ['All', 'Strong', 'Moderate', 'Watchlist'];

const TIER_TEXT_COLOR: Record<ReadinessTier, string> = {
  Strong: 'text-emerald-700',
  Moderate: 'text-teal-700',
  Watchlist: 'text-amber-700',
};

export function ApplicantQueue({
  items,
  selectedId,
  tierFilter,
  onTierFilterChange,
  onSelectApplication,
}: ApplicantQueueProps) {
  const filteredItems =
    tierFilter === 'All'
      ? items
      : items.filter((item) => item.assessment.readinessTier === tierFilter);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Applicant Queue</h2>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            {filteredItems.length} of {items.length} requests
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          Synthetic MSME queue + consented requests from Borrower Portal
        </p>

        <div
          className="mt-3 grid grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1"
          role="group"
          aria-label="Filter queue by readiness tier"
        >
          {TIER_FILTERS.map((tier) => {
            const active = tierFilter === tier;
            return (
              <button
                key={tier}
                type="button"
                onClick={() => onTierFilterChange(tier)}
                aria-pressed={active}
                className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tier}
              </button>
            );
          })}
        </div>
      </div>

      <div className="divide-y divide-slate-100 border-t border-slate-200">
        {filteredItems.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-xs font-medium text-slate-700">
              No applicants match the {tierFilter} readiness tier.
            </p>
            <button
              type="button"
              onClick={() => onTierFilterChange('All')}
              className="mt-2 text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              Show all applicants
            </button>
          </div>
        ) : (
          filteredItems.map(({ application, assessment }) => {
            const isSelected = application.id === selectedId;
            const isConsentSubmission = application.source === 'borrower-consent';

            return (
              <button
                key={application.id}
                type="button"
                onClick={() => onSelectApplication(application.id)}
                aria-current={isSelected ? 'true' : undefined}
                className={`group flex w-full items-start justify-between gap-3 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600 ${
                  isSelected ? 'bg-teal-50/70' : 'bg-white hover:bg-slate-50/80'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <span className="font-mono text-[11px] font-medium text-slate-500 tabular-nums">
                      {application.referenceCode}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${
                        isConsentSubmission ? 'text-teal-700' : 'text-slate-500'
                      }`}
                    >
                      {isConsentSubmission ? 'Borrower AA Consent' : 'Synthetic Sample'}
                    </span>
                  </div>

                  <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                    {application.businessName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {application.businessType} · {application.location}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                    <span className="font-mono font-medium text-slate-800 tabular-nums">
                      Req {formatCompactINR(application.requestedLoan)}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    {assessment.knockOutTriggered ? (
                      <span className="font-semibold text-red-700">Knock-Out Cap</span>
                    ) : assessment.isCashHeavyProfile ? (
                      <span className="font-semibold text-teal-800">
                        Cash-Heavy · Tranche 1
                      </span>
                    ) : (
                      <span className="font-mono text-emerald-700 tabular-nums">
                        Limit {formatCompactINR(assessment.recommendedLoanAmount)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end">
                  <div className="flex items-baseline gap-0.5">
                    <span className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                      {assessment.stabilityScore}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">/100</span>
                  </div>
                  <span
                    className={`text-[11px] font-semibold ${TIER_TEXT_COLOR[assessment.readinessTier]}`}
                  >
                    {assessment.readinessTier}
                  </span>
                  <span className="mt-1.5 inline-flex items-center text-[11px] text-slate-400 group-hover:text-slate-700">
                    {application.reviewStatus}
                    <ChevronRight className="ml-0.5 h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
