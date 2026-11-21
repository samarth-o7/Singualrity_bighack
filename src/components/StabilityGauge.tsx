import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ReadinessTier } from '../types/credit';

interface StabilityGaugeProps {
  score: number;
  tier: ReadinessTier;
}

const TIER_STYLES: Record<
  ReadinessTier,
  { stroke: string; textClass: string; descriptor: string }
> = {
  Strong: {
    stroke: '#047857', // emerald-700
    textClass: 'text-emerald-700',
    descriptor: 'Consistent cash inflows and comfortable expense coverage',
  },
  Moderate: {
    stroke: '#0f766e', // teal-700
    textClass: 'text-teal-700',
    descriptor: 'Bankable cash-flow rhythm with manageable variability',
  },
  Watchlist: {
    stroke: '#b45309', // amber-700
    textClass: 'text-amber-700',
    descriptor: 'Thin surplus cushion or elevated volatility — starter tranche advised',
  },
};

export function StabilityGauge({ score, tier }: StabilityGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const [displayScore, setDisplayScore] = useState<number>(0);
  const previousRef = useRef<number>(0);

  useEffect(() => {
    const startVal = previousRef.current;
    const endVal = clamped;
    const duration = 520;
    let rafId = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextVal = Math.round(startVal + (endVal - startVal) * eased);
      setDisplayScore(nextVal);
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        previousRef.current = endVal;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      previousRef.current = clamped;
    };
  }, [clamped]);

  const radius = 58;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference * (1 - clamped / 100);
  const style = TIER_STYLES[tier];

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[94px] w-[156px]">
        <svg
          viewBox="0 0 156 94"
          className="h-full w-full overflow-visible"
          role="img"
          aria-label={`Stability score ${clamped} out of 100, readiness tier ${tier}`}
        >
          <path
            d="M 20 78 A 58 58 0 0 1 136 78"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="11"
            strokeLinecap="round"
          />
          <motion.path
            d="M 20 78 A 58 58 0 0 1 136 78"
            fill="none"
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference, stroke: style.stroke }}
            animate={{ strokeDashoffset, stroke: style.stroke }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center">
          <div className="flex items-baseline gap-0.5">
            <span className="font-mono text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
              {displayScore}
            </span>
            <span className="font-mono text-xs font-medium text-slate-400 tabular-nums">
              /100
            </span>
          </div>
          <span className={`text-xs font-semibold ${style.textClass}`}>
            {tier} Readiness
          </span>
        </div>
      </div>
    </div>
  );
}

export function getReadinessDescriptor(tier: ReadinessTier): string {
  return TIER_STYLES[tier].descriptor;
}
