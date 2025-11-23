/**
 * Dashboard Screen
 * Main trading dashboard with real-time updates
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ApiClient, {DashboardState} from '../services/ApiClient';
import {NotificationService} from '../services/NotificationService';

const DashboardScreen = () => {
  const [state, setState] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 5000); // Update every 5s

    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await ApiClient.getDashboardState();
      setState(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const handleStop = () => {
    Alert.alert(
      '엔진 중지',
      '정말 트레이딩 엔진을 중지하시겠습니까?',
      [
        {text: '취소', style: 'cancel'},
        {
          text: '중지',
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiClient.stopEngine();
              await NotificationService.showEngineStatusChange({status: 'stopped'});
              loadDashboard();
            } catch (error) {
              Alert.alert('오류', '엔진 중지 실패');
            }
          },
        },
      ],
    );
  };

  const handlePause = async () => {
    try {
      await ApiClient.pauseEngine();
      await NotificationService.showEngineStatusChange({status: 'paused'});
      loadDashboard();
    } catch (error) {
      Alert.alert('오류', '엔진 일시정지 실패');
    }
  };

  const handleResume = async () => {
    try {
      await ApiClient.resumeEngine();
      await NotificationService.showEngineStatusChange({status: 'running'});
      loadDashboard();
    } catch (error) {
      Alert.alert('오류', '엔진 재개 실패');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  if (!state) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>데이터를 불러올 수 없습니다</Text>
      </View>
    );
  }

  const isRunning = state.engine?.status === 'running';
  const isPaused = state.engine?.status === 'paused';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }>
      {/* Status Header */}
      <View style={styles.header}>
        <View style={styles.statusBadge}>
          <View
            style={[
              styles.statusDot,
              {backgroundColor: isRunning ? '#4CAF50' : isPaused ? '#FF9800' : '#F44336'},
            ]}
          />
          <Text style={styles.statusText}>{state.engine.status.toUpperCase()}</Text>
        </View>
        <Text style={styles.symbolText}>{state.engine.symbol}</Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {isRunning && (
          <>
            <TouchableOpacity style={styles.btnSecondary} onPress={handlePause}>
              <Icon name="pause" size={20} color="#fff" />
              <Text style={styles.btnText}>일시정지</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnDanger} onPress={handleStop}>
              <Icon name="stop" size={20} color="#fff" />
              <Text style={styles.btnText}>중지</Text>
            </TouchableOpacity>
          </>
        )}
        {isPaused && (
          <>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleResume}>
              <Icon name="play" size={20} color="#fff" />
              <Text style={styles.btnText}>재개</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnDanger} onPress={handleStop}>
              <Icon name="stop" size={20} color="#fff" />
              <Text style={styles.btnText}>중지</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {/* PnL Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>총 손익 (PnL)</Text>
          <Text
            style={[
              styles.cardValue,
              {color: state.pnl.total >= 0 ? '#4CAF50' : '#F44336'},
            ]}>
            {state.pnl.total >= 0 ? '+' : ''}${state.pnl.total.toFixed(2)}
          </Text>
          <Text style={styles.cardSubtext}>ROI: {state.pnl.roi.toFixed(2)}%</Text>
        </View>

        {/* Position Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>포지션 가치</Text>
          <Text style={styles.cardValue}>${state.position.totalValue.toFixed(2)}</Text>
          <Text style={styles.cardSubtext}>
            재고 비율: {(state.position.inventoryRatio * 100).toFixed(1)}%
          </Text>
        </View>

        {/* Price Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>현재가</Text>
          <Text style={styles.cardValue}>${state.market.lastPrice.toFixed(2)}</Text>
          <Text
            style={[
              styles.cardSubtext,
              {color: state.market.priceChangePct24h >= 0 ? '#4CAF50' : '#F44336'},
            ]}>
            {state.market.priceChangePct24h >= 0 ? '+' : ''}
            {state.market.priceChangePct24h.toFixed(2)}%
          </Text>
        </View>

        {/* Grid Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>그리드</Text>
          <Text style={styles.cardValue}>
            {state.grid.activeLevels}/{state.grid.totalLevels}
          </Text>
          <Text style={styles.cardSubtext}>활성 레벨</Text>
        </View>
      </View>

      {/* Metrics */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>트레이딩 지표</Text>
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>총 거래</Text>
            <Text style={styles.metricValue}>{state.metrics.totalTrades}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>승률</Text>
            <Text style={styles.metricValue}>{state.metrics.winRate.toFixed(1)}%</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>평균 수익</Text>
            <Text style={styles.metricValue}>${state.metrics.avgProfit.toFixed(2)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>수익 비율</Text>
            <Text style={styles.metricValue}>
              {state.metrics.profitFactor.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Risk */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>리스크 관리</Text>
        <View style={styles.riskRow}>
          <Text style={styles.riskLabel}>최대 낙폭</Text>
          <Text style={styles.riskValue}>{state.risk.maxDrawdown.toFixed(2)}%</Text>
        </View>
        <View style={styles.riskRow}>
          <Text style={styles.riskLabel}>현재 낙폭</Text>
          <Text style={styles.riskValue}>{state.risk.currentDrawdown.toFixed(2)}%</Text>
        </View>
        <View style={styles.riskRow}>
          <Text style={styles.riskLabel}>일일 손실</Text>
          <Text style={styles.riskValue}>${state.risk.dailyLoss.toFixed(2)}</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  errorText: {
    color: '#F44336',
    fontSize: 16,
  },
  header: {
    padding: 16,
    backgroundColor: '#1E1E1E',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  symbolText: {
    color: '#2196F3',
    fontSize: 18,
    fontWeight: 'bold',
  },
  controls: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnSecondary: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#666',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnDanger: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F44336',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  card: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 8,
  },
  cardTitle: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  cardValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtext: {
    color: '#888',
    fontSize: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    color: '#888',
    fontSize: 11,
    marginBottom: 4,
  },
  metricValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  riskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  riskLabel: {
    color: '#888',
    fontSize: 14,
  },
  riskValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DashboardScreen;
