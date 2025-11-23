/**
 * Chart Screen
 * Displays price chart with grid levels
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {LineChart} from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useNavigation} from '@react-navigation/native';
import ApiClient from '../services/ApiClient';

const screenWidth = Dimensions.get('window').width;

interface PriceData {
  labels: string[];
  prices: number[];
  volumes: number[];
  gridLevels: Array<{price: number; side: 'buy' | 'sell'; hasOrder: boolean}>;
  currentPrice: number;
}

const ChartScreen = () => {
  const navigation = useNavigation();
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState<'5m' | '15m' | '1h' | '4h'>('15m');

  useEffect(() => {
    loadChartData();
    const interval = setInterval(loadChartData, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, [timeframe]);

  const loadChartData = async () => {
    try {
      setLoading(true);
      const state = await ApiClient.getDashboardState();

      // Generate sample price data based on current price
      // In production, fetch real candle data from API
      const now = Date.now();
      const intervals: Record<string, number> = {
        '5m': 5 * 60 * 1000,
        '15m': 15 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '4h': 4 * 60 * 60 * 1000,
      };
      const interval = intervals[timeframe];
      const points = 20;

      const basePrice = state.market.lastPrice;
      const labels: string[] = [];
      const prices: number[] = [];
      const volumes: number[] = [];

      for (let i = points - 1; i >= 0; i--) {
        const time = new Date(now - i * interval);
        labels.push(
          timeframe === '5m' || timeframe === '15m'
            ? `${time.getHours()}:${String(time.getMinutes()).padStart(2, '0')}`
            : `${time.getHours()}:00`,
        );

        // Generate realistic price variation
        const variation = (Math.random() - 0.5) * basePrice * 0.02;
        prices.push(basePrice + variation);
        volumes.push(Math.random() * 100000);
      }

      setPriceData({
        labels,
        prices,
        volumes,
        gridLevels: state.grid.levels.map((level: any) => ({
          price: level.price,
          side: level.side === 'buy' ? 'buy' : 'sell',
          hasOrder: level.hasOrder || false,
        })),
        currentPrice: state.market.lastPrice,
      });
    } catch (error) {
      console.error('Failed to load chart data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadChartData();
  };

  const renderTimeframeButton = (
    label: string,
    value: '5m' | '15m' | '1h' | '4h',
  ) => (
    <TouchableOpacity
      style={[styles.timeframeBtn, timeframe === value && styles.timeframeBtnActive]}
      onPress={() => setTimeframe(value)}>
      <Text
        style={[
          styles.timeframeBtnText,
          timeframe === value && styles.timeframeBtnTextActive,
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading || !priceData) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  const minPrice = Math.min(...priceData.prices);
  const maxPrice = Math.max(...priceData.prices);
  const priceRange = maxPrice - minPrice;

  // Filter grid levels to show only those within visible range
  const visibleGridLevels = priceData.gridLevels.filter(
    level => level.price >= minPrice - priceRange * 0.1 && level.price <= maxPrice + priceRange * 0.1,
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }>
      {/* Timeframe Selector */}
      <View style={styles.timeframeContainer}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
          <Text style={styles.timeframeLabel}>시간 프레임:</Text>
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => navigation.navigate('TradeHistory' as never)}>
            <Icon name="format-list-bulleted" size={16} color="#2196F3" />
            <Text style={styles.historyBtnText}>거래 내역</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.timeframeRow}>
          {renderTimeframeButton('5분', '5m')}
          {renderTimeframeButton('15분', '15m')}
          {renderTimeframeButton('1시간', '1h')}
          {renderTimeframeButton('4시간', '4h')}
        </View>
      </View>

      {/* Price Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>가격 차트</Text>
        <Text style={styles.currentPrice}>${priceData.currentPrice.toFixed(2)}</Text>

        <LineChart
          data={{
            labels: priceData.labels,
            datasets: [
              {
                data: priceData.prices,
              },
            ],
          }}
          width={screenWidth - 32}
          height={300}
          chartConfig={{
            backgroundColor: '#1E1E1E',
            backgroundGradientFrom: '#1E1E1E',
            backgroundGradientTo: '#1E1E1E',
            decimalPlaces: 2,
            color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(136, 136, 136, ${opacity})`,
            style: {
              borderRadius: 8,
            },
            propsForDots: {
              r: '3',
              strokeWidth: '2',
              stroke: '#2196F3',
            },
            propsForBackgroundLines: {
              strokeDasharray: '',
              stroke: '#2C2C2C',
            },
          }}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={true}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          withVerticalLines={false}
          withHorizontalLines={true}
          withDots={true}
          withShadow={false}
        />
      </View>

      {/* Grid Levels */}
      <View style={styles.gridContainer}>
        <View style={styles.gridHeader}>
          <Text style={styles.gridTitle}>그리드 레벨</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, {backgroundColor: '#4CAF50'}]} />
              <Text style={styles.legendText}>매수</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, {backgroundColor: '#F44336'}]} />
              <Text style={styles.legendText}>매도</Text>
            </View>
          </View>
        </View>

        <View style={styles.gridLevels}>
          {visibleGridLevels
            .sort((a, b) => b.price - a.price)
            .map((level, index) => (
              <View key={index} style={styles.gridLevel}>
                <View style={styles.gridLevelLeft}>
                  <View
                    style={[
                      styles.gridDot,
                      {
                        backgroundColor: level.side === 'buy' ? '#4CAF50' : '#F44336',
                        opacity: level.hasOrder ? 1 : 0.3,
                      },
                    ]}
                  />
                  <Text style={styles.gridPrice}>${level.price.toFixed(2)}</Text>
                </View>

                <View style={styles.gridLevelRight}>
                  {level.hasOrder && (
                    <View style={styles.orderBadge}>
                      <Icon name="clock-outline" size={12} color="#2196F3" />
                      <Text style={styles.orderText}>활성</Text>
                    </View>
                  )}
                  <Text
                    style={[
                      styles.gridDistance,
                      {
                        color:
                          level.price < priceData.currentPrice
                            ? '#4CAF50'
                            : '#F44336',
                      },
                    ]}>
                    {(
                      ((level.price - priceData.currentPrice) /
                        priceData.currentPrice) *
                      100
                    ).toFixed(2)}
                    %
                  </Text>
                </View>
              </View>
            ))}
        </View>
      </View>

      {/* Volume Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>거래량</Text>

        <LineChart
          data={{
            labels: priceData.labels,
            datasets: [
              {
                data: priceData.volumes,
              },
            ],
          }}
          width={screenWidth - 32}
          height={150}
          chartConfig={{
            backgroundColor: '#1E1E1E',
            backgroundGradientFrom: '#1E1E1E',
            backgroundGradientTo: '#1E1E1E',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(136, 136, 136, ${opacity})`,
            style: {
              borderRadius: 8,
            },
            propsForBackgroundLines: {
              strokeDasharray: '',
              stroke: '#2C2C2C',
            },
          }}
          style={styles.chart}
          withInnerLines={false}
          withOuterLines={false}
          withVerticalLabels={false}
          withHorizontalLabels={false}
          withVerticalLines={false}
          withHorizontalLines={false}
          withDots={false}
          withShadow={false}
        />
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
  timeframeContainer: {
    padding: 16,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  timeframeLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
  },
  timeframeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timeframeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#2C2C2C',
    borderWidth: 1,
    borderColor: '#3C3C3C',
  },
  timeframeBtnActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  timeframeBtnText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  timeframeBtnTextActive: {
    color: '#fff',
  },
  historyBtn: {
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
  historyBtnText: {
    color: '#2196F3',
    fontSize: 12,
    fontWeight: '600',
  },
  chartContainer: {
    backgroundColor: '#1E1E1E',
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  chartTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  currentPrice: {
    color: '#2196F3',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  gridContainer: {
    backgroundColor: '#1E1E1E',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
  },
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  gridTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#888',
    fontSize: 12,
  },
  gridLevels: {
    gap: 8,
  },
  gridLevel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  gridLevelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gridDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  gridPrice: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  gridLevelRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 12,
  },
  orderText: {
    color: '#2196F3',
    fontSize: 11,
    fontWeight: '600',
  },
  gridDistance: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default ChartScreen;
