# 📈 Futures Trading Guide

BPX Grid Bot의 선물 거래 기능을 사용하는 완전한 가이드입니다.

---

## ⚠️ 중요 경고

**선물 거래는 현물 거래보다 훨씬 위험합니다!**

- **레버리지**: 손실도 레버리지만큼 증폭됩니다
- **청산 리스크**: 담보 부족 시 강제 청산될 수 있습니다
- **펀딩 비용**: 8시간마다 펀딩 비용이 발생합니다
- **변동성**: 급격한 가격 변동에 취약합니다

**반드시 dry-run 모드로 충분히 테스트한 후 소액으로 시작하세요!**

---

## 🎯 주요 기능

### 1. 레버리지 거래
- 설정 가능한 레버리지 (1x ~ 최대 레버리지)
- Cross 또는 Isolated 마진 모드
- 자동 레버리지 설정

### 2. 청산 방지
- 실시간 청산 리스크 모니터링
- 청산가 대비 안전 버퍼 설정
- 위험 감지 시 자동 포지션 축소
- 긴급 청산 방지 메커니즘

### 3. 펀딩 비용 최적화
- 펀딩 레이트 실시간 추적
- 높은 펀딩 레이트 감지 시 경고
- 펀딩 비용 기반 주문 조정
- 일일 펀딩 비용 추정

### 4. 리스크 관리
- 포지션 크기 제한
- 마진 비율 모니터링
- ADL (Auto-Deleveraging) 위험 추적
- 일일 손실 한도

---

## 📋 설정 가이드

### 기본 설정 파일

```json
{
  "name": "SOL Futures AMM Grid",
  "type": "futures",
  "symbol": "SOL-PERP",
  "baseAsset": "SOL",
  "quoteAsset": "USDC",

  "grid": {
    "mode": "mean-reversion",
    "levels": 16,
    "spacing": { "type": "percentage", "value": 1.5 }
  },

  "order": {
    "quantityPerLevel": 0.03,
    "orderType": "PostOnly",
    "timeInForce": "GTC"
  },

  "risk": {
    "maxPositionSize": 2.0,
    "maxPositionValue": 500,
    "maxDailyLoss": 50,
    "maxOrderCount": 32,
    "rebalanceThreshold": 2.5,
    "emergencyStopLoss": 15
  },

  "futures": {
    "leverage": 3,
    "marginMode": "isolated",
    "liquidationBuffer": 8
  },

  "dryRun": true
}
```

### 선물 특화 설정 설명

#### `futures.leverage` (레버리지)
- **범위**: 1 ~ 최대 레버리지 (심볼마다 다름)
- **권장**: 초보자 1-3x, 경험자 3-5x, 전문가 5-10x
- **위험**: 레버리지가 높을수록 청산 리스크 증가

```json
"leverage": 3  // 3배 레버리지
```

#### `futures.marginMode` (마진 모드)
- **Isolated**: 포지션별 독립 담보 (권장)
  - 장점: 한 포지션 청산이 다른 포지션에 영향 없음
  - 단점: 각 포지션마다 별도 담보 필요

- **Cross**: 전체 계정 담보 공유
  - 장점: 자금 효율성 높음
  - 단점: 한 포지션 청산이 전체 계정에 영향

```json
"marginMode": "isolated"  // Isolated 마진 (권장)
```

#### `futures.liquidationBuffer` (청산 버퍼)
- **의미**: 청산가까지의 최소 거리 (%)
- **권장**: 5-10% (보수적), 3-5% (공격적)
- **동작**: 버퍼 이내 접근 시 자동 포지션 축소

```json
"liquidationBuffer": 8  // 청산가로부터 8% 버퍼
```

#### `risk.maxPositionSize` (최대 포지션 크기)
- **의미**: 최대 보유 가능한 base asset 수량
- **계산**: `계정 자산 × 레버리지 / 가격 × 안전 계수`
- **권장**: 보수적으로 설정 (계산값의 50-70%)

```json
"maxPositionSize": 2.0  // 최대 2.0 SOL
```

---

## 🚀 사용 방법

### 1. Dry Run으로 테스트

```bash
npm start -- --strategy config/strategies/sol-futures-grid.json
```

**확인 사항:**
- 레버리지가 올바르게 설정되는지
- 청산가가 안전한 거리에 있는지
- 펀딩 비용이 예상 범위 내인지
- 주문이 올바르게 배치되는지

### 2. 소액 실전 테스트

설정 파일에서 `"dryRun": false`로 변경:

```json
{
  "dryRun": false,
  "futures": {
    "leverage": 2,  // 낮은 레버리지로 시작
    "marginMode": "isolated"
  },
  "risk": {
    "maxPositionSize": 0.1,  // 매우 작은 포지션
    "maxDailyLoss": 10  // 낮은 손실 한도
  }
}
```

**모니터링:**
- 첫 24시간 동안 지속적으로 모니터링
- 청산 리스크 알림 확인
- 펀딩 비용 누적 확인
- PnL 추이 관찰

### 3. 점진적 확대

1-2주 성공적으로 운영 후:
1. 포지션 크기 점진적 증가
2. 레버리지 조정 (필요 시)
3. 그리드 레벨 최적화
4. 리밸런싱 임계값 조정

---

## 📊 리스크 관리 전략

### 레버리지별 권장 설정

#### 낮은 레버리지 (1-2x) - 보수적
```json
{
  "futures": {
    "leverage": 2,
    "marginMode": "cross",
    "liquidationBuffer": 10
  },
  "risk": {
    "maxPositionSize": 5.0,
    "maxDailyLoss": 100,
    "emergencyStopLoss": 20
  }
}
```

