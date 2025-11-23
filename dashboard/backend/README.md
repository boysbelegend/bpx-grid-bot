# 📡 Dashboard Backend API

BPX Grid Bot의 웹 대시보드 백엔드 서버입니다. Express.js + WebSocket으로 실시간 모니터링 API를 제공합니다.

---

## 🚀 빠른 시작

### 1. 패키지 설치

```bash
cd dashboard/backend
npm install
```

### 2. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일 수정:
```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
BOT_ROOT_PATH=../../
```

### 3. 서버 실행

**개발 모드 (hot reload):**
```bash
npm run dev
```

**프로덕션 빌드:**
```bash
npm run build
npm start
```

서버가 시작되면:
- **API**: `http://localhost:3001`
- **WebSocket**: `ws://localhost:3001/ws`

---

## 📚 API 엔드포인트

### Health & Status

**GET `/api/health`**
- 서버 상태 확인
```json
{
  "success": true,
  "data": { "status": "ok", "timestamp": 1234567890 },
  "timestamp": 1234567890
}
```

**GET `/api/status`**
- 트레이딩 엔진 상태
```json
{
  "success": true,
  "data": {
    "status": "running",
    "strategyName": "SOL AMM Grid",
    "symbol": "SOL_USDC",
    "uptime": 123456,
    "startTime": 1234567890
  }
}
```

**GET `/api/state`**
- 전체 대시보드 상태 (한 번에 모든 데이터)
```json
{
  "success": true,
  "data": {
    "engine": { ... },
    "position": { ... },
    "pnl": { ... },
    "orders": [ ... ],
    "grid": { ... },
    "risk": { ... },
    "metrics": { ... },
    "market": { ... },
    "lastUpdate": 1234567890
  }
}
```

### Position & PnL

**GET `/api/position`**
- 현재 포지션 정보
```json
{
  "success": true,
  "data": {
    "baseAsset": "SOL",
    "quoteAsset": "USDC",
    "baseBalance": 10.5,
    "quoteBalance": 2050.0,
    "baseValue": 2100.0,
    "totalValue": 4150.0,
    "inventorySkew": 0.05,
    "averageBuyPrice": 200.0,
    "averageSellPrice": 202.0
  }
}
```

**GET `/api/pnl`**
- 손익 정보
```json
{
  "success": true,
  "data": {
    "realizedPnl": 150.5,
    "unrealizedPnl": 25.3,
    "totalPnl": 175.8,
    "totalFees": 12.3,
    "netPnl": 163.5,
    "returnPct": 5.45,
    "dailyPnl": 45.2,
    "dailyReturnPct": 1.5
  }
}
```

### Orders & Grid

**GET `/api/orders`**
- 활성 주문 목록
```json
{
  "success": true,
  "data": [
    {
      "orderId": "123456",
      "clientId": "grid-0",
      "side": "Bid",
      "price": 199.0,
      "quantity": 0.05,
      "filled": 0.0,
      "status": "pending",
      "createdAt": 1234567890
    }
  ]
}
```

**GET `/api/grid`**
- 그리드 상태
```json
{
  "success": true,
  "data": {
    "centerPrice": 200.0,
    "levels": 20,
    "spacing": 1.0,
    "activeOrders": 18,
    "totalLevels": 20,
    "buyLevels": 10,
    "sellLevels": 10
  }
}
```

### Risk & Metrics

**GET `/api/risk`**
- 리스크 상태
```json
{
  "success": true,
  "data": {
    "isHealthy": true,
    "violations": [],
    "warnings": ["Position utilization at 75%"],
    "maxPositionSize": 10.0,
    "currentPositionSize": 7.5,
    "maxDailyLoss": 100.0,
    "currentDailyLoss": -15.5,
    "utilizationPct": 75.0
  }
}
```

**GET `/api/metrics`**
- 거래 성과 지표
```json
{
  "success": true,
  "data": {
    "totalTrades": 150,
    "winningTrades": 95,
    "losingTrades": 55,
    "winRate": 63.3,
    "averageProfit": 2.5,
    "averageLoss": -1.8,
    "profitFactor": 1.85,
    "largestWin": 15.5,
    "largestLoss": -8.3
  }
}
```

**GET `/api/market`**
- 시장 데이터
```json
{
  "success": true,
  "data": {
    "symbol": "SOL_USDC",
    "lastPrice": 200.5,
    "bid": 200.4,
    "ask": 200.6,
    "spread": 0.2,
    "volume24h": 1500000,
    "priceChange24h": 5.5,
    "priceChangePct24h": 2.82,
    "high24h": 205.0,
    "low24h": 195.0,
    "timestamp": 1234567890
  }
}
```

### Control Endpoints

**POST `/api/control/start`**
- 트레이딩 엔진 시작
```json
// Request
{
  "strategyPath": "config/strategies/sol-amm-grid.json",
  "dryRun": true
}

// Response
{
  "success": true,
  "data": { "message": "Engine started successfully" }
}
```

**POST `/api/control/stop`**
- 트레이딩 엔진 정지
```json
// Request
{
  "force": false
}

// Response
{
  "success": true,
  "data": { "message": "Engine stopped successfully" }
}
```

