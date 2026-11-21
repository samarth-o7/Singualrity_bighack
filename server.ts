import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const EXPLANATION_MODEL = 'gemini-4-hydrogen';

interface ExplainRequestBody {
  role: 'lender';
  businessName: string;
  businessType: string;
  location: string;
  isStressed?: boolean;
  stressSummary?: string;
  metrics: {
    stabilityScore: number;
    readinessTier: string;
    profileTag: string;
    isCashHeavyProfile: boolean;
    knockOutTriggered: boolean;
    knockOutCodes: string[];
    avgMonthlyInflow: number;
    avgMonthlyOutflow: number;
    monthlyNetSurplus: number;
    maxSafeMonthlyRepayment: number;
    maxRepaymentRatioPercent: number;
    requestedLoan: number;
    recommendedLoanAmount: number;
    tenureMonths: number;
    repaymentSchedule: string;
    periodicInstalment: number;
    indicativeInterestRange: string;
    starterTrancheActive: boolean;
    starterTranchePath?: string;
    underwritingDecision: string;
    policyReasonCodes: Array<{
      code: string;
      category: string;
      title: string;
      detail: string;
    }>;
  };
}

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function createApp() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  // Strictly read-only Lender Credit Memo endpoint
  app.post('/api/explain', async (req: Request, res: Response) => {
    try {
      const body = req.body as Partial<ExplainRequestBody>;
      if (
        !body ||
        body.role !== 'lender' ||
        !body.metrics ||
        typeof body.metrics.stabilityScore !== 'number'
      ) {
        res.status(400).json({ error: 'Invalid deterministic assessment payload.' });
        return;
      }

      const ai = getGenAIClient();
      if (!ai) {
        res.status(503).json({
          error: 'GEMINI_API_KEY is not configured in server environment.',
          code: 'NO_API_KEY',
        });
        return;
      }

      const safePayload = {
        businessName: String(body.businessName ?? 'MSME Applicant').slice(0, 120),
        businessType: String(body.businessType ?? 'Micro-Enterprise').slice(0, 80),
        location: String(body.location ?? 'India').slice(0, 80),
        isStressed: Boolean(body.isStressed),
        stressSummary: body.stressSummary ? String(body.stressSummary).slice(0, 200) : undefined,
        metrics: body.metrics,
      };

      const response = await ai.models.generateContent({
        model: EXPLANATION_MODEL,
        contents:
          'Draft a concise institutional credit underwriting memo, structuring mitigations, and field/phone verification questions based strictly on this pre-computed deterministic MSME underwriting snapshot. Never use the acronym EMI—use Repayment, Safe Repayment Capacity, or Periodic Instalment. Do not alter any number or decision.\n\n' +
          JSON.stringify(safePayload, null, 2),
        config: {
          systemInstruction:
            'You are a strictly read-only credit underwriting analyst assistant for an Indian NBFC/MFI credit committee. ' +
            'All scores, knock-out rules, cash-heavy reweighting, starter tranche limits, and Safe Repayment Capacity caps are 100% deterministic and final. ' +
            'NEVER recalculate or change any figure. NEVER use the word "EMI"—always refer to "Repayment", "Safe Repayment Capacity", or "Periodic Instalment". ' +
            'Write a crisp 2-3 sentence underwritingMemo citing key policy reason codes, 2-3 concrete structuringMitigations, and 2-3 sharp field/phone verificationQuestions.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              underwritingMemo: {
                type: Type.STRING,
                description:
                  'Concise 2-3 sentence credit committee memo referencing deterministic score, tier, and policy codes.',
              },
              structuringMitigations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2 to 3 concrete loan structuring mitigations aligned to guardrails.',
              },
              verificationQuestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  '2 to 3 targeted field or phone verification questions for the credit officer.',
              },
            },
            required: ['underwritingMemo', 'structuringMitigations', 'verificationQuestions'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        model: EXPLANATION_MODEL,
        role: 'lender',
        data: parsed,
      });
    } catch (err: unknown) {
      const errorObj = err as { status?: number; message?: string };
      const status =
        typeof errorObj?.status === 'number' && errorObj.status >= 400 && errorObj.status < 600
          ? errorObj.status
          : 502;
      const message =
        errorObj?.message || 'Gemini explanation service encountered an upstream error.';
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pravah Credit server running on http://0.0.0.0:${PORT}`);
  });
}

createApp();
