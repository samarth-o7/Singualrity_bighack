import { ArrowRight, Briefcase, Lock, ShieldCheck, Store } from 'lucide-react';
import { motion } from 'motion/react';

interface LandingScreenProps {
  isMobileFrame: boolean;
  isBorrowerAuthenticated: boolean;
  isLenderAuthenticated: boolean;
  queueCount: number;
  hasBorrowerSubmission: boolean;
  onSelectBorrower: () => void;
  onSelectLender: () => void;
}

export function LandingScreen({
  isMobileFrame,
  isBorrowerAuthenticated,
  isLenderAuthenticated,
  queueCount,
  hasBorrowerSubmission,
  onSelectBorrower,
  onSelectLender,
}: LandingScreenProps) {
  return (
    <div className={isMobileFrame ? 'space-y-5 py-1' : 'mx-auto max-w-[1040px] py-8 sm:py-12'}>
      {/* Hero Headline */}
      <div className={isMobileFrame ? 'space-y-2' : 'max-w-2xl space-y-3'}>
        <p className="text-xs font-semibold text-teal-800">
          Problem F2 · Credit for the credit-invisible
        </p>
        <h1
          className={
            isMobileFrame
              ? 'text-xl font-bold tracking-tight text-slate-900 text-balance'
              : 'text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl text-balance'
          }
        >
          Cash-flow credit readiness for India&apos;s micro-businesses
        </h1>
        <p
          className={
            isMobileFrame
              ? 'text-xs leading-relaxed text-slate-600'
              : 'text-sm leading-relaxed text-slate-600 sm:text-base'
          }
        >
          Pravah Credit replaces manual self-reporting with revocable RBI Account Aggregator
          signals and 100% deterministic underwriting—sizing fair Periodic Instalments strictly to
          verified repayment capacity.
        </p>
      </div>

      {/* Two Interactive Role Portal Cards */}
      <div
        className={`mt-6 grid gap-4 ${
          isMobileFrame ? 'grid-cols-1' : 'mt-8 grid-cols-1 items-stretch md:grid-cols-2 md:gap-6'
        }`}
      >
        {/* Borrower Portal Card */}
        <motion.button
          type="button"
          onClick={onSelectBorrower}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.99 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-teal-600 hover:shadow-md hover:shadow-teal-900/5 sm:p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
        >
          <div>
            <div className="flex items-center justify-between gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-700/10 text-teal-800 transition-colors group-hover:bg-teal-700 group-hover:text-white"
                aria-hidden="true"
              >
                <Store className="h-5 w-5" />
              </div>
              <span className="font-mono text-[11px] font-medium text-slate-500">
                {isBorrowerAuthenticated ? 'Session Active' : 'Mobile OTP · RBI AA'}
              </span>
            </div>

            <h2 className="mt-4 text-lg font-bold tracking-tight text-slate-900">
              Borrower Portal
            </h2>
            <p className="mt-1 text-xs font-medium text-teal-800">
              For Micro-Businesses · Check Credit Readiness via RBI AA
            </p>
            <p className="mt-2.5 text-xs leading-relaxed text-slate-600">
              Request working capital, approve 10-minute read-only Account Aggregator consent on
              your linked bank account, inspect your Stability Score, and submit directly to a
              partner lender.
            </p>

            <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-3.5 text-xs text-slate-600">
              <li>Single-applicant private workspace · zero visibility of other accounts</li>
              <li>Zero raw statement retention · derived financial ratios computed in memory</li>
              <li>Transparent Periodic Instalment sizing and Starter Tranche eligibility</li>
            </ul>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-teal-800">
            <span>{isBorrowerAuthenticated ? 'Resume Borrower Portal' : 'Enter Borrower Portal'}</span>
            <ArrowRight
              className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </div>
        </motion.button>

        {/* Lender Portal Card */}
        <motion.button
          type="button"
          onClick={onSelectLender}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.99 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-slate-900 hover:shadow-md hover:shadow-slate-900/5 sm:p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
        >
          <div>
            <div className="flex items-center justify-between gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900/8 text-slate-900 transition-colors group-hover:bg-slate-900 group-hover:text-white"
                aria-hidden="true"
              >
                <Briefcase className="h-5 w-5" />
              </div>
              <span className="font-mono text-[11px] font-medium text-slate-500 tabular-nums">
                {queueCount} in queue{hasBorrowerSubmission ? ' · 1 live' : ''}
              </span>
            </div>

            <h2 className="mt-4 text-lg font-bold tracking-tight text-slate-900">
              Lender Portal
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-700">
              For NBFC / FIU Partners · Deterministic Underwriting Desk
            </p>
            <p className="mt-2.5 text-xs leading-relaxed text-slate-600">
              Review incoming MSME applications, inspect 5 tamper-resistant bank &amp; UPI signals,
              run live downside stress tests, audit explicit policy reason codes, and record
              credit decisions.
            </p>

            <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-3.5 text-xs text-slate-600">
              <li>Hard Knock-Out Rules (NACH bounces &gt; 2 or non-positive net surplus)</li>
              <li>Cash-Heavy dynamic weighting &amp; PM SVANidhi-modeled Starter Tranche</li>
              <li>Live Stress-Test Simulator, Cash-Flow Chart &amp; structuring guardrails</li>
            </ul>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-slate-900">
            <span>
              {isLenderAuthenticated ? 'Open Underwriting Queue' : 'Sign In as FIU Partner'}
            </span>
            <ArrowRight
              className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </div>
        </motion.button>
      </div>

      {/* Subtle Trust & Architecture Strip */}
      <div
        className={`mt-6 grid gap-4 border-t border-slate-200 pt-5 ${
          isMobileFrame ? 'grid-cols-1' : 'mt-10 grid-cols-1 sm:grid-cols-3'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-slate-900">100% Deterministic Scoring</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
              Every score, knock-out cap, and Safe Repayment Capacity limit runs in pure TypeScript.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-slate-900">Zero Raw Data Retention</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
              Revocable 10-minute read-only RBI AA consent discards statements immediately after
              ratio extraction.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Store className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-slate-900">Cash-Heavy Vendor Inclusion</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
              Dynamic weighting shifts focus to NACH discipline &amp; bank cash-deposit regularity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