#### 중간 레버리지 (3-5x) - 균형
```json
{
  "futures": {
    "leverage": 3,
    "marginMode": "isolated",
    "liquidationBuffer": 8
  },
  "risk": {
    "maxPositionSize": 2.0,
    "maxDailyLoss": 50,
    "emergencyStopLoss": 15
  }
}
```

#### 높은 레버리지 (5-10x) - 공격적
```json
{
  "futures": {
    "leverage": 5,
    "marginMode": "isolated",
    "liquidationBuffer": 5
  },
  "risk": {
    "maxPositionSize": 1.0,
    "maxDailyLoss": 30,
    "emergencyStopLoss": 10
  }
}
```

### 청산 방지 체크리스트

✅ **항상 확인:**
1. 청산가가 현재가의 최소 10% 이상 떨어져 있는지
2. 마진 비율이 80% 미만인지
3. ADL 순위가 3 이하인지
4. 충분한 여유 담보가 있는지

✅ **위험 신호:**
- 청산 버퍼 경고 발생
- 마진 비율 70% 이상
- 펀딩 레이트 0.1% 이상
- 급격한 가격 변동

✅ **긴급 조치:**
1. 포지션 50% 축소 (자동 실행됨)
2. 레버리지 감소
3. 추가 담보 입금
4. 봇 일시 정지

---

## 💰 펀딩 비용 관리

### 펀딩 레이트란?

- 롱과 숏 포지션 간의 균형을 맞추기 위한 수수료
- 8시간마다 부과 (00:00, 08:00, 16:00 UTC)
- 양수: 롱이 숏에게 지불
- 음수: 숏이 롱에게 지불

### 펀딩 비용 최적화

봇은 자동으로 펀딩 레이트를 고려하여 주문을 조정합니다:

```typescript
// 높은 양수 펀딩 레이트 (롱이 비싸짐)
// → 숏 포지션 선호, 매도 주문 증가

// 높은 음수 펀딩 레이트 (숏이 비싸짐)
// → 롱 포지션 선호, 매수 주문 증가
```

### 펀딩 비용 계산

```
일일 펀딩 비용 = 포지션 가치 × 펀딩 레이트 × 3
```

**예시:**
- 포지션: 1 SOL @ $200 = $200
- 펀딩 레이트: 0.01% (0.0001)
- 일일 비용: $200 × 0.0001 × 3 = **$0.06/일**

---

## 🔍 모니터링 & 알림

### 로그 메시지

**정상 동작:**
```
[INFO] Funding rate: 0.0023% (Longs pay shorts)
[INFO] Liquidation distance: 15.3%
[INFO] Position: Long 1.5 SOL @ $200
```

**경고:**
```
[WARN] High funding rate: 0.0523%
[WARN] Approaching liquidation buffer: 7.2% distance
[WARN] Margin ratio elevated: 65%
```

**위험:**
```
[ERROR] CRITICAL: High liquidation risk!
[ERROR] EMERGENCY: Reducing position to avoid liquidation!
```

### 대시보드 확인 사항

1. **Position Card**: 현재 포지션, 청산가
2. **Risk Card**: 마진 비율, 청산 거리
3. **PnL Card**: 펀딩 비용 포함 손익
4. **Metrics Card**: 승률, 수익 팩터

---

## 🛠️ 트러블슈팅

### 문제: 청산 경고가 자주 발생

**해결책:**
1. 레버리지 감소
2. 청산 버퍼 증가
3. 포지션 크기 감소
4. 추가 담보 입금

### 문제: 펀딩 비용이 너무 높음

**해결책:**
1. 포지션 크기 감소
2. 펀딩 레이트 유리한 방향으로 포지션 조정
3. 펀딩 시간 전에 포지션 일시 축소

### 문제: ADL 위험 높음 (4-5 quantile)

**해결책:**
1. 포지션 즉시 50% 축소
2. 레버리지 감소
3. 마진 모드를 Cross로 변경 고려

### 문제: 마진 부족 에러

**해결책:**
1. 추가 담보 입금
2. 일부 포지션 청산
3. 레버리지 감소

---

## 📈 성능 최적화

### 그리드 설정 최적화

**변동성 낮은 시장:**
```json
{
  "grid": {
    "levels": 20,
    "spacing": { "value": 0.5 }  // 좁은 간격
  }
}
```

**변동성 높은 시장:**
```json
{
  "grid": {
    "levels": 12,
    "spacing": { "value": 2.0 }  // 넓은 간격
  }
}
```

### 레버리지 최적화

- **낮은 변동성**: 레버리지 증가 가능
- **높은 변동성**: 레버리지 감소 권장
- **뉴스/이벤트**: 레버리지 1x 또는 포지션 청산

---

## 📚 추가 학습 자료

### Backpack Futures 문서
- [API 문서](https://docs.backpack.exchange/)
- 펀딩 레이트 메커니즘
- 청산 프로세스
- 레버리지 브래킷

### 리스크 관리
- Position sizing
- Leverage management
- Liquidation prevention
- Funding rate arbitrage

---

## ⚖️ 법적 고지

- 이 봇은 교육 목적으로 제공됩니다
- 금융 자문이 아닙니다
- 과거 성과는 미래 수익을 보장하지 않습니다
- 선물 거래는 원금 손실 위험이 있습니다
- 투자는 본인 책임 하에 진행하세요

---

**선물 거래 준비 완료! 항상 리스크를 먼저 생각하세요.** ⚠️
