/**
 * Scenario Selector Component
 * Browse and select trading scenario templates
 */

import React, { useState, useEffect } from 'react';
import api from '../api/client';
import type { ScenarioTemplate, UserProfile } from '../types';
import { ScenarioCard } from './ScenarioCard';

interface ScenarioSelectorProps {
  onSelect: (scenario: ScenarioTemplate) => void;
  onCustomize?: (scenario: ScenarioTemplate) => void;
  selectedId?: string;
}

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  onSelect,
  onCustomize,
  selectedId,
}) => {
  const [scenarios, setScenarios] = useState<ScenarioTemplate[]>([]);
  const [filteredScenarios, setFilteredScenarios] = useState<ScenarioTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [marketTypeFilter, setMarketTypeFilter] = useState<'all' | 'spot' | 'futures'>('all');
  const [riskLevelFilter, setRiskLevelFilter] = useState<
    'all' | 'conservative' | 'moderate' | 'aggressive'
  >('all');
  const [showRecommended, setShowRecommended] = useState(false);

  // User profile for recommendations
  const [userProfile, setUserProfile] = useState<UserProfile>({
    experience: 'beginner',
    riskTolerance: 'low',
    marketType: 'spot',
  });

  // Fetch scenarios
  useEffect(() => {
    loadScenarios();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = scenarios;

    if (marketTypeFilter !== 'all') {
      filtered = filtered.filter((s) => s.marketType === marketTypeFilter);
    }

    if (riskLevelFilter !== 'all') {
      filtered = filtered.filter((s) => s.riskLevel === riskLevelFilter);
    }

    setFilteredScenarios(filtered);
  }, [scenarios, marketTypeFilter, riskLevelFilter]);

  const loadScenarios = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getScenarios();
      if (response.data.success && response.data.data) {
        setScenarios(response.data.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load scenarios');
      console.error('Error loading scenarios:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getRecommendations(userProfile);
      if (response.data.success && response.data.data) {
        setFilteredScenarios(response.data.data);
        setShowRecommended(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load recommendations');
      console.error('Error loading recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setMarketTypeFilter('all');
    setRiskLevelFilter('all');
    setShowRecommended(false);
    setFilteredScenarios(scenarios);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">시나리오 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="font-bold text-red-800 mb-2">오류 발생</h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadScenarios}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">트레이딩 시나리오 선택</h2>
        <p className="text-gray-600">
          사전 정의된 시나리오 템플릿 중에서 선택하거나 커스터마이즈하세요
        </p>
      </div>

      {/* Recommendation Section */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-3">맞춤 추천 받기</h3>
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              경험 수준
            </label>
            <select
              value={userProfile.experience}
              onChange={(e) =>
                setUserProfile({
                  ...userProfile,
                  experience: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="beginner">초보자</option>
              <option value="intermediate">중급자</option>
              <option value="expert">전문가</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              리스크 성향
            </label>
            <select
              value={userProfile.riskTolerance}
              onChange={(e) =>
                setUserProfile({
                  ...userProfile,
                  riskTolerance: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">낮음</option>
              <option value="medium">중간</option>
              <option value="high">높음</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              시장 타입
            </label>
            <select
              value={userProfile.marketType}
              onChange={(e) =>
                setUserProfile({
                  ...userProfile,
                  marketType: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="spot">현물</option>
              <option value="futures">선물</option>
            </select>
          </div>
        </div>
        <button
          onClick={loadRecommendations}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors"
        >
          추천 시나리오 보기
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setMarketTypeFilter('all')}
            className={`px-4 py-2 rounded transition-colors ${
              marketTypeFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setMarketTypeFilter('spot')}
            className={`px-4 py-2 rounded transition-colors ${
              marketTypeFilter === 'spot'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            현물
          </button>
          <button
            onClick={() => setMarketTypeFilter('futures')}
            className={`px-4 py-2 rounded transition-colors ${
              marketTypeFilter === 'futures'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            선물
          </button>
        </div>

        <div className="h-6 w-px bg-gray-300"></div>

        <div className="flex gap-2">
          <button
            onClick={() => setRiskLevelFilter('conservative')}
            className={`px-4 py-2 rounded transition-colors ${
              riskLevelFilter === 'conservative'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            보수적
          </button>
          <button
            onClick={() => setRiskLevelFilter('moderate')}
            className={`px-4 py-2 rounded transition-colors ${
              riskLevelFilter === 'moderate'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            균형
          </button>
          <button
            onClick={() => setRiskLevelFilter('aggressive')}
            className={`px-4 py-2 rounded transition-colors ${
              riskLevelFilter === 'aggressive'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            공격적
          </button>
        </div>

        {(marketTypeFilter !== 'all' || riskLevelFilter !== 'all' || showRecommended) && (
          <button
            onClick={resetFilters}
            className="ml-auto px-4 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
          >
            필터 초기화
          </button>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        {showRecommended ? (
          <p>
            <strong>{filteredScenarios.length}개</strong>의 추천 시나리오
          </p>
        ) : (
          <p>
            <strong>{filteredScenarios.length}개</strong>의 시나리오 (전체{' '}
            {scenarios.length}개)
          </p>
        )}
      </div>

      {/* Scenario Grid */}
      {filteredScenarios.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">조건에 맞는 시나리오가 없습니다</p>
          <button
            onClick={resetFilters}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            모든 시나리오 보기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredScenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              selected={scenario.id === selectedId}
              onSelect={onSelect}
              onCustomize={onCustomize}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ScenarioSelector;
