import React, { useState, useEffect, useRef } from 'react';
import { useTrading } from '../../context/TradingContext';
import StrategyConfig from './components/StrategyConfig';
import LiveChart from './components/LiveChart';
import PortfolioStats from './components/PortfolioStats';
import OpenPositions from './components/OpenPositions';
import TradeHistory from './components/TradeHistory';
import SignalsLog from './components/SignalsLog';
import { useRealtimeData } from './hooks/useRealTimeData';
import { usePaperTrading } from './hooks/usePaperTrading';
import { Play, Square, RotateCcw, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PaperTrading() {
  const { api, socket, credentials } = useTrading();
  const { realtimeData, isConnected, subscribeToSymbol } = useRealtimeData(socket);
  const {
    portfolio,
    openPositions,
    closedTrades,
    signals,
    isRunning,
    startTrading,
    stopTrading,
    resetPortfolio,
    updateStrategy,
    currentStrategy
  } = usePaperTrading(api);

  const [showConfig, setShowConfig]       = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState('NIFTY 50');

  // Track last candle count & last-sent timestamp to avoid spamming the backend
  const lastSentCandleCount = useRef(0);
  const lastSentTime        = useRef(0);

  // Subscribe to real-time data when symbol changes
  useEffect(() => {
    if (selectedSymbol) subscribeToSymbol(selectedSymbol);
  }, [selectedSymbol, subscribeToSymbol]);

  /**
   * Send candles to backend ONLY when:
   *  - paper trading is running
   *  - candle count has increased (new candle closed)
   *  - at least 5 seconds since last send (debounce)
   *
   * This was previously firing on EVERY render (hundreds/sec), flooding the
   * backend and never letting checkForSignals run cleanly.
   */
  useEffect(() => {
    if (!isRunning) return;
    if (!realtimeData?.candles || realtimeData.candles.length === 0) return;

    const count = realtimeData.candles.length;
    const now   = Date.now();

    // Only send if a new candle has been added OR it's been >5s (handles tick updates)
    if (count === lastSentCandleCount.current && now - lastSentTime.current < 5000) return;

    lastSentCandleCount.current = count;
    lastSentTime.current        = now;

    api('post', '/papertrade/candles', { candles: realtimeData.candles })
      .catch(err => console.error('Failed to send candles:', err));

  }, [realtimeData?.candles, isRunning, api]);

  const handleTimeframeChange = (newTimeframe) => {
    console.log(`📊 Timeframe changed to ${newTimeframe}m`);
    if (currentStrategy) {
      updateStrategy({ ...currentStrategy, timeframe: newTimeframe });
    }
    // Reset sent-count so candles are re-sent after timeframe change
    lastSentCandleCount.current = 0;
    subscribeToSymbol(selectedSymbol, newTimeframe);
  };

  const handleStart = async () => {
    if (!credentials?.connected) {
      toast.error('Please connect to Zerodha first');
      return;
    }
    if (!currentStrategy) {
      toast.error('Please configure strategy first');
      return;
    }
    const result = await startTrading();
    if (result?.success) {
      setSelectedSymbol(currentStrategy.symbol);
      setShowConfig(false);
      // Force immediate candle send after start
      lastSentCandleCount.current = 0;
      lastSentTime.current        = 0;
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset portfolio to ₹1 Crore? All trade history will be cleared.')) {
      resetPortfolio();
      toast.success('Portfolio reset to ₹1 Crore');
    }
  };

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Paper Trading</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Simulated trading with real-time market data
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="btn-ghost"
            onClick={() => setShowConfig(!showConfig)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Settings size={16} />
            {showConfig ? 'Hide' : 'Show'} Config
          </button>

          <button
            className="btn-ghost"
            onClick={handleReset}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RotateCcw size={16} />
            Reset
          </button>

          {!isRunning ? (
            <button
              className="btn-green"
              onClick={handleStart}
              disabled={!currentStrategy || !credentials?.connected}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              title={!credentials?.connected ? 'Connect to Zerodha first' : ''}
            >
              <Play size={16} />
              Start Trading
            </button>
          ) : (
            <button
              className="btn-danger"
              onClick={stopTrading}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Square size={16} />
              Stop Trading
            </button>
          )}
        </div>
      </div>

      {showConfig && (
        <StrategyConfig
          onUpdate={updateStrategy}
          currentStrategy={currentStrategy}
        />
      )}

      <PortfolioStats
        portfolio={portfolio}
        openPositions={openPositions}
        isRunning={isRunning}
      />

      <LiveChart
        data={realtimeData}
        symbol={selectedSymbol}
        isConnected={isConnected}
        isRunning={isRunning}
        onTimeframeChange={handleTimeframeChange}
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.5fr 1fr',
        gap: 20,
        marginTop: 20
      }}>
        <OpenPositions
          positions={openPositions}
          currentPrice={realtimeData?.price}
          isRunning={isRunning}
        />
        <SignalsLog signals={signals} />
      </div>

      <div style={{ marginTop: 20 }}>
        <TradeHistory trades={closedTrades} />
      </div>
    </div>
  );
}