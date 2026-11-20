import { StabilityBand } from '../types/credit';

interface StabilityGaugeProps {
  score: number;
  band: StabilityBand;
}

const BAND_STYLES: Record<
  StabilityBand,
  { stroke: string; textClass: string; descriptor: string }
> = {
  Strong: {
    stroke: '#047857', // emerald-700
    textClass: 'text-emerald-700',
    descriptor: 'Consistent inflows & healthy repayment headroom',
  },
  Moderate: {
    stroke: '#0f766e', // teal-700
    textClass: 'text-teal-700',
    descriptor: 'Bankable cash-flow with manageable variability',
  },
  Cautious: {
    stroke: '#b45309', // amber-700
    textClass: 'text-amber-700',
    descriptor: 'Right-sized starter limit advised to limit stress',
  },
  Fragile: {
    stroke: '#b91c1c', // red-700
    textClass: 'text-red-700',
    descriptor: 'Thin cash buffer or volatile receipts detected',
  },
};

export function StabilityGauge({ score, band }: StabilityGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 58;
  const circumference = Math.PI * radius; // Semi-circle arc length
  const strokeDashoffset = circumference * (1 - clamped / 100);
  const style = BAND_STYLES[band];

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[94px] w-[156px]">
        <svg
          viewBox="0 0 156 94"
          className="h-full w-full overflow-visible"
          role="img"
          aria-label={`Stability score ${clamped} out of 100, rated ${band}`}
        >
          {/* Background track arc */}
          <path
            d="M 20 78 A 58 58 0 0 1 136 78"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="11"
            strokeLinecap="round"
          />
          {/* Active progress arc */}
          <path
            d="M 20 78 A 58 58 0 0 1 136 78"
            fill="none"
            stroke={style.stroke}
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-[stroke-dashoffset,stroke] duration-300 ease-out"
          />
        </svg>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center">
          <div className="flex items-baseline gap-0.5">
            <span className="font-mono text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
              {clamped}
            </span>
            <span className="font-mono text-xs font-medium text-slate-400 tabular-nums">
              /100
            </span>
          </div>
          <span className={`text-xs font-semibold ${style.textClass}`}>
            {band} Stability
          </span>
        </div>
      </div>
    </div>
  );
}

export function getStabilityDescriptor(band: StabilityBand): string {
  return BAND_STYLES[band].descriptor;
}
