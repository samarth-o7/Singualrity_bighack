import { FluctuationLevel, MSMEInputs, MSMEPreset, PresetId } from '../types/credit';
import { formatINR } from '../utils/format';
import { PresetSelector } from './PresetSelector';
import { RangeNumberField } from './RangeNumberField';

interface InputPanelProps {
  presets: MSMEPreset[];
  activePreset: MSMEPreset;
  activePresetId: PresetId;
  isCustomized: boolean;
  inputs: MSMEInputs;
  monthlyRevenue: number;
  monthlyNetSurplus: number;
  isMobileFrame: boolean;
  onSelectPreset: (preset: MSMEPreset) => void;
  onResetPreset: () => void;
  onChangeInput: <K extends keyof MSMEInputs>(key: K, value: MSMEInputs[K]) => void;
}

const FLUCTUATION_OPTIONS: { value: FluctuationLevel; caption: string }[] = [
  { value: 'Low', caption: 'Steady daily sales' },
  { value: 'Medium', caption: 'Seasonal swings' },
  { value: 'High', caption: 'Irregular receipts' },
];

export function InputPanel({
  presets,
  activePreset,
  activePresetId,
  isCustomized,
  inputs,
  monthlyRevenue,
  monthlyNetSurplus,
  isMobileFrame,
  onSelectPreset,
  onResetPreset,
  onChangeInput,
}: InputPanelProps) {
  const isDeficit = monthlyNetSurplus <= 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {/* Top Section: Presets */}
      <div className="p-5 sm:p-6">
        <PresetSelector
          presets={presets}
          activePresetId={activePresetId}
          isCustomized={isCustomized}
          isMobileFrame={isMobileFrame}
          onSelectPreset={onSelectPreset}
          onResetPreset={onResetPreset}
        />

        {/* Quiet active merchant context line */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span>
            Active profile: <strong className="font-semibold text-slate-800">{activePreset.businessName}</strong>
            {isCustomized ? ' · Adjusted' : ''}
          </span>
          <span className="text-slate-400">{activePreset.sectorNote}</span>
        </div>
      </div>

      <div className="border-t border-slate-200" />

      {/* Cash-flow & Credit Request Parameters */}
      <div className="space-y-6 p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Operating Cash-Flow & Loan Inputs
          </h2>
          <span className="text-xs text-slate-500">Live updates</span>
        </div>

        {/* 1. Daily Sales */}
        <RangeNumberField
          id="daily-sales"
          label="Daily sales"
          helperText="Average gross cash + digital collections per open day"
          value={inputs.dailySales}
          min={500}
          max={25000}
          step={100}
          prefix="₹"
          minLabel="₹500"
          maxLabel="₹25,000"
          onChange={(v) => onChangeInput('dailySales', v)}
        />

        {/* 2. Operating Days / Week */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="block text-sm font-medium text-slate-800">
                Operating days / week
              </span>
              <p className="text-xs text-slate-500">Typical active trading days per week</p>
            </div>
            <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
              {inputs.operatingDaysPerWeek} {inputs.operatingDaysPerWeek === 1 ? 'day' : 'days'}
            </span>
          </div>
          <div
            className="grid grid-cols-7 gap-1.5"
            role="group"
            aria-label="Operating days per week"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const selected = inputs.operatingDaysPerWeek === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => onChangeInput('operatingDaysPerWeek', day)}
                  aria-pressed={selected}
                  className={`h-10 rounded-md border font-mono text-sm font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                    selected
                      ? 'border-teal-700 bg-teal-700 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. UPI Payment Share */}
        <RangeNumberField
          id="upi-share"
          label="UPI payment share"
          helperText="Percentage of sales settled through UPI QR or digital apps"
          value={inputs.upiShare}
          min={0}
          max={100}
          step={1}
          suffix="%"
          minLabel="0%"
          maxLabel="100%"
          onChange={(v) => onChangeInput('upiShare', v)}
        />

        {/* 4. Cash-flow Fluctuation */}
        <div className="space-y-2">
          <div>
            <span className="block text-sm font-medium text-slate-800">
              Cash-flow fluctuation
            </span>
            <p className="text-xs text-slate-500">Week-to-week revenue variability</p>
          </div>
          <div
            className="grid grid-cols-3 gap-2"
            role="group"
            aria-label="Cash-flow fluctuation level"
          >
            {FLUCTUATION_OPTIONS.map((option) => {
              const selected = inputs.cashFlowFluctuation === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChangeInput('cashFlowFluctuation', option.value)}
                  aria-pressed={selected}
                  className={`flex flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                    selected
                      ? 'border-teal-700 bg-teal-50/70 text-teal-950'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-semibold">{option.value}</span>
                  <span className="mt-0.5 text-[11px] text-slate-500 leading-tight">
                    {option.caption}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Payment Consistency */}
        <RangeNumberField
          id="payment-consistency"
          label="Payment consistency"
          helperText="On-time rate for rent, electricity bills, and supplier payouts"
          value={inputs.paymentConsistency}
          min={0}
          max={100}
          step={1}
          suffix="%"
          minLabel="0%"
          maxLabel="100%"
          onChange={(v) => onChangeInput('paymentConsistency', v)}
        />

        {/* 6. Monthly Fixed Expenses */}
        <RangeNumberField
          id="fixed-expenses"
          label="Monthly fixed expenses"
          helperText="Shop rent, helpers, utilities, and recurring overhead"
          value={inputs.monthlyFixedExpenses}
          min={2000}
          max={200000}
          step={500}
          prefix="₹"
          minLabel="₹2,000"
          maxLabel="₹2,00,000"
          onChange={(v) => onChangeInput('monthlyFixedExpenses', v)}
        />

        {/* 7. Requested Loan */}
        <RangeNumberField
          id="requested-loan"
          label="Requested loan amount"
          helperText="Working capital or equipment credit requested by the MSME"
          value={inputs.requestedLoan}
          min={10000}
          max={500000}
          step={5000}
          prefix="₹"
          minLabel="₹10,000"
          maxLabel="₹5,00,000"
          onChange={(v) => onChangeInput('requestedLoan', v)}
        />
      </div>

      {/* Derived Monthly Cash-Flow Baseline Footer Strip */}
      <div className="border-t border-slate-200 bg-slate-50/80 px-5 py-4 sm:px-6 rounded-b-xl">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500">Est. monthly gross sales</p>
            <p className="mt-0.5 font-mono text-base font-semibold text-slate-900 tabular-nums">
              {formatINR(monthlyRevenue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Est. monthly net surplus</p>
            <p
              className={`mt-0.5 font-mono text-base font-semibold tabular-nums ${
                isDeficit ? 'text-red-700' : 'text-emerald-700'
              }`}
            >
              {monthlyNetSurplus < 0
                ? `-${formatINR(Math.abs(monthlyNetSurplus))}`
                : formatINR(monthlyNetSurplus)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
