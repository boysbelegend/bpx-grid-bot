/**
 * Portfolio Screen
 * Multi-pair portfolio management
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ApiClient, {PortfolioSummary} from '../services/ApiClient';

const PortfolioScreen = () => {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPortfolio();
    const interval = setInterval(loadPortfolio, 10000); // Update every 10s

    return () => clearInterval(interval);
  }, []);

  const loadPortfolio = async () => {
    try {
      const data = await ApiClient.getPortfolioSummary();
      setSummary(data);
    } catch (error) {
      console.error('Failed to load portfolio:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPortfolio();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return '#4CAF50';
      case 'paused':
        return '#FF9800';
      default:
        return '#666';
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>포트폴리오를 불러올 수 없습니다</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }>
      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>활성 페어</Text>
          <Text style={styles.summaryValue}>
            {summary.activePairs}/{summary.totalPairs}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>총 PnL</Text>
          <Text
            style={[
              styles.summaryValue,
              {color: summary.totalPnl >= 0 ? '#4CAF50' : '#F44336'},
            ]}>
            {summary.totalPnl >= 0 ? '+' : ''}${summary.totalPnl.toFixed(2)}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>일일 PnL</Text>
          <Text
            style={[
              styles.summaryValue,
              {color: summary.dailyPnl >= 0 ? '#4CAF50' : '#F44336'},
            ]}>
            {summary.dailyPnl >= 0 ? '+' : ''}${summary.dailyPnl.toFixed(2)}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>총 가치</Text>
          <Text style={styles.summaryValue}>
            ${summary.totalPositionValue.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Pair Breakdown */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>페어 상세</Text>

        {summary.pairBreakdown.map((pair, index) => (
          <View key={pair.symbol} style={styles.pairCard}>
            <View style={styles.pairHeader}>
              <View style={styles.pairTitle}>
                <View
                  style={[
                    styles.statusDot,
                    {backgroundColor: getStatusColor(pair.status)},
                  ]}
                />
                <Text style={styles.pairSymbol}>{pair.symbol}</Text>
              </View>
              <Text
                style={[
                  styles.pairPnl,
                  {color: pair.pnl >= 0 ? '#4CAF50' : '#F44336'},
                ]}>
                {pair.pnl >= 0 ? '+' : ''}${pair.pnl.toFixed(2)}
              </Text>
            </View>

            {/* Allocation Bar */}
            <View style={styles.allocationBar}>
              <View
                style={[
                  styles.allocationFill,
                  {
                    width: `${pair.weight * 100}%`,
                    backgroundColor:
                      pair.status === 'running'
                        ? '#2196F3'
                        : pair.status === 'paused'
                        ? '#FF9800'
                        : '#666',
                  },
                ]}
              />
            </View>

            {/* Pair Stats */}
            <View style={styles.pairStats}>
              <View style={styles.pairStat}>
                <Text style={styles.pairStatLabel}>비중</Text>
                <Text style={styles.pairStatValue}>
                  {(pair.weight * 100).toFixed(1)}%
                </Text>
              </View>
              <View style={styles.pairStat}>
                <Text style={styles.pairStatLabel}>포지션</Text>
                <Text style={styles.pairStatValue}>
                  ${pair.positionValue.toFixed(2)}
                </Text>
              </View>
              {pair.totalTrades !== undefined && (
                <View style={styles.pairStat}>
                  <Text style={styles.pairStatLabel}>거래</Text>
                  <Text style={styles.pairStatValue}>{pair.totalTrades}</Text>
                </View>
              )}
              {pair.winRate !== undefined && (
                <View style={styles.pairStat}>
                  <Text style={styles.pairStatLabel}>승률</Text>
                  <Text style={styles.pairStatValue}>
                    {(pair.winRate * 100).toFixed(1)}%
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#1E1E1E',
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  pairCard: {
    backgroundColor: '#2C2C2C',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  pairHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pairTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  pairSymbol: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pairPnl: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  allocationBar: {
    height: 4,
    backgroundColor: '#3C3C3C',
    borderRadius: 2,
    marginVertical: 8,
  },
  allocationFill: {
    height: '100%',
    borderRadius: 2,
  },
  pairStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  pairStat: {
    alignItems: 'center',
  },
  pairStatLabel: {
    color: '#888',
    fontSize: 11,
    marginBottom: 4,
  },
  pairStatValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PortfolioScreen;
