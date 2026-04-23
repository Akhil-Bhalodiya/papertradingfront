import React, { useState, useEffect } from 'react';
import { useTrading } from '../context/TradingContext';
import { Settings2, Key, Sliders, Save, CheckCircle, AlertTriangle } from 'lucide-react';

export default function Settings() {
  const { credentials, strategy, connectZerodha, saveStrategy } = useTrading();
  const [apiKey, setApiKey] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [strat, setStrat] = useState({ ...strategy });
  const [saving, setSaving] = useState(false);

  useEffect(() => { setStrat({ ...strategy }); }, [strategy]);

  const handleConnect = async () => {
    if (!apiKey || !accessToken) return;
    setConnecting(true);
    await connectZerodha(apiKey, accessToken);
    setConnecting(false);
  };

  const handleSaveStrategy = async () => {
    setSaving(true);
    await saveStrategy(strat);
    setSaving(false);
  };

  const updateStrat = (k, v) => setStrat(s => ({ ...s, [k]: v }));

  return (
    <div style={{ padding: 28, maxWidth: 800 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Settings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Configure API credentials and trading strategy</p>
      </div>

      {/* Zerodha credentials */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Key size={16} style={{ color: 'var(--accent)' }} />Zerodha API Credentials
        </h3>

        {credentials?.connected && (
          <div style={{ padding: '10px 14px', background: 'var(--green-dim)', border: '1px solid rgba(0,255,157,0.3)', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={14} style={{ color: 'var(--green)' }} />
            <span style={{ color: 'var(--green)', fontSize: 13 }}>Successfully connected to Zerodha</span>
          </div>
        )}

        <div style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
          <div>
            <label>API Key</label>
            <input type="text" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Enter your Zerodha API key" />
          </div>
          <div>
            <label>Access Token</label>
            <input type="password" value={accessToken} onChange={e => setAccessToken(e.target.value)} placeholder="Enter today's access token" />
          </div>
        </div>

        <div style={{ background: 'var(--yellow-dim)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--yellow)' }}>
          <AlertTriangle size={13} style={{ display: 'inline', marginRight: 6 }} />
          Access tokens expire daily. You need to generate a new token each trading day from the Zerodha developer console.
        </div>

        <button className="btn-primary" onClick={handleConnect} disabled={connecting || !apiKey || !accessToken}>
          {connecting ? 'Connecting...' : 'Connect to Zerodha'}
        </button>
      </div>

      {/* Strategy settings */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sliders size={16} style={{ color: 'var(--accent)' }} />Strategy Configuration
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <label>Underlying Instrument</label>
            <select value={strat.instruments?.[0] || 'NIFTY 50'} onChange={e => updateStrat('instruments', [e.target.value])}>
              <option>NIFTY 50</option>
              <option>NIFTY BANK</option>
            </select>
          </div>
          <div>
            <label>Candle Timeframe</label>
            <select value={strat.timeframe} onChange={e => updateStrat('timeframe', e.target.value)}>
              <option value="1">1 Minute</option>
              <option value="3">3 Minutes</option>
              <option value="5">5 Minutes</option>
              <option value="15">15 Minutes</option>
            </select>
          </div>
          <div>
            <label>EMA Short Period</label>
            <input type="number" value={strat.emaShort} onChange={e => updateStrat('emaShort', parseInt(e.target.value))} min={1} max={50} />
          </div>
          <div>
            <label>EMA Long Period</label>
            <input type="number" value={strat.emaLong} onChange={e => updateStrat('emaLong', parseInt(e.target.value))} min={1} max={200} />
          </div>
          <div>
            <label>EMA Angle Threshold (degrees)</label>
            <input type="number" value={strat.emaAngleThreshold} onChange={e => updateStrat('emaAngleThreshold', parseFloat(e.target.value))} min={0} max={90} step={1} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Min angle of 15 EMA for signal confirmation</div>
          </div>
          <div>
            <label>Number of Lots</label>
            <input type="number" value={strat.lots} onChange={e => updateStrat('lots', parseInt(e.target.value))} min={1} max={100} />
          </div>
          <div>
            <label>Max Trades Per Day</label>
            <input type="number" value={strat.maxTradesPerDay} onChange={e => updateStrat('maxTradesPerDay', parseInt(e.target.value))} min={1} max={20} />
          </div>
        </div>

        <button className="btn-green" onClick={handleSaveStrategy} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Save size={15} />{saving ? 'Saving...' : 'Save Strategy'}
        </button>
      </div>

      {/* Strategy explanation */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>📋 Strategy Rules</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {[
            { title: '📈 Bullish Signal (BUY CALL)', desc: `EMA ${strat.emaShort} crosses above EMA ${strat.emaLong}, AND the angle of EMA ${strat.emaLong} is greater than ${strat.emaAngleThreshold}°. → Buy ATM CALL option.` },
            { title: '📉 Bearish Signal (BUY PUT)', desc: `EMA ${strat.emaShort} crosses below EMA ${strat.emaLong}, AND the angle of EMA ${strat.emaLong} is less than -${strat.emaAngleThreshold}°. → Buy ATM PUT option.` },
            { title: '🛑 Stop Loss', desc: 'Previous candle\'s closing price. For CALL: exit if underlying closes below SL candle. For PUT: exit if underlying closes above SL candle.' },
            { title: '🎯 Target', desc: 'Risk = |Entry - SL|. Target = Entry + 2× Risk (2:1 reward-to-risk ratio).' },
            { title: '💡 ATM Strike', desc: `Nearest ${strat.instruments?.[0]?.includes('BANK') ? '100' : '50'}-point strike to the current spot price at time of signal.` },
          ].map(({ title, desc }) => (
            <div key={title} style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8, borderLeft: '3px solid var(--border-bright)' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{title}</div>
              <div>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
