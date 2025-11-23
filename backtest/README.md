# 📊 Python Backtesting Engine

과거 데이터로 그리드 전략을 검증하고 최적 파라미터를 찾는 백테스팅 시스템입니다.

---

## 🚀 빠른 시작

### 1. Python 패키지 설치

```bash
cd backtest
pip install -r requirements.txt
```

### 2. 간단한 백테스트 실행

```bash
cd examples
python run_backtest.py --symbol SOL_USDC --days 7
```

실행 결과:
```
============================================================
BACKTEST REPORT
============================================================

Period: 2024-01-01 to 2024-01-07 (7 days)

PERFORMANCE SUMMARY
------------------------------------------------------------
Initial Value:        $ 3,000.00
Final Value:          $ 3,150.42
Total Return:            5.01%

PNL BREAKDOWN
------------------------------------------------------------
Realized PnL:         $   145.67
Unrealized PnL:       $     4.75
Total PnL:            $   150.42
Total Fees:           $     2.34

TRADING STATISTICS
------------------------------------------------------------
Total Trades:                42
Win Rate:                  68.5%

RISK METRICS
------------------------------------------------------------
Max Drawdown:             -2.3%
Sharpe Ratio:              1.85
```

### 3. 차트 확인

자동으로 6개 차트가 표시됩니다:
- 가격 움직임
- 자산 곡선 (Equity Curve)
- 낙폭 (Drawdown)
- 수익률 분포
- 누적 수익률
- 거래 체결 위치

---

## 📖 사용 방법

### 기본 백테스트

```bash
python run_backtest.py \
  --strategy ../config/strategies/sol-amm-grid.json \
  --symbol SOL_USDC \
  --days 30 \
  --interval 5m \
  --initial-base 10.0 \
  --initial-quote 2000.0
```

**파라미터:**
- `--strategy`: 전략 설정 파일 경로
- `--symbol`: 거래 페어 (SOL_USDC, BTC_USDC 등)
- `--days`: 백테스트 기간 (일)
- `--interval`: 데이터 간격 (1m, 5m, 15m, 1h, 4h, 1d)
- `--initial-base`: 시작 베이스 자산 수량
- `--initial-quote`: 시작 쿼트 자산 금액

### 리포트 저장

```bash
python run_backtest.py \
  --symbol SOL_USDC \
  --days 30 \
  --save-report results/sol_report.txt \
  --save-chart results/sol_chart.png
```

### 파라미터 최적화

최적의 그리드 설정을 자동으로 찾습니다:

```bash
python optimize_params.py \
  --symbol SOL_USDC \
  --days 14 \
  --interval 5m \
  --output optimization_results.csv
```

**결과 예시:**
```
TOP 10 PARAMETER COMBINATIONS (by Total Return)
================================================================
  levels  spacing  quantity  rebalance_threshold  total_return
0     25      1.2      0.05                  3.0         8.45%
1     20      1.0      0.05                  2.0         7.92%
2     30      0.8      0.08                  3.0         7.68%
...
```

---

## 📈 성과 지표 설명

### 수익률 지표
- **Total Return**: 총 수익률 (%)
- **Annualized Return**: 연환산 수익률
- **Realized PnL**: 실현 손익 (체결 완료)
- **Unrealized PnL**: 미실현 손익 (보유 중)

### 리스크 지표
- **Max Drawdown**: 최대 낙폭 (peak to trough)
- **Sharpe Ratio**: 샤프 비율 (위험 대비 수익)
  - > 1.0: 좋음
  - > 2.0: 매우 좋음
  - > 3.0: 탁월함
- **Volatility**: 변동성 (일일 표준편차)
- **Calmar Ratio**: 연환산 수익률 / 최대 낙폭

### 거래 지표
- **Win Rate**: 승률 (%)
- **Total Trades**: 총 거래 횟수
- **Avg Trades/Day**: 일일 평균 거래 횟수

---

## 🔧 고급 사용법

### Python 스크립트에서 직접 사용

