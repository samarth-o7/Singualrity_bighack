import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  KeyRound,
  LayoutDashboard,
  Loader2,
  Lock,
  RefreshCw,
  Send,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BorrowerAccountProfile,
  BorrowerDashboardTab,
  BorrowerStep,
  LoanApplication,
  RepaymentSchedule,
} from '../types/credit';
import { evaluateMSMECredit } from '../utils/creditModel';
import { formatCompactINR, formatINR } from '../utils/format';
import { CashFlowChart } from './CashFlowChart';
import { getReadinessDescriptor, StabilityGauge } from './StabilityGauge';
import { StarterTrancheLadderCard } from './StarterTrancheLadderCard';

interface BorrowerPortalProps {
  step: BorrowerStep;
  account: BorrowerAccountProfile | null;
  requestedLoan: number;
  preferredRepaymentSchedule: RepaymentSchedule;
  consentGrantedAtMs: number | null;
  submittedApplication: LoanApplication | null;
  hasUnsyncedChanges: boolean;
  isMobileFrame: boolean;
  onStepChange: (step: BorrowerStep) => void;
  onCreateBorrowerAccount: (businessName: string, mobileNumber: string) => void;
  onRequestedLoanChange: (amount: number) => void;
  onPreferredScheduleChange: (schedule: RepaymentSchedule) => void;
  onNotifyAaOtpSent: (formattedMobile: string, isResend: boolean) => void;
  onConsentApproved: () => void;
  onSubmitToPartnerLender: () => void;
  onRevokeConsent: () => void;
}

const QUICK_LOAN_AMOUNTS = [50000, 100000, 120000, 200000];

const RHYTHM_OPTIONS: {
  value: RepaymentSchedule;
  label: string;
  helper: string;
}[] = [
  { value: 'Daily', label: 'Daily', helper: 'Small daily instalments from UPI settlements' },
  { value: 'Weekly', label: 'Weekly', helper: 'Aligned with weekly restock cycles' },
  { value: 'Monthly', label: 'Monthly', helper: 'Single predictable monthly instalment' },
];

const STEP_LABELS: { id: BorrowerStep; num: string; label: string }[] = [
  { id: 'login', num: '01', label: 'Account' },
  { id: 'request', num: '02', label: 'Request' },
  { id: 'consent', num: '03', label: 'RBI AA Consent' },
  { id: 'dashboard', num: '04', label: 'Readiness' },
];

function formatIndianMobile(digits: string): string {
  const clean = digits.replace(/\D/g, '').slice(-10);
  if (clean.length !== 10) return clean;
  return `${clean.slice(0, 5)} ${clean.slice(5)}`;
}

