import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import {
  LoanApplication,
  ReadinessTier,
  StressTestScenario,
  UnderwriterStatus,
} from '../types/credit';
import {
  DEFAULT_STRESS_SCENARIO,
  evaluateMSMECredit,
} from '../utils/creditModel';
import { ApplicantQueue, EvaluatedApplication } from './ApplicantQueue';
import { LenderEvaluator } from './LenderEvaluator';

interface LenderPortalProps {
  applications: LoanApplication[];
  selectedApplicationId: string;
  isMobileFrame: boolean;
  onSelectApplication: (id: string) => void;
  onReviewStatusChange: (appId: string, status: UnderwriterStatus) => void;
}

export function LenderPortal({
  applications,
  selectedApplicationId,
  isMobileFrame,
  onSelectApplication,
  onReviewStatusChange,
}: LenderPortalProps) {
  const [tierFilter, setTierFilter] = useState<'All' | ReadinessTier>('All');
  const [mobileShowDetail, setMobileShowDetail] = useState<boolean>(false);
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

  const selectedItem =
    evaluatedItems.find((item) => item.application.id === selectedApplicationId) ??
    evaluatedItems[0];

  // Stressed evaluation strictly for the currently open applicant in Lender View
  const activeAssessment = useMemo(() => {
    if (!selectedItem) return null;
    return evaluateMSMECredit(
      selectedItem.application.signals,
      selectedItem.application.requestedLoan,
      stressScenario
    );
  }, [selectedItem, stressScenario]);

  const handleSelect = (id: string) => {
    onSelectApplication(id);
    setStressScenario({ ...DEFAULT_STRESS_SCENARIO });
    if (isMobileFrame) {
      setMobileShowDetail(true);
    }
  };

  if (isMobileFrame) {
    return (
      <div className="space-y-3">
        <div>
          <h1 className="text-base font-bold tracking-tight text-slate-900">
            Lender Underwriting Queue
          </h1>
          <p className="mt-0.5 text-xs text-slate-600">
            Deterministic RBI AA scorecard, knock-out guardrails, and downside stress testing.
          </p>
        </div>

        {mobileShowDetail && selectedItem && activeAssessment ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setMobileShowDetail(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Back to Applicant Queue ({applications.length})</span>
            </button>

            <LenderEvaluator
              application={selectedItem.application}
              baselineAssessment={selectedItem.assessment}
              activeAssessment={activeAssessment}
              stressScenario={stressScenario}
              isMobileFrame={true}
              onStressScenarioChange={setStressScenario}
              onReviewStatusChange={onReviewStatusChange}
            />
          </div>
        ) : (
          <ApplicantQueue
            items={evaluatedItems}
            selectedId={selectedItem?.application.id ?? ''}
            tierFilter={tierFilter}
            onTierFilterChange={setTierFilter}
            onSelectApplication={handleSelect}
          />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1320px]">
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl text-balance">
            Underwriting Queue & Stress-Test Evaluator
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Inspect tamper-resistant AA scorecards, hard knock-out rules, policy reason codes, and
            simulate downside scenarios live.
          </p>
        </div>
        <p className="text-xs text-slate-500 whitespace-nowrap">
          Lender Portal · Deterministic Credit Policy Engine
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4 lg:sticky lg:top-20">
          <ApplicantQueue
            items={evaluatedItems}
            selectedId={selectedItem?.application.id ?? ''}
            tierFilter={tierFilter}
            onTierFilterChange={setTierFilter}
            onSelectApplication={handleSelect}
          />
        </div>

        <div className="lg:col-span-8">
          {selectedItem && activeAssessment && (
            <LenderEvaluator
              application={selectedItem.application}
              baselineAssessment={selectedItem.assessment}
              activeAssessment={activeAssessment}
              stressScenario={stressScenario}
              isMobileFrame={false}
              onStressScenarioChange={setStressScenario}
              onReviewStatusChange={onReviewStatusChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
