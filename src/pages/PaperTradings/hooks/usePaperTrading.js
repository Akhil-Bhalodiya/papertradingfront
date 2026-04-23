import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

export function usePaperTrading(api) {
  const [state, setState] = useState({
    isRunning: false,
    portfolio: {
      initialCapital:   10000000,
      currentCapital:   10000000,
      totalPnl:         0,
      totalPnlPercent:  0,
      totalTrades:      0,
      winningTrades:    0,
      losingTrades:     0,
      winRate:          0
    },
    openPositions:   [],
    closedTrades:    [],
    signals:         [],
    currentStrategy: null
  });

  // On mount: sync state from backend (e.g. after page refresh)
  useEffect(() => {
    api('get', '/papertrade/state').then(res => {
      if (res?.success) {
        setState(prev => ({
          ...prev,
          isRunning:     res.running,
          portfolio:     res.portfolio,
          openPositions: res.openPositions,
          closedTrades:  res.closedTrades,
          signals:       res.signals
        }));
      }
    }).catch(() => {});
  }, []);

  // Poll state every 2 seconds while running
  useEffect(() => {
    if (!state.isRunning) return;

    const interval = setInterval(async () => {
      try {
        const res = await api('get', '/papertrade/state');
        if (res?.success) {
          setState(prev => ({
            ...prev,
            portfolio:     res.portfolio,
            openPositions: res.openPositions,
            closedTrades:  res.closedTrades,
            signals:       res.signals
          }));
        }
      } catch (error) {
        console.error('Error fetching paper trading state:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [state.isRunning, api]);

  const startTrading = useCallback(async () => {
    if (!state.currentStrategy) {
      toast.error('Please configure strategy first');
      return { success: false };
    }

    console.log('🚀 Starting paper trading with strategy:', state.currentStrategy);

    // Subscribe to WebSocket feed for this symbol
    try {
      await api('post', '/papertrade/subscribe', { symbol: state.currentStrategy.symbol });
    } catch (error) {
      console.error('Failed to subscribe:', error);
    }

    const res = await api('post', '/papertrade/start', state.currentStrategy);
    console.log('Start trading response:', res);

    if (res?.success) {
      setState(prev => ({ ...prev, isRunning: true }));
      toast.success('Paper trading started!');
    } else {
      toast.error(res?.error || 'Failed to start paper trading');
    }
    return res;
  }, [state.currentStrategy, api]);

  const stopTrading = useCallback(async () => {
    const res = await api('post', '/papertrade/stop');
    if (res?.success) {
      setState(prev => ({ ...prev, isRunning: false }));
      toast.success('Paper trading stopped');
      try {
        await api('post', '/papertrade/unsubscribe');
      } catch (error) {
        console.error('Failed to unsubscribe:', error);
      }
    }
    return res;
  }, [api]);

  const resetPortfolio = useCallback(async () => {
    const res = await api('post', '/papertrade/reset');
    if (res?.success) {
      const stateRes = await api('get', '/papertrade/state');
      if (stateRes?.success) {
        setState(prev => ({
          ...prev,
          portfolio:     stateRes.portfolio,
          openPositions: stateRes.openPositions,
          closedTrades:  stateRes.closedTrades,
          signals:       stateRes.signals
        }));
      }
    }
    return res;
  }, [api]);

  const updateStrategy = useCallback((strategy) => {
    setState(prev => ({ ...prev, currentStrategy: strategy }));
  }, []);

  return {
    ...state,
    startTrading,
    stopTrading,
    resetPortfolio,
    updateStrategy
  };
}