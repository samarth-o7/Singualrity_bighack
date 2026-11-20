import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { CreditAssessment, StressTestScenario } from '../types/credit';
import { DEFAULT_STRESS_SCENARIO } from '../utils/creditModel';
import { formatINR } from '../utils/format';
import { RangeNumberField } from './RangeNumberField';

interface StressTestPanelProps {
  scenario: StressTestScenario;
  baseline: CreditAssessment;
  stressed: CreditAssessment;
  isMobileFrame: boolean;
  onScenarioChange: (scenario: StressTestScenario) => void;
}

export function isStressActive(scenario: StressTestScenario): boolean {
  return (
    scenario.inflowDipPercent > 0 ||
    scenario.additionalNachBounces > 0 ||
    scenario.outflowShockPercent > 0 ||
    scenario.bbpsDropPoints > 0
  );
}

export function StressTestPanel({
  scenario,
  baseline,
  stressed,
  isMobileFrame,
  onScenarioChange,
}: StressTestPanelProps) {
  const active = isStressActive(scenario);
  const scoreDelta = stressed.stabilityScore - baseline.stabilityScore;
  const loanDelta = stressed.recommendedLoanAmount - baseline.recommendedLoanAmount;

  const togglePreset = (patch: Partial<StressTestScenario>) => {
    const matchesAll = Object.entries(patch).every(
      ([k, v]) => scenario[k as keyof StressTestScenario] === v
    );
    if (matchesAll) {
      const resetPatch: Partial<StressTestScenario> = {};
      for (const k of Object.keys(patch)) {
        resetPatch[k as keyof StressTestScenario] = 0;
      }
      onScenarioChange({ ...scenario, ...resetPatch });
    } else {
      onScenarioChange({ ...scenario, ...patch });
    }
  };

  const handleField = <K extends keyof StressTestScenario>(
    key: K,
    value: StressTestScenario[K]
  ) => {
    onScenarioChange({
      ...scenario,
      [key]: value,
    });
  };

  return (
    <section
      aria-labelledby="stress-test-heading"
      className="rounded-xl border border-slate-300 bg-slate-50/90 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <SlidersHorizontal
            className="mt-0.5 h-4 w-4 shrink-0 text-teal-800"
            aria-hidden="true"
          />
          <div>
            <h3 id="stress-test-heading" className="text-sm font-bold text-slate-900">
              Lender Stress-Test Simulator
            </h3>
            <p className="text-xs text-slate-600">
              Lender-only downside testing — simulate lean-month shocks to inspect deterministic
              knock-out triggers and exposure caps
            </p>
          </div>
        </div>

        {active && (
          <button
            type="button"
            onClick={() => onScenarioChange({ ...DEFAULT_STRESS_SCENARIO })}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            <span>Reset Baseline</span>
          </button>
        )}
      </div>

      {/* Quick Scenario Toggle Buttons */}
      <div className="mt-3.5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => togglePreset({ inflowDipPercent: 25 })}
          aria-pressed={scenario.inflowDipPercent === 25}
          className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
            scenario.inflowDipPercent === 25
              ? 'border-amber-600 bg-amber-50 text-amber-950'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
          }`}
        >
          25% Lean-Month Inflow Dip
        </button>

        <button
          type="button"
          onClick={() => togglePreset({ additionalNachBounces: 2 })}
          aria-pressed={scenario.additionalNachBounces === 2}
          className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
            scenario.additionalNachBounces === 2
              ? 'border-red-600 bg-red-50 text-red-950'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
          }`}
        >
          Simulate +2 NACH Bounces
        </button>

        <button
          type="button"
          onClick={() => togglePreset({ outflowShockPercent: 15 })}
          aria-pressed={scenario.outflowShockPercent === 15}
          className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
            scenario.outflowShockPercent === 15
              ? 'border-amber-600 bg-amber-50 text-amber-950'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
          }`}
        >
          15% Outflow / Cost Spike
        </button>

        <button
          type="button"
          onClick={() =>
            onScenarioChange({
              inflowDipPercent: 25,
              additionalNachBounces: 2,
              outflowShockPercent: 10,
              bbpsDropPoints: 10,
            })
          }
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
        >
          Severe Combined Downside
        </button>
      </div>

      {/* Fine-Grained Downside Sliders */}
      <div
        className={`mt-4 grid gap-4 border-t border-slate-200 pt-4 ${
          isMobileFrame ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
        }`}
      >
        <RangeNumberField
          id="stress-inflow-dip"
          label="Lean-month inflow dip"
          value={scenario.inflowDipPercent}
          min={0}
          max={50}
          step={5}
          suffix="%"
          minLabel="0%"
          maxLabel="-50%"
          onChange={(v) => handleField('inflowDipPercent', v)}
        />

        <RangeNumberField
          id="stress-nach-bounces"
          label="Additional NACH bounces"
          value={scenario.additionalNachBounces}
          min={0}
          max={4}
          step={1}
          prefix="+"
          minLabel="+0"
          maxLabel="+4"
          onChange={(v) => handleField('additionalNachBounces', v)}
        />

        <RangeNumberField
          id="stress-outflow-shock"
          label="Outflow / expense spike"
          value={scenario.outflowShockPercent}
          min={0}
          max={35}
          step={5}
          suffix="%"
          minLabel="0%"
          maxLabel="+35%"
          onChange={(v) => handleField('outflowShockPercent', v)}
        />

        <RangeNumberField
          id="stress-bbps-drop"
          label="BBPS utility timeliness drop"
          value={scenario.bbpsDropPoints}
          min={0}
          max={30}
          step={5}
          prefix="-"
          suffix="%"
          minLabel="0%"
          maxLabel="-30%"
          onChange={(v) => handleField('bbpsDropPoints', v)}
        />
      </div>

      {/* Live Baseline vs. Stressed Comparison Strip */}
      <div className="mt-4 border-t border-slate-200 pt-3.5">
        <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-600">
          <span>{active ? 'Live Stress Impact vs. Baseline' : 'Baseline (No Stress Applied)'}</span>
          <span className="font-mono tabular-nums text-slate-500">
            100% deterministic recalculation
          </span>
        </div>

        <dl
          className={`mt-2 grid gap-3 text-xs ${
            isMobileFrame ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'
          }`}
        >
          <div className="rounded-lg border border-slate-200 bg-white p-2.5">
            <dt className="text-[11px] text-slate-500">Stability score</dt>
            <dd className="mt-0.5 font-mono font-bold text-slate-900 tabular-nums">
              {baseline.stabilityScore}
              {active && (
                <span className={scoreDelta < 0 ? ' text-red-700' : ' text-slate-700'}>
                  {' '}
                  → {stressed.stabilityScore} ({scoreDelta})
                </span>
              )}
            </dd>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-2.5">
            <dt className="text-[11px] text-slate-500">Readiness tier</dt>
            <dd className="mt-0.5 font-semibold text-slate-900">
              {baseline.readinessTier}
              {active && stressed.readinessTier !== baseline.readinessTier && (
                <span className="text-red-700"> → {stressed.readinessTier}</span>
              )}
            </dd>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-2.5">
            <dt className="text-[11px] text-slate-500">Knock-out status</dt>
            <dd
              className={`mt-0.5 font-semibold ${
                stressed.knockOutTriggered ? 'text-red-700' : 'text-emerald-700'
              }`}
            >
              {stressed.knockOutTriggered ? 'Triggered' : 'Clear'}
            </dd>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-2.5">
            <dt className="text-[11px] text-slate-500">Safe loan limit</dt>
            <dd className="mt-0.5 font-mono font-bold text-slate-900 tabular-nums">
              {formatINR(stressed.recommendedLoanAmount)}
              {active && loanDelta !== 0 && (
                <span className="block text-[10px] font-medium text-red-700">
                  {loanDelta < 0 ? `-${formatINR(Math.abs(loanDelta))}` : `+${formatINR(loanDelta)}`}
                </span>
              )}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
