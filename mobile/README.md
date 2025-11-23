# BPX Grid Bot - Mobile App

React Native mobile application for monitoring and controlling the BPX Grid Bot trading system.

## Features

### 📱 Real-time Monitoring
- Live dashboard with trading metrics
- Real-time PnL tracking
- Position and risk monitoring
- Grid level visualization
- Order book display

### 💼 Portfolio Management
- Multi-pair portfolio overview
- Individual pair performance tracking
- Weight-based allocation display
- Status indicators for each trading pair

### 🔔 Push Notifications
- Trade execution alerts
- Risk warnings (drawdown, daily loss limits)
- PnL updates
- Engine status changes
- Customizable notification preferences

### ⚙️ Remote Control
- Start/Stop/Pause trading engine
- Real-time status updates
- Emergency stop functionality
- Connection health monitoring

### 🎨 Modern UI/UX
- Dark theme optimized for trading
- Intuitive navigation with bottom tabs
- Pull-to-refresh on all screens
- Responsive design for all screen sizes
- Material icons throughout

## Tech Stack

- **React Native** 0.73.2
- **React Navigation** 6.x (Bottom Tabs + Stack)
- **TypeScript** for type safety
- **Axios** for API communication
- **AsyncStorage** for local settings
- **Notifee** for push notifications
- **React Native Vector Icons** for UI elements
- **React Native Chart Kit** for data visualization

## Installation

### Prerequisites

- Node.js 18+
- React Native development environment
- iOS: Xcode 14+ and CocoaPods
- Android: Android Studio and JDK 11+

### Setup

1. **Install dependencies:**
   ```bash
   cd mobile
   npm install
   ```

2. **iOS setup:**
   ```bash
   cd ios
   pod install
   cd ..
   ```

3. **Android setup:**
   - Open `android/` folder in Android Studio
   - Sync Gradle files

### Running the App

**iOS:**
```bash
npm run ios
```

**Android:**
```bash
npm run android
```

**Metro bundler:**
```bash
npm start
```

## Configuration

### API Server

1. Open the app
2. Go to **Settings** tab
3. Enter your backend API URL (e.g., `http://192.168.1.100:3001/api`)
4. Tap **Save**
5. Verify connection status shows "Connected"

### Notifications

1. Go to **Settings** tab
2. Enable/disable notification types:
   - **Trade Notifications**: Alerts on order execution
   - **Risk Notifications**: Warnings for drawdown/loss limits
   - **PnL Updates**: Daily profit/loss summaries
3. Settings are saved automatically

### Performance

- Adjust refresh interval (1-60 seconds) in Settings
- Default: 5 seconds for dashboard, 10 seconds for portfolio

## Screens

### Dashboard
- Engine status and controls (Start/Stop/Pause)
- Real-time price and 24h change
- PnL card with ROI
- Position value and inventory ratio
- Grid levels (active/total)
- Trading metrics (trades, win rate, avg profit)
- Risk monitoring (drawdown, daily loss)

### Portfolio
- Multi-pair overview cards:
  - Active pairs count
  - Total PnL
  - Daily PnL
  - Total portfolio value
- Individual pair breakdown:
  - Status indicator
  - PnL per pair
  - Allocation bar
  - Position value
  - Trading stats

### Settings
- API server configuration
- Connection health check
- Notification preferences
- Refresh interval settings
- App version info

## Push Notification Examples

**Trade Alert:**
```
🟢 BUY SOL_USDC
Price: $142.50
Qty: 0.0500
PnL: +$2.50
```

**Risk Warning:**
```
⚠️ Risk Alert
Daily Loss Limit
Current daily loss: $85.00 / $100.00
```

**PnL Update:**
```
📈 PnL Update
Total: $1,245.50 (12.45%)
Daily: +$45.80
```

## Project Structure

```
mobile/
├── src/
│   ├── screens/
│   │   ├── DashboardScreen.tsx    # Main trading dashboard
│   │   ├── PortfolioScreen.tsx    # Portfolio management
│   │   └── SettingsScreen.tsx     # App settings
│   └── services/
│       ├── ApiClient.ts           # Backend API client
│       └── NotificationService.ts # Push notification handler
├── App.tsx                        # Root component with navigation
├── index.js                       # Entry point
├── package.json                   # Dependencies
└── tsconfig.json                  # TypeScript config
```

## API Integration

The mobile app connects to the BPX Grid Bot backend API:

**Endpoints:**
- `GET /api/state` - Dashboard state
- `POST /api/control/start` - Start engine
- `POST /api/control/stop` - Stop engine
- `POST /api/control/pause` - Pause engine
- `POST /api/control/resume` - Resume engine
- `GET /api/portfolio/summary` - Portfolio overview
- `GET /api/scenarios` - Scenario templates
- `GET /api/health` - Health check

## Building for Production

### iOS

1. Configure signing in Xcode
2. Set bundle identifier
3. Build archive:
   ```bash
   cd ios
   xcodebuild -workspace BPXGridBot.xcworkspace \
              -scheme BPXGridBot \
              -configuration Release \
              -archivePath ./build/BPXGridBot.xcarchive \
              archive
   ```

### Android

1. Generate signing key:
   ```bash
   keytool -genkeypair -v -storetype PKCS12 \
           -keystore my-release-key.keystore \
           -alias my-key-alias -keyalg RSA \
           -keysize 2048 -validity 10000
   ```

2. Build APK/AAB:
   ```bash
   cd android
   ./gradlew assembleRelease  # APK
   ./gradlew bundleRelease    # AAB for Play Store
   ```

## Troubleshooting

### Connection Issues

1. Ensure backend server is running
2. Check API URL in Settings (use IP address, not localhost)
3. Verify firewall allows connections
4. Check network connectivity

### Notifications Not Working

1. Check notification permissions in device settings
2. Enable notifications in app Settings
3. Verify backend is sending events
4. Check notification channel settings (Android)

### Build Errors

**iOS:**
- Clean build: `cd ios && pod deintegrate && pod install`
- Clear Metro cache: `npm start -- --reset-cache`

**Android:**
- Clean Gradle: `cd android && ./gradlew clean`
- Rebuild: `./gradlew assembleDebug`

## Development

### Hot Reload

Press `r` in Metro bundler to reload
Press `d` to open developer menu

### Debugging

- **Chrome DevTools**: Shake device → "Debug" → Opens Chrome
- **React Native Debugger**: Standalone debugging tool
- **Flipper**: Advanced debugging with network inspector

### Linting

```bash
npm run lint
```

## Future Enhancements

- [ ] Chart visualization with TradingView/Lightweight Charts
- [ ] Scenario template selection from mobile
- [ ] Quick backtest execution
- [ ] Trading history with filters
- [ ] Dark/Light theme toggle
- [ ] Multiple language support
- [ ] Biometric authentication
- [ ] WebSocket for real-time updates
- [ ] Offline mode with cached data

## License

See main project LICENSE file

## Support

For issues and feature requests, please visit:
https://github.com/your-repo/bpx-grid-bot
