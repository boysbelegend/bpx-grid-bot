/**
 * Scenario Customizer Component
 * Edit and customize scenario parameters
 */

import React, { useState, useEffect } from 'react';
import type { ScenarioTemplate } from '../types';

interface ScenarioCustomizerProps {
  scenario: ScenarioTemplate;
  onSave: (customized: {
    name: string;
    description: string;
    config: Partial<ScenarioTemplate['config']>;
  }) => void;
  onCancel: () => void;
}

export const ScenarioCustomizer: React.FC<ScenarioCustomizerProps> = ({
  scenario,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(scenario.name + ' (사용자 정의)');
  const [description, setDescription] = useState(scenario.description);

  // Grid settings
  const [gridLevels, setGridLevels] = useState(scenario.config.grid.levels);
  const [gridSpacing, setGridSpacing] = useState(scenario.config.grid.spacing.value);

  // Order settings
  const [quantityPerLevel, setQuantityPerLevel] = useState(
    scenario.config.order.quantityPerLevel
  );

  // Risk settings
  const [maxPositionSize, setMaxPositionSize] = useState(
    scenario.config.risk.maxPositionSize
  );
  const [maxPositionValue, setMaxPositionValue] = useState(
    scenario.config.risk.maxPositionValue
  );
  const [maxDailyLoss, setMaxDailyLoss] = useState(scenario.config.risk.maxDailyLoss);
  const [emergencyStopLoss, setEmergencyStopLoss] = useState(
    scenario.config.risk.emergencyStopLoss
  );

  // Futures settings (if applicable)
  const [leverage, setLeverage] = useState(scenario.config.futures?.leverage || 1);
  const [marginMode, setMarginMode] = useState<'cross' | 'isolated'>(
    scenario.config.futures?.marginMode || 'isolated'
  );
  const [liquidationBuffer, setLiquidationBuffer] = useState(
    scenario.config.futures?.liquidationBuffer || 5
  );

  const isFutures = scenario.marketType === 'futures';

  const handleSave = () => {
    const customizations: Partial<ScenarioTemplate['config']> = {
      grid: {
        levels: gridLevels,
        spacing: {
          type: scenario.config.grid.spacing.type,
          value: gridSpacing,
        },
      },
      order: {
        quantityPerLevel,
      },
      risk: {
        maxPositionSize,
        maxPositionValue,
        maxDailyLoss,
        emergencyStopLoss,
      },
    };

    if (isFutures) {
      customizations.futures = {
        leverage,
        marginMode,
        liquidationBuffer,
      };
    }

    onSave({
      name,
      description,
      config: customizations,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">시나리오 커스터마이즈</h2>
        <p className="text-gray-600">
          기본 시나리오: <strong>{scenario.name}</strong>
        </p>
      </div>

      {/* Name & Description */}
      <div className="mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            시나리오 이름
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="예: 내 SOL 전략"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            placeholder="시나리오 설명..."
          />
        </div>
      </div>

      {/* Grid Settings */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-lg mb-4">그리드 설정</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              그리드 레벨 수
            </label>
            <input
              type="number"
              value={gridLevels}
              onChange={(e) => setGridLevels(parseInt(e.target.value))}
              min={5}
              max={50}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">5-50 (권장: 10-30)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              그리드 간격 (%)
            </label>
            <input
              type="number"
              value={gridSpacing}
              onChange={(e) => setGridSpacing(parseFloat(e.target.value))}
              min={0.1}
              max={10}
              step={0.1}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">0.1-10% (권장: 0.5-3%)</p>
          </div>
        </div>
      </div>

      {/* Order Settings */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-lg mb-4">주문 설정</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            레벨당 주문 수량
          </label>
          <input
            type="number"
            value={quantityPerLevel}
            onChange={(e) => setQuantityPerLevel(parseFloat(e.target.value))}
            min={0.01}
            max={100}
            step={0.01}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            각 그리드 레벨에서 거래할 수량 (base asset)
          </p>
        </div>
      </div>

      {/* Risk Settings */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-lg mb-4">리스크 관리</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              최대 포지션 크기
            </label>
            <input
              type="number"
              value={maxPositionSize}
              onChange={(e) => setMaxPositionSize(parseFloat(e.target.value))}
              min={0.1}
              step={0.1}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Base asset 단위</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              최대 포지션 가치 ($)
            </label>
            <input
              type="number"
              value={maxPositionValue}
              onChange={(e) => setMaxPositionValue(parseFloat(e.target.value))}
              min={10}
              step={10}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">USD 가치</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              일일 손실 한도 ($)
            </label>
            <input
              type="number"
              value={maxDailyLoss}
              onChange={(e) => setMaxDailyLoss(parseFloat(e.target.value))}
              min={1}
              step={1}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">초과 시 거래 중단</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              긴급 손절 (%)
            </label>
            <input
              type="number"
              value={emergencyStopLoss}
              onChange={(e) => setEmergencyStopLoss(parseFloat(e.target.value))}
              min={1}
              max={50}
              step={1}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">최대 손실률</p>
          </div>
        </div>
      </div>

      {/* Futures Settings (if futures) */}
      {isFutures && (
        <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <h3 className="font-semibold text-lg mb-4 text-purple-900">
            선물 거래 설정 ⚠️
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                레버리지 (x)
              </label>
              <input
                type="number"
                value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value))}
                min={1}
                max={20}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">1-20배 (주의!)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                마진 모드
              </label>
              <select
                value={marginMode}
                onChange={(e) => setMarginMode(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="isolated">Isolated</option>
                <option value="cross">Cross</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">권장: Isolated</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                청산 버퍼 (%)
              </label>
              <input
                type="number"
                value={liquidationBuffer}
                onChange={(e) => setLiquidationBuffer(parseFloat(e.target.value))}
                min={1}
                max={20}
                step={0.5}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">최소 안전 거리</p>
            </div>
          </div>
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ 주의:</strong> 레버리지가 높을수록 청산 리스크가 증가합니다.
              초보자는 1-3배 레버리지를 권장합니다.
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-6 py-2 border-2 border-gray-300 rounded font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors"
        >
          취소
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors"
        >
          저장하기
        </button>
      </div>
    </div>
  );
};

export default ScenarioCustomizer;