**POST `/api/control/pause`**
- 트레이딩 일시정지 (주문 취소 없이)
```json
{
  "success": true,
  "data": { "message": "Engine paused successfully" }
}
```

**POST `/api/control/resume`**
- 트레이딩 재개
```json
{
  "success": true,
  "data": { "message": "Engine resumed successfully" }
}
```

**GET `/api/strategies`**
- 사용 가능한 전략 목록
```json
{
  "success": true,
  "data": [
    {
      "name": "sol-amm-grid",
      "path": "config/strategies/sol-amm-grid.json"
    },
    {
      "name": "btc-amm-grid",
      "path": "config/strategies/btc-amm-grid.json"
    }
  ]
}
```

---

## 🔌 WebSocket API

WebSocket 연결: `ws://localhost:3001/ws`

### 메시지 형식

**Subscribe (클라이언트 → 서버):**
```json
{
  "type": "subscribe",
  "channel": "all",
  "timestamp": 1234567890
}
```

**Update (서버 → 클라이언트):**
```json
{
  "type": "update",
  "channel": "all",
  "data": {
    "engine": { ... },
    "position": { ... },
    "pnl": { ... },
    ...
  },
  "timestamp": 1234567890
}
```

**Ping/Pong (연결 유지):**
```json
// Client -> Server
{
  "type": "ping",
  "timestamp": 1234567890
}

// Server -> Client
{
  "type": "pong",
  "timestamp": 1234567890
}
```

**Error (서버 → 클라이언트):**
```json
{
  "type": "error",
  "data": { "error": "Error message" },
  "timestamp": 1234567890
}
```

### 업데이트 채널

- `status`: 엔진 상태 변경
- `position`: 포지션 업데이트
- `pnl`: 손익 업데이트
- `orders`: 주문 업데이트
- `grid`: 그리드 업데이트
- `risk`: 리스크 업데이트
- `market`: 시장 데이터 업데이트
- `all`: 전체 업데이트 (기본값)

---

## 💡 사용 예시

### cURL로 엔진 시작

```bash
curl -X POST http://localhost:3001/api/control/start \
  -H "Content-Type: application/json" \
  -d '{
    "strategyPath": "config/strategies/sol-amm-grid.json",
    "dryRun": true
  }'
```

### JavaScript로 WebSocket 연결

```javascript
const ws = new WebSocket('ws://localhost:3001/ws');

ws.onopen = () => {
  console.log('Connected');

  // Subscribe to updates
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'all',
    timestamp: Date.now()
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'update') {
    console.log('Update received:', message.data);
    // Update UI with new data
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

### Python으로 API 호출

```python
import requests

# Get status
response = requests.get('http://localhost:3001/api/status')
status = response.json()
print(status)

# Start engine
response = requests.post('http://localhost:3001/api/control/start', json={
    'strategyPath': 'config/strategies/sol-amm-grid.json',
    'dryRun': True
})
print(response.json())
```

---

## 🏗️ 아키텍처

```
dashboard/backend/
├── src/
│   ├── server.ts              # Express 서버 메인
│   ├── routes.ts              # REST API 라우트
│   ├── websocketServer.ts     # WebSocket 서버
│   ├── engineManager.ts       # 트레이딩 엔진 관리
│   ├── types.ts               # TypeScript 타입 정의
│   └── logger.ts              # 로깅 설정
├── package.json
├── tsconfig.json
└── README.md
```

**주요 컴포넌트:**

1. **server.ts**: Express 앱 초기화, 미들웨어 설정
2. **routes.ts**: REST API 엔드포인트 정의
3. **websocketServer.ts**: WebSocket 연결 관리, 실시간 브로드캐스트
4. **engineManager.ts**: TradingEngine 인스턴스 관리, 이벤트 리스닝
5. **types.ts**: API 요청/응답 타입 정의

---

## 🔧 개발

### 타입 체크

```bash
npm run build
```

### 로그 레벨

환경 변수로 조정:
```bash
LOG_LEVEL=debug npm run dev
```

### CORS 설정

다른 origin 허용:
```env
CORS_ORIGIN=http://localhost:3000,http://myapp.com
```

---

## 🚨 에러 처리

모든 API 응답은 다음 형식을 따릅니다:

**성공:**
```json
{
  "success": true,
  "data": { ... },
  "timestamp": 1234567890
}
```

**실패:**
```json
{
  "success": false,
  "error": "Error message",
  "timestamp": 1234567890
}
```

**HTTP 상태 코드:**
- `200`: 성공
- `400`: 잘못된 요청
- `404`: 리소스 없음
- `500`: 서버 에러

---

## 📊 모니터링

서버는 Pino 로거를 사용합니다. 로그는 JSON 형식으로 출력됩니다:

```json
{
  "level": 30,
  "time": 1234567890,
  "msg": "Dashboard backend server started",
  "port": 3001,
  "env": "development"
}
```

---

**백엔드 API 준비 완료! 이제 프론트엔드 UI를 연결하면 됩니다.** 🎉
