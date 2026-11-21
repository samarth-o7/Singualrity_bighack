import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { BorrowerPortal } from './components/BorrowerPortal';
import { Header } from './components/Header';
import { LandingScreen } from './components/LandingScreen';
import { LenderPortal } from './components/LenderPortal';
import { ToastContainer } from './components/ToastContainer';
import {
  createSyntheticBorrowerAccount,
  INITIAL_LENDER_QUEUE,
} from './data/msmeProfiles';
import {
  AppRoute,
  BorrowerAccountProfile,
  BorrowerStep,
  LenderStep,
  LoanApplication,
  RepaymentSchedule,
  ToastItem,
  ToastVariant,
  UnderwriterStatus,
  ViewMode,
} from './types/credit';
import { formatINR } from './utils/format';

const BORROWER_CONSENT_APP_ID = 'app-borrower-aa-consent';

function formatCurrentTime(): string {
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date());
}

export default function App() {
  // App-wide navigation & viewport frame
  const [route, setRoute] = useState<AppRoute>('landing');
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');

  // Borrower multi-step isolated state (dynamically created account, zero hardcoded store)
  const [borrowerStep, setBorrowerStep] = useState<BorrowerStep>('login');
  const [borrowerAccount, setBorrowerAccount] = useState<BorrowerAccountProfile | null>(null);
  const [requestedLoan, setRequestedLoan] = useState<number>(100000);
  const [preferredRepaymentSchedule, setPreferredRepaymentSchedule] =
    useState<RepaymentSchedule>('Weekly');
  const [consentGrantedAtMs, setConsentGrantedAtMs] = useState<number | null>(null);

  // Lender multi-screen state
  const [lenderStep, setLenderStep] = useState<LenderStep>('login');
  const [lenderPartnerId, setLenderPartnerId] = useState<string>('');
  const [isLenderAuthenticated, setIsLenderAuthenticated] = useState<boolean>(false);
  const [applications, setApplications] = useState<LoanApplication[]>(
    INITIAL_LENDER_QUEUE
  );
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>(
    INITIAL_LENDER_QUEUE[0].id
  );

  // Toast notifications
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback(
    (title: string, description?: string, variant: ToastVariant = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-2), { id, title, description, variant }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 3600);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const isBorrowerAuthenticated = borrowerAccount !== null;

  const submittedBorrowerApp = useMemo(
    () => applications.find((app) => app.id === BORROWER_CONSENT_APP_ID) ?? null,
    [applications]
  );

  const hasUnsyncedChanges = Boolean(
    submittedBorrowerApp &&
      borrowerAccount &&
      (submittedBorrowerApp.requestedLoan !== requestedLoan ||
        submittedBorrowerApp.preferredRepaymentSchedule !== preferredRepaymentSchedule ||
        submittedBorrowerApp.businessName !== borrowerAccount.businessName ||
        submittedBorrowerApp.aaHandle !== borrowerAccount.aaHandle)
  );

  // Navigation handlers
  const handleGoHome = () => {
    setRoute('landing');
  };

  const handleOpenBorrowerPortal = () => {
    setRoute('borrower');
    if (!isBorrowerAuthenticated) {
      setBorrowerStep('login');
    } else if (consentGrantedAtMs !== null) {
      setBorrowerStep('dashboard');
    }
  };

  const handleOpenLenderPortal = () => {
    setRoute('lender');
    if (!isLenderAuthenticated) {
      setLenderStep('login');
    } else if (lenderStep === 'login') {
      setLenderStep('queue');
    }
  };

  const handleSwitchRole = () => {
    if (route === 'borrower') {
      setRoute('lender');
      if (!isLenderAuthenticated) {
        setLenderStep('login');
      } else if (lenderStep === 'login') {
        setLenderStep('queue');
      }
      pushToast('Switched to Lender Portal', 'NBFC / FIU Partner underwriting desk active.', 'info');
    } else {
      setRoute('borrower');
      if (!isBorrowerAuthenticated) {
        setBorrowerStep('login');
      }
      pushToast('Switched to Borrower Portal', 'Private single-applicant workspace active.', 'info');
    }
  };

  const handleLogout = () => {
    if (route === 'borrower') {
      setBorrowerAccount(null);
      setConsentGrantedAtMs(null);
      setBorrowerStep('login');
      setRoute('landing');
      pushToast('Logged Out', 'Borrower session ended securely.', 'info');
    } else if (route === 'lender') {
      setIsLenderAuthenticated(false);
      setLenderPartnerId('');
      setLenderStep('login');
      setRoute('landing');
      pushToast('Logged Out', 'FIU Partner underwriting session closed.', 'info');
    }
  };

  // Borrower flow handlers
  const handleCreateBorrowerAccount = (businessName: string, mobileNumber: string) => {
    const previousMobile = borrowerAccount?.mobileNumber;
    const nextAccount = createSyntheticBorrowerAccount(businessName, mobileNumber);
    setBorrowerAccount(nextAccount);

    // If switching to a different mobile number, require fresh RBI AA consent
    if (previousMobile && previousMobile !== nextAccount.mobileNumber) {
      setConsentGrantedAtMs(null);
    }

    setBorrowerStep('request');
    pushToast(
      'Borrower Account Ready',
      `${nextAccount.businessName} linked to ${nextAccount.aaHandle} (Synthetic Data).`,
      'success'
    );
  };

  const handleNotifyAaOtpSent = (formattedMobile: string, isResend: boolean) => {
    pushToast(
      isResend ? 'Simulated AA OTP Resent' : 'Simulated AA OTP Sent',
      `Enter any 6-digit code sent to +91 ${formattedMobile} to grant 10-min consent.`,
      'info'
    );
  };

  const handleConsentApproved = () => {
    setConsentGrantedAtMs(Date.now());
    setBorrowerStep('dashboard');
    pushToast(
      'Consent Granted',
      '10-min read-only RBI AA session active. Raw bank statement discarded.',
      'success'
    );
  };

  const handleSubmitToPartnerLender = () => {
    if (!borrowerAccount) return;
    const timestamp = `Today, ${formatCurrentTime()}`;
    const isUpdate = Boolean(submittedBorrowerApp);
    const refCode = `AA-${borrowerAccount.mobileNumber.slice(-4)}`;

    setApplications((prev) => {
      const existing = prev.find((app) => app.id === BORROWER_CONSENT_APP_ID);
      const record: LoanApplication = {
        id: BORROWER_CONSENT_APP_ID,
        referenceCode: refCode,
        profileId: 'borrower-personal',
        businessName: borrowerAccount.businessName,
        businessType: borrowerAccount.businessType,
        accountMask: borrowerAccount.accountMask,
        aaHandle: borrowerAccount.aaHandle,
        mobileNumber: borrowerAccount.mobileNumber,
        location: borrowerAccount.location,
        sectorNote: borrowerAccount.sectorNote,
        aaSourceLabel: borrowerAccount.aaSourceLabel,
        source: 'borrower-consent',
        consentGrantedAt: timestamp,
        reviewStatus: existing ? existing.reviewStatus : 'Pending Review',
        requestedLoan,
        preferredRepaymentSchedule,
        signals: { ...borrowerAccount.signals },
      };

      const others = prev.filter((app) => app.id !== BORROWER_CONSENT_APP_ID);
      return [record, ...others];
    });

    setSelectedApplicationId(BORROWER_CONSENT_APP_ID);

    pushToast(
      isUpdate ? 'Application Updated' : 'Application Submitted',
      `${borrowerAccount.businessName} (${refCode} · ${formatINR(requestedLoan)}) pushed to Partner Lender Queue.`,
      'success'
    );
  };

  const handleRevokeConsent = () => {
    setConsentGrantedAtMs(null);
    setBorrowerStep('consent');
    setApplications((prev) => {
      const remaining = prev.filter((app) => app.id !== BORROWER_CONSENT_APP_ID);
      if (selectedApplicationId === BORROWER_CONSENT_APP_ID && remaining.length > 0) {
        setSelectedApplicationId(remaining[0].id);
      }
      return remaining;
    });
    pushToast(
      'Consent Revoked',
      'Read-only RBI AA session terminated and in-memory ratios cleared.',
      'warning'
    );
  };

  // Lender flow handlers
  const handleLenderAuthenticated = (partnerId: string) => {
    setLenderPartnerId(partnerId);
    setIsLenderAuthenticated(true);
    setLenderStep('queue');
    pushToast(
      'Signed In as FIU Partner',
      `Connected to underwriting desk (${partnerId}).`,
      'success'
    );
  };

  const handleOpenApplication = (appId: string) => {
    setSelectedApplicationId(appId);
    setLenderStep('workspace');
  };

  const handleReviewStatusChange = (appId: string, status: UnderwriterStatus) => {
    const target = applications.find((a) => a.id === appId);
    setApplications((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, reviewStatus: status } : app))
    );
    pushToast(
      'Decision Saved',
      `${target ? target.businessName : 'Applicant'} updated to "${status}".`,
      status === 'Watchlist Hold' ? 'warning' : 'success'
    );
  };

  const isMobileFrame = viewMode === 'mobile';

  const screenContent = (
    <AnimatePresence mode="wait">
      {route === 'landing' && (
        <motion.div
          key="screen-landing"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <LandingScreen
            isMobileFrame={isMobileFrame}
            isBorrowerAuthenticated={isBorrowerAuthenticated}
            isLenderAuthenticated={isLenderAuthenticated}
            queueCount={applications.length}
            hasBorrowerSubmission={submittedBorrowerApp !== null}
            onSelectBorrower={handleOpenBorrowerPortal}
            onSelectLender={handleOpenLenderPortal}
          />
        </motion.div>
      )}

      {route === 'borrower' && (
        <motion.div
          key="screen-borrower"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <BorrowerPortal
            step={borrowerStep}
            account={borrowerAccount}
            requestedLoan={requestedLoan}
            preferredRepaymentSchedule={preferredRepaymentSchedule}
            consentGrantedAtMs={consentGrantedAtMs}
            submittedApplication={submittedBorrowerApp}
            hasUnsyncedChanges={hasUnsyncedChanges}
            isMobileFrame={isMobileFrame}
            onStepChange={setBorrowerStep}
            onCreateBorrowerAccount={handleCreateBorrowerAccount}
            onRequestedLoanChange={setRequestedLoan}
            onPreferredScheduleChange={setPreferredRepaymentSchedule}
            onNotifyAaOtpSent={handleNotifyAaOtpSent}
            onConsentApproved={handleConsentApproved}
            onSubmitToPartnerLender={handleSubmitToPartnerLender}
            onRevokeConsent={handleRevokeConsent}
          />
        </motion.div>
      )}

      {route === 'lender' && (
        <motion.div
          key="screen-lender"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <LenderPortal
            step={lenderStep}
            partnerId={lenderPartnerId}
            applications={applications}
            selectedApplicationId={selectedApplicationId}
            isMobileFrame={isMobileFrame}
            onAuthenticated={handleLenderAuthenticated}
            onOpenApplication={handleOpenApplication}
            onBackToQueue={() => setLenderStep('queue')}
            onReviewStatusChange={handleReviewStatusChange}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
        <Header
          route={route}
          viewMode={viewMode}
          isBorrowerAuthenticated={isBorrowerAuthenticated}
          isLenderAuthenticated={isLenderAuthenticated}
          queueCount={applications.length}
          hasBorrowerSubmission={submittedBorrowerApp !== null}
          onGoHome={handleGoHome}
          onSwitchRole={handleSwitchRole}
          onViewModeChange={setViewMode}
          onLogout={handleLogout}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {isMobileFrame ? (
            <div className="mx-auto flex flex-col items-center">
              <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
                <span>
                  {route === 'landing'
                    ? 'Home · Role Selection'
                    : route === 'borrower'
                      ? 'Borrower Portal'
                      : 'Lender Portal'}{' '}
                  · Mobile Frame
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">390px viewport</span>
              </div>

              <div className="relative w-full max-w-[390px] overflow-hidden rounded-[2rem] border-[6px] border-slate-900 bg-slate-50 shadow-xl">
                <div
                  className="flex items-center justify-center border-b border-slate-200 bg-white py-2"
                  aria-hidden="true"
                >
                  <div className="h-1.5 w-16 rounded-full bg-slate-200" />
                </div>

                <div className="h-[760px] overflow-y-auto p-3.5">{screenContent}</div>

                <ToastContainer
                  toasts={toasts}
                  isMobileFrame={true}
                  onDismiss={dismissToast}
                />
              </div>
            </div>
          ) : (
            screenContent
          )}
        </main>

        {!isMobileFrame && (
          <ToastContainer toasts={toasts} isMobileFrame={false} onDismiss={dismissToast} />
        )}
      </div>
    </MotionConfig>
  );
}
