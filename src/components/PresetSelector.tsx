import { MSMEPreset, PresetId } from '../types/credit';
import { formatCompactINR } from '../utils/format';

interface PresetSelectorProps {
  presets: MSMEPreset[];
  activePresetId: PresetId;
  isCustomized: boolean;
  isMobileFrame: boolean;
  onSelectPreset: (preset: MSMEPreset) => void;
  onResetPreset: () => void;
}

export function PresetSelector({
  presets,
  activePresetId,
  isCustomized,
  isMobileFrame,
  onSelectPreset,
  onResetPreset,
}: PresetSelectorProps) {
  return (
    <section aria-labelledby="presets-heading">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 id="presets-heading" className="text-sm font-semibold text-slate-900">
            Indian MSME Presets
          </h2>
          <p className="text-xs text-slate-500">
            Select a synthetic merchant profile to pre-fill cash-flow parameters
          </p>
        </div>
        {isCustomized && (
          <button
            type="button"
            onClick={onResetPreset}
            className="shrink-0 rounded-md px-2.5 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50 hover:text-teal-800 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            Reset preset
          </button>
        )}
      </div>

      <div className={isMobileFrame ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-1 gap-2.5 sm:grid-cols-2'}>
        {presets.map((preset) => {
          const isSelected = preset.id === activePresetId;
          const estMonthly = preset.inputs.dailySales * preset.inputs.operatingDaysPerWeek * 4.33;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              aria-pressed={isSelected}
              className={`group flex flex-col items-start rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                isSelected
                  ? 'border-teal-700 bg-teal-50/60 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50/80'
              }`}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900 truncate">
                  {preset.label}
                </span>
                <span className="font-mono text-xs font-medium text-slate-600 tabular-nums shrink-0">
                  {formatCompactINR(estMonthly)}/mo
                </span>
              </div>
              <span className="mt-1 text-xs text-slate-600 truncate w-full">
                {preset.businessName}
              </span>
              <span className="mt-0.5 text-[11px] text-slate-500 truncate w-full">
                {preset.location} · {preset.inputs.upiShare}% UPI · {preset.inputs.cashFlowFluctuation} var.
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
