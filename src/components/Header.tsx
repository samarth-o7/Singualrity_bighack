import { Briefcase, Monitor, Smartphone, User } from 'lucide-react';
import { RoleMode, ViewMode } from '../types/credit';

interface HeaderProps {
  roleMode: RoleMode;
  viewMode: ViewMode;
  queueCount: number;
  hasBorrowerSubmission: boolean;
  onRoleModeChange: (role: RoleMode) => void;
  onViewModeChange: (mode: ViewMode) => void;
}

export function Header({
  roleMode,
  viewMode,
  queueCount,
  hasBorrowerSubmission,
  onRoleModeChange,
  onViewModeChange,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* Left: Brand + Synthetic Data Badge */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white"
              aria-hidden="true"
            >
              P
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
                Pravah Credit
              </span>
              <span className="hidden text-xs text-slate-500 xl:inline whitespace-nowrap">
                Problem F2 · Credit for the credit-invisible
              </span>
            </div>
          </div>

          <span
            className="inline-flex shrink-0 items-center rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 whitespace-nowrap"
            role="status"
          >
            Synthetic Data Demo
          </span>
        </div>

        {/* Right: Role Switcher (Borrower View | Lender View) + Desktop / Mobile Frame Toggle */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Role Switcher */}
          <div
            className="inline-flex shrink-0 items-center rounded-lg border border-slate-200 bg-slate-100 p-1"
            role="tablist"
            aria-label="Workspace role switcher"
          >
            <button
              type="button"
              role="tab"
              aria-selected={roleMode === 'borrower'}
              onClick={() => onRoleModeChange('borrower')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                roleMode === 'borrower'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Borrower View</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={roleMode === 'lender'}
              onClick={() => onRoleModeChange('lender')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                roleMode === 'lender'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Lender View</span>
              <span
                className={`ml-0.5 font-mono text-[11px] tabular-nums ${
                  roleMode === 'lender'
                    ? 'text-teal-100'
                    : hasBorrowerSubmission
                      ? 'text-teal-700 font-semibold'
                      : 'text-slate-500'
                }`}
              >
                ({queueCount})
              </span>
            </button>
          </div>

          {/* Desktop / Mobile Frame Toggle */}
          <div
            className="inline-flex shrink-0 items-center rounded-lg border border-slate-200 bg-slate-100 p-1"
            role="group"
            aria-label="Viewport preview frame"
          >
            <button
              type="button"
              onClick={() => onViewModeChange('desktop')}
              aria-pressed={viewMode === 'desktop'}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                viewMode === 'desktop'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Monitor className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('mobile')}
              aria-pressed={viewMode === 'mobile'}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                viewMode === 'mobile'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Mobile Frame</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
