import {
  CreditAssessment,
  LoanApplication,
  PolicyReasonCode,
  ScorecardPillar,
  StressTestScenario,
  UnderwriterStatus,
} from '../types/credit';
import { formatINR } from '../utils/format';
import { AiExplanationCard } from './AiExplanationCard';
import { CashFlowChart } from './CashFlowChart';
import { getReadinessDescriptor, StabilityGauge } from './StabilityGauge';
import { StarterTrancheLadderCard } from './StarterTrancheLadderCard';
import { isStressActive, StressTestPanel } from './StressTestPanel';

interface LenderEvaluatorProps {
  application: LoanApplication;
  baselineAssessment: CreditAssessment;
  activeAssessment: CreditAssessment;
  stressScenario: StressTestScenario;
  isMobileFrame: boolean;
  onStressScenarioChange: (scenario: StressTestScenario) => void;
  onReviewStatusChange: (appId: string, status: UnderwriterStatus) => void;
}

const REVIEW_STATUSES: UnderwriterStatus[] = [
  'AA Verified',
  'In Review',
  'Guardrail Hold',
  'Pre-Approved',
];

const PILLAR_STATUS_TEXT: Record<ScorecardPillar['status'], string> = {
  Strong: 'text-emerald-700',
  Moderate: 'text-teal-700',
  Watch: 'text-red-700',
  Reweighted: 'text-slate-500',
};

const REASON_CATEGORY_TEXT: Record<PolicyReasonCode['category'], string> = {
  'Knock-Out': 'text-red-700',
  Watch: 'text-amber-700',
  Sizing: 'text-teal-800',
  Inclusion: 'text-teal-700',
  Strength: 'text-emerald-700',
};

function summarizeStress(scenario: StressTestScenario): string {
  const parts: string[] = [];
  if (scenario.inflowDipPercent > 0) parts.push(`-${scenario.inflowDipPercent}% inflow dip`);
  if (scenario.additionalNachBounces > 0)
    parts.push(`+${scenario.additionalNachBounces} NACH bounces`);
  if (scenario.outflowShockPercent > 0)
    parts.push(`+${scenario.outflowShockPercent}% outflow shock`);
  return parts.join(', ');
}