function formatCountdown(remainingSec: number): string {
  const clamped = Math.max(0, remainingSec);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function BorrowerPortal({
  step,
  account,
  requestedLoan,
  preferredRepaymentSchedule,
  consentGrantedAtMs,
  submittedApplication,
  hasUnsyncedChanges,
  isMobileFrame,
  onStepChange,
  onCreateBorrowerAccount,
  onRequestedLoanChange,
  onPreferredScheduleChange,
  onNotifyAaOtpSent,
  onConsentApproved,
  onSubmitToPartnerLender,
  onRevokeConsent,
}: BorrowerPortalProps) {
  // Step 1 — Create New Borrower Account form state
  const [shopNameInput, setShopNameInput] = useState<string>(account?.businessName ?? '');
  const [phoneInput, setPhoneInput] = useState<string>(account?.mobileNumber ?? '');
  const [accountError, setAccountError] = useState<string | null>(null);

  // Step 3 — Interactive RBI AA Consent OTP state
  const [aaOtpSent, setAaOtpSent] = useState<boolean>(false);
  const [aaOtpCode, setAaOtpCode] = useState<string>('');
  const [aaOtpError, setAaOtpError] = useState<string | null>(null);
  const [aaResendCount, setAaResendCount] = useState<number>(0);
  const [verifyingStage, setVerifyingStage] = useState<number | null>(null);

  // Step 4 — Dashboard tab + Submission Confirmation state
  const [activeTab, setActiveTab] = useState<BorrowerDashboardTab>('overview');
  const [showSubmittedConfirmation, setShowSubmittedConfirmation] = useState<boolean>(false);
  const [remainingConsentSeconds, setRemainingConsentSeconds] = useState<number>(600);

  // Reset AA OTP form whenever leaving or re-entering Step 3
  useEffect(() => {
    if (step !== 'consent') {
      setAaOtpSent(false);
      setAaOtpCode('');
      setAaOtpError(null);
      setAaResendCount(0);
      setVerifyingStage(null);
    }
  }, [step]);

  // Clear local inputs when logged out (account becomes null)
  useEffect(() => {
    if (!account) {
      setShopNameInput('');
      setPhoneInput('');
      setAccountError(null);
      setShowSubmittedConfirmation(false);
    }
  }, [account]);

  // Live 10-minute consent countdown timer
  useEffect(() => {
    if (!consentGrantedAtMs) {
      setRemainingConsentSeconds(600);
      return;
    }
    const updateRemaining = () => {
      const elapsedSec = Math.floor((Date.now() - consentGrantedAtMs) / 1000);
      setRemainingConsentSeconds(Math.max(0, 600 - elapsedSec));
    };
    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [consentGrantedAtMs]);

  const assessment = useMemo(() => {
    if (!account) return null;
    return evaluateMSMECredit(account.signals, requestedLoan);
  }, [account, requestedLoan]);

  const formattedMobile = account ? formatIndianMobile(account.mobileNumber) : '';

  const verificationStages = account
    ? [
        `Connecting to RBI Account Aggregator (${account.aaHandle})...`,
        'Computing derived bank & UPI ratios in memory...',
        'Discarding raw statement — zero retention verified...',
      ]
    : [
        'Connecting to RBI Account Aggregator...',
        'Computing derived bank & UPI ratios in memory...',
        'Discarding raw statement — zero retention verified...',
      ];

  // Step 1 handlers
  const handleCreateAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = shopNameInput.trim();
    const cleanedDigits = phoneInput.replace(/\D/g, '');

    if (trimmedName.length < 2) {
      setAccountError('Enter your Full Name or Shop Name (at least 2 characters).');
      return;
    }
    if (cleanedDigits.length !== 10) {
      setAccountError('Enter a valid 10-digit Indian mobile number.');
      return;
    }

    setAccountError(null);
    onCreateBorrowerAccount(trimmedName, cleanedDigits);
  };

  const handleQuickDemoFill = () => {
    setAccountError(null);
    // Preserve custom user input if they already typed one; otherwise populate a clean sample
    if (!shopNameInput.trim()) {
      setShopNameInput('Kaveri Fresh Mart');
    }
    if (phoneInput.replace(/\D/g, '').length !== 10) {
      setPhoneInput('9845071289');
    }
  };

  // Step 2 handlers
  const handleLoanInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      onRequestedLoanChange(10000);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) {
      onRequestedLoanChange(Math.min(500000, Math.max(0, parsed)));
    }
  };

  const handleLoanInputBlur = () => {
    if (requestedLoan < 10000) onRequestedLoanChange(10000);
    if (requestedLoan > 500000) onRequestedLoanChange(500000);
  };

  // Step 3 — Interactive RBI AA Consent OTP handlers
  const handleSendAaOtp = () => {
    if (!account) return;
    setAaOtpSent(true);
    setAaOtpError(null);
    onNotifyAaOtpSent(formatIndianMobile(account.mobileNumber), false);
  };

  const handleResendAaOtp = () => {
    if (!account || verifyingStage !== null) return;
    setAaOtpCode('');
    setAaOtpError(null);
    setAaResendCount((prev) => prev + 1);
    onNotifyAaOtpSent(formatIndianMobile(account.mobileNumber), true);
  };

  const handleVerifyAaOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyingStage !== null) return;

    const cleanedOtp = aaOtpCode.replace(/\D/g, '');
    if (cleanedOtp.length !== 6) {
      setAaOtpError('Enter a 6-digit OTP code to verify and approve 10-minute read-only consent.');
      return;
    }

    setAaOtpError(null);
    setVerifyingStage(0);
    window.setTimeout(() => setVerifyingStage(1), 500);
    window.setTimeout(() => setVerifyingStage(2), 1000);
    window.setTimeout(() => {
      setVerifyingStage(null);
      setActiveTab('overview');
      setShowSubmittedConfirmation(false);
      onConsentApproved();
    }, 1500);
  };

  const handleSubmitApplication = () => {
    onSubmitToPartnerLender();
    setShowSubmittedConfirmation(true);
  };

  const currentStepIndex = STEP_LABELS.findIndex((s) => s.id === step);
  const previewDigits = phoneInput.replace(/\D/g, '');

  return (
    <div className={isMobileFrame ? 'space-y-4' : 'mx-auto max-w-[1240px] space-y-6'}>
      {/* Compact Step Progress Bar (Shown during Steps 1–3 onboarding) */}
      {step !== 'dashboard' && (
        <nav
          aria-label="Borrower onboarding steps"
          className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white px-4 py-3"
        >
          <ol className="flex items-center justify-between gap-2">
            {STEP_LABELS.map((item, idx) => {
              const isCompleted = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <li key={item.id} className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold transition-colors ${
                      isCompleted
                        ? 'bg-emerald-700 text-white'
                        : isCurrent
                          ? 'bg-teal-700 text-white'
                          : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? '✓' : item.num}
                  </span>
                  <span
                    className={`truncate text-xs ${
                      isCurrent
                        ? 'font-semibold text-slate-900'
                        : isCompleted
                          ? 'font-medium text-emerald-800'
                          : 'text-slate-400'
                    } ${isMobileFrame && !isCurrent ? 'hidden' : ''}`}
                  >
                    {item.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <AnimatePresence mode="wait">
        {/* ===================================================================
            STEP 1 — CREATE NEW BORROWER ACCOUNT (Dynamic Name + 10-Digit Mobile)
            =================================================================== */}
        {step === 'login' && (
          <motion.div
            key="borrower-step-login"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-md"
          >
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-700/10 text-teal-800">
                  <Smartphone className="h-5 w-5" aria-hidden="true" />
                </div>
                <button
                  type="button"
                  onClick={handleQuickDemoFill}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50/70 px-3 py-1.5 text-xs font-semibold text-teal-900 transition-all duration-150 hover:border-teal-400 hover:bg-teal-50 active:scale-[0.98] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  <Zap className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                  <span>Quick Demo Fill</span>
                </button>
              </div>

              <h1 className="mt-4 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                Create Borrower Account
              </h1>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Enter your full name or shop name and 10-digit mobile number to initialize your
                private RBI Account Aggregator profile.
              </p>

              <form onSubmit={handleCreateAccountSubmit} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="borrower-shop-name"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Full Name / Shop Name
                  </label>
                  <input
                    id="borrower-shop-name"
                    type="text"
                    maxLength={64}
                    placeholder="e.g. Lakshmi Kirana & Spices"
                    value={shopNameInput}
                    onChange={(e) => {
                      setShopNameInput(e.target.value);
                      setAccountError(null);
                    }}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                  />
                </div>

                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <label
                      htmlFor="borrower-mobile"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      10-Digit Mobile Number
                    </label>
                    {previewDigits.length === 10 && (
                      <span className="font-mono text-[11px] font-medium text-teal-800">
                        AA: {previewDigits}@finvu
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2.5 focus-within:border-teal-700 focus-within:ring-2 focus-within:ring-teal-600/20">
                    <span className="mr-2 font-mono text-xs font-semibold text-slate-500 select-none">
                      +91
                    </span>
                    <input
                      id="borrower-mobile"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="9845071289"
                      value={phoneInput}
                      onChange={(e) => {
                        setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10));
                        setAccountError(null);
                      }}
                      className="w-full bg-transparent font-mono text-sm font-semibold text-slate-900 tabular-nums placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Synthetic Data Demo: your mobile number deterministically seeds a distinct
                    synthetic bank &amp; UPI cash-flow profile.
                  </p>
                </div>

                {accountError && (
                  <p className="text-xs font-medium text-red-700" role="alert">
                    {accountError}
                  </p>
                )}

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white transition-all duration-150 hover:bg-teal-800 active:scale-[0.99] sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                >
                  <span>Continue to Credit Request</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>

              <div className="mt-5 flex items-start gap-2 border-t border-slate-100 pt-4 text-[11px] text-slate-500">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-700" aria-hidden="true" />
                <span>
                  Single-applicant private session. Your account and signals remain strictly
                  isolated from other applicants.
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ===================================================================
            STEP 2 — CREDIT REQUEST SETUP (Amount + Preferred Rhythm ONLY)
            =================================================================== */}
        {step === 'request' && account && (
          <motion.div
            key="borrower-step-request"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-xl"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onStepChange('consent');
              }}
              className="rounded-xl border border-slate-200 bg-white"
            >
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-teal-800">
                    Step 2 of 4 · Credit Request
                  </p>
                  <button
                    type="button"
                    onClick={() => onStepChange('login')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Edit Account</span>
                  </button>
                </div>

                <h1 className="mt-1.5 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                  Configure your working capital request
                </h1>
                <p className="mt-1 text-xs text-slate-600">
                  Enter only the amount you need and your preferred Periodic Instalment rhythm.
                  Bank and UPI signals are fetched read-only in the next step.
                </p>

                {/* Dynamically Bound Single Personal Business Identity Card */}
                <div className="mt-4 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-700/10 text-teal-800"
                    aria-hidden="true"
                  >
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{account.businessName}</p>
                      <span className="font-mono text-[11px] font-semibold text-teal-800">
                        {account.aaHandle}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600">
                      +91 {formattedMobile} · {account.location}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200" />

              <div className="space-y-5 p-5 sm:p-6">
                {/* Requested Loan Amount */}
                <div>
                  <label
                    htmlFor="borrower-requested-loan-amount"
                    className="block text-xs font-semibold text-slate-800"
                  >
                    Requested Loan Amount (₹)
                  </label>
                  <div className="mt-1.5 flex items-center rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 focus-within:border-teal-700 focus-within:ring-2 focus-within:ring-teal-600/20">
                    <span className="mr-2 font-mono text-sm font-semibold text-slate-500 select-none">
                      ₹
                    </span>
                    <input
                      id="borrower-requested-loan-amount"
                      type="number"
                      min={10000}
                      max={500000}
                      step={5000}
                      value={requestedLoan}
                      onChange={handleLoanInputChange}
                      onBlur={handleLoanInputBlur}
                      className="w-full bg-transparent font-mono text-lg font-bold text-slate-900 tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </div>

                  <div className="mt-2 grid grid-cols-4 gap-1.5">
                    {QUICK_LOAN_AMOUNTS.map((amount) => {
                      const active = requestedLoan === amount;
                      return (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => onRequestedLoanChange(amount)}
                          className={`rounded-md border px-2 py-1.5 font-mono text-xs font-medium tabular-nums transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                            active
                              ? 'border-teal-700 bg-teal-50 text-teal-900'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                          }`}
                        >
                          {formatCompactINR(amount)}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 font-mono text-[11px] text-slate-400 tabular-nums">
                    Working capital range: ₹10,000 – ₹5,00,000
                  </p>
                </div>

                {/* Preferred Periodic Instalment Rhythm */}
                <div>
                  <span className="block text-xs font-semibold text-slate-800">
                    Preferred Periodic Instalment Rhythm
                  </span>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Choose how you prefer to repay; final rhythm is also checked against your
                    verified bank cash-flow velocity.
                  </p>
                  <div
                    className={`mt-2.5 grid gap-2 ${
                      isMobileFrame ? 'grid-cols-1' : 'grid-cols-3'
                    }`}
                    role="radiogroup"
                    aria-label="Preferred periodic instalment rhythm"
                  >
                    {RHYTHM_OPTIONS.map((option) => {
                      const active = preferredRepaymentSchedule === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => onPreferredScheduleChange(option.value)}
                          className={`rounded-lg border p-3 text-left transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                            active
                              ? 'border-teal-700 bg-teal-50/70'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <p
                            className={`text-xs font-semibold ${
                              active ? 'text-teal-950' : 'text-slate-900'
                            }`}
                          >
                            {option.label}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                            {option.helper}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-slate-200 bg-slate-50/70 px-5 py-4 sm:px-6">
                <p className="text-[11px] text-slate-500">
                  No manual sales or income sliders required
                </p>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white transition-all duration-150 hover:bg-teal-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                >
                  <span>Continue to RBI AA Consent</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* ===================================================================
            STEP 3 — SIMULATED RBI ACCOUNT AGGREGATOR (AA) INTERACTIVE OTP CONSENT
            =================================================================== */}
        {step === 'consent' && account && (
          <motion.div
            key="borrower-step-consent"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-xl"
          >
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-teal-800">
                    Step 3 of 4 · Simulated RBI Account Aggregator
                  </p>
                  <button
                    type="button"
                    disabled={verifyingStage !== null}
                    onClick={() => onStepChange('request')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-50"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Edit Request</span>
                  </button>
                </div>

                <h1 className="mt-1.5 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                  Approve 10-Minute Read-Only Consent
                </h1>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Verify via AA OTP to authorize a revocable 10-minute read-only fetch of your
                  synthetic bank &amp; UPI summary signals.
                </p>

                {/* Consent Artifact Summary */}
                <dl className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/70 px-4 text-xs">
                  <div className="flex items-center justify-between gap-2 py-2.5">
                    <dt className="text-slate-500">Account Aggregator Handle</dt>
                    <dd className="font-mono font-semibold text-teal-800">{account.aaHandle}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-2.5">
                    <dt className="text-slate-500">Linked FIP Account</dt>
                    <dd className="font-mono font-semibold text-slate-900">
                      {account.accountMask}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-2.5">
                    <dt className="text-slate-500">Applicant / Shop Name</dt>
                    <dd className="font-semibold text-slate-900 text-right">
                      {account.businessName}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-2.5">
                    <dt className="text-slate-500">Consent Scope &amp; Duration</dt>
                    <dd className="font-mono font-semibold text-slate-900">
                      10-Min · Read-Only Fetch
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-2.5">
                    <dt className="text-slate-500">Requested Facility</dt>
                    <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                      {formatINR(requestedLoan)} · {preferredRepaymentSchedule} preferred
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4 py-2.5">
                    <dt className="shrink-0 text-slate-500">Derived Signals (5)</dt>
                    <dd className="text-right text-[11px] leading-snug text-slate-700">
                      Unique UPI Payers, 6m NACH Bounces, Inflow-to-Outflow CV, Liquidity Cushion,
                      Cash-Deposit Regularity
                    </dd>
                  </div>
                </dl>

                {/* Zero-Retention Privacy Badge */}
                <div
                  className="mt-4 flex items-start gap-2.5 rounded-lg border border-teal-200 bg-teal-50/70 p-3.5"
                  role="note"
                >
                  <ShieldCheck
                    className="mt-0.5 h-4 w-4 shrink-0 text-teal-800"
                    aria-hidden="true"
                  />
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-teal-950">
                      Privacy &amp; Zero-Retention Guarantee
                    </p>
                    <p className="text-xs leading-relaxed text-teal-900">
                      Encrypted, revocable read-only consent. Only derived financial ratios are
                      computed in memory; raw bank statements are never stored.
                    </p>
                  </div>
                </div>
              </div>

              {/* Interactive OTP Step Container */}
              <div className="rounded-b-xl border-t border-slate-200 bg-slate-50/70 p-5 sm:p-6">
                {verifyingStage !== null ? (
                  /* Animated 1.5s ratio-computation sequence (runs ONLY after OTP submit) */
                  <div
                    className="space-y-3 rounded-lg border border-teal-200 bg-white p-4"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="flex items-center gap-2.5">
                      <Loader2
                        className="h-4 w-4 shrink-0 animate-spin text-teal-700"
                        aria-hidden="true"
                      />
                      <span className="text-xs font-semibold text-slate-900">
                        {verificationStages[verifyingStage]}
                      </span>
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <motion.div
                        className="h-full origin-left rounded-full bg-teal-700"
                        initial={{ scaleX: 0.12 }}
                        animate={{ scaleX: (verifyingStage + 1) / verificationStages.length }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>

                    <ul className="space-y-1 text-[11px]">
                      {verificationStages.map((stageLabel, idx) => {
                        const done = idx < verifyingStage;
                        const active = idx === verifyingStage;
                        return (
                          <li
                            key={stageLabel}
                            className={`flex items-center gap-1.5 ${
                              done
                                ? 'text-emerald-700'
                                : active
                                  ? 'font-semibold text-teal-900'
                                  : 'text-slate-400'
                            }`}
                          >
                            <span className="font-mono">{done ? '✓' : active ? '→' : '·'}</span>
                            <span>{stageLabel}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : !aaOtpSent ? (
                  /* Stage A: Send OTP (does NOT auto-verify) */
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={handleSendAaOtp}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 text-xs font-semibold text-white transition-all duration-150 hover:bg-teal-800 active:scale-[0.99] sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                    >
                      <KeyRound className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>Send OTP to +91 {formattedMobile}</span>
                    </button>
                    <p className="text-center text-[11px] text-slate-500">
                      You will enter the 6-digit AA OTP on the next step before any read-only fetch
                      begins.
                    </p>
                  </div>
                ) : (
                  /* Stage B: Interactive 6-Digit OTP Input Box + Resend OTP + Verify & Grant Consent */
                  <motion.form
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    onSubmit={handleVerifyAaOtpSubmit}
                    className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <label
                          htmlFor="aa-consent-otp"
                          className="block text-xs font-bold text-slate-900"
                        >
                          Enter 6-Digit RBI AA Consent OTP
                        </label>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
                          Simulated AA OTP sent to{' '}
                          <span className="font-mono font-semibold text-slate-800">
                            +91 {formattedMobile}
                          </span>{' '}
                          — enter any 6-digit code to verify.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleResendAaOtp}
                        className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-teal-800 transition-colors hover:text-teal-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
                      >
                        <RefreshCw className="h-3 w-3" aria-hidden="true" />
                        <span>Resend OTP</span>
                      </button>
                    </div>

                    <div>
                      <input
                        id="aa-consent-otp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        autoFocus
                        maxLength={6}
                        placeholder="• • • • • •"
                        value={aaOtpCode}
                        onChange={(e) => {
                          setAaOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                          setAaOtpError(null);
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-slate-50/50 px-4 py-3 text-center font-mono text-xl font-bold tracking-[0.55em] text-slate-900 tabular-nums placeholder:tracking-[0.45em] placeholder:text-slate-400 focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                      />
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-mono tabular-nums">
                          {aaOtpCode.length}/6 digits entered
                        </span>
                        {aaResendCount > 0 && (
                          <span className="font-medium text-teal-700">
                            OTP resent ({aaResendCount})
                          </span>
                        )}
                      </div>
                    </div>

                    {aaOtpError && (
                      <p className="text-xs font-medium text-red-700" role="alert">
                        {aaOtpError}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 text-xs font-semibold text-white transition-all duration-150 hover:bg-teal-800 active:scale-[0.99] sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                    >
                      <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>Verify OTP &amp; Grant 10-Min Consent</span>
                    </button>
                  </motion.form>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ===================================================================
            STEP 4 — PERSONAL BORROWER DASHBOARD (Strictly Single-User, Zero AI)
            =================================================================== */}
        {step === 'dashboard' && account && assessment && (
          <motion.div
            key="borrower-step-dashboard"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-5"
          >
            {/* Top Dynamically Bound Personal Business Header */}
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono text-xs font-medium text-teal-800">
                  Private Borrower Dashboard · {account.aaHandle}
                </p>
                <h1
                  className={
                    isMobileFrame
                      ? 'mt-0.5 text-base font-bold tracking-tight text-slate-900'
                      : 'mt-0.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl'
                  }
                >
                  {account.businessName}
                </h1>
                <p className="mt-0.5 text-xs text-slate-600">
                  +91 {formattedMobile} · {account.businessType} · {account.location}
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Clock className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                <span>AA Consent Timer:</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatCountdown(remainingConsentSeconds)}
                </span>
              </div>
            </div>

            {/* Sidebar (Desktop) + Horizontal Tab Strip (Mobile Frame) */}
            <div
              className={
                isMobileFrame
                  ? 'space-y-4'
                  : 'grid grid-cols-1 items-start gap-6 lg:grid-cols-12'
              }
            >
              {/* Navigation */}
              <aside className={isMobileFrame ? '' : 'lg:col-span-3 lg:sticky lg:top-20'}>
                <nav
                  aria-label="Borrower dashboard sections"
                  className={
                    isMobileFrame
                      ? 'grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1'
                      : 'space-y-1 rounded-xl border border-slate-200 bg-white p-2'
                  }
                >
                  {[
                    { id: 'overview' as const, label: 'Overview', Icon: LayoutDashboard },
                    { id: 'signals' as const, label: 'Cash-Flow & Signals', Icon: Activity },
                    { id: 'privacy' as const, label: 'Consent & Privacy', Icon: ShieldCheck },
                  ].map(({ id, label, Icon }) => {
                    const active = activeTab === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setActiveTab(id);
                          setShowSubmittedConfirmation(false);
                        }}
                        aria-current={active ? 'page' : undefined}
                        className={`flex items-center gap-2 rounded-lg text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                          isMobileFrame
                            ? `justify-center px-2 py-2 ${
                                active
                                  ? 'bg-white text-teal-900 shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`
                            : `w-full px-3 py-2.5 text-left ${
                                active
                                  ? 'bg-teal-50 text-teal-900'
                                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                              }`
                        }`}
                      >
                        <Icon
                          className={`h-3.5 w-3.5 shrink-0 ${
                            active ? 'text-teal-700' : 'text-slate-400'
                          }`}
                          aria-hidden="true"
                        />
                        <span className="truncate">
                          {isMobileFrame ? label.split(' ')[0] : label}
                        </span>
                      </button>
                    );
                  })}
                </nav>

                {!isMobileFrame && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-xs">
                    <p className="font-semibold text-slate-900">Active Request Summary</p>
                    <dl className="mt-2.5 space-y-2 text-[11px]">
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">AA Handle</dt>
                        <dd className="truncate font-mono font-semibold text-teal-800">
                          {account.aaHandle}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Requested</dt>
                        <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                          {formatINR(requestedLoan)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Preferred rhythm</dt>
                        <dd className="font-semibold text-slate-900">
                          {preferredRepaymentSchedule}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Lender Queue</dt>
                        <dd
                          className={`font-semibold ${
                            submittedApplication ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {submittedApplication
                            ? submittedApplication.reviewStatus
                            : 'Not yet submitted'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}
              </aside>

              {/* Active Tab Content */}
              <div className={isMobileFrame ? '' : 'lg:col-span-9'}>
                <AnimatePresence mode="wait">
                  {/* TAB 1: OVERVIEW (or Submission Confirmation Screen) */}
                  {activeTab === 'overview' && showSubmittedConfirmation && submittedApplication ? (
                    <motion.div
                      key="borrower-confirmation"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="rounded-xl border border-emerald-200 bg-white p-6 sm:p-8"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <h2 className="mt-4 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                        Application Submitted to Partner Lender
                      </h2>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
                        Derived bank &amp; UPI ratios for{' '}
                        <strong className="text-slate-900">{account.businessName}</strong> (
                        <span className="font-mono text-teal-800">{account.aaHandle}</span>) have
                        been pushed to the NBFC partner underwriting queue. No raw bank statements
                        were shared or stored.
                      </p>

                      <dl className="mt-5 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-xs sm:grid-cols-4">
                        <div>
                          <dt className="text-[11px] text-slate-500">Reference ID</dt>
                          <dd className="mt-0.5 font-mono font-bold text-slate-900 tabular-nums">
                            {submittedApplication.referenceCode}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-slate-500">Requested Amount</dt>
                          <dd className="mt-0.5 font-mono font-bold text-slate-900 tabular-nums">
                            {formatINR(submittedApplication.requestedLoan)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-slate-500">Eligible Limit</dt>
                          <dd className="mt-0.5 font-mono font-bold text-emerald-700 tabular-nums">
                            {formatINR(assessment.recommendedLoanAmount)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-slate-500">Queue Status</dt>
                          <dd className="mt-0.5 font-semibold text-teal-800">
                            {submittedApplication.reviewStatus}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-5 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setShowSubmittedConfirmation(false)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Return to Overview</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowSubmittedConfirmation(false);
                            setActiveTab('privacy');
                          }}
                          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                        >
                          Manage AA Consent
                        </button>
                      </div>
                    </motion.div>
                  ) : activeTab === 'overview' ? (
                    <motion.div
                      key="borrower-tab-overview"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="rounded-xl border border-slate-200 bg-white"
                    >
                      {/* Top Hero: Animated Stability Gauge & Readiness Tier */}
                      <div className="p-5 sm:p-6">
                        <div
                          className={`flex gap-5 ${
                            isMobileFrame
                              ? 'flex-col items-center text-center'
                              : 'flex-col items-start justify-between sm:flex-row sm:items-center'
                          }`}
                        >
                          <div className={isMobileFrame ? 'order-2 w-full' : 'min-w-0 flex-1'}>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                              <span className="font-medium text-slate-500">
                                Readiness Tier:{' '}
                                <strong className="font-semibold text-slate-900">
                                  {assessment.readinessTier}
                                </strong>
                              </span>
                              <span aria-hidden="true" className="text-slate-300">
                                ·
                              </span>
                              <span
                                className={`font-semibold ${
                                  assessment.isCashHeavyProfile
                                    ? 'text-teal-800'
                                    : 'text-slate-600'
                                }`}
                              >
                                {assessment.profileTag}
                              </span>
                            </div>
                            <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">
                              {assessment.underwritingDecision}
                            </h2>
                            <p className="mt-1 text-xs leading-relaxed text-slate-600">
                              {getReadinessDescriptor(assessment.readinessTier)}
                            </p>
                          </div>

                          <div className={isMobileFrame ? 'order-1' : 'shrink-0'}>
                            <StabilityGauge
                              score={assessment.stabilityScore}
                              tier={assessment.readinessTier}
                            />
                          </div>
                        </div>

                        {assessment.knockOutTriggered && (
                          <div className="mt-4 rounded-lg border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-900">
                            <p className="font-semibold text-red-950">
                              Safety Policy Cap Applied (Watchlist Tier)
                            </p>
                            <ul className="mt-1 space-y-1">
                              {assessment.knockOutRules
                                .filter((r) => r.triggered)
                                .map((rule) => (
                                  <li key={rule.code}>
                                    <span className="font-mono font-semibold">{rule.code}</span>:{' '}
                                    {rule.observed} ({rule.actionTaken})
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}

                        {/* Recommended Fair Credit Terms Grid */}
                        <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200">
                          <div className="bg-slate-50/70 p-3.5 sm:p-4">
                            <p className="text-xs text-slate-500">Recommended loan</p>
                            <p className="mt-1 font-mono text-lg font-bold tracking-tight text-slate-900 tabular-nums sm:text-xl">
                              {assessment.recommendedLoanAmount === 0
                                ? '₹0'
                                : formatINR(assessment.recommendedLoanAmount)}
                            </p>
                            <p className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                              {assessment.recommendedLoanAmount === 0
                                ? 'Non-positive surplus'
                                : assessment.starterTrancheLadder.isActive
                                  ? 'Starter Tranche 1 Cap'
                                  : `${Math.round(assessment.loanCoverageRatio * 100)}% of ${formatINR(requestedLoan)}`}
                            </p>
                          </div>

                          <div className="bg-slate-50/70 p-3.5 sm:p-4">
                            <p className="text-xs text-slate-500">Tenure</p>
                            <p className="mt-1 font-mono text-lg font-bold tracking-tight text-slate-900 tabular-nums sm:text-xl">
                              {assessment.recommendedLoanAmount === 0
                                ? '—'
                                : `${assessment.tenureMonths} months`}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {assessment.recommendedLoanAmount === 0
                                ? 'Not eligible'
                                : `Safe Repayment ≤${assessment.maxRepaymentRatioPercent}% surplus`}
                            </p>
                          </div>

                          <div className="bg-slate-50/70 p-3.5 sm:p-4">
                            <p className="text-xs text-slate-500">Periodic instalment</p>
                            <p className="mt-1 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                              {assessment.recommendedLoanAmount === 0
                                ? '—'
                                : assessment.repaymentSchedule}
                            </p>
                            <p className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                              {assessment.recommendedLoanAmount === 0
                                ? 'N/A'
                                : `${formatINR(assessment.periodicInstalment)} / ${
                                    assessment.repaymentSchedule === 'Daily'
                                      ? 'operating day'
                                      : assessment.repaymentSchedule === 'Weekly'
                                        ? 'week'
                                        : 'month'
                                  }`}
                              {preferredRepaymentSchedule !== assessment.repaymentSchedule &&
                              assessment.recommendedLoanAmount > 0
                                ? ` · Pref: ${preferredRepaymentSchedule}`
                                : ''}
                            </p>
                          </div>

                          <div className="bg-slate-50/70 p-3.5 sm:p-4">
                            <p className="text-xs text-slate-500">Indicative interest</p>
                            <p className="mt-1 font-mono text-base font-bold tracking-tight text-slate-900 tabular-nums sm:text-lg">
                              {assessment.recommendedLoanAmount === 0
                                ? '—'
                                : assessment.indicativeInterestRange}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {assessment.recommendedLoanAmount === 0
                                ? 'N/A'
                                : 'Tier-based APR guidance'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-200" />

                      <div className="space-y-6 p-5 sm:p-6">
                        {assessment.starterTrancheLadder.isActive && (
                          <StarterTrancheLadderCard
                            ladder={assessment.starterTrancheLadder}
                            recommendedLoanAmount={assessment.recommendedLoanAmount}
                            isMobileFrame={isMobileFrame}
                          />
                        )}

                        <CashFlowChart assessment={assessment} />

                        {/* Interactive Submit to Partner Lender Action Bar */}
                        <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 sm:p-5">
                          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900">
                                {submittedApplication
                                  ? `Submitted to Partner Lender · Ref ${submittedApplication.referenceCode}`
                                  : 'Ready to submit to our NBFC Partner?'}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-600">
                                {submittedApplication
                                  ? `Current underwriting status: ${submittedApplication.reviewStatus}. ${
                                      hasUnsyncedChanges
                                        ? 'You updated your requested terms—sync the update below.'
                                        : 'Your live request is now visible in the Lender Portal queue.'
                                    }`
                                  : 'Shares only your derived ratios and deterministic terms with the partner underwriting desk.'}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={handleSubmitApplication}
                              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white transition-all duration-150 hover:bg-teal-800 active:scale-[0.98] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                            >
                              <Send className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>
                                {submittedApplication
                                  ? hasUnsyncedChanges
                                    ? 'Sync Updated Application'
                                    : 'View Submission Receipt'
                                  : 'Submit Application to Partner Lender'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-b-xl border-t border-slate-200 bg-slate-50/70 px-5 py-3 text-[11px] leading-relaxed text-slate-500 sm:px-6">
                        Synthetic Data · Signals deterministically seeded for{' '}
                        <span className="font-mono text-slate-700">{account.aaHandle}</span> and
                        scored via 100% deterministic TypeScript.
                      </div>
                    </motion.div>
                  ) : activeTab === 'signals' ? (
                    /* TAB 2: CASH-FLOW & SIGNALS (Strictly Deterministic, Zero AI Advice) */
                    <motion.div
                      key="borrower-tab-signals"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
                    >
                      <div>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h2 className="text-base font-bold tracking-tight text-slate-900">
                            Fetched Bank &amp; UPI Signals (Read-Only)
                          </h2>
                          <span className="text-xs font-medium text-teal-800">
                            {account.aaSourceLabel}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          Synthetic Data deterministically seeded for{' '}
                          <span className="font-mono font-medium text-slate-800">
                            {account.aaHandle}
                          </span>{' '}
                          — computed in memory from your 5 core bank &amp; UPI signals.
                        </p>

                        <dl
                          className={`mt-4 grid gap-3 ${
                            isMobileFrame ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
                          }`}
                        >
                          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                            <dt className="text-[11px] text-slate-500">Unique UPI payers</dt>
                            <dd className="mt-1 font-mono text-sm font-bold text-slate-900 tabular-nums">
                              {assessment.effectiveSignals.uniqueUpiPayersPerMonth}/mo
                            </dd>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                            <dt className="text-[11px] text-slate-500">NACH bounces (6m)</dt>
                            <dd
                              className={`mt-1 font-mono text-sm font-bold tabular-nums ${
                                assessment.effectiveSignals.nachBounces6m > 2
                                  ? 'text-red-700'
                                  : assessment.effectiveSignals.nachBounces6m > 0
                                    ? 'text-amber-700'
                                    : 'text-emerald-700'
                              }`}
                            >
                              {assessment.effectiveSignals.nachBounces6m} bounces
                            </dd>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                            <dt className="text-[11px] text-slate-500">Cash-flow stability (CV)</dt>
                            <dd className="mt-1 font-mono text-sm font-bold text-slate-900 tabular-nums">
                              {assessment.effectiveSignals.inflowOutflowCv.toFixed(2)}
                            </dd>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                            <dt className="text-[11px] text-slate-500">Liquidity cushion</dt>
                            <dd className="mt-1 font-mono text-sm font-bold text-slate-900 tabular-nums">
                              {Math.round(assessment.effectiveSignals.minToAvgBalanceRatio * 100)}%
                              min/avg
                            </dd>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                            <dt className="text-[11px] text-slate-500">Cash deposit regularity</dt>
                            <dd className="mt-1 font-mono text-sm font-bold text-slate-900 tabular-nums">
                              {assessment.effectiveSignals.cashDepositRegularity}/100
                            </dd>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                            <dt className="text-[11px] text-slate-500">Buffer after repayment</dt>
                            <dd className="mt-1 font-mono text-sm font-bold text-emerald-700 tabular-nums">
                              {formatINR(assessment.remainingMonthlyBuffer)}/mo
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <div className="border-t border-slate-100 pt-5">
                        <CashFlowChart assessment={assessment} />
                      </div>

                      <div className="border-t border-slate-100 pt-5">
                        <h3 className="text-sm font-semibold text-slate-900">
                          Repayment comfort &amp; deterministic next-step checklist
                        </h3>
                        {assessment.recommendedLoanAmount > 0 && (
                          <p className="mt-1 text-xs leading-relaxed text-slate-600">
                            Estimated monthly repayment of{' '}
                            <strong className="font-mono font-semibold text-slate-900 tabular-nums">
                              {formatINR(assessment.estimatedMonthlyRepayment)}
                            </strong>{' '}
                            leaves{' '}
                            <strong className="font-mono font-semibold text-emerald-700 tabular-nums">
                              {formatINR(assessment.remainingMonthlyBuffer)}/mo
                            </strong>{' '}
                            from your {formatINR(Math.max(0, assessment.monthlyNetSurplus))}{' '}
                            verified surplus. {assessment.repaymentRationale}
                            {assessment.recommendedLoanAmount < requestedLoan &&
                              !assessment.starterTrancheLadder.isActive && (
                                <>
                                  {' '}
                                  Exposure was right-sized to stay safely inside the{' '}
                                  {assessment.maxRepaymentRatioPercent}% Safe Repayment Capacity
                                  ceiling.
                                </>
                              )}
                          </p>
                        )}

                        <ul className="mt-3 divide-y divide-slate-100">
                          {assessment.borrowerImprovementSteps.map((item) => (
                            <li key={item.title} className="py-2.5 first:pt-0 last:pb-0">
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <span className="text-xs font-semibold text-slate-900">
                                  {item.title}
                                </span>
                                <span className="font-mono text-[11px] font-medium text-teal-700">
                                  {item.targetMetric}
                                </span>
                              </div>
                              <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                                {item.detail}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  ) : (
                    /* TAB 3: CONSENT & PRIVACY (Live Countdown, Edit Amount, Revoke Consent) */
                    <motion.div
                      key="borrower-tab-privacy"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-base font-bold tracking-tight text-slate-900">
                            Active RBI Account Aggregator Consent
                          </h2>
                          <p className="mt-1 text-xs text-slate-600">
                            Control your revocable 10-minute read-only session and data privacy
                            preferences.
                          </p>
                        </div>

                        <div className="rounded-lg border border-teal-200 bg-teal-50/70 px-3.5 py-2 text-right">
                          <p className="text-[10px] font-semibold text-teal-800">
                            Session Expires In
                          </p>
                          <p className="font-mono text-lg font-bold text-teal-950 tabular-nums">
                            {formatCountdown(remainingConsentSeconds)}
                          </p>
                        </div>
                      </div>

                      <div
                        className="flex items-start gap-2.5 rounded-lg border border-teal-200 bg-teal-50/50 p-3.5"
                        role="note"
                      >
                        <ShieldCheck
                          className="mt-0.5 h-4 w-4 shrink-0 text-teal-800"
                          aria-hidden="true"
                        />
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-teal-950">
                            Privacy &amp; Zero-Retention Guarantee Active
                          </p>
                          <p className="text-xs leading-relaxed text-teal-900">
                            Raw bank statement lines were discarded immediately after computing the
                            5 derived signals in memory. Revoking consent clears your session and
                            withdraws your request from the partner queue.
                          </p>
                        </div>
                      </div>

                      <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/60 px-4 text-xs">
                        <div className="flex items-center justify-between gap-2 py-2.5">
                          <dt className="text-slate-500">Account Aggregator Handle</dt>
                          <dd className="font-mono font-semibold text-teal-800">
                            {account.aaHandle}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-2 py-2.5">
                          <dt className="text-slate-500">Linked FIP Account</dt>
                          <dd className="font-mono font-semibold text-slate-900">
                            {account.accountMask}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-2 py-2.5">
                          <dt className="text-slate-500">Data Retention Mode</dt>
                          <dd className="font-semibold text-emerald-700">
                            Zero Raw Retention (In-Memory Ratios Only)
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-2 py-2.5">
                          <dt className="text-slate-500">Partner Lender Sync</dt>
                          <dd className="font-semibold text-slate-900">
                            {submittedApplication
                              ? `Submitted · Ref ${submittedApplication.referenceCode}`
                              : 'Local preview only (not yet submitted)'}
                          </dd>
                        </div>
                      </dl>

                      {/* Update Requested Loan Amount Inline */}
                      <div className="border-t border-slate-100 pt-4">
                        <h3 className="text-xs font-semibold text-slate-900">
                          Adjust Requested Loan Amount or Rhythm
                        </h3>
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          {QUICK_LOAN_AMOUNTS.map((amount) => {
                            const active = requestedLoan === amount;
                            return (
                              <button
                                key={amount}
                                type="button"
                                onClick={() => onRequestedLoanChange(amount)}
                                className={`rounded-md border px-3 py-1.5 font-mono text-xs font-semibold tabular-nums transition-colors ${
                                  active
                                    ? 'border-teal-700 bg-teal-50 text-teal-900'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                }`}
                              >
                                {formatCompactINR(amount)}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => onStepChange('request')}
                            className="ml-auto text-xs font-semibold text-teal-800 hover:text-teal-900"
                          >
                            Edit full request →
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                        <p className="text-xs text-slate-500">
                          Need to stop sharing immediately? Revoke access at any time.
                        </p>
                        <button
                          type="button"
                          onClick={onRevokeConsent}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-xs font-semibold text-red-800 transition-all duration-150 hover:bg-red-100 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                        >
                          <ShieldOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>Revoke Consent</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
