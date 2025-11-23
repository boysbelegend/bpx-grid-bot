# BPX Grid Bot - AMM Style Spread Trading System

**고급 스프레드 트레이딩 시스템** for Backpack Exchange

현물/선물 통합 지원, AMM 스타일 동적 그리드 트레이딩, 실전 리스크 관리를 갖춘 전문가급 자동 매매 봇입니다.

---

## ✨ 주요 기능

### 🎯 핵심 기능
- ✅ **다중 종목 지원**: SOL, BTC, ETH 등 모든 Backpack 페어
- ✅ **AMM 스타일 그리드**: Meteora/Uniswap v3 스타일의 유동성 공급 전략
- ✅ **동적 그리드 재배치**: 가격 변동에 따라 자동으로 그리드 이동
- ✅ **인벤토리 밸런싱**: 자산 쏠림 방지 및 자동 조정
- ✅ **현물 + 선물 지원**: 통합 아키텍처 (v1: 현물, v2: 선물)
- ✅ **드라이런 모드**: 실제 주문 없이 시뮬레이션 테스트

### 🛡️ 리스크 관리
- 최대 포지션 크기 제한
- 일일 손실 한도 (Daily Loss Limit)
- 긴급 정지 (Emergency Stop Loss)
- 레버리지 및 청산가 모니터링 (선물)
- 실시간 리스크 지표 추적

### 🎨 전략 모드
- **Mean-Reversion**: 현재가 중심 대칭 그리드 (기본)
- **Trend-Following**: 추세 방향 편향 그리드 (추후 추가)
- **Adaptive**: 변동성 기반 동적 조정 (추후 추가)

---

## 📋 시스템 요구사항

- **Node.js**: 16.x 이상
- **Yarn** 또는 npm
- **Backpack Exchange 계정** 및 API 키
- **충분한 거래 자금** (전략별 요구사항 참고)

---

## 🚀 빠른 시작

### 1. 설치

```bash
git clone <repository-url>
cd bpx-grid-bot
yarn install
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 API 키를 입력:

```bash
cp .env.copy .env
nano .env  # 또는 선호하는 에디터
```

```.env
# Backpack Exchange API
BACKPACK_API_KEY=your_api_key_here
BACKPACK_API_SECRET=your_api_secret_here

# Telegram (선택사항)
TELEGRAM_BOT_API_TOKEN=
TELEGRAM_TARGET_CHAT_ID=
TELEGRAM_NOTIFY_INTERVAL=3600000

# Logging
LOG_LEVEL=info
LOG_FILE=trading.log
```

### 3. 전략 설정

`config/strategies/` 디렉토리에서 전략 설정 파일을 선택하거나 커스텀 생성:

```bash
# 템플릿에서 새 전략 생성
cp config/strategies/template.json config/strategies/my-strategy.json
nano config/strategies/my-strategy.json
```

### 4. 드라이런 테스트 (권장)

실제 거래 전, 드라이런 모드로 테스트:

```bash
# 빌드
yarn build

# 드라이런 실행 (기본 SOL 전략)
node dist/src/app.js

# 또는 특정 전략 지정
node dist/src/app.js config/strategies/btc-conservative-grid.json
```

### 5. 실전 거래 시작

드라이런 테스트 완료 후, 설정 파일에서 `dryRun: false`로 변경:

```json
{
  "dryRun": false,
  ...
}
```

```bash
# 실전 실행
node dist/src/app.js config/strategies/my-strategy.json
```

### 6. PM2로 백그라운드 실행

```bash
# PM2 설치 (미설치 시)
npm install -g pm2

# 백그라운드 실행
pm2 start dist/src/app.js --name grid-bot -- config/strategies/sol-amm-grid.json

# 로그 확인
pm2 logs grid-bot

# 상태 확인
pm2 status

# 중지
pm2 stop grid-bot

