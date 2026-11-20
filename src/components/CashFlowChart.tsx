import { CreditAssessment } from '../types/credit';
import { formatINR } from '../utils/format';

interface CashFlowChartProps {
  assessment: CreditAssessment;
  baselineAssessment?: CreditAssessment;
  isStressed?: boolean;
}

interface BarRow {
  id: string;
  label: string;
  sublabel: string;
  value: number;
  baselineValue?: number;
  barColor: string;
  valueColor: string;
  secondaryMarkerValue?: number;
  secondaryMarkerLabel?: string;
}

export function CashFlowChart({
  assessment,
  baselineAssessment,
  isStressed = false,
}: CashFlowChartProps) {
  const {
    effectiveSignals,
    monthlyNetSurplus,
    maxSafeMonthlyEmi,
    maxEmiRatioPercent,
    estimatedMonthlyEmi,
  } = assessment;

  const baseSignals = baselineAssessment?.effectiveSignals;
  const baseSurplus = baselineAssessment?.monthlyNetSurplus;
  const baseSafeEmi = baselineAssessment?.maxSafeMonthlyEmi;

  // Compute unified scale across current and baseline figures so stress contractions are visually proportional
  const maxScale = Math.max(
    10000,
    effectiveSignals.avgMonthlyInflow,
    effectiveSignals.avgMonthlyOutflow,
    Math.abs(monthlyNetSurplus),
    maxSafeMonthlyEmi,
    baseSignals?.avgMonthlyInflow ?? 0,
    baseSignals?.avgMonthlyOutflow ?? 0
  );

  const isDeficit = monthlyNetSurplus < 0;

  const rows: BarRow[] = [
    {
      id: 'inflow',
      label: 'Verified Avg Monthly Inflow',
      sublabel: 'AA bank credits',
      value: effectiveSignals.avgMonthlyInflow,
      baselineValue: isStressed ? baseSignals?.avgMonthlyInflow : undefined,
      barColor: 'bg-teal-700',
      valueColor: 'text-slate-900',
    },
    {
      id: 'outflow',
      label: 'Verified Avg Monthly Outflow',
      sublabel: 'Operating debits & bills',
      value: effectiveSignals.avgMonthlyOutflow,
      baselineValue: isStressed ? baseSignals?.avgMonthlyOutflow : undefined,
      barColor: 'bg-slate-500',
      valueColor: 'text-slate-800',
    },
    {
      id: 'surplus',
      label: 'Monthly Net Surplus',
      sublabel: isDeficit ? 'Cash-flow deficit' : 'Inflow minus outflow',
      value: monthlyNetSurplus,
      baselineValue: isStressed ? baseSurplus : undefined,
      barColor: isDeficit ? 'bg-red-600' : 'bg-emerald-600',
      valueColor: isDeficit ? 'text-red-700' : 'text-emerald-700',
    },
    {
      id: 'safe-emi',
      label: `Safe EMI Cap (${maxEmiRatioPercent}% of Surplus)`,
      sublabel:
        estimatedMonthlyEmi > 0
          ? `Est. EMI: ${formatINR(estimatedMonthlyEmi)}/mo`
          : 'No eligible monthly EMI',
      value: maxSafeMonthlyEmi,
      baselineValue: isStressed ? baseSafeEmi : undefined,
      barColor: 'bg-amber-600',
      valueColor: 'text-amber-800',
      secondaryMarkerValue: estimatedMonthlyEmi > 0 ? estimatedMonthlyEmi : undefined,
      secondaryMarkerLabel: `Est. EMI ${formatINR(estimatedMonthlyEmi)}`,
    },
  ];

  return (
    <section aria-labelledby="cashflow-chart-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 id="cashflow-chart-heading" className="text-sm font-semibold text-slate-900">
            Cash-Flow & Repayment Capacity
          </h3>
          <p className="text-xs text-slate-500">
            Verified monthly inflow, outflow, net surplus, and deterministic EMI ceiling
          </p>
        </div>
        {isStressed && (
          <span className="font-mono text-[11px] font-semibold text-amber-800">
            Stress Scenario Active (dashed tick = baseline)
          </span>
        )}
      </div>

      <div className="mt-4 space-y-3.5">
        {rows.map((row) => {
          const absVal = Math.max(0, Math.abs(row.value));
          const widthPct = Math.min(100, Math.max(absVal > 0 ? 2 : 0, (absVal / maxScale) * 100));
          const basePct =
            row.baselineValue !== undefined
              ? Math.min(100, Math.max(0, (Math.max(0, row.baselineValue) / maxScale) * 100))
              : null;
          const markerPct =
            row.secondaryMarkerValue !== undefined
              ? Math.min(100, Math.max(0, (row.secondaryMarkerValue / maxScale) * 100))
              : null;

          const delta =
            row.baselineValue !== undefined ? row.value - row.baselineValue : 0;

          return (
            <div key={row.id} className="space-y-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <span className="font-medium text-slate-800">{row.label}</span>
                  <span className="ml-1.5 text-[11px] text-slate-500">· {row.sublabel}</span>
                </div>
                <div className="shrink-0 font-mono font-semibold tabular-nums">
                  <span className={row.valueColor}>
                    {row.value < 0
                      ? `-${formatINR(Math.abs(row.value))}`
                      : formatINR(row.value)}
                  </span>
                  {row.baselineValue !== undefined && delta !== 0 && (
                    <span className="ml-1.5 text-[11px] font-medium text-slate-500">
                      (vs {formatINR(row.baselineValue)})
                    </span>
                  )}
                </div>
              </div>

              <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100">
                {/* Active Value Bar */}
                <div
                  className={`h-full rounded-full transition-all duration-300 ${row.barColor}`}
                  style={{ width: `${widthPct}%` }}
                />

                {/* Actual Estimated EMI marker inside Safe EMI Cap bar */}
                {markerPct !== null && markerPct > 0 && (
                  <div
                    className="pointer-events-none absolute inset-y-0 w-0.5 bg-slate-900"
                    style={{ left: `${markerPct}%` }}
                    title={row.secondaryMarkerLabel}
                  />
                )}

                {/* Baseline ghost tick during Lender Stress-Test */}
                {basePct !== null && Math.abs(basePct - widthPct) >= 1 && (
                  <div
                    className="pointer-events-none absolute inset-y-0 w-0.5 border-r-2 border-dashed border-slate-700/70"
                    style={{ left: `${basePct}%` }}
                    title={`Baseline: ${formatINR(row.baselineValue ?? 0)}`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Concise Legend */}
      <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-xs bg-teal-700" aria-hidden="true" />
          Inflow
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-xs bg-slate-500" aria-hidden="true" />
          Outflow
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-xs bg-emerald-600" aria-hidden="true" />
          Net Surplus
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-xs bg-amber-600" aria-hidden="true" />
          Safe EMI Cap
        </span>
        {estimatedMonthlyEmi > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-0.5 bg-slate-900" aria-hidden="true" />
            Est. EMI ({formatINR(estimatedMonthlyEmi)}/mo)
          </span>
        )}
      </div>
    </section>
  );
}
