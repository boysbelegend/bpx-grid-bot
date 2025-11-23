/**
 * Trading Scenario Templates
 * Pre-defined risk profiles for easy setup
 */

export interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  marketType: 'spot' | 'futures';

  // Display info
  recommended: string;
  pros: string[];
  cons: string[];

  // Strategy configuration
  config: {
    grid: {
      levels: number;
      spacing: { type: string; value: number };
    };
    order: {
      quantityPerLevel: number;
    };
    risk: {
      maxPositionSize: number;
      maxPositionValue: number;
      maxDailyLoss: number;
      emergencyStopLoss: number;
    };
    futures?: {
      leverage: number;
      marginMode: 'cross' | 'isolated';
      liquidationBuffer: number;
    };
  };
}

// ============================================================================
// Spot Trading Scenarios
// ============================================================================

export const spotScenarios: ScenarioTemplate[] = [
  {
    id: 'spot-conservative',
    name: '보수적 현물 (Conservative Spot)',
    description: '안정적이고 낮은 리스크의 현물 거래 전략',
    riskLevel: 'conservative',
    marketType: 'spot',
    recommended: '초보자, 변동성 낮은 시장',
    pros: [
      '낮은 리스크',
      '안정적인 수익',
      '큰 자본으로 운영 가능',
      '장기 운영에 적합'
    ],
    cons: [
      '낮은 수익률',
      '큰 초기 자본 필요',
      '수익 실현이 느림'
    ],
    config: {
      grid: {
        levels: 20,
        spacing: { type: 'percentage', value: 2.0 }
      },
      order: {
        quantityPerLevel: 0.03
      },
      risk: {
        maxPositionSize: 10.0,
        maxPositionValue: 2000,
        maxDailyLoss: 100,
        emergencyStopLoss: 20
      }
    }
  },
  {
    id: 'spot-moderate',
    name: '균형 현물 (Moderate Spot)',
    description: '리스크와 수익의 균형을 맞춘 현물 거래 전략',
    riskLevel: 'moderate',
    marketType: 'spot',
    recommended: '중급자, 일반적인 시장 조건',
    pros: [
      '균형잡힌 리스크/수익',
      '다양한 시장 조건에 적응',
      '적절한 자본으로 시작 가능'
    ],
    cons: [
      '변동성 높을 때 주의 필요',
      '중간 정도의 모니터링 필요'
    ],
    config: {
      grid: {
        levels: 20,
        spacing: { type: 'percentage', value: 1.0 }
      },
      order: {
        quantityPerLevel: 0.05
      },
      risk: {
        maxPositionSize: 10.0,
        maxPositionValue: 2000,
        maxDailyLoss: 100,
        emergencyStopLoss: 15
      }
    }
  },
  {
    id: 'spot-aggressive',
    name: '공격적 현물 (Aggressive Spot)',
    description: '높은 수익을 추구하는 공격적인 현물 거래 전략',
    riskLevel: 'aggressive',
    marketType: 'spot',
    recommended: '경험자, 높은 변동성 시장',
    pros: [
      '높은 수익 가능성',
      '빠른 자본 회전',
      '변동성 활용'
    ],
    cons: [
      '높은 리스크',
      '빈번한 모니터링 필요',
      '손실 가능성 증가'
    ],
    config: {
      grid: {
        levels: 30,
        spacing: { type: 'percentage', value: 0.5 }
      },
      order: {
        quantityPerLevel: 0.08
      },
      risk: {
        maxPositionSize: 15.0,
        maxPositionValue: 3000,
        maxDailyLoss: 200,
        emergencyStopLoss: 10
      }
    }
  }
];

// ============================================================================
// Futures Trading Scenarios
// ============================================================================