# 재시작
pm2 restart grid-bot
```

---

## 📖 전략 설정 가이드

### 기본 구조

```json
{
  "name": "My Strategy",
  "type": "spot",
  "symbol": "SOL_USDC",
  "baseAsset": "SOL",
  "quoteAsset": "USDC",

  "grid": {
    "mode": "mean-reversion",
    "levels": 20,
    "spacing": {
      "type": "percentage",
      "value": 1.0
    },
    "range": {
      "lower": "auto",
      "upper": "auto"
    }
  },

  "order": {
    "quantityPerLevel": 0.05,
    "orderType": "Limit",
    "timeInForce": "GTC"
  },

  "risk": {
    "maxPositionSize": 10.0,
    "maxPositionValue": 2000,
    "maxDailyLoss": 100,
    "maxOrderCount": 40,
    "rebalanceThreshold": 3.0,
    "emergencyStopLoss": 10.0
  },

  "dryRun": true,
  "cancelOrdersOnStart": true,
  "telegramNotify": false
}
```

### 주요 파라미터 설명

#### Grid 설정
- **mode**: `mean-reversion` (대칭 그리드), `trend-following` (추세 편향)
- **levels**: 그리드 레벨 수 (10~50 권장)
- **spacing.type**: `percentage` (비율) 또는 `fixed` (절대값)
- **spacing.value**:
  - percentage: `1.0` = 1% 간격
  - fixed: 절대 가격 차이 (예: 10 USDC)
- **range**: `auto` (자동 계산) 또는 고정 가격 범위

#### Order 설정
- **quantityPerLevel**: 각 레벨의 주문 수량
- **orderType**: `Limit` 또는 `PostOnly` (메이커 전용)
- **timeInForce**: `GTC` (Good Till Cancel), `IOC`, `FOK`

#### Risk 설정
- **maxPositionSize**: 최대 보유 가능 베이스 자산 (예: 10 SOL)
- **maxPositionValue**: 최대 포지션 가치 (USDC)
- **maxDailyLoss**: 일일 최대 손실 한도 (USDC)
- **maxOrderCount**: 동시 최대 주문 수
- **rebalanceThreshold**: 그리드 재배치 트리거 (% 가격 변동)
- **emergencyStopLoss**: 긴급 정지 손실률 (%)

---

## 💰 자금 요구사항 계산

### 현물 모드

```
필요 베이스 자산 = (levels / 2) × quantityPerLevel
필요 쿼트 자산 = (levels / 2) × quantityPerLevel × 예상 평균가격
```

**예시**: SOL_USDC, 20 레벨, 0.05 SOL/레벨, SOL 가격 $150

```
필요 SOL = 10 × 0.05 = 0.5 SOL
필요 USDC = 10 × 0.05 × 150 = $75
```

### 안전 여유분

실전에서는 **2배 여유분** 권장:
- SOL: 1.0 SOL
- USDC: $150

---

## 🎛️ 리스크 프로필별 권장 설정

### 보수적 (Low Risk)
```json
{
  "grid": {
    "levels": 10,
    "spacing": { "value": 2.0 }
  },
  "risk": {
    "maxDailyLoss": 50,
    "rebalanceThreshold": 5.0,
    "emergencyStopLoss": 5.0
  }
}
```

### 중간 (Medium Risk) - 기본
```json
{
  "grid": {
    "levels": 20,
    "spacing": { "value": 1.0 }
  },
  "risk": {
    "maxDailyLoss": 100,
    "rebalanceThreshold": 3.0,
    "emergencyStopLoss": 10.0
  }
}
```

### 공격적 (High Risk)
```json
{
  "grid": {
    "levels": 30,
    "spacing": { "value": 0.5 }
  },
  "risk": {
    "maxDailyLoss": 200,
    "rebalanceThreshold": 2.0,
    "emergencyStopLoss": 15.0
  }
}
```

---

## 📊 모니터링 및 로그

### 실시간 로그

봇은 주기적으로 (기본 60초) 상태를 출력합니다:

```
[METRICS] {
  symbol: 'SOL_USDC',
  price: 152.34,
  baseAsset: '0.5000 SOL',
  quoteAsset: '76.17 USDC',
  inventorySkew: '0.123',
  activeOrders: 18,
  realizedPnL: '5.42',
  unrealizedPnL: '2.31',
  totalPnL: '7.73',
  fees: '0.87',
  trades: 24,
  winRate: '62.5%'
}
```

### 최종 요약

종료 시 전체 세션 요약을 출력:

```
============================================================
TRADING SESSION SUMMARY - SOL_USDC
============================================================
Strategy: SOL AMM Grid Strategy
Duration: 120 minutes
Total Trades: 48
Winning Trades: 30
Losing Trades: 18
Win Rate: 62.5%
Total Volume: 1523.45 USDC
Total Fees: 1.52 USDC
Realized PnL: 15.67 USDC
Unrealized PnL: 3.21 USDC
Total PnL: 18.88 USDC
============================================================
```

---

## 🔧 고급 사용법

### 커스텀 전략 개발

새로운 전략을 만들려면:

1. `src/strategies/` 에 새 클래스 생성
2. `BaseStrategy` 상속
3. `calculateGridOrders()`, `shouldRebalance()` 구현

```typescript
import { BaseStrategy } from './BaseStrategy';