export function LenderEvaluator({
  application,
  baselineAssessment,
  activeAssessment,
  stressScenario,
  isMobileFrame,
  onStressScenarioChange,
  onReviewStatusChange,
}: LenderEvaluatorProps) {
  const stressed = isStressActive(stressScenario);
  const stressSummary = stressed ? summarizeStress(stressScenario) : undefined;

  const {
    effectiveSignals,
    monthlyNetSurplus,
    expenseCoverageRatio,
    operatingMarginPercent,
    isCashHeavyProfile,
    profileTag,
    weightingModeLabel,
    starterTrancheLadder,
    stabilityScore,
    readinessTier,
    pillars,
    knockOutTriggered,
    knockOutRules,
    recommendedLoanAmount,
    requestedLoan,
    loanCoverageRatio,
    maxRepaymentRatioPercent,
    maxSafeMonthlyRepayment,
    estimatedMonthlyRepayment,
    periodicInstalment,
    tenureMonths,
    repaymentSchedule,
    indicativeInterestRange,
    policyReasonCodes,
    structuringGuardrails,
    underwritingDecision,
  } = activeAssessment;

  const isDeclined = recommendedLoanAmount === 0;
  const isDeficit = monthlyNetSurplus <= 0;

  const snapshotKey = [
    application.id,
    application.requestedLoan,
    stressScenario.inflowDipPercent,
    stressScenario.additionalNachBounces,
    stressScenario.outflowShockPercent,
  ].join('-');

  return (
    <div className="space-y-5">
      {/* Lender-Only Stress-Test Simulator Panel */}
      <StressTestPanel
        scenario={stressScenario}
        baseline={baselineAssessment}
        stressed={activeAssessment}
        isMobileFrame={isMobileFrame}
        onScenarioChange={onStressScenarioChange}
      />

      {/* Full Deterministic Underwriting Profile */}
      <div className="rounded-xl border border-slate-200 bg-white">
        {/* Applicant Identity Header */}
        <div className="border-b border-slate-200 p-5 sm:p-6">
          <div
            className={`flex gap-3 ${
              isMobileFrame
                ? 'flex-col'
                : 'flex-col justify-between sm:flex-row sm:items-start'
            }`}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                <span className="font-mono font-semibold text-slate-800 tabular-nums">
                  {application.referenceCode}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[11px]">{application.accountMask}</span>
                <span aria-hidden="true">·</span>
                <span
                  className={
                    isCashHeavyProfile ? 'font-semibold text-teal-800' : 'text-slate-600'
                  }
                >
                  {profileTag}
                </span>
              </div>

              <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">
                {application.businessName}
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                {application.businessType} · {application.location} · Consent:{' '}
                {application.consentGrantedAt}
              </p>
            </div>

            <div className="shrink-0">
              <label
                htmlFor="lender-review-status"
                className="block text-[11px] font-medium text-slate-500"
              >
                Queue status
              </label>
              <select
                id="lender-review-status"
                value={application.reviewStatus}
                onChange={(e) =>
                  onReviewStatusChange(application.id, e.target.value as UnderwriterStatus)
                }
                className="mt-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
              >
                {REVIEW_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Verified Bank & UPI Signals Summary Strip */}
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="font-semibold text-slate-700">
                {stressed
                  ? 'Stressed Bank & UPI Signals (Simulated Downside Active)'
                  : 'Verified Bank & UPI Signals (Read-Only)'}
              </span>
              <span className="text-slate-500">{application.aaSourceLabel}</span>
            </div>

            <dl
              className={`grid gap-x-4 gap-y-2.5 text-xs ${
                isMobileFrame ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
              }`}
            >
              <div>
                <dt className="text-[11px] text-slate-500">Unique UPI payers</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                  {effectiveSignals.uniqueUpiPayersPerMonth}/mo
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">NACH bounces (6m)</dt>
                <dd
                  className={`font-mono font-semibold tabular-nums ${
                    effectiveSignals.nachBounces6m > 2
                      ? 'text-red-700'
                      : effectiveSignals.nachBounces6m > 0
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                  }`}
                >
                  {effectiveSignals.nachBounces6m} bounces
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">Cash-flow CV</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                  {effectiveSignals.inflowOutflowCv.toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">Liquidity cushion</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                  {Math.round(effectiveSignals.minToAvgBalanceRatio * 100)}% min/avg
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">Cash deposit reg.</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                  {effectiveSignals.cashDepositRegularity}/100
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">Requested loan</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatINR(requestedLoan)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Deterministic Score, Hard Knock-Out Rules & Formula-Driven Terms */}
        <div className="p-5 sm:p-6">
          <div
            className={`flex gap-5 ${
              isMobileFrame
                ? 'flex-col items-center text-center'
                : 'flex-col items-start justify-between sm:flex-row sm:items-center'
            }`}
          >
            <div className={isMobileFrame ? 'order-2 w-full' : 'min-w-0 flex-1'}>
              <p className="text-xs font-medium text-slate-500">
                {stressed ? 'Stressed Stability Score' : 'Deterministic Stability Score'} ·
                Readiness Tier:{' '}
                <span className="font-semibold text-slate-900">{readinessTier}</span>
              </p>
              <h3 className="mt-1 text-base font-bold tracking-tight text-slate-900">
                {underwritingDecision}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {getReadinessDescriptor(readinessTier)}
              </p>
            </div>

            <div className={isMobileFrame ? 'order-1' : 'shrink-0'}>
              <StabilityGauge score={stabilityScore} tier={readinessTier} />
            </div>
          </div>

          {/* Hard Knock-Out Rules Strip */}
          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="flex items-baseline justify-between gap-2">
              <h4 className="text-xs font-semibold text-slate-900">Hard Knock-Out Rules</h4>
              <span
                className={`font-mono text-xs font-semibold ${
                  knockOutTriggered ? 'text-red-700' : 'text-emerald-700'
                }`}
              >
                {knockOutTriggered ? 'KNOCK-OUT TRIGGERED' : 'ALL CLEAR'}
              </span>
            </div>

            <div
              className={`mt-2.5 grid gap-2.5 ${
                isMobileFrame ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
              }`}
            >
              {knockOutRules.map((rule) => (
                <div
                  key={rule.code}
                  className={`rounded-lg border p-3 text-xs ${
                    rule.triggered
                      ? 'border-red-200 bg-red-50/70'
                      : 'border-slate-200 bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-slate-900">{rule.label}</span>
                    <span
                      className={`font-mono text-[11px] font-bold shrink-0 ${
                        rule.triggered ? 'text-red-700' : 'text-emerald-700'
                      }`}
                    >
                      {rule.triggered ? 'TRIGGERED' : 'PASS'}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-slate-700 tabular-nums">
                    Observed: {rule.observed} · Rule: {rule.threshold}
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-slate-600">
                    {rule.actionTaken}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Formula-Driven Fair Credit Terms */}
          <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200">
            <div className="bg-slate-50/70 p-3.5">
              <p className="text-xs text-slate-500">Recommended loan</p>
              <p className="mt-1 font-mono text-lg font-bold tracking-tight text-slate-900 tabular-nums">
                {isDeclined ? '₹0' : formatINR(recommendedLoanAmount)}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                {isDeclined
                  ? 'Exposure capped at ₹0'
                  : starterTrancheLadder.isActive
                    ? 'Starter Tranche 1 Cap'
                    : `${Math.round(loanCoverageRatio * 100)}% of ${formatINR(requestedLoan)}`}
              </p>
            </div>

            <div className="bg-slate-50/70 p-3.5">
              <p className="text-xs text-slate-500">Tenure &amp; repayment cap</p>
              <p className="mt-1 font-mono text-lg font-bold tracking-tight text-slate-900 tabular-nums">
                {isDeclined ? '—' : `${tenureMonths} months`}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                Cap: {maxRepaymentRatioPercent}% surplus ({formatINR(maxSafeMonthlyRepayment)}/mo)
              </p>
            </div>

            <div className="bg-slate-50/70 p-3.5">
              <p className="text-xs text-slate-500">Periodic instalment</p>
              <p className="mt-1 text-lg font-bold tracking-tight text-slate-900">
                {isDeclined ? '—' : repaymentSchedule}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                {isDeclined
                  ? 'N/A'
                  : `Est. ${formatINR(periodicInstalment)}/cycle (${formatINR(estimatedMonthlyRepayment)}/mo)`}
              </p>
            </div>

            <div className="bg-slate-50/70 p-3.5">
              <p className="text-xs text-slate-500">Indicative interest</p>
              <p className="mt-1 font-mono text-base font-bold tracking-tight text-slate-900 tabular-nums sm:text-lg">
                {isDeclined ? '—' : indicativeInterestRange}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {isDeclined ? 'N/A' : 'Deterministic risk band'}
              </p>
            </div>
          </div>
        </div>

        {/* Starter Tranche Ladder + Live Cash-Flow Chart + AI Credit Memo + Scorecard + Codes + Guardrails */}
        <div className="space-y-6 border-t border-slate-200 p-5 sm:p-6">
          {starterTrancheLadder.isActive && (
            <StarterTrancheLadderCard
              ladder={starterTrancheLadder}
              recommendedLoanAmount={recommendedLoanAmount}
              isMobileFrame={isMobileFrame}
            />
          )}

          {/* Live Cash-Flow & Repayment Capacity Bar Chart */}
          <CashFlowChart
            assessment={activeAssessment}
            baselineAssessment={baselineAssessment}
            isStressed={stressed}
          />

          {/* Explanation-Only Read-Only AI Credit Memo Layer (Lender Portal Only) */}
          <div className="border-t border-slate-100 pt-5">
            <AiExplanationCard
              businessName={application.businessName}
              businessType={application.businessType}
              location={application.location}
              assessment={activeAssessment}
              isStressed={stressed}
              stressSummary={stressSummary}
              snapshotKey={snapshotKey}
            />
          </div>

          {/* Weighted 4-Signal Scorecard Table */}
          <div className="border-t border-slate-100 pt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Weighted deterministic scorecard (0–100)
              </h3>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {weightingModeLabel}
              </span>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-medium text-slate-500">
                    <th className="py-2 pr-3 font-medium">Pillar</th>
                    {!isMobileFrame && <th className="py-2 px-2 font-medium">Observed signal</th>}
                    <th className="py-2 px-2 text-right font-medium">Wt</th>
                    <th className="py-2 px-2 text-right font-medium">Sub</th>
                    <th className="py-2 pl-2 text-right font-medium">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {pillars.map((pillar) => (
                    <tr key={pillar.id} className="align-top">
                      <td className="py-2.5 pr-3">
                        <div className="font-medium text-slate-900">{pillar.label}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-slate-500">
                          {isMobileFrame ? `${pillar.observedDisplay} · ` : ''}
                          <span className={`font-semibold ${PILLAR_STATUS_TEXT[pillar.status]}`}>
                            {pillar.status}
                          </span>
                        </div>
                      </td>
                      {!isMobileFrame && (
                        <td className="py-2.5 px-2 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                          {pillar.observedDisplay}
                        </td>
                      )}
                      <td className="py-2.5 px-2 text-right font-mono text-slate-500 tabular-nums whitespace-nowrap">
                        {pillar.weightPercent}%
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                        {pillar.subScore}
                      </td>
                      <td className="py-2.5 pl-2 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {pillar.weightedPoints.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Verified Cash-Flow Ratios */}
          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-900">
              Verified monthly cash flow &amp; coverage
            </h3>
            <dl
              className={`mt-3 grid gap-x-4 gap-y-3 ${
                isMobileFrame ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'
              }`}
            >
              <div>
                <dt className="text-[11px] text-slate-500">Avg monthly inflow</dt>
                <dd className="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums">
                  {formatINR(effectiveSignals.avgMonthlyInflow)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">Avg monthly outflow</dt>
                <dd className="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums">
                  {formatINR(effectiveSignals.avgMonthlyOutflow)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">Monthly net surplus</dt>
                <dd
                  className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${
                    isDeficit ? 'text-red-700' : 'text-emerald-700'
                  }`}
                >
                  {monthlyNetSurplus < 0
                    ? `-${formatINR(Math.abs(monthlyNetSurplus))}`
                    : formatINR(monthlyNetSurplus)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">Inflow / outflow</dt>
                <dd className="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums">
                  {expenseCoverageRatio.toFixed(2)}x{' '}
                  <span className="text-[11px] font-normal text-slate-500">
                    ({Math.round(operatingMarginPercent)}%)
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Explicit Policy Reason Codes */}
          <div className="border-t border-slate-100 pt-5">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Explicit policy reason codes
              </h3>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {policyReasonCodes.length} codes emitted
              </span>
            </div>

            <ul className="mt-3 divide-y divide-slate-100">
              {policyReasonCodes.map((reason) => (
                <li key={reason.code} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-900">
                      {reason.code}
                    </span>
                    <span
                      className={`font-mono text-[11px] font-semibold ${REASON_CATEGORY_TEXT[reason.category]}`}
                    >
                      {reason.category}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs font-medium text-slate-800">{reason.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{reason.detail}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Fair Loan Structuring Guardrails */}
          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-900">
              Fair credit structuring guardrails
            </h3>
            <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-slate-700">
              {structuringGuardrails.map((guardrail, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="font-mono font-semibold text-teal-700 tabular-nums">
                    0{index + 1}.
                  </span>
                  <span>{guardrail}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-b-xl border-t border-slate-200 bg-slate-50/70 px-5 py-3 text-[11px] leading-relaxed text-slate-500 sm:px-6">
          100% deterministic TypeScript financial scoring (zero LLM in math) using synthetic
          Indian MSME sample signals. Not a binding credit sanction.
        </div>
      </div>
    </div>
  );
}
