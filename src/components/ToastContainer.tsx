import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ToastItem, ToastVariant } from '../types/credit';

interface ToastContainerProps {
  toasts: ToastItem[];
  isMobileFrame: boolean;
  onDismiss: (id: string) => void;
}

const VARIANT_STYLES: Record<
  ToastVariant,
  { border: string; iconColor: string; Icon: typeof CheckCircle2 }
> = {
  success: {
    border: 'border-emerald-200 bg-white',
    iconColor: 'text-emerald-700',
    Icon: CheckCircle2,
  },
  info: {
    border: 'border-teal-200 bg-white',
    iconColor: 'text-teal-700',
    Icon: Info,
  },
  warning: {
    border: 'border-amber-200 bg-white',
    iconColor: 'text-amber-700',
    Icon: AlertTriangle,
  },
};

export function ToastContainer({
  toasts,
  isMobileFrame,
  onDismiss,
}: ToastContainerProps) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className={
        isMobileFrame
          ? 'pointer-events-none absolute inset-x-3 bottom-3 z-50 flex flex-col gap-2'
          : 'pointer-events-none fixed right-5 bottom-5 z-50 flex w-full max-w-sm flex-col gap-2.5'
      }
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const { border, iconColor, Icon } = VARIANT_STYLES[toast.variant];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              role="status"
              className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border p-3.5 shadow-lg shadow-slate-900/8 ${border}`}
            >
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900">{toast.title}</p>
                {toast.description && (
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-600">
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="Dismiss notification"
                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
