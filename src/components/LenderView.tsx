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

const CHECK_STATUS_TEXT: Record<'Passed' | 'Needs Proof' | 'Warning', string> = {
  Passed: 'text-emerald-700',
  'Needs Proof': 'text-amber-700',
  Warning: 'text-red-700',
};

const SEVERITY_TEXT: Record<'Low' | 'Medium' | 'High', string> = {
  Low: 'text-slate-600',
  Medium: 'text-amber-700',
  High: 'text-red-700',
};

export function LenderView({ inputs, assessment, isMobileFrame }: LenderViewProps) {
  const {
    keySignals,
    verificationChecks,
    dataConfidence,
    verificationStatus,
    confidenceHaircutMultiplier,
    monthlyRevenue,
    monthlyFixedExpenses,
    monthlyNetSurplus,
    expenseCoverageRatio,
    operatingMarginPercent,
    monthlyRepaymentTotal,
    repaymentToSurplusPercent,
    recommendedLoanAmount,
    riskFlags,
  } = assessment;

  const requestedDelta = recommendedLoanAmount - inputs.requestedLoan;
  const isDeficit = monthlyNetSurplus < 0;

  return (
    <div className="space-y-6">
      {/* 1. Key Underwriting Signals Attribution Table */}
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">
            Key underwriting signals
          </h3>
          <span className="text-xs text-slate-500">Cash-flow weighted model</span>
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
              {keySignals.map((signal) => (
                <tr key={signal.id} className="align-top">
                  <td className="py-2.5 pr-3">
                    <div className="font-medium text-slate-900">{signal.label}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      {isMobileFrame ? `${signal.rawDisplay} · ` : ''}
                      <span className={STATUS_TEXT[signal.status]}>{signal.status}</span>
                    </div>
                  </td>
                  {!isMobileFrame && (
                    <td className="py-2.5 px-2 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                      {signal.rawDisplay}
                    </td>
                  )}
                  <td className="py-2.5 px-2 text-right font-mono text-slate-500 tabular-nums whitespace-nowrap">
                    {signal.weightPercent}%
                  </td>
                  <td className="py-2.5 pl-2 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                    {signal.contribution.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Verification & Data Confidence Cross-Signal Checks */}
      <div className="border-t border-slate-100 pt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="text-xs font-semibold text-slate-900">
            Cross-signal verification checks
          </h4>
          <span className="font-mono text-xs text-slate-600 tabular-nums">
            Confidence {dataConfidence}/100 · Exposure cap {Math.round(confidenceHaircutMultiplier * 100)}%
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Status: <strong className="font-semibold text-slate-800">{verificationStatus}</strong>
        </p>

        <ul className="mt-3 divide-y divide-slate-100">
          {verificationChecks.map((check) => (
            <li key={check.id} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-slate-900">{check.label}</span>
                <span className="font-mono text-[11px] tabular-nums shrink-0">
                  <span className={`font-semibold ${CHECK_STATUS_TEXT[check.status]}`}>
                    {check.status}
                  </span>
                  <span className="ml-1.5 text-slate-400">
                    ({check.confidenceImpact >= 0 ? `+${check.confidenceImpact}` : check.confidenceImpact})
                  </span>
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{check.detail}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* 3. Cash-Flow & Affordability Diagnostics */}
      <div className="border-t border-slate-100 pt-5">
        <h4 className="text-xs font-semibold text-slate-900">
          Cash-flow & affordability ratios
        </h4>
        <dl
          className={`mt-3 grid gap-x-4 gap-y-3 ${
            isMobileFrame ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
          }`}
        >
          <div>
            <dt className="text-[11px] text-slate-500">Monthly revenue</dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums">
              {formatINR(monthlyRevenue)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-slate-500">Fixed expenses</dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums">
              {formatINR(monthlyFixedExpenses)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-slate-500">Monthly net surplus</dt>
            <dd
              className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${
                isDeficit ? 'text-red-700' : 'text-emerald-700'
              }`}
            >
              {isDeficit
                ? `-${formatINR(Math.abs(monthlyNetSurplus))}`
                : formatINR(monthlyNetSurplus)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-slate-500">Expense coverage</dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums">
              {expenseCoverageRatio.toFixed(2)}x{' '}
              <span className="text-[11px] font-normal text-slate-500">
                ({Math.round(operatingMarginPercent)}%)
              </span>
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
                : `-${formatINR(Math.abs(requestedDelta))}`}
            </dd>
          </div>
        </dl>
      </div>

      {/* 4. Risk Flags & Guardrails */}
      <div className="border-t border-slate-100 pt-5">
        <h4 className="text-xs font-semibold text-slate-900">
          Risk flags & structuring guardrails
        </h4>
        <ul className="mt-3 divide-y divide-slate-100">
          {riskFlags.map((risk) => (
            <li key={risk.id} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-slate-900">{risk.title}</span>
                <span
                  className={`font-mono text-[11px] font-semibold shrink-0 ${SEVERITY_TEXT[risk.severity]}`}
                >
                  {risk.severity} risk
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-600">{risk.detail}</p>
              <p className="mt-1 text-xs font-medium text-slate-700">
                Guardrail: {risk.mitigant}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
