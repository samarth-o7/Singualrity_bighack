import { CreditAssessment, MSMEInputs } from '../types/credit';
import { formatINR } from '../utils/format';

interface BorrowerViewProps {
  inputs: MSMEInputs;
  assessment: CreditAssessment;
  isMobileFrame: boolean;
}

export function BorrowerView({ inputs, assessment, isMobileFrame }: BorrowerViewProps) {
  const {
    recommendedLoan,
    tenureMonths,
    repaymentFrequency,
    repaymentRationale,
    estimatedInstallment,
    monthlyRepaymentTotal,
    monthlyNetSurplus,
    remainingMonthlyBuffer,
    repaymentToSurplusPercent,
    borrowerTips,
  } = assessment;

  const isDeclined = recommendedLoan === 0;
  const isRightSized = recommendedLoan > 0 && recommendedLoan < inputs.requestedLoan;
  const frequencyUnit =
    repaymentFrequency === 'Daily'
      ? 'operating day'
      : repaymentFrequency === 'Weekly'
        ? 'week'
        : 'fortnight';

  const repaymentShareWidth = Math.min(100, Math.round(repaymentToSurplusPercent));
  const bufferShareWidth = Math.max(0, 100 - repaymentShareWidth);

  return (
    <div className="space-y-6">
      {/* Plain-language Offer Explanation */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          What this offer means for your business
        </h3>
        {isDeclined ? (
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            At your current monthly fixed costs ({formatINR(inputs.monthlyFixedExpenses)}) and daily
            sales ({formatINR(inputs.dailySales)}), there is not enough monthly cash buffer left to
            safely carry a loan. Reducing fixed overhead or demonstrating higher daily receipts is
            needed before borrowing.
          </p>
        ) : (
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            Based on your regular collections and payment discipline, your business can comfortably
            handle{' '}
            <strong className="font-semibold text-slate-900 font-mono tabular-nums">
              {formatINR(estimatedInstallment)}
            </strong>{' '}
            per {frequencyUnit} for{' '}
            <strong className="font-semibold text-slate-900 font-mono tabular-nums">
              {tenureMonths} months
            </strong>
            . {repaymentRationale}
            {isRightSized && (
              <>
                {' '}
                We right-sized the starting limit from{' '}
                <span className="font-mono tabular-nums">{formatINR(inputs.requestedLoan)}</span> to{' '}
                <span className="font-mono tabular-nums">{formatINR(recommendedLoan)}</span> so
                repayments do not strain slow weeks.
              </>
            )}
          </p>
        )}
      </div>

      {/* Monthly Cash Comfort Breakdown */}
      {!isDeclined && (
        <div className="border-t border-slate-100 pt-5">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-xs font-semibold text-slate-900">
              Monthly surplus allocation
            </h4>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              Net surplus: {formatINR(monthlyNetSurplus)}/mo
            </span>
          </div>

          {/* Stacked allocation bar */}
          <div
            className="mt-2.5 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
            role="img"
            aria-label={`${repaymentShareWidth}% of monthly surplus goes to loan repayment, ${bufferShareWidth}% stays as business buffer`}
          >
            <div
              className="bg-teal-700 transition-all duration-300"
              style={{ width: `${repaymentShareWidth}%` }}
            />
            <div
              className="bg-emerald-500/75 transition-all duration-300"
              style={{ width: `${bufferShareWidth}%` }}
            />
          </div>

          <div
            className={`mt-3 grid gap-3 ${
              isMobileFrame ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'
            }`}
          >
            <div>
              <p className="text-xs text-slate-500">Est. {repaymentFrequency.toLowerCase()} payout</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums">
                {formatINR(estimatedInstallment)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total monthly repayment</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-teal-800 tabular-nums">
                {formatINR(monthlyRepaymentTotal)}{' '}
                <span className="text-xs font-normal text-slate-500">
                  ({Math.round(repaymentToSurplusPercent)}%)
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Cash buffer kept with you</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-emerald-700 tabular-nums">
                {formatINR(remainingMonthlyBuffer)}/mo
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actionable Tips to Improve Terms */}
      <div className="border-t border-slate-100 pt-5">
        <h4 className="text-xs font-semibold text-slate-900">
          How to unlock a higher limit or lower interest
        </h4>
        <ul className="mt-3 divide-y divide-slate-100">
          {borrowerTips.map((tip) => (
            <li key={tip.title} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-slate-900">{tip.title}</span>
                <span className="font-mono text-xs font-medium text-teal-700">
                  {tip.impactLabel}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{tip.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
