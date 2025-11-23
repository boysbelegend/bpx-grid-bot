/**
 * API Test Script
 * Simple script to test dashboard API endpoints
 */

const BASE_URL = 'http://localhost:3001';

async function testAPI() {
  console.log('🧪 Testing Dashboard API...\n');

  try {
    // 1. Health check
    console.log('1. Health Check');
    const health = await fetch(`${BASE_URL}/api/health`);
    console.log(await health.json());
    console.log('');

    // 2. Get status
    console.log('2. Engine Status');
    const status = await fetch(`${BASE_URL}/api/status`);
    console.log(await status.json());
    console.log('');

    // 3. Get available strategies
    console.log('3. Available Strategies');
    const strategies = await fetch(`${BASE_URL}/api/strategies`);
    console.log(await strategies.json());
    console.log('');

    // 4. Start engine (dry run)
    console.log('4. Starting Engine (Dry Run)');
    const start = await fetch(`${BASE_URL}/api/control/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        strategyPath: 'config/strategies/sol-amm-grid.json',
        dryRun: true,
      }),
    });
    console.log(await start.json());
    console.log('');

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 5. Get full state
    console.log('5. Dashboard State');
    const state = await fetch(`${BASE_URL}/api/state`);
    console.log(await state.json());
    console.log('');

    // 6. Get position
    console.log('6. Position Data');
    const position = await fetch(`${BASE_URL}/api/position`);
    console.log(await position.json());
    console.log('');

    // 7. Get PnL
    console.log('7. PnL Data');
    const pnl = await fetch(`${BASE_URL}/api/pnl`);
    console.log(await pnl.json());
    console.log('');

    // 8. Get orders
    console.log('8. Active Orders');
    const orders = await fetch(`${BASE_URL}/api/orders`);
    console.log(await orders.json());
    console.log('');

    // 9. Stop engine
    console.log('9. Stopping Engine');
    const stop = await fetch(`${BASE_URL}/api/control/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: false }),
    });
    console.log(await stop.json());
    console.log('');

    console.log('✅ All tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests
testAPI();