export const futuresScenarios: ScenarioTemplate[] = [
  {
    id: 'futures-conservative',
    name: '보수적 선물 (Conservative Futures)',
    description: '낮은 레버리지로 안전하게 운영하는 선물 거래',
    riskLevel: 'conservative',
    marketType: 'futures',
    recommended: '선물 초보자, 안정적 운영',
    pros: [
      '낮은 청산 리스크',
      '안정적인 수익',
      '큰 안전 버퍼',
      '초보자도 안전'
    ],
    cons: [
      '낮은 자본 효율',
      '수익률 제한적',
      '펀딩 비용 부담 상대적으로 큼'
    ],
    config: {
      grid: {
        levels: 16,
        spacing: { type: 'percentage', value: 2.0 }
      },
      order: {
        quantityPerLevel: 0.02
      },
      risk: {
        maxPositionSize: 5.0,
        maxPositionValue: 1000,
        maxDailyLoss: 100,
        emergencyStopLoss: 20
      },
      futures: {
        leverage: 2,
        marginMode: 'cross',
        liquidationBuffer: 10
      }
    }
  },
  {
    id: 'futures-moderate',
    name: '균형 선물 (Moderate Futures)',
    description: '중간 레버리지로 리스크와 수익의 균형을 맞춘 선물 거래',
    riskLevel: 'moderate',
    marketType: 'futures',
    recommended: '선물 중급자, 일반적인 시장',
    pros: [
      '적절한 자본 효율',
      '균형잡힌 리스크 관리',
      '대부분의 시장 조건에 적합'
    ],
    cons: [
      '정기적인 모니터링 필요',
      '청산 리스크 존재',
      '펀딩 비용 고려 필요'
    ],
    config: {
      grid: {
        levels: 16,
        spacing: { type: 'percentage', value: 1.5 }
      },
      order: {
        quantityPerLevel: 0.03
      },
      risk: {
        maxPositionSize: 2.0,
        maxPositionValue: 500,
        maxDailyLoss: 50,
        emergencyStopLoss: 15
      },
      futures: {
        leverage: 3,
        marginMode: 'isolated',
        liquidationBuffer: 8
      }
    }
  },
  {
    id: 'futures-aggressive',
    name: '공격적 선물 (Aggressive Futures)',
    description: '높은 레버리지로 큰 수익을 추구하는 선물 거래',
    riskLevel: 'aggressive',
    marketType: 'futures',
    recommended: '선물 전문가만, 높은 변동성',
    pros: [
      '높은 자본 효율',
      '큰 수익 가능성',
      '빠른 수익 실현'
    ],
    cons: [
      '높은 청산 리스크',
      '지속적인 모니터링 필수',
      '큰 손실 가능성',
      '전문가만 권장'
    ],
    config: {
      grid: {
        levels: 12,
        spacing: { type: 'percentage', value: 1.0 }
      },
      order: {
        quantityPerLevel: 0.05
      },
      risk: {
        maxPositionSize: 1.0,
        maxPositionValue: 300,
        maxDailyLoss: 30,
        emergencyStopLoss: 10
      },
      futures: {
        leverage: 5,
        marginMode: 'isolated',
        liquidationBuffer: 5
      }
    }
  },
  {
    id: 'futures-ultra-conservative',
    name: '초보수적 선물 (Ultra Conservative)',
    description: '1배 레버리지로 현물과 유사하게 운영',
    riskLevel: 'conservative',
    marketType: 'futures',
    recommended: '선물 처음 시작, 안전 최우선',
    pros: [
      '거의 청산 불가능',
      '현물과 유사한 리스크',
      '선물 시장 경험 축적',
      '펀딩 비용 최소화'
    ],
    cons: [
      '선물의 장점 활용 못함',
      '낮은 수익률',
      '자본 효율 낮음'
    ],
    config: {
      grid: {
        levels: 20,
        spacing: { type: 'percentage', value: 2.5 }
      },
      order: {
        quantityPerLevel: 0.02
      },
      risk: {
        maxPositionSize: 10.0,
        maxPositionValue: 2000,
        maxDailyLoss: 100,
        emergencyStopLoss: 25
      },
      futures: {
        leverage: 1,
        marginMode: 'cross',
        liquidationBuffer: 15
      }
    }
  },
  {
    id: 'futures-extreme',
    name: '극공격적 선물 (Extreme Risk)',
    description: '⚠️ 전문가 전용: 매우 높은 레버리지',
    riskLevel: 'aggressive',
    marketType: 'futures',
    recommended: '⚠️ 전문가만, 매우 위험',
    pros: [
      '최대 자본 효율',
      '극대화된 수익 가능성'
    ],
    cons: [
      '⚠️ 매우 높은 청산 리스크',
      '⚠️ 실시간 모니터링 필수',
      '⚠️ 초보자 절대 금지',
      '⚠️ 큰 손실 가능성'
    ],
    config: {
      grid: {
        levels: 10,
        spacing: { type: 'percentage', value: 0.8 }
      },
      order: {
        quantityPerLevel: 0.06
      },
      risk: {
        maxPositionSize: 0.5,
        maxPositionValue: 150,
        maxDailyLoss: 20,
        emergencyStopLoss: 8
      },
      futures: {
        leverage: 10,
        marginMode: 'isolated',
        liquidationBuffer: 3
      }
    }
  }
];

