/**
 * Trade History Screen
 * Displays paginated trade history with filtering
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useNavigation} from '@react-navigation/native';
import ApiClient, {Trade} from '../services/ApiClient';

const TradeHistoryScreen = () => {
  const navigation = useNavigation();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [sideFilter, setSideFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | '1d' | '7d' | '30d'>('all');
  const pageSize = 20;

  useEffect(() => {
    loadTrades();
  }, [page, sideFilter, dateFilter]);

  const loadTrades = async () => {
    try {
      setLoading(true);
      const data = await ApiClient.getTrades({
        sessionId: 'current',
        limit: pageSize,
        offset: page * pageSize,
        side: sideFilter !== 'all' ? sideFilter : undefined,
        dateFilter,
      });
      setTrades(data.trades || []);
    } catch (error) {
      console.error('Failed to load trades:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(0);
    loadTrades();
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(
      date.getMinutes(),
    ).padStart(2, '0')}`;
  };

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  const renderFilterButton = (
    label: string,
    isActive: boolean,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      style={[styles.filterBtn, isActive && styles.filterBtnActive]}
      onPress={onPress}>
      <Text style={[styles.filterBtnText, isActive && styles.filterBtnTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Filters */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>구분:</Text>
        <View style={styles.filterRow}>
          {renderFilterButton('전체', sideFilter === 'all', () => setSideFilter('all'))}
          {renderFilterButton('매수', sideFilter === 'buy', () => setSideFilter('buy'))}
          {renderFilterButton('매도', sideFilter === 'sell', () => setSideFilter('sell'))}
        </View>
      </View>

      <View style={styles.filterContainer}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
          <Text style={styles.filterLabel}>기간:</Text>
          <TouchableOpacity
            style={styles.chartBtn}
            onPress={() => navigation.navigate('Chart' as never)}>
            <Icon name="chart-line" size={16} color="#2196F3" />
            <Text style={styles.chartBtnText}>차트 보기</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.filterRow}>
          {renderFilterButton('전체', dateFilter === 'all', () => setDateFilter('all'))}
          {renderFilterButton('1일', dateFilter === '1d', () => setDateFilter('1d'))}
          {renderFilterButton('7일', dateFilter === '7d', () => setDateFilter('7d'))}
          {renderFilterButton('30일', dateFilter === '30d', () => setDateFilter('30d'))}
        </View>
      </View>

      {/* Trade List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }>
        {loading && trades.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>로딩 중...</Text>
          </View>
        ) : trades.length === 0 ? (
          <View style={styles.centered}>
            <Icon name="information-outline" size={48} color="#666" />
            <Text style={styles.emptyText}>거래 기록이 없습니다</Text>
          </View>
        ) : (
          trades.map(trade => (
            <View key={trade.id} style={styles.tradeCard}>
              <View style={styles.tradeHeader}>
                <View style={styles.tradeHeaderLeft}>
                  <View
                    style={[
                      styles.sideBadge,
                      {
                        backgroundColor:
                          trade.side === 'buy'
                            ? 'rgba(76, 175, 80, 0.1)'
                            : 'rgba(244, 67, 54, 0.1)',
                      },
                    ]}>
                    <Text
                      style={[
                        styles.sideBadgeText,
                        {color: trade.side === 'buy' ? '#4CAF50' : '#F44336'},
                      ]}>
                      {trade.side === 'buy' ? '매수' : '매도'}
                    </Text>
                  </View>
                  <Text style={styles.symbolText}>{trade.symbol}</Text>
                  {trade.grid_level !== undefined && (
                    <Text style={styles.gridLevel}>#{trade.grid_level}</Text>
                  )}
                </View>
                <Text style={styles.dateText}>{formatDateTime(trade.timestamp)}</Text>
              </View>

              <View style={styles.tradeDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>가격</Text>
                  <Text style={styles.detailValue}>{formatCurrency(trade.price)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>수량</Text>
                  <Text style={styles.detailValue}>{trade.quantity.toFixed(4)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>금액</Text>
                  <Text style={styles.detailValue}>{formatCurrency(trade.value)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>수수료</Text>
                  <Text style={styles.detailValueSecondary}>
                    {formatCurrency(trade.fee)}
                  </Text>
                </View>
              </View>

              {trade.realized_pnl !== 0 && (
                <View style={styles.pnlRow}>
                  <Text style={styles.pnlLabel}>실현 손익</Text>
                  <Text
                    style={[
                      styles.pnlValue,
                      {color: trade.realized_pnl >= 0 ? '#4CAF50' : '#F44336'},
                    ]}>
                    {trade.realized_pnl >= 0 ? '+' : ''}
                    {formatCurrency(trade.realized_pnl)}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Pagination */}
      {trades.length > 0 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]}
            onPress={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}>
            <Icon
              name="chevron-left"
              size={24}
              color={page === 0 ? '#666' : '#fff'}
            />
          </TouchableOpacity>

          <Text style={styles.pageText}>페이지 {page + 1}</Text>

          <TouchableOpacity
            style={[
              styles.pageBtn,
              trades.length < pageSize && styles.pageBtnDisabled,
            ]}
            onPress={() => setPage(page + 1)}
            disabled={trades.length < pageSize}>
            <Icon
              name="chevron-right"
              size={24}
              color={trades.length < pageSize ? '#666' : '#fff'}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  filterContainer: {
    padding: 16,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  filterLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#2C2C2C',
    borderWidth: 1,
    borderColor: '#3C3C3C',
  },
  filterBtnActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  filterBtnText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  filterBtnTextActive: {
    color: '#fff',
  },
  chartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  chartBtnText: {
    color: '#2196F3',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    color: '#888',
    marginTop: 16,
    fontSize: 14,
  },
  emptyText: {
    color: '#888',
    marginTop: 16,
    fontSize: 14,
  },
  tradeCard: {
    backgroundColor: '#1E1E1E',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tradeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sideBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sideBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  symbolText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  gridLevel: {
    color: '#888',
    fontSize: 12,
  },
  dateText: {
    color: '#888',
    fontSize: 12,
  },
  tradeDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    color: '#888',
    fontSize: 13,
  },
  detailValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  detailValueSecondary: {
    color: '#888',
    fontSize: 13,
  },
  pnlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2C',
  },
  pnlLabel: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  pnlValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1E1E1E',
    borderTopWidth: 1,
    borderTopColor: '#2C2C2C',
    gap: 24,
  },
  pageBtn: {
    padding: 8,
  },
  pageBtnDisabled: {
    opacity: 0.3,
  },
  pageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default TradeHistoryScreen;
