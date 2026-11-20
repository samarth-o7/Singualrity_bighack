import { useMemo, useState } from 'react';
import { Header } from './components/Header';
import { InputPanel } from './components/InputPanel';
import { OutputPanel } from './components/OutputPanel';
import { MSME_PRESETS } from './data/presets';
import { MSMEInputs, MSMEPreset, PerspectiveTab, PresetId, ViewMode } from './types/credit';
import { evaluateCreditProfile } from './utils/creditModel';

function areInputsEqual(a: MSMEInputs, b: MSMEInputs): boolean {
  return (
    a.dailySales === b.dailySales &&
    a.operatingDaysPerWeek === b.operatingDaysPerWeek &&
    a.upiShare === b.upiShare &&
    a.cashFlowFluctuation === b.cashFlowFluctuation &&
    a.paymentConsistency === b.paymentConsistency &&
    a.monthlyFixedExpenses === b.monthlyFixedExpenses &&
    a.requestedLoan === b.requestedLoan
  );
}

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [activePresetId, setActivePresetId] = useState<PresetId>(MSME_PRESETS[0].id);
  const [inputs, setInputs] = useState<MSMEInputs>(MSME_PRESETS[0].inputs);
  const [activeTab, setActiveTab] = useState<PerspectiveTab>('borrower');

  const activePreset = useMemo(
    () => MSME_PRESETS.find((p) => p.id === activePresetId) ?? MSME_PRESETS[0],
    [activePresetId]
  );

  const isCustomized = useMemo(
    () => !areInputsEqual(inputs, activePreset.inputs),
    [inputs, activePreset]
  );

  const assessment = useMemo(() => evaluateCreditProfile(inputs), [inputs]);

  const handleSelectPreset = (preset: MSMEPreset) => {
    setActivePresetId(preset.id);
    setInputs({ ...preset.inputs });
  };

  const handleResetPreset = () => {
    setInputs({ ...activePreset.inputs });
  };

  const handleChangeInput = <K extends keyof MSMEInputs>(key: K, value: MSMEInputs[K]) => {
    setInputs((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const isMobileFrame = viewMode === 'mobile';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Header viewMode={viewMode} onViewModeChange={setViewMode} />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {isMobileFrame ? (
          /* Centered 390px Phone Frame Preview */
          <div className="mx-auto flex flex-col items-center">
            <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
              <span>Mobile Frame Preview</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">390px viewport</span>
            </div>

            <div className="w-full max-w-[390px] rounded-[2rem] border-[6px] border-slate-900 bg-slate-50 shadow-xl overflow-hidden">
              {/* Subtle phone top notch bar */}
              <div
                className="flex items-center justify-center bg-white py-2 border-b border-slate-200"
                aria-hidden="true"
              >
                <div className="h-1.5 w-16 rounded-full bg-slate-200" />
              </div>

              <div className="max-h-[780px] overflow-y-auto p-3.5 space-y-4">
                <div>
                  <h1 className="text-base font-bold tracking-tight text-slate-900">
                    Cash-Flow Credit Assessment
                  </h1>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Evaluate thin-file Indian MSMEs using sales rhythm, UPI trail, and bill
                    consistency.
                  </p>
                </div>

                <InputPanel
                  presets={MSME_PRESETS}
                  activePreset={activePreset}
                  activePresetId={activePresetId}
                  isCustomized={isCustomized}
                  inputs={inputs}
                  monthlyRevenue={assessment.monthlyRevenue}
                  monthlyNetSurplus={assessment.monthlyNetSurplus}
                  isMobileFrame={true}
                  onSelectPreset={handleSelectPreset}
                  onResetPreset={handleResetPreset}
                  onChangeInput={handleChangeInput}
                />

                <OutputPanel
                  inputs={inputs}
                  assessment={assessment}
                  activeTab={activeTab}
                  isMobileFrame={true}
                  onTabChange={setActiveTab}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Full-Width Responsive Desktop Workspace */
          <div className="mx-auto max-w-[1320px]">
            <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl text-balance">
                  Cash-Flow Credit Assessment
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Underwrite thin-file Indian MSMEs from operating cash-flow signals instead of
                  traditional credit bureau history.
                </p>
              </div>
              <p className="text-xs text-slate-500 whitespace-nowrap">
                Finance Track · Problem F2 Prototype
              </p>
            </div>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
              <div className="lg:col-span-6 xl:col-span-6">
                <InputPanel
                  presets={MSME_PRESETS}
                  activePreset={activePreset}
                  activePresetId={activePresetId}
                  isCustomized={isCustomized}
                  inputs={inputs}
                  monthlyRevenue={assessment.monthlyRevenue}
                  monthlyNetSurplus={assessment.monthlyNetSurplus}
                  isMobileFrame={false}
                  onSelectPreset={handleSelectPreset}
                  onResetPreset={handleResetPreset}
                  onChangeInput={handleChangeInput}
                />
              </div>

              <div className="lg:col-span-6 xl:col-span-6 lg:sticky lg:top-20">
                <OutputPanel
                  inputs={inputs}
                  assessment={assessment}
                  activeTab={activeTab}
                  isMobileFrame={false}
                  onTabChange={setActiveTab}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
