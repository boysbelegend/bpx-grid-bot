# 📬 알림 시스템 가이드

BPX Grid Bot의 알림 시스템을 사용하면 중요한 거래 이벤트를 Telegram이나 Discord로 실시간으로 받아볼 수 있습니다.

---

## 🎯 지원하는 알림 채널

### 1. Telegram
- ✅ 가장 많이 사용되는 알림 방식
- ✅ 모바일 앱으로 즉시 확인 가능
- ✅ 마크다운 포맷 지원

### 2. Discord
- ✅ 팀 협업에 적합
- ✅ 풍부한 임베드 메시지
- ✅ 채널별 분류 가능

---

## 🚀 빠른 시작

### 1. Telegram 설정

#### Step 1: 봇 생성
1. Telegram에서 [@BotFather](https://t.me/botfather)와 대화 시작
2. `/newbot` 명령어 입력
3. 봇 이름 설정 (예: "My Trading Bot")
4. 봇 유저네임 설정 (예: "my_trading_bot")
5. **Bot Token 복사** (예: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

#### Step 2: Chat ID 획득
1. 생성한 봇과 대화 시작 (아무 메시지나 보내기)
2. 브라우저에서 아래 URL 접속:
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
```
3. **chat id** 찾기 (예: `"id": 123456789`)

#### Step 3: 설정 파일 작성
```bash
cp config/notifications.example.json config/notifications.json
```

`config/notifications.json` 편집:
```json
{
  "enabled": true,
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
      "chatId": "123456789"
    }
  },
  "events": {
    "trade": true,
    "risk": true,
    "error": true,
    "dailyReport": true,
    "positionChange": false,
    "liquidationWarning": true
  }
}
```

### 2. Discord 설정

#### Step 1: 웹훅 생성
1. Discord 서버 설정 → 연동 → 웹훅
2. "새 웹훅" 클릭
3. 웹훅 이름 설정 (예: "Trading Bot")
4. 채널 선택 (알림을 받을 채널)
5. **웹훅 URL 복사**

#### Step 2: 설정 파일 작성
```json
{
  "enabled": true,
  "channels": {
    "discord": {
      "enabled": true,
      "webhookUrl": "https://discord.com/api/webhooks/123456789/abcdefghijklmnop"
    }
  },
  "events": {
    "trade": true,
    "risk": true,
    "error": true,
    "dailyReport": true
  }
}
```

---

## 📋 알림 이벤트 종류

### 1. Trade (거래 알림)
주문이 체결될 때마다 알림

**예시:**
```
🟢 Buy Order Filled

Symbol: SOL_USDC
Price: $198.45
Quantity: 0.05
💰 PnL: +$2.35
```

**설정:**
```json
{
  "events": {
    "trade": true
  }
}
```

### 2. Risk (리스크 경고)
리스크 위반 또는 경고 발생 시 알림

**예시:**
```
⚠️ Risk Warning

Daily loss approaching limit

⚠️ Warnings:
• Daily loss at 85.2% of limit
• Position size at 92.1% of limit
```

**설정:**
```json
{
  "events": {
    "risk": true
  }
}
```

### 3. Liquidation Warning (청산 경고 - 선물만)
청산가에 가까워질 때 알림

**예시:**
```
🚨 Liquidation Warning

Symbol: SOL-PERP
Current: $195.30
Liquidation: $182.50
Distance: 6.55%

⚡ Action: Position reduced by 50%
```

**설정:**
```json
{
  "events": {
    "liquidationWarning": true
  }
}
```

### 4. Error (오류 알림)
시스템 오류 발생 시 알림

**예시:**
```
❌ Error Occurred

Context: Order Placement
Error: Insufficient balance

Stack:
Error: Insufficient balance
  at BackpackClient.placeOrder...
```

**설정:**
```json
{
  "events": {
    "error": true
  }
}
```

### 5. Daily Report (일일 리포트)
하루 거래 요약 (매일 자정)

**예시:**
```
📈 Daily Report

Trades: 24 (18W / 6L)
Win Rate: 75.0%
Total PnL: +$45.30
Best: +$8.50
Worst: -$3.20
```

**설정:**
```json
{
  "events": {
    "dailyReport": true
  }
}
```

### 6. Position Change (포지션 변경)
포지션이 크게 변경될 때 알림

**예시:**
```
📊 Position Changed

Symbol: SOL_USDC
Old: 1.2500
New: 0.7500
Change: -0.5000
Reason: Emergency stop-loss triggered
```

**설정:**
```json
{
  "events": {
    "positionChange": false
  }
}
```

---

## ⚙️ 고급 설정

### 채널별 선택적 활성화

둘 다 사용하거나 하나만 사용 가능:

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "...",
      "chatId": "..."
    },
    "discord": {
      "enabled": true,
      "webhookUrl": "..."
    }
  }
}
```

### 이벤트별 선택적 활성화

필요한 알림만 켜기:

```json
{
  "events": {
    "trade": false,           // 거래 알림 끄기 (너무 많을 수 있음)
    "risk": true,             // 리스크 경고는 필수
    "error": true,            // 오류는 필수
    "dailyReport": true,      // 일일 요약만 보기
    "positionChange": false,  // 포지션 변경은 끄기
    "liquidationWarning": true // 청산 경고는 필수 (선물)
  }
}
```

### 권장 설정

