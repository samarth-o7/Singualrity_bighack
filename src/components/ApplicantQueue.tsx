import { ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import {
  CreditAssessment,
  LenderQueueFilter,
  LoanApplication,
  ReadinessTier,
  UnderwriterStatus,
} from '../types/credit';
import { formatCompactINR } from '../utils/format';

export interface EvaluatedApplication {
  application: LoanApplication;
  assessment: CreditAssessment;
}

interface ApplicantQueueProps {
  items: EvaluatedApplication[];
  activeFilter: LenderQueueFilter;
  isMobileFrame: boolean;
  onFilterChange: (filter: LenderQueueFilter) => void;
  onSelectApplication: (id: string) => void;
}

const FILTER_TABS: LenderQueueFilter[] = [
  'All',
  'Strong',
  'Moderate',
  'Watchlist',
  'Cash-Heavy',
];

const TIER_TEXT_COLOR: Record<ReadinessTier, string> = {
  Strong: 'text-emerald-700',
  Moderate: 'text-teal-700',
  Watchlist: 'text-amber-700',
};

const STATUS_STYLE: Record<UnderwriterStatus, string> = {
  'Pending Review': 'text-slate-600',
  'Approved Terms': 'text-emerald-700 font-semibold',
  'Starter Tranche Offered': 'text-teal-800 font-semibold',
  'Watchlist Hold': 'text-amber-800 font-semibold',
};

function matchesFilter(
  item: EvaluatedApplication,
  filter: LenderQueueFilter
): boolean {
  if (filter === 'All') return true;
  if (filter === 'Cash-Heavy') return item.assessment.isCashHeavyProfile;
  return item.assessment.readinessTier === filter;
}

export function ApplicantQueue({
  items,
  activeFilter,
  isMobileFrame,
  onFilterChange,
  onSelectApplication,
}: ApplicantQueueProps) {
  const filteredItems = items.filter((item) => matchesFilter(item, activeFilter));

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 sm:text-base">
              Incoming Underwriting Queue
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Synthetic MSME applications + live consented submissions from Borrower Portal
            </p>
          </div>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            Showing {filteredItems.length} of {items.length}
          </span>
        </div>

        {/* Interactive Filter Tabs: All, Strong, Moderate, Watchlist, Cash-Heavy */}
        <div
          className={`mt-4 flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 ${
            isMobileFrame ? '' : 'sm:inline-flex'
          }`}
          role="tablist"
          aria-label="Filter underwriting queue"
        >
          {FILTER_TABS.map((filter) => {
            const active = activeFilter === filter;
            const count = items.filter((item) => matchesFilter(item, filter)).length;
            return (
              <button
                key={filter}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onFilterChange(filter)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{filter}</span>
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    active ? 'text-teal-700' : 'text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Applicant List */}
      <div className="divide-y divide-slate-100 border-t border-slate-200">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs font-medium text-slate-700">
              No applications match the &ldquo;{activeFilter}&rdquo; filter.
            </p>
            <button
              type="button"
              onClick={() => onFilterChange('All')}
              className="mt-2 text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              Reset filter to All
            </button>
          </div>
        ) : (
          filteredItems.map(({ application, assessment }) => {
            const isLiveSubmission = application.source === 'borrower-consent';

            return (
              <motion.button
                key={application.id}
                type="button"
                onClick={() => onSelectApplication(application.id)}
                whileHover={{ x: 2 }}
                transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                className={`group flex w-full text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600 ${
                  isMobileFrame
                    ? 'items-start justify-between gap-3 p-4 hover:bg-slate-50/90'
                    : 'flex-col justify-between gap-3 px-5 py-4 hover:bg-slate-50/90 sm:flex-row sm:items-center'
                }`}
              >
                {/* Left: Identity & Origin */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                    <span className="font-mono font-semibold text-slate-700 tabular-nums">
                      {application.referenceCode}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span
                      className={
                        isLiveSubmission
                          ? 'font-semibold text-teal-800'
                          : 'font-medium text-slate-500'
                      }
                    >
                      {isLiveSubmission ? 'Live Borrower Submission' : 'Synthetic Sample'}
                    </span>
                    {assessment.isCashHeavyProfile && (
                      <>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className="font-semibold text-teal-700">
                          Cash-Heavy · Outflow-Verified
                        </span>
                      </>
                    )}
                  </div>

                  <p className="mt-1 truncate text-sm font-bold text-slate-900 group-hover:text-teal-900">
                    {application.businessName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {application.aaHandle ? `${application.aaHandle} · ` : ''}
                    {application.businessType} · {application.location} ·{' '}
                    {application.consentGrantedAt}
                  </p>

                  {isMobileFrame && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                      <span className="font-mono font-medium text-slate-800 tabular-nums">
                        Req {formatCompactINR(application.requestedLoan)}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                        Rec {formatCompactINR(assessment.recommendedLoanAmount)}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className={STATUS_STYLE[application.reviewStatus]}>
                        {application.reviewStatus}
                      </span>
                    </div>
                  )}
                </div>

                {/* Desktop Columns: Requested / Recommended / Decision Status */}
                {!isMobileFrame && (
                  <div className="flex shrink-0 flex-wrap items-center gap-6 text-right">
                    <div className="min-w-[96px]">
                      <p className="text-[11px] text-slate-500">Requested / Rec</p>
                      <p className="mt-0.5 font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {formatCompactINR(application.requestedLoan)}{' '}
                        <span className="text-slate-400">/</span>{' '}
                        <span
                          className={
                            assessment.knockOutTriggered ? 'text-red-700' : 'text-emerald-700'
                          }
                        >
                          {formatCompactINR(assessment.recommendedLoanAmount)}
                        </span>
                      </p>
                    </div>

                    <div className="min-w-[132px]">
                      <p className="text-[11px] text-slate-500">Underwriter Decision</p>
                      <p className={`mt-0.5 text-xs ${STATUS_STYLE[application.reviewStatus]}`}>
                        {application.reviewStatus}
                      </p>
                    </div>
                  </div>
                )}

                {/* Right: Deterministic Score & Open Arrow */}
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-0.5">
                      <span className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                        {assessment.stabilityScore}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">/100</span>
                    </div>
                    <p
                      className={`text-[11px] font-semibold ${TIER_TEXT_COLOR[assessment.readinessTier]}`}
                    >
                      {assessment.readinessTier}
                    </p>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-teal-700"
                    aria-hidden="true"
                  />
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}
