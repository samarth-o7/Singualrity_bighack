import React from 'react';
import { formatIndianNumber } from '../utils/format';

interface RangeNumberFieldProps {
  id: string;
  label: string;
  helperText?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
  minLabel?: string;
  maxLabel?: string;
  onChange: (value: number) => void;
}

export function RangeNumberField({
  id,
  label,
  helperText,
  value,
  min,
  max,
  step,
  prefix,
  suffix,
  minLabel,
  maxLabel,
  onChange,
}: RangeNumberFieldProps) {
  const clamped = Math.min(max, Math.max(min, value));
  const fillPercent = max > min ? ((clamped - min) / (max - min)) * 100 : 0;

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange(min);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) {
      onChange(Math.min(max, Math.max(0, parsed)));
    }
  };

  const handleNumberBlur = () => {
    if (value < min) onChange(min);
    if (value > max) onChange(max);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <label htmlFor={`${id}-input`} className="block text-sm font-medium text-slate-800">
            {label}
          </label>
          {helperText && <p className="text-xs text-slate-500">{helperText}</p>}
        </div>

        <div className="flex shrink-0 items-center rounded-md border border-slate-300 bg-white px-2.5 py-1.5 focus-within:border-teal-700 focus-within:ring-2 focus-within:ring-teal-600/20">
          {prefix && (
            <span className="mr-1 font-mono text-xs font-medium text-slate-500 select-none">
              {prefix}
            </span>
          )}
          <input
            id={`${id}-input`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleNumberChange}
            onBlur={handleNumberBlur}
            className="w-20 bg-transparent text-right font-mono text-sm font-semibold text-slate-900 tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          {suffix && (
            <span className="ml-1 font-mono text-xs font-medium text-slate-500 select-none">
              {suffix}
            </span>
          )}
        </div>
      </div>

      <div className="relative flex items-center pt-0.5">
        <input
          id={`${id}-slider`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={clamped}
          aria-label={label}
          onChange={(e) => onChange(Number(e.target.value))}
          className="credit-slider w-full"
          style={{
            background: `linear-gradient(to right, #0f766e 0%, #0f766e ${fillPercent}%, #e2e8f0 ${fillPercent}%, #e2e8f0 100%)`,
            borderRadius: '9999px',
            height: '6px',
          }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums">
        <span>{minLabel ?? `${prefix ?? ''}${formatIndianNumber(min)}${suffix ?? ''}`}</span>
        <span>{maxLabel ?? `${prefix ?? ''}${formatIndianNumber(max)}${suffix ?? ''}`}</span>
      </div>
    </div>
  );
}
