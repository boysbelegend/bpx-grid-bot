/**
 * Settings Screen
 * App configuration and preferences
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiClient from '../services/ApiClient';

const SettingsScreen = () => {
  const [apiUrl, setApiUrl] = useState('http://localhost:3001/api');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [tradeNotifications, setTradeNotifications] = useState(true);
  const [riskNotifications, setRiskNotifications] = useState(true);
  const [pnlNotifications, setPnlNotifications] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState('5');
  const [connectionStatus, setConnectionStatus] = useState<
    'checking' | 'connected' | 'disconnected'
  >('checking');

  useEffect(() => {
    loadSettings();
    checkConnection();
  }, []);

  const loadSettings = async () => {
    try {
      const savedUrl = await AsyncStorage.getItem('apiBaseUrl');
      const savedNotifications = await AsyncStorage.getItem('notificationsEnabled');
      const savedTradeNotif = await AsyncStorage.getItem('tradeNotifications');
      const savedRiskNotif = await AsyncStorage.getItem('riskNotifications');
      const savedPnlNotif = await AsyncStorage.getItem('pnlNotifications');
      const savedInterval = await AsyncStorage.getItem('refreshInterval');

      if (savedUrl) setApiUrl(savedUrl);
      if (savedNotifications) setNotificationsEnabled(JSON.parse(savedNotifications));
      if (savedTradeNotif) setTradeNotifications(JSON.parse(savedTradeNotif));
      if (savedRiskNotif) setRiskNotifications(JSON.parse(savedRiskNotif));
      if (savedPnlNotif) setPnlNotifications(JSON.parse(savedPnlNotif));
      if (savedInterval) setRefreshInterval(savedInterval);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const checkConnection = async () => {
    setConnectionStatus('checking');
    const isConnected = await ApiClient.checkHealth();
    setConnectionStatus(isConnected ? 'connected' : 'disconnected');
  };

  const handleSaveApiUrl = async () => {
    try {
      await ApiClient.setBaseURL(apiUrl);
      await AsyncStorage.setItem('apiBaseUrl', apiUrl);
      Alert.alert('성공', 'API URL이 저장되었습니다');
      checkConnection();
    } catch (error) {
      Alert.alert('오류', 'API URL 저장 실패');
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    await AsyncStorage.setItem('notificationsEnabled', JSON.stringify(value));
  };

  const handleToggleTradeNotifications = async (value: boolean) => {
    setTradeNotifications(value);
    await AsyncStorage.setItem('tradeNotifications', JSON.stringify(value));
  };

  const handleToggleRiskNotifications = async (value: boolean) => {
    setRiskNotifications(value);
    await AsyncStorage.setItem('riskNotifications', JSON.stringify(value));
  };

  const handleTogglePnlNotifications = async (value: boolean) => {
    setPnlNotifications(value);
    await AsyncStorage.setItem('pnlNotifications', JSON.stringify(value));
  };

  const handleSaveInterval = async () => {
    const interval = parseInt(refreshInterval, 10);
    if (isNaN(interval) || interval < 1 || interval > 60) {
      Alert.alert('오류', '새로고침 간격은 1-60초 사이여야 합니다');
      return;
    }
    await AsyncStorage.setItem('refreshInterval', refreshInterval);
    Alert.alert('성공', '설정이 저장되었습니다');
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'checking':
        return 'loading';
      case 'connected':
        return 'check-circle';
      case 'disconnected':
        return 'close-circle';
    }
  };

  const getConnectionColor = () => {
    switch (connectionStatus) {
      case 'checking':
        return '#FF9800';
      case 'connected':
        return '#4CAF50';
      case 'disconnected':
        return '#F44336';
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Connection Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>연결 설정</Text>

        <View style={styles.card}>
          <Text style={styles.label}>API 서버 URL</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={apiUrl}
              onChangeText={setApiUrl}
              placeholder="http://localhost:3001/api"
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <TouchableOpacity style={styles.btnPrimary} onPress={handleSaveApiUrl}>
            <Text style={styles.btnText}>저장</Text>
          </TouchableOpacity>

          <View style={styles.statusRow}>
            <Icon
              name={getConnectionIcon()}
              size={20}
              color={getConnectionColor()}
            />
            <Text style={[styles.statusText, {color: getConnectionColor()}]}>
              {connectionStatus === 'checking'
                ? '확인 중...'
                : connectionStatus === 'connected'
                ? '연결됨'
                : '연결 끊김'}
            </Text>
            <TouchableOpacity onPress={checkConnection}>
              <Icon name="refresh" size={20} color="#2196F3" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Notification Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>알림 설정</Text>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>알림 활성화</Text>
              <Text style={styles.settingDescription}>
                모든 푸시 알림 허용
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{false: '#3C3C3C', true: '#2196F3'}}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>거래 알림</Text>
              <Text style={styles.settingDescription}>
                매수/매도 체결 시 알림
              </Text>
            </View>
            <Switch
              value={tradeNotifications}
              onValueChange={handleToggleTradeNotifications}
              trackColor={{false: '#3C3C3C', true: '#2196F3'}}
              disabled={!notificationsEnabled}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>리스크 경고</Text>
              <Text style={styles.settingDescription}>
                손실/드로다운 경고 알림
              </Text>
            </View>
            <Switch
              value={riskNotifications}
              onValueChange={handleToggleRiskNotifications}
              trackColor={{false: '#3C3C3C', true: '#2196F3'}}
              disabled={!notificationsEnabled}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>PnL 업데이트</Text>
              <Text style={styles.settingDescription}>
                일일 손익 알림
              </Text>
            </View>
            <Switch
              value={pnlNotifications}
              onValueChange={handleTogglePnlNotifications}
              trackColor={{false: '#3C3C3C', true: '#2196F3'}}
              disabled={!notificationsEnabled}
            />
          </View>
        </View>
      </View>

      {/* Performance Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>성능 설정</Text>

        <View style={styles.card}>
          <Text style={styles.label}>새로고침 간격 (초)</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={refreshInterval}
              onChangeText={setRefreshInterval}
              placeholder="5"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />
          </View>
          <TouchableOpacity style={styles.btnPrimary} onPress={handleSaveInterval}>
            <Text style={styles.btnText}>저장</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>앱 정보</Text>

        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>버전</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>빌드</Text>
            <Text style={styles.infoValue}>100</Text>
          </View>
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
  section: {
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 8,
  },
  label: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
  },
  inputRow: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#2C2C2C',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
  },
  btnPrimary: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    color: '#888',
    fontSize: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    color: '#888',
    fontSize: 14,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SettingsScreen;
