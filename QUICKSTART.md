# 🚀 빠른 시작 가이드

## 1. 의존성 설치

```bash
yarn install
```

## 2. 환경 변수 설정

```bash
cp .env.example .env
nano .env  # API 키 입력
```

## 3. 드라이런 테스트 (권장)

```bash
# 빌드
yarn build

# SOL 전략으로 드라이런 테스트
yarn start:sol
```

Mock 거래소로 시뮬레이션이 실행됩니다. Ctrl+C로 중지할 수 있습니다.

## 4. 실전 거래

1. `config/strategies/sol-amm-grid.json` 파일을 열고 `dryRun: false`로 변경
2. 실행:

```bash
yarn start:sol
```

## 5. 백그라운드 실행 (PM2)

```bash
yarn start:prod
pm2 logs grid-bot  # 로그 확인
pm2 stop grid-bot  # 중지
```

## 전략 커스터마이징

`config/strategies/template.json`을 복사하여 나만의 전략 생성:

```bash
cp config/strategies/template.json config/strategies/my-strategy.json
nano config/strategies/my-strategy.json
```

주요 파라미터:
- `grid.levels`: 그리드 레벨 수
- `grid.spacing.value`: 그리드 간격 (%)
- `order.quantityPerLevel`: 레벨당 수량
- `risk.maxDailyLoss`: 최대 일일 손실

자세한 설명은 [README.new.md](README.new.md) 참조
