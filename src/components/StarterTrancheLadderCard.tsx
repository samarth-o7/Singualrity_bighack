import { ArrowRight } from 'lucide-react';
import { StarterTrancheLadder } from '../types/credit';
import { formatINR } from '../utils/format';

interface StarterTrancheLadderCardProps {
  ladder: StarterTrancheLadder;
  recommendedLoanAmount: number;
  isMobileFrame: boolean;
}

export function StarterTrancheLadderCard({
  ladder,
  recommendedLoanAmount,
  isMobileFrame,
}: StarterTrancheLadderCardProps) {
  if (!ladder.isActive) return null;

  return (
    <section
      aria-labelledby="starter-tranche-heading"
      className="rounded-lg border border-teal-200 bg-teal-50/50 p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="starter-tranche-heading" className="text-xs font-bold text-teal-950">
          Starter Tranche Trust Ladder ({ladder.programModel})
        </h3>
        <span className="font-mono text-[11px] font-semibold text-teal-800">
          ₹15,000 → ₹25,000 → ₹50,000
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-teal-900">{ladder.reason}</p>

      <div
        className={`mt-3 grid gap-2.5 ${
          isMobileFrame ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'
        }`}
      >
        {ladder.tranches.map((tranche, idx) => {
          const isCurrent = tranche.trancheNumber === 1;
          return (
            <div
              key={tranche.trancheNumber}
              className={`relative rounded-lg border p-3 ${
                isCurrent
                  ? 'border-teal-700 bg-white'
                  : 'border-teal-200/80 bg-white/70'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-semibold text-slate-600">
                  {tranche.label}
                </span>
                <span
                  className={`font-mono text-[10px] font-semibold ${
                    isCurrent ? 'text-teal-700' : 'text-slate-500'
                  }`}
                >
                  {tranche.status}
                </span>
              </div>

              <div className="mt-1 flex items-baseline justify-between gap-1">
                <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
                  {isCurrent
                    ? formatINR(Math.min(recommendedLoanAmount, tranche.amount))
                    : formatINR(tranche.amount)}
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  {tranche.tenureLabel}
                </span>
              </div>

              <p className="mt-1.5 text-[11px] leading-snug text-slate-600">
                {tranche.unlockCriteria}
              </p>

              {!isMobileFrame && idx < ladder.tranches.length - 1 && (
                <ArrowRight
                  className="pointer-events-none absolute -right-2.5 top-1/2 hidden h-3.5 w-3.5 -translate-y-1/2 text-teal-700 sm:block"
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
