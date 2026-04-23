import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import toast from 'react-hot-toast';

// REST calls go through the React proxy (see package.json "proxy": "http://localhost:5000")
// Socket.IO MUST connect directly to backend port — proxy doesn't support WebSockets
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:5000';

const TradingContext = createContext(null);

export function TradingProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [engineStatus, setEngineStatus] = useState({ running: false, mode: null });
  const [liveTrades, setLiveTrades] = useState([]);
  const [closedTrades, setClosedTrades] = useState([]);
  const [paperOpenTrades, setPaperOpenTrades] = useState([]);
  const [paperTrades, setPaperTrades] = useState([]);
  const [signals, setSignals] = useState([]);
  const [ticks, setTicks] = useState({});
  const [zerodhaConnected, setZerodhaConnected] = useState(false);
  const [stats, setStats] = useState({ today:{trades:0,pnl:0,wins:0,losses:0}, week:{trades:0,pnl:0,wins:0,losses:0}, month:{trades:0,pnl:0,wins:0,losses:0} });
  const [strategy, setStrategy] = useState({ timeframe:'5', lots:1, emaShort:9, emaLong:15, emaAngleThreshold:30, instruments:['NIFTY 50'], maxTradesPerDay:5 });
  const [credentials, setCredentials] = useState({ apiKey:'', accessToken:'' });

  useEffect(() => {
    const s = io(WS_URL);
    setSocket(s);
    s.on('connect', () => { setConnected(true); });
    s.on('disconnect', () => { setConnected(false); });
   s.on('state', (state) => {
  if (state.liveTrades) setLiveTrades(state.liveTrades);
  if (state.closedTrades) setClosedTrades(state.closedTrades);
  if (state.paperTrades) setPaperTrades(state.paperTrades);
  if (state.paperOpenTrades) setPaperOpenTrades(state.paperOpenTrades);
  if (state.signals) setSignals(state.signals);
  if (state.stats) setStats(state.stats);
  if (state.strategy) setStrategy(state.strategy);
  if (state.credentials) {
    setCredentials(c => ({ ...c, ...state.credentials }));
    setZerodhaConnected(state.credentials.connected || false);
  }
});
    s.on('trade_opened', (t) => { setLiveTrades(prev => [...prev, t]); toast.success(`📈 Trade opened: ${t.symbol}`); });
    s.on('trade_closed', (t) => { setLiveTrades(prev => prev.filter(x => x.id !== t.id)); setClosedTrades(prev => [t, ...prev]); const pnl = t.pnl?.toFixed(0); toast(pnl > 0 ? `✅ Profit: ₹${pnl}` : `❌ Loss: ₹${pnl}`, { icon: pnl > 0 ? '💚' : '🔴' }); });
    s.on('paper_trade_opened', (t) => { setPaperOpenTrades(prev => [...prev, t]); toast(`📋 Paper trade: ${t.symbol}`); });
    s.on('paper_trade_closed', (t) => { setPaperOpenTrades(prev => prev.filter(x => x.id !== t.id)); setPaperTrades(prev => [t, ...prev]); });
    s.on('signal', (sig) => { setSignals(prev => [sig, ...prev.slice(0, 49)]); });
    s.on('tick', ({ symbol, tick }) => { setTicks(prev => ({ ...prev, [symbol]: tick })); });
    s.on('stats', (s) => setStats(s));
    s.on('strategy', (s) => setStrategy(s));
    s.on('engine_status', (s) => setEngineStatus(s));
    s.on('ws_status', ({ connected: wsc }) => setWsConnected(wsc));
    return () => s.disconnect();
    s.on('zerodha_connection', ({ connected }) => {
  console.log('Zerodha connection update:', connected);
  setZerodhaConnected(connected);
  setCredentials(c => ({ ...c, connected }));
});
  }, []);

  const api = useCallback(async (method, path, data) => {
    try {
      const res = await axios({ method, url: `${API_BASE}${path}`, data });
      return res.data;
    } catch (e) {
      const msg = e.response?.data?.error || e.message;
      toast.error(msg);
      return { success: false, error: msg };
    }
  }, []);

  const connectZerodha = useCallback(async (apiKey, accessToken) => {
    const res = await api('post', '/trading/connect', { apiKey, accessToken });
    if (res.success) { setCredentials(c => ({ ...c, connected: true, apiKey })); toast.success('Connected to Zerodha!'); }
    console.log('connectZerodha', res);
    return res;
  }, [api]);

  const startTrading = useCallback(async (mode = 'live') => {
    const path = mode === 'paper' ? '/trading/start-paper' : '/trading/start';
    const res = await api('post', path);
    if (res.success) { setEngineStatus({ running: true, mode }); toast.success(`${mode === 'paper' ? 'Paper' : 'Live'} trading started!`); }
    return res;
  }, [api]);

  const stopTrading = useCallback(async () => {
    const res = await api('post', '/trading/stop');
    if (res.success) { setEngineStatus({ running: false }); toast('Trading stopped'); }
    return res;
  }, [api]);

  const saveStrategy = useCallback(async (s) => {
    const res = await api('post', '/settings/strategy', s);
    if (res.success) { setStrategy(res.strategy); toast.success('Strategy saved!'); }
    return res;
  }, [api]);

  return (
    <TradingContext.Provider value={{
      socket, connected, wsConnected, engineStatus,zerodhaConnected,
      liveTrades, closedTrades, paperOpenTrades, paperTrades,
      signals, ticks, stats, strategy, credentials,
      connectZerodha, startTrading, stopTrading, saveStrategy, api
    }}>
      {children}
    </TradingContext.Provider>
  );
}

export const useTrading = () => useContext(TradingContext);