// ============================================================================
// Custom Scenarios (User-defined)
// ============================================================================

export interface CustomScenario extends ScenarioTemplate {
  isCustom: true;
  createdAt: number;
  lastModified: number;
}

// ============================================================================
// Scenario Manager
// ============================================================================

export class ScenarioManager {
  private customScenarios: Map<string, CustomScenario> = new Map();

  /**
   * Get all available scenarios
   */
  getAllScenarios(marketType?: 'spot' | 'futures'): ScenarioTemplate[] {
    const builtIn = marketType === 'spot'
      ? spotScenarios
      : marketType === 'futures'
      ? futuresScenarios
      : [...spotScenarios, ...futuresScenarios];

    const custom = Array.from(this.customScenarios.values())
      .filter(s => !marketType || s.marketType === marketType);

    return [...builtIn, ...custom];
  }

  /**
   * Get scenario by ID
   */
  getScenario(id: string): ScenarioTemplate | null {
    // Check built-in scenarios
    const allBuiltIn = [...spotScenarios, ...futuresScenarios];
    const builtIn = allBuiltIn.find(s => s.id === id);
    if (builtIn) return builtIn;

    // Check custom scenarios
    return this.customScenarios.get(id) || null;
  }

  /**
   * Create custom scenario
   */
  createCustomScenario(
    name: string,
    description: string,
    baseScenarioId: string,
    customizations: Partial<ScenarioTemplate['config']>
  ): CustomScenario {
    const baseScenario = this.getScenario(baseScenarioId);
    if (!baseScenario) {
      throw new Error(`Base scenario ${baseScenarioId} not found`);
    }

    const customId = `custom-${Date.now()}`;
    const customScenario: CustomScenario = {
      ...baseScenario,
      id: customId,
      name,
      description,
      isCustom: true,
      createdAt: Date.now(),
      lastModified: Date.now(),
      config: {
        ...baseScenario.config,
        ...customizations,
      },
    };

    this.customScenarios.set(customId, customScenario);
    return customScenario;
  }

  /**
   * Update custom scenario
   */
  updateCustomScenario(
    id: string,
    updates: Partial<Omit<CustomScenario, 'id' | 'isCustom' | 'createdAt'>>
  ): CustomScenario {
    const scenario = this.customScenarios.get(id);
    if (!scenario) {
      throw new Error(`Custom scenario ${id} not found`);
    }

    const updated: CustomScenario = {
      ...scenario,
      ...updates,
      lastModified: Date.now(),
      config: {
        ...scenario.config,
        ...(updates.config || {}),
      },
    };

    this.customScenarios.set(id, updated);
    return updated;
  }

  /**
   * Delete custom scenario
   */
  deleteCustomScenario(id: string): boolean {
    return this.customScenarios.delete(id);
  }

  /**
   * Export scenario as JSON config
   */
  exportScenarioConfig(
    scenarioId: string,
    symbol: string,
    baseAsset: string,
    quoteAsset: string,
    dryRun: boolean = true
  ): any {
    const scenario = this.getScenario(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario ${scenarioId} not found`);
    }

    return {
      name: scenario.name,
      type: scenario.marketType,
      symbol,
      baseAsset,
      quoteAsset,
      ...scenario.config,
      dryRun,
      cancelOrdersOnStart: true,
      telegramNotify: false,
    };
  }

  /**
   * Get scenario recommendations based on user profile
   */
  getRecommendations(profile: {
    experience: 'beginner' | 'intermediate' | 'expert';
    riskTolerance: 'low' | 'medium' | 'high';
    marketType: 'spot' | 'futures';
  }): ScenarioTemplate[] {
    const scenarios = this.getAllScenarios(profile.marketType);

    // Filter based on experience and risk tolerance
    return scenarios.filter(s => {
      if (profile.experience === 'beginner') {
        return s.riskLevel === 'conservative';
      } else if (profile.experience === 'intermediate') {
        return s.riskLevel === 'conservative' || s.riskLevel === 'moderate';
      } else {
        // Experts can use all scenarios
        return true;
      }
    }).filter(s => {
      if (profile.riskTolerance === 'low') {
        return s.riskLevel === 'conservative';
      } else if (profile.riskTolerance === 'medium') {
        return s.riskLevel === 'conservative' || s.riskLevel === 'moderate';
      } else {
        return true; // High risk tolerance - all scenarios
      }
    });
  }
}

// Singleton instance
export const scenarioManager = new ScenarioManager();
