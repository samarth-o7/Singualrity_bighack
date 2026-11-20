import { useEffect, useState } from 'react';
import { FileText, Loader2, Sparkles } from 'lucide-react';
import {
  BorrowerAiExplanation,
  CreditAssessment,
  LenderAiMemo,
} from '../types/credit';
import {
  buildDeterministicBorrowerFallback,
  buildDeterministicLenderFallback,
} from '../utils/explanationFallback';

interface AiExplanationCardProps {
  role: 'borrower' | 'lender';
  businessName: string;
  businessType: string;
  location: string;
  assessment: CreditAssessment;
  isStressed?: boolean;
  stressSummary?: string;
  /** Unique fingerprint of the current deterministic snapshot to clear stale text */
  snapshotKey: string;
}

export function AiExplanationCard({
  role,
  businessName,
  businessType,
  location,
  assessment,
  isStressed = false,
  stressSummary,
  snapshotKey,
}: AiExplanationCardProps) {
  const [loading, setLoading] = useState(false);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [borrowerResult, setBorrowerResult] = useState<BorrowerAiExplanation | null>(null);
  const [lenderResult, setLenderResult] = useState<LenderAiMemo | null>(null);

  // Reset explanation whenever deterministic metrics or applicant change so read-only text stays 100% synced
  useEffect(() => {
    setBorrowerResult(null);
    setLenderResult(null);
    setSourceLabel(null);
    setFallbackNotice(null);
  }, [snapshotKey, role]);

  const handleGenerate = async () => {
    setLoading(true);
    setFallbackNotice(null);

    const payload = {
      role,
      businessName,
      businessType,
      location,
      isStressed,
      stressSummary,
      metrics: {
        stabilityScore: assessment.stabilityScore,
        readinessTier: assessment.readinessTier,
        profileTag: assessment.profileTag,
        isCashHeavyProfile: assessment.isCashHeavyProfile,
        knockOutTriggered: assessment.knockOutTriggered,
        knockOutCodes: assessment.knockOutRules
          .filter((r) => r.triggered)
          .map((r) => r.code),
        avgMonthlyInflow: assessment.effectiveSignals.avgMonthlyInflow,
        avgMonthlyOutflow: assessment.effectiveSignals.avgMonthlyOutflow,
        monthlyNetSurplus: assessment.monthlyNetSurplus,
        maxSafeMonthlyEmi: assessment.maxSafeMonthlyEmi,
        maxEmiRatioPercent: assessment.maxEmiRatioPercent,
        requestedLoan: assessment.requestedLoan,
        recommendedLoanAmount: assessment.recommendedLoanAmount,
        tenureMonths: assessment.tenureMonths,
        repaymentSchedule: assessment.repaymentSchedule,
        indicativeInterestRange: assessment.indicativeInterestRange,
        starterTrancheActive: assessment.starterTrancheLadder.isActive,
        starterTranchePath: assessment.starterTrancheLadder.isActive
          ? 'Tranche 1: ₹15,000 (12m) → Tranche 2: ₹25,000 → Tranche 3: ₹50,000'
          : undefined,
        underwritingDecision: assessment.underwritingDecision,
        policyReasonCodes: assessment.policyReasonCodes,
      },
    };

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await response.json();
      if (!response.ok || !body?.data) {
        throw new Error(body?.error || `HTTP ${response.status}`);
      }

      if (role === 'borrower') {
        setBorrowerResult(body.data as BorrowerAiExplanation);
      } else {
        setLenderResult(body.data as LenderAiMemo);
      }
      setSourceLabel(`Gemini (${body.model || 'gemini-4-hydrogen'}) · Read-Only`);
    } catch (err: unknown) {
      const reason =
        err instanceof Error ? err.message : 'Unable to reach Gemini endpoint';
      setFallbackNotice(
        `Live Gemini API unavailable (${reason}). Showing deterministic local policy summary built directly from reason codes.`
      );
      setSourceLabel('Deterministic Policy Fallback · Local');

      if (role === 'borrower') {
        setBorrowerResult(
          buildDeterministicBorrowerFallback({
            businessName,
            businessType,
            location,
            assessment,
            isStressed,
            stressSummary,
          })
        );
      } else {
        setLenderResult(
          buildDeterministicLenderFallback({
            businessName,
            businessType,
            location,
            assessment,
            isStressed,
            stressSummary,
          })
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const buttonLabel =
    role === 'borrower' ? 'Generate AI Explanation' : 'Generate AI Credit Memo';

  const hasResult = role === 'borrower' ? borrowerResult !== null : lenderResult !== null;

  return (
    <section
      aria-labelledby={`ai-layer-heading-${role}`}
      className="rounded-lg border border-slate-200 bg-slate-50/70 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              id={`ai-layer-heading-${role}`}
              className="text-xs font-bold text-slate-900"
            >
              {role === 'borrower' ? 'Plain-Language Readiness Assistant' : 'Credit Committee Memo'}
            </h3>
            <span className="inline-flex items-center rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">
              AI Explanation Layer · Read-Only (Score &amp; Loan Terms are 100% Deterministic)
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Receives only pre-computed metrics, knock-out flags, tranche status, and policy reason
            codes—never computes or alters underwriting math.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : role === 'borrower' ? (
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>{loading ? 'Generating…' : hasResult ? 'Regenerate' : buttonLabel}</span>
        </button>
      </div>

      {fallbackNotice && (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
          {fallbackNotice}
        </p>
      )}

      {/* Borrower Structured Result */}
      {role === 'borrower' && borrowerResult && (
        <div className="mt-3.5 space-y-3 border-t border-slate-200 pt-3.5">
          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">Readiness Summary</span>
            {sourceLabel && <span className="font-mono">{sourceLabel}</span>}
          </div>
          <p className="text-xs leading-relaxed text-slate-700">
            {borrowerResult.readinessSummary}
          </p>

          {borrowerResult.actionSteps.length > 0 && (
            <div className="border-t border-slate-200/80 pt-3">
              <p className="text-[11px] font-semibold text-slate-800">
                Concrete steps to improve or unlock the next tranche
              </p>
              <ul className="mt-2 space-y-2">
                {borrowerResult.actionSteps.map((step, index) => (
                  <li key={index} className="text-xs leading-relaxed text-slate-700">
                    <span className="font-semibold text-slate-900">
                      0{index + 1}. {step.title}:
                    </span>{' '}
                    {step.detail}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Lender Structured Memo Result */}
      {role === 'lender' && lenderResult && (
        <div className="mt-3.5 space-y-3 border-t border-slate-200 pt-3.5">
          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">Underwriting Memo</span>
            {sourceLabel && <span className="font-mono">{sourceLabel}</span>}
          </div>
          <p className="text-xs leading-relaxed text-slate-700">
            {lenderResult.underwritingMemo}
          </p>

          {lenderResult.structuringMitigations.length > 0 && (
            <div className="border-t border-slate-200/80 pt-3">
              <p className="text-[11px] font-semibold text-slate-800">
                Recommended Structuring Mitigations
              </p>
              <ul className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-slate-700">
                {lenderResult.structuringMitigations.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-mono font-semibold text-teal-700">0{idx + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lenderResult.verificationQuestions.length > 0 && (
            <div className="border-t border-slate-200/80 pt-3">
              <p className="text-[11px] font-semibold text-slate-800">
                Field / Phone Verification Questions
              </p>
              <ul className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-slate-700">
                {lenderResult.verificationQuestions.map((q, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-mono font-semibold text-slate-500">Q{idx + 1}.</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
