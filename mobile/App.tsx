/**
 * BPX Grid Bot Mobile App
 * Main entry point with navigation setup
 */

import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {StyleSheet} from 'react-native';

import DashboardScreen from './src/screens/DashboardScreen';
import PortfolioScreen from './src/screens/PortfolioScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import {NotificationService} from './src/services/NotificationService';

const Tab = createBottomTabNavigator();

const App = () => {
  useEffect(() => {
    // Initialize notifications
    NotificationService.initialize();

    return () => {
      // Cleanup
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({route}) => ({
            tabBarIcon: ({focused, color, size}) => {
              let iconName: string;

              switch (route.name) {
                case 'Dashboard':
                  iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
                  break;
                case 'Portfolio':
                  iconName = focused ? 'wallet' : 'wallet-outline';
                  break;
                case 'Settings':
                  iconName = focused ? 'cog' : 'cog-outline';
                  break;
                default:
                  iconName = 'help-circle-outline';
              }

              return <Icon name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#2196F3',
            tabBarInactiveTintColor: '#888',
            tabBarStyle: {
              backgroundColor: '#1E1E1E',
              borderTopColor: '#333',
            },
            headerStyle: {
              backgroundColor: '#1E1E1E',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          })}>
          <Tab.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{title: '대시보드'}}
          />
          <Tab.Screen
            name="Portfolio"
            component={PortfolioScreen}
            options={{title: '포트폴리오'}}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{title: '설정'}}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
