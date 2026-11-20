import { useMemo, useState } from 'react';
import { BorrowerPortal } from './components/BorrowerPortal';
import { Header } from './components/Header';
import { LenderPortal } from './components/LenderPortal';
import {
  INITIAL_LENDER_QUEUE,
  SYNTHETIC_MSME_PROFILES,
} from './data/msmeProfiles';
import {
  LoanApplication,
  ProfileId,
  RoleMode,
  UnderwriterStatus,
  ViewMode,
} from './types/credit';

const BORROWER_CONSENT_APP_ID = 'app-borrower-aa-consent';
const BORROWER_CONSENT_REF = 'AA-2050';

function formatCurrentTime(): string {
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date());
}

export default function App() {
  const [roleMode, setRoleMode] = useState<RoleMode>('borrower');
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');

  // Borrower Portal state: selected synthetic persona, requested loan amount, and revocable consent state
  const [selectedProfileId, setSelectedProfileId] = useState<ProfileId>(
    SYNTHETIC_MSME_PROFILES[0].id
  );
  const [requestedLoan, setRequestedLoan] = useState<number>(
    SYNTHETIC_MSME_PROFILES[0].defaultRequestedLoan
  );
  const [consentGranted, setConsentGranted] = useState<boolean>(false);

  // Lender Portal queue: 4 synthetic MSME profiles + any consented submission from Borrower Portal
  const [applications, setApplications] = useState<LoanApplication[]>(
    INITIAL_LENDER_QUEUE
  );
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>(
    INITIAL_LENDER_QUEUE[0].id
  );

  const activeProfile = useMemo(
    () =>
      SYNTHETIC_MSME_PROFILES.find((p) => p.id === selectedProfileId) ??
      SYNTHETIC_MSME_PROFILES[0],
    [selectedProfileId]
  );

  const submittedBorrowerApp = useMemo(
    () => applications.find((app) => app.id === BORROWER_CONSENT_APP_ID) ?? null,
    [applications]
  );

  const hasLoanAmountChange = Boolean(
    consentGranted &&
      submittedBorrowerApp &&
      submittedBorrowerApp.requestedLoan !== requestedLoan
  );

  const upsertBorrowerApplication = (profileId: ProfileId, loanAmount: number) => {
    const profile =
      SYNTHETIC_MSME_PROFILES.find((p) => p.id === profileId) ??
      SYNTHETIC_MSME_PROFILES[0];
    const timestamp = `Today, ${formatCurrentTime()}`;

    setApplications((prev) => {
      const existing = prev.find((app) => app.id === BORROWER_CONSENT_APP_ID);
      const record: LoanApplication = {
        id: BORROWER_CONSENT_APP_ID,
        referenceCode: BORROWER_CONSENT_REF,
        profileId: profile.id,
        businessName: profile.businessName,
        businessType: profile.label,
        udyamId: profile.udyamId,
        location: profile.location,
        sectorNote: profile.sectorNote,
        aaSourceLabel: profile.aaSourceLabel,
        source: 'borrower-consent',
        consentGrantedAt: timestamp,
        reviewStatus:
          existing && existing.profileId === profile.id
            ? existing.reviewStatus
            : profile.signals.nachBounces6m > 2
              ? 'Guardrail Hold'
              : 'AA Verified',
        requestedLoan: loanAmount,
        signals: { ...profile.signals },
      };

      const others = prev.filter((app) => app.id !== BORROWER_CONSENT_APP_ID);
      return [record, ...others];
    });

    setSelectedApplicationId(BORROWER_CONSENT_APP_ID);
  };

  const handleSelectProfile = (profileId: ProfileId) => {
    const profile =
      SYNTHETIC_MSME_PROFILES.find((p) => p.id === profileId) ??
      SYNTHETIC_MSME_PROFILES[0];
    setSelectedProfileId(profile.id);
    setRequestedLoan(profile.defaultRequestedLoan);
    // Switching persona requires fresh explicit read-only AA consent
    setConsentGranted(false);
  };

  const handleGrantConsent = () => {
    setConsentGranted(true);
    upsertBorrowerApplication(activeProfile.id, requestedLoan);
  };

  const handleUpdateLoanRequest = () => {
    if (!consentGranted) return;
    upsertBorrowerApplication(activeProfile.id, requestedLoan);
  };

  const handleRevokeConsent = () => {
    setConsentGranted(false);
    setApplications((prev) => {
      const remaining = prev.filter((app) => app.id !== BORROWER_CONSENT_APP_ID);
      if (selectedApplicationId === BORROWER_CONSENT_APP_ID && remaining.length > 0) {
        setSelectedApplicationId(remaining[0].id);
      }
      return remaining;
    });
  };

  const handleReviewStatusChange = (appId: string, status: UnderwriterStatus) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, reviewStatus: status } : app))
    );
  };

  const isMobileFrame = viewMode === 'mobile';

  const workspaceContent =
    roleMode === 'borrower' ? (
      <BorrowerPortal
        profiles={SYNTHETIC_MSME_PROFILES}
        selectedProfileId={selectedProfileId}
        requestedLoan={requestedLoan}
        consentGranted={consentGranted}
        submittedApplication={submittedBorrowerApp}
        hasLoanAmountChange={hasLoanAmountChange}
        isMobileFrame={isMobileFrame}
        onSelectProfile={handleSelectProfile}
        onRequestedLoanChange={setRequestedLoan}
        onGrantConsent={handleGrantConsent}
        onUpdateLoanRequest={handleUpdateLoanRequest}
        onRevokeConsent={handleRevokeConsent}
      />
    ) : (
      <LenderPortal
        applications={applications}
        selectedApplicationId={selectedApplicationId}
        isMobileFrame={isMobileFrame}
        onSelectApplication={setSelectedApplicationId}
        onReviewStatusChange={handleReviewStatusChange}
      />
    );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Header
        roleMode={roleMode}
        viewMode={viewMode}
        queueCount={applications.length}
        hasBorrowerSubmission={submittedBorrowerApp !== null}
        onRoleModeChange={setRoleMode}
        onViewModeChange={setViewMode}
      />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {isMobileFrame ? (
          <div className="mx-auto flex flex-col items-center">
            <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
              <span>
                {roleMode === 'borrower' ? 'Borrower Portal' : 'Lender Portal'} · Mobile Frame
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">390px viewport</span>
            </div>

            <div className="w-full max-w-[390px] overflow-hidden rounded-[2rem] border-[6px] border-slate-900 bg-slate-50 shadow-xl">
              <div
                className="flex items-center justify-center border-b border-slate-200 bg-white py-2"
                aria-hidden="true"
              >
                <div className="h-1.5 w-16 rounded-full bg-slate-200" />
              </div>

              <div className="max-h-[780px] overflow-y-auto p-3.5">{workspaceContent}</div>
            </div>
          </div>
        ) : (
          workspaceContent
        )}
      </main>
    </div>
  );
}
