import { CreditAssessment, MSMEInputs } from '../types/credit';
import { formatINR } from '../utils/format';

interface BorrowerViewProps {
  inputs: MSMEInputs;
  assessment: CreditAssessment;
  isMobileFrame: boolean;
}

const CHECK_STATUS_STYLES: Record<'Passed' | 'Needs Proof' | 'Warning', string> = {
  Passed: 'text-emerald-700',
  'Needs Proof': 'text-amber-700',
  Warning: 'text-red-700',
};

const SIGNAL_STATUS_STYLES: Record<'Positive' | 'Neutral' | 'Watch', string> = {
  Positive: 'text-emerald-700',
  Neutral: 'text-slate-600',
  Watch: 'text-amber-700',
};

export function BorrowerView({ inputs, assessment, isMobileFrame }: BorrowerViewProps) {
  const {
    recommendedLoanAmount,
    tenureMonths,
    repaymentSchedule,
    repaymentRationale,
    estimatedInstallment,
    monthlyRepaymentTotal,
    monthlyNetSurplus,
    remainingMonthlyBuffer,
    repaymentToSurplusPercent,
    verificationStatus,
    dataConfidence,
    keySignals,
    verificationChecks,
    riskFlags,
    borrowerTips,
  } = assessment;

  const isDeclined = recommendedLoanAmount === 0;
  const isRightSized =
    recommendedLoanAmount > 0 && recommendedLoanAmount < inputs.requestedLoan;
  const frequencyUnit =
    repaymentSchedule === 'Daily'
      ? 'operating day'
      : repaymentSchedule === 'Weekly'
        ? 'week'
        : 'month';

  const repaymentShareWidth = Math.min(100, Math.round(repaymentToSurplusPercent));
  const bufferShareWidth = Math.max(0, 100 - repaymentShareWidth);

  const actionableChecks = verificationChecks.filter((c) => c.status !== 'Passed');
  const materialRisks = riskFlags.filter((r) => r.severity !== 'Low');

  return (
    <div className="space-y-6">
      {/* Plain-language Offer Explanation */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          What this offer means for your business
        </h3>
        {isDeclined ? (
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            At your current monthly fixed expenses ({formatINR(inputs.monthlyFixedExpenses)}) and
            daily sales ({formatINR(inputs.dailySales)}), your business has no positive monthly
            surplus left to safely repay a loan. Lowering fixed overhead or recording higher daily
            collections is needed first.
          </p>
        ) : (
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            Based on your operating cash flow and payment track record, your business can safely
            repay{' '}
            <strong className="font-mono font-semibold text-slate-900 tabular-nums">
              {formatINR(estimatedInstallment)}
            </strong>{' '}
            per {frequencyUnit} over{' '}
            <strong className="font-mono font-semibold text-slate-900 tabular-nums">
              {tenureMonths} months
            </strong>
            . {repaymentRationale}
            {isRightSized && (
              <>
                {' '}
                We right-sized the initial limit from{' '}
                <span className="font-mono tabular-nums">{formatINR(inputs.requestedLoan)}</span> to{' '}
                <span className="font-mono tabular-nums">{formatINR(recommendedLoanAmount)}</span>{' '}
                to protect cash flow during slower weeks.
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
              Net surplus: {formatINR(Math.max(0, monthlyNetSurplus))}/mo
            </span>
          </div>

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
              <p className="text-xs text-slate-500">
                Est. {repaymentSchedule.toLowerCase()} payout
              </p>
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

      {/* Key Signals in Plain Language */}
      <div className="border-t border-slate-100 pt-5">
        <h4 className="text-xs font-semibold text-slate-900">
          What shaped your score
        </h4>
        <ul className="mt-3 divide-y divide-slate-100">
          {keySignals.map((signal) => (
            <li key={signal.id} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-slate-900">{signal.label}</span>
                <span className="font-mono text-xs tabular-nums shrink-0">
                  <span className="text-slate-700">{signal.rawDisplay}</span>
                  <span className="mx-1.5 text-slate-300">·</span>
                  <span className={`font-semibold ${SIGNAL_STATUS_STYLES[signal.status]}`}>
                    {signal.status}
                  </span>
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-600">{signal.detail}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Verification & Proof Status for Borrower */}
      <div className="border-t border-slate-100 pt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="text-xs font-semibold text-slate-900">
            Verification & documents checklist
          </h4>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            {verificationStatus} · {dataConfidence}/100
          </span>
        </div>

        {actionableChecks.length === 0 ? (
          <p className="mt-2 text-xs leading-relaxed text-emerald-800">
            All cross-signal checks look consistent. Sharing your 90-day UPI QR statement is enough
            to confirm these terms.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {actionableChecks.map((check) => (
              <li key={check.id} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900">{check.label}</span>
                  <span
                    className={`font-mono text-[11px] font-semibold shrink-0 ${CHECK_STATUS_STYLES[check.status]}`}
                  >
                    {check.status}
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{check.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Key Watchouts (if any) + How to Improve */}
      <div className="border-t border-slate-100 pt-5">
        <h4 className="text-xs font-semibold text-slate-900">
          {materialRisks.length > 0
            ? 'How to strengthen your offer & address watchouts'
            : 'How to unlock a higher limit or lower interest'}
        </h4>
        <ul className="mt-3 divide-y divide-slate-100">
          {borrowerTips.map((tip) => (
            <li key={tip.title} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-slate-900">{tip.title}</span>
                <span className="font-mono text-[11px] font-medium text-teal-700">
                  {tip.impactLabel}
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{tip.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