export class MyCustomStrategy extends BaseStrategy {
  calculateGridOrders(currentPrice, inventory) {
    // 커스텀 로직
  }

  shouldRebalance(currentPrice, lastRebalancePrice) {
    // 재배치 로직
  }
}
```

### 프로그래밍 방식 사용

```typescript
import { BackpackClient, AMMGridStrategy, TradingEngine } from './src';

const client = new BackpackClient({ apiKey, apiSecret });
const strategy = new AMMGridStrategy(config);
const engine = new TradingEngine({ client, strategy, strategyConfig: config });

await engine.start();
```

---

## 🐛 트러블슈팅

### 일반적인 문제

**1. "Insufficient balance" 에러**
- 잔고가 부족합니다. 자금 요구사항을 확인하세요.
- `quantityPerLevel` 또는 `levels`를 줄여보세요.

**2. "Risk limits violated" 경고**
- `maxPositionSize`, `maxDailyLoss` 설정을 확인하세요.
- 손실 한도에 도달하면 자동으로 중지됩니다.

**3. WebSocket 연결 끊김**
- 자동으로 재연결을 시도합니다.
- 계속 문제가 발생하면 네트워크를 확인하세요.

**4. 주문이 체결되지 않음**
- 가격 레벨이 시장가와 너무 멀리 떨어져 있을 수 있습니다.
- `spacing` 값을 줄여보세요.

---

## ⚠️ 리스크 경고

- **시장 리스크**: 그리드 트레이딩은 횡보장에 유리하며, 강한 추세장에서는 손실이 발생할 수 있습니다.
- **자금 관리**: 전체 자산의 일부만 투자하세요.
- **테스트 필수**: 드라이런 모드로 충분히 테스트한 후 실전에 사용하세요.
- **수수료**: 잦은 거래로 인한 수수료를 고려하세요. VIP 등급을 확보하면 유리합니다.
- **책임 소재**: 이 소프트웨어는 있는 그대로 제공되며, 거래 손실에 대한 책임은 사용자에게 있습니다.

---

## 🛣️ 로드맵

### v1.0 (현재)
- ✅ 현물 그리드 트레이딩
- ✅ AMM 스타일 동적 그리드
- ✅ 리스크 관리
- ✅ 드라이런 모드

### v1.5 (계획)
- [ ] Python 백테스팅 엔진
- [ ] 수수료 최적화 (Post-only)
- [ ] 다중 전략 동시 실행

### v2.0 (계획)
- [ ] 선물/파생 상품 지원
- [ ] 웹 대시보드
- [ ] Trend-following, Adaptive 전략
- [ ] 다중 거래소 지원

---

## 📄 라이선스

MIT License - [LICENSE](LICENSE) 파일 참조

---

## 🙏 크레딧

- Original Grid Bot: https://github.com/pordria/backpack-grid-bot
- Backpack Exchange API: https://github.com/backpack-exchange/bpx-openapi

---

## 📞 지원

이슈 리포트: [GitHub Issues](https://github.com/yourusername/bpx-grid-bot/issues)

---

**Happy Trading! 🚀**
