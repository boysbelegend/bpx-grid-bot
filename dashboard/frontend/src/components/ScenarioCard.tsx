/**
 * Scenario Card Component
 * Displays individual scenario details with risk level and features
 */

import React from 'react';
import type { ScenarioTemplate } from '../types';

interface ScenarioCardProps {
  scenario: ScenarioTemplate;
  selected?: boolean;
  onSelect?: (scenario: ScenarioTemplate) => void;
  onCustomize?: (scenario: ScenarioTemplate) => void;
  compact?: boolean;
}

const getRiskColor = (riskLevel: string) => {
  switch (riskLevel) {
    case 'conservative':
      return 'text-green-600';
    case 'moderate':
      return 'text-yellow-600';
    case 'aggressive':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

const getRiskBadge = (riskLevel: string) => {
  switch (riskLevel) {
    case 'conservative':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'moderate':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'aggressive':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getMarketBadge = (marketType: string) => {
  return marketType === 'futures'
    ? 'bg-purple-100 text-purple-800 border-purple-200'
    : 'bg-blue-100 text-blue-800 border-blue-200';
};

export const ScenarioCard: React.FC<ScenarioCardProps> = ({
  scenario,
  selected = false,
  onSelect,
  onCustomize,
  compact = false,
}) => {
  if (compact) {
    return (
      <div
        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
          selected
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 bg-white hover:border-blue-300'
        }`}
        onClick={() => onSelect?.(scenario)}
      >
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg">{scenario.name}</h3>
          <div className="flex gap-2">
            <span
              className={`px-2 py-1 rounded text-xs font-medium border ${getRiskBadge(
                scenario.riskLevel
              )}`}
            >
              {scenario.riskLevel}
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-2">{scenario.description}</p>
        <p className="text-xs text-gray-500">
          <strong>권장:</strong> {scenario.recommended}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`p-6 rounded-lg border-2 transition-all ${
        selected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white hover:shadow-lg'
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-xl mb-1">{scenario.name}</h3>
          <p className="text-sm text-gray-600">{scenario.description}</p>
        </div>
        <div className="flex gap-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium border ${getRiskBadge(
              scenario.riskLevel
            )}`}
          >
            {scenario.riskLevel}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium border ${getMarketBadge(
              scenario.marketType
            )}`}
          >
            {scenario.marketType}
          </span>
        </div>
      </div>

      {/* Recommended For */}
      <div className="mb-4 p-3 bg-gray-50 rounded">
        <p className="text-sm">
          <strong className="text-gray-700">권장 대상:</strong>{' '}
          <span className="text-gray-600">{scenario.recommended}</span>
        </p>
      </div>

      {/* Pros & Cons */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="font-semibold text-sm text-green-700 mb-2">✓ 장점</h4>
          <ul className="space-y-1">
            {scenario.pros.map((pro, idx) => (
              <li key={idx} className="text-sm text-gray-600 flex items-start">
                <span className="text-green-500 mr-1">•</span>
                <span>{pro}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-sm text-red-700 mb-2">✗ 단점</h4>
          <ul className="space-y-1">
            {scenario.cons.map((con, idx) => (
              <li key={idx} className="text-sm text-gray-600 flex items-start">
                <span className="text-red-500 mr-1">•</span>
                <span>{con}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Configuration Summary */}
      <div className="mb-4 p-3 bg-gray-50 rounded">
        <h4 className="font-semibold text-sm text-gray-700 mb-2">설정 요약</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-600">그리드 레벨:</span>{' '}
            <span className="font-medium">{scenario.config.grid.levels}</span>
          </div>
          <div>
            <span className="text-gray-600">간격:</span>{' '}
            <span className="font-medium">{scenario.config.grid.spacing.value}%</span>
          </div>
          <div>
            <span className="text-gray-600">최대 포지션:</span>{' '}
            <span className="font-medium">{scenario.config.risk.maxPositionSize}</span>
          </div>
          <div>
            <span className="text-gray-600">일일 손실 한도:</span>{' '}
            <span className="font-medium">${scenario.config.risk.maxDailyLoss}</span>
          </div>
          {scenario.config.futures && (
            <>
              <div>
                <span className="text-gray-600">레버리지:</span>{' '}
                <span className="font-medium">{scenario.config.futures.leverage}x</span>
              </div>
              <div>
                <span className="text-gray-600">마진 모드:</span>{' '}
                <span className="font-medium">{scenario.config.futures.marginMode}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {onSelect && (
          <button
            onClick={() => onSelect(scenario)}
            className={`flex-1 px-4 py-2 rounded font-medium transition-colors ${
              selected
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {selected ? '선택됨 ✓' : '선택하기'}
          </button>
        )}
        {onCustomize && (
          <button
            onClick={() => onCustomize(scenario)}
            className="px-4 py-2 rounded font-medium border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors"
          >
            커스터마이즈
          </button>
        )}
      </div>
    </div>
  );
};

export default ScenarioCard;
