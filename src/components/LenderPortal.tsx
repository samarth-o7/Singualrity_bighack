import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Briefcase, Lock, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  LenderQueueFilter,
  LenderStep,
  LoanApplication,
  StressTestScenario,
  UnderwriterStatus,
} from '../types/credit';
import { DEFAULT_STRESS_SCENARIO, evaluateMSMECredit } from '../utils/creditModel';
import { ApplicantQueue, EvaluatedApplication } from './ApplicantQueue';
import { LenderEvaluator } from './LenderEvaluator';

interface LenderPortalProps {
  step: LenderStep;
  partnerId: string;
  applications: LoanApplication[];
  selectedApplicationId: string;
  isMobileFrame: boolean;
  onAuthenticated: (partnerId: string) => void;
  onOpenApplication: (id: string) => void;
  onBackToQueue: () => void;
  onReviewStatusChange: (appId: string, status: UnderwriterStatus) => void;
}

export function LenderPortal({
  step,
  partnerId,
  applications,
  selectedApplicationId,
  isMobileFrame,
  onAuthenticated,
  onOpenApplication,
  onBackToQueue,
  onReviewStatusChange,
}: LenderPortalProps) {
  // Step 1 Login state
  const [nbfcIdInput, setNbfcIdInput] = useState<string>(partnerId || '');
  const [passcodeInput, setPasscodeInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Step 2 Queue filter
  const [activeFilter, setActiveFilter] = useState<LenderQueueFilter>('All');

  // Step 3 Workspace stress simulator
  const [stressScenario, setStressScenario] = useState<StressTestScenario>({
    ...DEFAULT_STRESS_SCENARIO,
  });

  // Baseline evaluation for every application in the queue
  const evaluatedItems: EvaluatedApplication[] = useMemo(
    () =>
      applications.map((application) => ({
        application,
        assessment: evaluateMSMECredit(application.signals, application.requestedLoan),
      })),
    [applications]
  );

  // KPI metrics for Queue Dashboard
  const kpis = useMemo(() => {
    let strongCount = 0;
    let moderateCount = 0;
    let watchlistCount = 0;
    let pendingCount = 0;
    let liveBorrowerCount = 0;

    for (const item of evaluatedItems) {
      if (item.assessment.readinessTier === 'Strong') strongCount += 1;
      else if (item.assessment.readinessTier === 'Moderate') moderateCount += 1;
      else watchlistCount += 1;

      if (item.application.reviewStatus === 'Pending Review') pendingCount += 1;
      if (item.application.source === 'borrower-consent') liveBorrowerCount += 1;
    }

    return {
      total: evaluatedItems.length,
      strongCount,
      moderateCount,
      watchlistCount,
      pendingCount,
      liveBorrowerCount,
    };
  }, [evaluatedItems]);

  const selectedItem =
    evaluatedItems.find((item) => item.application.id === selectedApplicationId) ??
    evaluatedItems[0];

  const activeAssessment = useMemo(() => {
    if (!selectedItem) return null;
    return evaluateMSMECredit(
      selectedItem.application.signals,
      selectedItem.application.requestedLoan,
      stressScenario
    );
  }, [selectedItem, stressScenario]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nbfcIdInput.trim() || passcodeInput.trim().length < 4) {
      setLoginError('Enter a Partner NBFC ID and at least 4 characters for passcode.');
      return;
    }
    setLoginError(null);
    onAuthenticated(nbfcIdInput.trim().toUpperCase());
  };

  const handleQuickDemoLogin = () => {
    const demoId = 'NBFC-FIU-IN-4092';
    setNbfcIdInput(demoId);
    setPasscodeInput('884210');
    setLoginError(null);
    onAuthenticated(demoId);
  };

  const handleSelectApplicant = (id: string) => {
    setStressScenario({ ...DEFAULT_STRESS_SCENARIO });
    onOpenApplication(id);
  };

  return (
    <div className={isMobileFrame ? 'space-y-4' : 'mx-auto max-w-[1240px] space-y-6'}>
      <AnimatePresence mode="wait">
        {/* ===================================================================
            STEP 1 — LENDER / FIU PARTNER LOGIN
            =================================================================== */}
        {step === 'login' && (
          <motion.div
            key="lender-step-login"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-md py-2 sm:py-6"
          >
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900/8 text-slate-900">
                  <Briefcase className="h-5 w-5" aria-hidden="true" />
                </div>
                <button
                  type="button"
                  onClick={handleQuickDemoLogin}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50/70 px-3 py-1.5 text-xs font-semibold text-teal-900 transition-all duration-150 hover:border-teal-400 hover:bg-teal-50 active:scale-[0.98] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  <Zap className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                  <span>Quick Demo Login</span>
                </button>
              </div>

              <h1 className="mt-4 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                FIU / NBFC Partner Sign-In
              </h1>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Authenticate to access the deterministic underwriting queue, live stress simulator,
                and credit committee decision workspace.
              </p>

              <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="lender-partner-id"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Partner NBFC / FIU ID
                  </label>
                  <input
                    id="lender-partner-id"
                    type="text"
                    placeholder="NBFC-FIU-IN-4092"
                    value={nbfcIdInput}
                    onChange={(e) => {
                      setNbfcIdInput(e.target.value);
                      setLoginError(null);
                    }}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm font-semibold text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="lender-passcode"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Underwriter Passcode
                  </label>
                  <input
                    id="lender-passcode"
                    type="password"
                    placeholder="••••••"
                    value={passcodeInput}
                    onChange={(e) => {
                      setPasscodeInput(e.target.value);
                      setLoginError(null);
                    }}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm font-semibold text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                  />
                </div>

                {loginError && (
                  <p className="text-xs font-medium text-red-700" role="alert">
                    {loginError}
                  </p>
                )}

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition-all duration-150 hover:bg-slate-800 active:scale-[0.99] sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                >
                  <span>Sign In to Underwriting Desk</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>

              <div className="mt-5 flex items-start gap-2 border-t border-slate-100 pt-4 text-[11px] text-slate-500">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden="true" />
                <span>
                  Simulated FIU institutional authentication · uses synthetic RBI Account Aggregator
                  derived profiles.
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ===================================================================
            STEP 2 — UNDERWRITING QUEUE DASHBOARD (KPIs + Filter Tabs + Queue)
            =================================================================== */}
        {step === 'queue' && (
          <motion.div
            key="lender-step-queue"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-5"
          >
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] font-medium text-slate-500">
                  FIU Partner · {partnerId || 'NBFC-FIU-IN-4092'}
                </p>
                <h1
                  className={
                    isMobileFrame
                      ? 'mt-0.5 text-base font-bold tracking-tight text-slate-900'
                      : 'mt-0.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl'
                  }
                >
                  Underwriting Queue Dashboard
                </h1>
                <p className="mt-0.5 text-xs text-slate-600">
                  Select any applicant to inspect tamper-resistant bank/UPI signals, run downside
                  stress tests, and record credit decisions.
                </p>
              </div>
            </div>

            {/* Top 4 KPI Summary Cards */}
            <div
              className={`grid gap-3 ${
                isMobileFrame ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'
              }`}
            >
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">Total Applications</p>
                <p className="mt-1.5 font-mono text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                  {kpis.total}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {kpis.liveBorrowerCount > 0
                    ? `Includes ${kpis.liveBorrowerCount} live borrower submission`
                    : 'Synthetic MSME sample queue'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">Strong / Moderate</p>
                <p className="mt-1.5 font-mono text-2xl font-bold tracking-tight text-emerald-700 tabular-nums">
                  {kpis.strongCount + kpis.moderateCount}
                </p>
                <p className="mt-1 font-mono text-[11px] text-slate-500 tabular-nums">
                  {kpis.strongCount} Strong · {kpis.moderateCount} Moderate
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">Watchlist Tier</p>
                <p className="mt-1.5 font-mono text-2xl font-bold tracking-tight text-amber-700 tabular-nums">
                  {kpis.watchlistCount}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Guardrail cap or knock-out review
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">Pending Decisions</p>
                <p className="mt-1.5 font-mono text-2xl font-bold tracking-tight text-teal-800 tabular-nums">
                  {kpis.pendingCount}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Awaiting underwriter action
                </p>
              </div>
            </div>

            {/* Filterable Applicant Queue */}
            <ApplicantQueue
              items={evaluatedItems}
              activeFilter={activeFilter}
              isMobileFrame={isMobileFrame}
              onFilterChange={setActiveFilter}
              onSelectApplication={handleSelectApplicant}
            />
          </motion.div>
        )}

        {/* ===================================================================
            STEP 3 — APPLICANT UNDERWRITING WORKSPACE
            =================================================================== */}
        {step === 'workspace' && selectedItem && activeAssessment && (
          <motion.div
            key={`lender-step-workspace-${selectedItem.application.id}`}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            {/* Workspace Breadcrumb & Back to Queue */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={onBackToQueue}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-all duration-150 hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Back to Queue</span>
              </button>

              <p className="text-xs text-slate-500 truncate">
                Underwriting Queue <span aria-hidden="true">/</span>{' '}
                <span className="font-mono font-semibold text-slate-800">
                  {selectedItem.application.referenceCode}
                </span>{' '}
                <span aria-hidden="true">·</span>{' '}
                <span className="font-medium text-slate-700">
                  {selectedItem.application.businessName}
                </span>
              </p>
            </div>

            <LenderEvaluator
              application={selectedItem.application}
              baselineAssessment={selectedItem.assessment}
              activeAssessment={activeAssessment}
              stressScenario={stressScenario}
              isMobileFrame={isMobileFrame}
              onStressScenarioChange={setStressScenario}
              onReviewStatusChange={onReviewStatusChange}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
