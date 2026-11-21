import {
  ArrowLeftRight,
  Briefcase,
  LogOut,
  Monitor,
  Smartphone,
  User,
} from 'lucide-react';
import { AppRoute, ViewMode } from '../types/credit';

interface HeaderProps {
  route: AppRoute;
  viewMode: ViewMode;
  isBorrowerAuthenticated: boolean;
  isLenderAuthenticated: boolean;
  queueCount: number;
  hasBorrowerSubmission: boolean;
  onGoHome: () => void;
  onSwitchRole: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onLogout: () => void;
}

export function Header({
  route,
  viewMode,
  isBorrowerAuthenticated,
  isLenderAuthenticated,
  queueCount,
  hasBorrowerSubmission,
  onGoHome,
  onSwitchRole,
  onViewModeChange,
  onLogout,
}: HeaderProps) {
  const canLogout =
    (route === 'borrower' && isBorrowerAuthenticated) ||
    (route === 'lender' && isLenderAuthenticated);

  const activeRoleLabel =
    route === 'borrower'
      ? 'Borrower Portal'
      : route === 'lender'
        ? 'Lender Portal'
        : 'Select Portal';

  const switchRoleLabel =
    route === 'borrower'
      ? `Switch to Lender (${queueCount})`
      : route === 'lender'
        ? 'Switch to Borrower'
        : 'Switch Role';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* Left Zone: Brand Logo (returns to Home) + Active Role Indicator + Synthetic Data Badge */}
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onGoHome}
            className="group flex items-center gap-2.5 rounded-lg py-0.5 text-left transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            title="Return to Pravah Credit Home"
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white transition-transform duration-150 group-hover:scale-[1.03] group-active:scale-95"
              aria-hidden="true"
            >
              P
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
              Pravah Credit
            </span>
          </button>

          <span
            className="inline-flex shrink-0 items-center rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 whitespace-nowrap"
            role="status"
          >
            Synthetic Data Demo
          </span>

          <div className="hidden items-center gap-1.5 text-xs text-slate-500 md:inline-flex whitespace-nowrap">
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            {route === 'borrower' ? (
              <User className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
            ) : route === 'lender' ? (
              <Briefcase className="h-3.5 w-3.5 text-slate-700" aria-hidden="true" />
            ) : null}
            <span className="font-semibold text-slate-800">{activeRoleLabel}</span>
            {route === 'lender' && hasBorrowerSubmission && (
              <span className="font-mono text-[11px] font-medium text-teal-700">
                (1 live submission)
              </span>
            )}
          </div>
        </div>

        {/* Right Zone: Switch Role + Desktop / Mobile (390px) Toggle + Logout */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {route !== 'landing' && (
            <button
              type="button"
              onClick={onSwitchRole}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-all duration-150 hover:border-teal-600 hover:bg-teal-50/50 hover:text-teal-900 active:scale-[0.98] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 text-teal-700" aria-hidden="true" />
              <span>{switchRoleLabel}</span>
            </button>
          )}

          {/* Desktop / Mobile (390px) Frame Toggle */}
          <div
            className="inline-flex shrink-0 items-center rounded-lg border border-slate-200 bg-slate-100 p-1"
            role="group"
            aria-label="Viewport preview frame"
          >
            <button
              type="button"
              onClick={() => onViewModeChange('desktop')}
              aria-pressed={viewMode === 'desktop'}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
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
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                viewMode === 'mobile'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Mobile (390px)</span>
            </button>
          </div>

          {canLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-all duration-150 hover:border-red-200 hover:bg-red-50 hover:text-red-800 active:scale-[0.98] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