```python
from backtest.data_loader import download_data
from backtest.strategy_tester import AMMGridBacktester, GridConfig, RiskConfig
from backtest.reporter import BacktestReporter

# 1. 데이터 다운로드
price_data = download_data(symbol="SOL_USDC", days=7, interval="5m")

# 2. 전략 설정
grid_config = GridConfig(
    levels=20,
    spacing_value=1.0,
    quantity_per_level=0.05
)

risk_config = RiskConfig(
    rebalance_threshold=3.0,
    max_daily_loss=100.0
)

# 3. 백테스트 실행
backtester = AMMGridBacktester(
    grid_config=grid_config,
    risk_config=risk_config,
    initial_base=10.0,
    initial_quote=2000.0
)

results = backtester.run(price_data)

# 4. 리포트 생성
reporter = BacktestReporter(results)
reporter.generate_report("my_report.txt")
reporter.plot_results("my_chart.png")
```

### 커스텀 전략 테스트

자신만의 전략 JSON 파일 생성:

```json
{
  "grid": {
    "levels": 25,
    "spacing": {
      "value": 1.2
    }
  },
  "order": {
    "quantityPerLevel": 0.08
  },
  "risk": {
    "rebalanceThreshold": 2.5
  }
}
```

---

## 📊 백테스팅 Best Practices

### 1. 충분한 데이터 사용
- **최소**: 7일 (빠른 테스트)
- **권장**: 30일 (신뢰도 향상)
- **이상적**: 90일+ (다양한 시장 상황 포함)

### 2. 다양한 시장 상황 테스트
```bash
# 횡보장 기간
python run_backtest.py --days 30 --interval 5m

# 추세장 기간
python run_backtest.py --days 30 --interval 5m

# 급변동 기간
python run_backtest.py --days 7 --interval 1m
```

### 3. 여러 종목으로 검증
```bash
python run_backtest.py --symbol SOL_USDC --days 30
python run_backtest.py --symbol BTC_USDC --days 30
python run_backtest.py --symbol ETH_USDC --days 30
```

### 4. 파라미터 민감도 분석
```bash
# Spacing 변화 테스트
for spacing in 0.5 0.8 1.0 1.5 2.0; do
  python run_backtest.py --spacing $spacing
done
```

---

## ⚠️ 백테스팅 주의사항

### 1. 과최적화 (Overfitting) 방지
- 너무 많은 파라미터 조정 금지
- In-sample / Out-of-sample 테스트 병행
- 과거 성과 ≠ 미래 성과

### 2. 슬리피지 & 수수료
- 백테스트는 이상적 체결 가정
- 실전에서는 슬리피지 발생 가능
- VIP 수수료 등급 확인 필수

### 3. 시장 영향력
- 백테스트는 대량 주문의 시장 영향 미반영
- 실전에서 큰 수량은 분할 체결 필요

### 4. 예외 상황
- 거래소 장애
- API 레이트 리밋
- 네트워크 지연
→ 백테스트에 미포함

---

## 💡 최적화 팁

### 승률 vs 수익률
```
높은 승률 (70%+) = 안정적이지만 수익률 낮음
낮은 승률 (50-60%) + 높은 수익률 = 위험하지만 수익 높음
```

### 그리드 간격 선택
```
좁은 간격 (0.5-1.0%) = 거래 많음, 수수료 높음
넓은 간격 (2.0-3.0%) = 거래 적음, 큰 변동 필요
```

### 레벨 수 선택
```
적은 레벨 (10-15) = 관리 쉬움, 수익 제한적
많은 레벨 (30-50) = 수익 높음, 자금 많이 필요
```

---

## 🎯 예상 성과 (참고용)

### 횡보장 (Sideways Market)
```
승률: 65-75%
월 수익률: 5-10%
최대 낙폭: 2-5%
샤프 비율: 1.5-2.5
```

### 약한 추세장
```
승률: 55-65%
월 수익률: 3-7%
최대 낙폭: 5-10%
샤프 비율: 1.0-1.8
```

### 강한 추세장
```
승률: 40-55%
월 수익률: -2% ~ +5%
최대 낙폭: 10-20%
샤프 비율: 0.5-1.2
⚠️ 추세장에서는 손실 가능!
```

---

## 📚 추가 학습 자료

### Jupyter Notebook 예제
```bash
jupyter notebook backtest_tutorial.ipynb
```

### 데이터 분석
```python
# 체결 내역 분석
fills = results['fills']
print(fills.groupby('side')['value'].sum())

# 시간대별 수익률
hourly_returns = equity_curve.resample('1H').last().pct_change()
print(hourly_returns.describe())
```

---

**백테스팅으로 전략을 충분히 검증한 후 실전 투입하세요!** 📊✅