**초보자 (노이즈 최소화):**
```json
{
  "events": {
    "trade": false,
    "risk": true,
    "error": true,
    "dailyReport": true,
    "positionChange": false,
    "liquidationWarning": true
  }
}
```

**중급자 (균형):**
```json
{
  "events": {
    "trade": true,
    "risk": true,
    "error": true,
    "dailyReport": true,
    "positionChange": false,
    "liquidationWarning": true
  }
}
```

**전문가 (모든 정보):**
```json
{
  "events": {
    "trade": true,
    "risk": true,
    "error": true,
    "dailyReport": true,
    "positionChange": true,
    "liquidationWarning": true
  }
}
```

---

## 🔧 프로그래밍 방식 사용

### TypeScript에서 사용

```typescript
import { NotificationManager } from './notifications/NotificationManager';

// 설정 로드
const config = require('../config/notifications.json');

// 매니저 초기화
const notifier = new NotificationManager(config);

// 거래 알림
await notifier.notifyTrade({
  side: 'Buy',
  price: 198.45,
  quantity: 0.05,
  symbol: 'SOL_USDC',
  pnl: 2.35,
});

// 리스크 경고
await notifier.notifyRiskWarning({
  type: 'daily-loss',
  message: 'Daily loss approaching limit',
  warnings: ['Daily loss at 85.2% of limit'],
});

// 청산 경고 (선물)
await notifier.notifyLiquidationWarning({
  symbol: 'SOL-PERP',
  currentPrice: 195.30,
  liquidationPrice: 182.50,
  distancePercent: 6.55,
  action: 'Position reduced by 50%',
});

// 일일 리포트
await notifier.notifyDailyReport({
  totalTrades: 24,
  winningTrades: 18,
  losingTrades: 6,
  totalPnl: 45.30,
  winRate: 0.75,
  bestTrade: 8.50,
  worstTrade: -3.20,
});
```

### 런타임에 설정 변경

```typescript
// 알림 끄기/켜기
notifier.setEnabled(false);
notifier.setEnabled(true);

// 설정 업데이트
notifier.updateConfig({
  events: {
    trade: false, // 거래 알림 끄기
  },
});
```

---

## 🐛 트러블슈팅

### Telegram 봇이 응답하지 않음

**문제:** 봇 토큰이나 Chat ID가 잘못됨

**해결:**
1. Bot Token이 정확한지 확인
2. Chat ID 다시 확인:
```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
```
3. 봇과 대화를 시작했는지 확인 (아무 메시지나 보내기)

### Discord 웹훅 실패

**문제:** 웹훅 URL이 잘못됨

**해결:**
1. 웹훅 URL 다시 복사
2. URL이 `https://discord.com/api/webhooks/`로 시작하는지 확인
3. 웹훅이 삭제되지 않았는지 Discord에서 확인

### 알림이 너무 많음

**문제:** 모든 거래마다 알림이 옴

**해결:**
```json
{
  "events": {
    "trade": false,  // 거래 알림 끄기
    "dailyReport": true  // 일일 요약만 받기
  }
}
```

### 알림이 안 옴

**문제:** 설정이 비활성화됨

**해결:**
1. `enabled: true` 확인
2. 각 채널의 `enabled: true` 확인
3. 이벤트 설정 확인
4. 로그에서 오류 확인

---

## 📊 알림 예시 모음

### 성공적인 거래
```
🟢 Buy Order Filled

Symbol: SOL_USDC
Price: $198.45
Quantity: 0.05
💰 PnL: +$2.35

2025-01-23 14:30:25
```

### 리스크 위반
```
⛔ Risk Warning

Daily loss limit exceeded

⛔ Violations:
• Daily loss ($105.23) exceeds limit ($100)
• Bot automatically stopped

2025-01-23 16:45:12
```

### 청산 임박 (CRITICAL)
```
🚨 Liquidation Warning

Symbol: SOL-PERP
Current: $185.20
Liquidation: $182.50
Distance: 1.46%

⚡ Action: EMERGENCY! Position reduced by 50%

2025-01-23 18:22:03
```

### 일일 수익 리포트
```
📈 Daily Report

Trades: 32 (24W / 8L)
Win Rate: 75.0%
Total PnL: +$67.80
Best: +$12.30
Worst: -$4.50

2025-01-24 00:00:00
```

---

## 🔐 보안 주의사항

### Bot Token & Webhook URL 보호

1. **절대 공유하지 마세요!**
   - Bot Token과 Webhook URL은 비밀번호와 같습니다
   - GitHub 등에 업로드 금지

2. **환경 변수 사용 권장:**
```bash
# .env 파일
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
DISCORD_WEBHOOK_URL=your_webhook_url_here
```

3. **`.gitignore`에 추가:**
```
config/notifications.json
.env
```

4. **권한 최소화:**
   - Telegram 봇은 메시지 전송 권한만 필요
   - Discord 웹훅은 해당 채널만 접근

---

## ⚡ 성능 최적화

### 알림 빈도 조절

거래가 많을 경우 알림이 과도하게 발생할 수 있습니다:

**옵션 1: 중요한 알림만**
```json
{
  "events": {
    "trade": false,  // 거래 알림 끄기
    "risk": true,
    "liquidationWarning": true,
    "dailyReport": true
  }
}
```

**옵션 2: 배치 알림 (향후 구현 예정)**
- 5분마다 거래 요약
- 시간당 리포트

---

**알림 시스템으로 어디서든 거래를 모니터링하세요!** 📱
