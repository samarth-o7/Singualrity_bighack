import { CreditAssessment, MSMEInputs } from '../types/credit';
import { formatINR } from '../utils/format';

interface LenderViewProps {
  inputs: MSMEInputs;
  assessment: CreditAssessment;
  isMobileFrame: boolean;
}

const STATUS_TEXT: Record<'Positive' | 'Neutral' | 'Watch', string> = {
  Positive: 'text-emerald-700',
  Neutral: 'text-slate-600',
  Watch: 'text-amber-700',
};

const SEVERITY_TEXT: Record<'Low' | 'Medium' | 'High', string> = {
  Low: 'text-slate-600',
  Medium: 'text-amber-700',
  High: 'text-red-700',
};

export function LenderView({ inputs, assessment, isMobileFrame }: LenderViewProps) {
  const {
    factors,
    monthlyRevenue,
    monthlyNetSurplus,
    monthlyRepaymentTotal,
    repaymentToSurplusPercent,
    operatingMarginPercent,
    recommendedLoan,
    lenderRisks,
  } = assessment;

  const requestedDelta = recommendedLoan - inputs.requestedLoan;

  return (
    <div className="space-y-6">
      {/* Signal Attribution Table */}
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">
            Alternative underwriting signals
          </h3>
          <span className="text-xs text-slate-500">No bureau score required</span>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-medium text-slate-500">
                <th className="py-2 pr-3 font-medium">Signal</th>
                {!isMobileFrame && <th className="py-2 px-2 font-medium">Observed</th>}
                <th className="py-2 px-2 text-right font-medium">Weight</th>
                <th className="py-2 pl-2 text-right font-medium">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {factors.map((factor) => (
                <tr key={factor.id} className="align-top">
                  <td className="py-2.5 pr-3">
                    <div className="font-medium text-slate-900">{factor.label}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      {isMobileFrame ? `${factor.rawDisplay} · ` : ''}
                      <span className={STATUS_TEXT[factor.status]}>{factor.status}</span>
                    </div>
                  </td>
                  {!isMobileFrame && (
                    <td className="py-2.5 px-2 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                      {factor.rawDisplay}
                    </td>
                  )}
                  <td className="py-2.5 px-2 text-right font-mono text-slate-500 tabular-nums whitespace-nowrap">
                    {factor.weightPercent}%
                  </td>
                  <td className="py-2.5 pl-2 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                    {factor.contribution.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cash-Flow & FOIR Affordability Diagnostics */}
      <div className="border-t border-slate-100 pt-5">
        <h4 className="text-xs font-semibold text-slate-900">
          Affordability & cash-flow ratios
        </h4>
        <dl
          className={`mt-3 grid gap-x-4 gap-y-3 ${
            isMobileFrame ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
          }`}
        >
          <div>
            <dt className="text-[11px] text-slate-500">Est. monthly revenue</dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums">
              {formatINR(monthlyRevenue)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-slate-500">Fixed expenses</dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums">
              {formatINR(inputs.monthlyFixedExpenses)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-slate-500">Operating margin</dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums">
              {Math.round(operatingMarginPercent)}%
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-slate-500">Net monthly surplus</dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums">
              {formatINR(monthlyNetSurplus)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-slate-500">Debt service / surplus</dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold text-teal-800 tabular-nums">
              {Math.round(repaymentToSurplusPercent)}%{' '}
              <span className="text-[11px] font-normal text-slate-500">
                ({formatINR(monthlyRepaymentTotal)}/mo)
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-slate-500">Vs. requested ticket</dt>
            <dd
              className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${
                requestedDelta < 0 ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              {requestedDelta === 0
                ? '100% covered'
                : `${formatINR(requestedDelta)}`}
            </dd>
          </div>
        </dl>
      </div>

      {/* Risk Flags & Structuring Guardrails */}
      <div className="border-t border-slate-100 pt-5">
        <h4 className="text-xs font-semibold text-slate-900">
          Risk observations & recommended guardrails
        </h4>
        <ul className="mt-3 divide-y divide-slate-100">
          {lenderRisks.map((risk) => (
            <li key={risk.title} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-slate-900">{risk.title}</span>
                <span className={`font-mono text-[11px] font-semibold shrink-0 ${SEVERITY_TEXT[risk.severity]}`}>
                  {risk.severity} risk
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Guardrail: {risk.mitigant}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
