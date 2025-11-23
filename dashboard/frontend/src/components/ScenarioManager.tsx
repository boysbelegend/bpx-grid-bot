/**
 * Scenario Manager Component
 * Main component for managing and using scenario templates
 */

import React, { useState } from 'react';
import api from '../api/client';
import type { ScenarioTemplate } from '../types';
import { ScenarioSelector } from './ScenarioSelector';
import { ScenarioCustomizer } from './ScenarioCustomizer';

interface ScenarioManagerProps {
  onScenarioReady?: (config: any) => void;
}

type ViewMode = 'select' | 'customize' | 'export';

export const ScenarioManager: React.FC<ScenarioManagerProps> = ({ onScenarioReady }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('select');
  const [selectedScenario, setSelectedScenario] = useState<ScenarioTemplate | null>(null);
  const [customizing, setCustomizing] = useState(false);

  // Export form state
  const [symbol, setSymbol] = useState('SOL-PERP');
  const [baseAsset, setBaseAsset] = useState('SOL');
  const [quoteAsset, setQuoteAsset] = useState('USDC');
  const [dryRun, setDryRun] = useState(true);
  const [exportedConfig, setExportedConfig] = useState<any>(null);
  const [exporting, setExporting] = useState(false);

  const handleSelectScenario = (scenario: ScenarioTemplate) => {
    setSelectedScenario(scenario);
    setCustomizing(false);
  };

  const handleCustomizeScenario = (scenario: ScenarioTemplate) => {
    setSelectedScenario(scenario);
    setCustomizing(true);
    setViewMode('customize');
  };

  const handleSaveCustomization = async (customized: {
    name: string;
    description: string;
    config: Partial<ScenarioTemplate['config']>;
  }) => {
    if (!selectedScenario) return;

    try {
      const response = await api.createCustomScenario({
        name: customized.name,
        description: customized.description,
        baseScenarioId: selectedScenario.id,
        customizations: customized.config,
      });

      if (response.data.success && response.data.data) {
        setSelectedScenario(response.data.data);
        setViewMode('select');
        alert('커스텀 시나리오가 저장되었습니다!');
      }
    } catch (err: any) {
      console.error('Failed to save custom scenario:', err);
      alert('시나리오 저장 실패: ' + (err.message || '알 수 없는 오류'));
    }
  };

  const handleExportScenario = async () => {
    if (!selectedScenario) return;

    setExporting(true);
    try {
      const response = await api.exportScenario({
        scenarioId: selectedScenario.id,
        symbol,
        baseAsset,
        quoteAsset,
        dryRun,
      });

      if (response.data.success && response.data.data) {
        setExportedConfig(response.data.data);
        onScenarioReady?.(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to export scenario:', err);
      alert('시나리오 내보내기 실패: ' + (err.message || '알 수 없는 오류'));
    } finally {
      setExporting(false);
    }
  };

  const handleStartWithConfig = () => {
    if (exportedConfig) {
      onScenarioReady?.(exportedConfig);
    }
  };

  if (viewMode === 'customize' && selectedScenario) {
    return (
      <ScenarioCustomizer
        scenario={selectedScenario}
        onSave={handleSaveCustomization}
        onCancel={() => setViewMode('select')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Scenario Selection */}
      {viewMode === 'select' && (
        <ScenarioSelector
          onSelect={handleSelectScenario}
          onCustomize={handleCustomizeScenario}
          selectedId={selectedScenario?.id}
        />
      )}

      {/* Export Configuration */}
      {selectedScenario && viewMode === 'select' && (
        <div className="mt-8 p-6 bg-white rounded-lg shadow-lg border-2 border-blue-500">
          <h3 className="text-xl font-bold mb-4">선택된 시나리오: {selectedScenario.name}</h3>

          <div className="mb-6 p-4 bg-gray-50 rounded">
            <h4 className="font-semibold mb-3">거래 설정</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  심볼
                </label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: SOL-PERP"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Asset
                </label>
                <input
                  type="text"
                  value={baseAsset}
                  onChange={(e) => setBaseAsset(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: SOL"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quote Asset
                </label>
                <input
                  type="text"
                  value={quoteAsset}
                  onChange={(e) => setQuoteAsset(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: USDC"
                />
              </div>
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dryRun}
                    onChange={(e) => setDryRun(e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    Dry Run 모드 (시뮬레이션)
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleExportScenario}
              disabled={exporting}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {exporting ? '설정 생성 중...' : '전략 설정 생성'}
            </button>
            <button
              onClick={() => handleCustomizeScenario(selectedScenario)}
              className="px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              커스터마이즈
            </button>
          </div>

          {exportedConfig && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
              <h4 className="font-semibold text-green-900 mb-2">✓ 설정 생성 완료!</h4>
              <p className="text-sm text-green-700 mb-3">
                전략 설정이 준비되었습니다. 대시보드에서 바로 사용하거나 JSON 파일로 다운로드하세요.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleStartWithConfig}
                  className="px-4 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 transition-colors"
                >
                  이 설정으로 시작
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(exportedConfig, null, 2)], {
                      type: 'application/json',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${selectedScenario.id}-${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 border-2 border-green-600 text-green-700 rounded font-medium hover:bg-green-50 transition-colors"
                >
                  JSON 다운로드
                </button>
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                  설정 미리보기
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                  {JSON.stringify(exportedConfig, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScenarioManager;
