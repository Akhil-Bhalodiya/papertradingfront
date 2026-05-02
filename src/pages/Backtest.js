import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTrading } from '../context/TradingContext';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, Cell
} from 'recharts';
import {
  FlaskConical, Play, ChevronDown, ChevronUp,
  Download, CheckCircle, AlertCircle, RefreshCw, Database, Calendar, Loader
} from 'lucide-react';

// ── IST helpers ───────────────────────────────────────────────────────────────
function toIST(isoStr, format = 'datetime') {
  if (!isoStr) return '—';
  const d   = new Date(new Date(isoStr).getTime() + 5.5 * 60 * 60 * 1000);
  const dd  = String(d.getUTCDate()).padStart(2, '0');
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()];
  const hh  = d.getUTCHours(), mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const hh12 = String(hh % 12 || 12).padStart(2, '0');
  if (format === 'date')  return `${dd} ${mon} ${d.getUTCFullYear()}`;
  if (format === 'chart') return `${dd} ${mon} ${hh12}:${mm}`;
  return `${dd} ${mon}, ${hh12}:${mm} ${ampm}`;
}

// Format expiry: "2025-04-24" → "24 Apr 2025 (Thu)"
function formatExpiry(dateStr) {
  if (!dateStr) return '—';
  const d    = new Date(dateStr + 'T00:00:00Z');
  const dd   = String(d.getUTCDate()).padStart(2, '0');
  const mon  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()];
  const yr   = d.getUTCFullYear();
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return `${dd} ${mon} ${yr} (${days[d.getUTCDay()]})`;
}

// Get date part from datetime-local value or ISO string
function dateOnly(str) {
  if (!str) return '';
  return str.split('T')[0].split(' ')[0];
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function Stat({ label, value, color, sub }) {
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ── Price source badge ────────────────────────────────────────────────────────
function PriceBadge({ source }) {
  const map = {
    REAL_DB:   { label: 'REAL (DB)',  color: 'var(--green)',  bg: 'var(--green-dim)' },
    REAL_API:  { label: 'REAL (API)', color: 'var(--accent)', bg: 'var(--accent-dim)' },
    ESTIMATED: { label: 'EST',        color: 'var(--yellow)', bg: 'rgba(255,200,0,0.12)' }
  };
  const s = map[source] || map.ESTIMATED;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, color: s.color, background: s.bg, fontFamily: 'var(--font-mono)' }}>
      {s.label}
    </span>
  );
}

// ── Expiry Selector ───────────────────────────────────────────────────────────
// Always fetches from Zerodha via backend — never generates fake dates.
// Shows spinner while loading, error state if not connected.
function ExpirySelector({ api, underlying, expiry, onExpiryChange }) {
  const [expiries, setExpiries] = useState([]);
  const [status,   setStatus]  = useState('idle'); // idle | loading | ok | error
  const [errMsg,   setErrMsg]  = useState('');
  const prevUnderlying = useRef(null);

  const fetchExpiries = useCallback(async (und) => {
    setStatus('loading');
    setExpiries([]);
    setErrMsg('');
    try {
      const res = await api('get', `/backtest/expiries?underlying=${encodeURIComponent(und)}`);
      if (res?.success && res.expiries?.length > 0) {
        setExpiries(res.expiries);
        setStatus('ok');
        // Auto-select first if nothing selected or selection not in list
        if (!expiry || !res.expiries.includes(expiry)) {
          onExpiryChange(res.expiries[0]);
        }
      } else {
        setStatus('error');
        setErrMsg(res?.error || 'No expiries found. Make sure Zerodha is connected.');
      }
    } catch (e) {
      setStatus('error');
      setErrMsg('Failed to fetch expiries. Check Zerodha connection.');
    }
  }, [api, expiry, onExpiryChange]);

  useEffect(() => {
    if (underlying) {
      prevUnderlying.current = underlying;
      fetchExpiries(underlying);
    }
  }, [underlying]);

  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Calendar size={13} style={{ color: 'var(--accent)' }} />
        Expiry
        {status === 'loading' && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> fetching from Zerodha…
          </span>
        )}
        {status === 'ok' && expiries.length > 0 && (
          <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>
            ✓ {expiries.length} expiries loaded
          </span>
        )}
        <button
          type="button"
          onClick={() => fetchExpiries(underlying)}
          disabled={status === 'loading'}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex', alignItems: 'center' }}
          title="Refresh expiries"
        >
          <RefreshCw size={12} style={{ animation: status === 'loading' ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </label>

      {/* Error state */}
      {status === 'error' && (
        <div style={{ padding: '10px 12px', background: 'rgba(255,60,60,0.1)', border: '1px solid rgba(255,60,60,0.3)', borderRadius: 8, fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>
          ⚠ {errMsg}
          <button
            type="button"
            onClick={() => fetchExpiries(underlying)}
            style={{ marginLeft: 10, padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: '1px solid var(--red)', background: 'transparent', color: 'var(--red)', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {status === 'loading' && (
        <div style={{ height: 40, borderRadius: 8, background: 'var(--bg-secondary)', animation: 'pulse 1.5s infinite', border: '1px solid var(--border)' }} />
      )}

      {/* Actual dropdown */}
      {status !== 'loading' && expiries.length > 0 && (
        <>
          <select
            value={expiry || ''}
            onChange={e => onExpiryChange(e.target.value)}
          >
            {expiries.map(e => (
              <option key={e} value={e}>{formatExpiry(e)}</option>
            ))}
          </select>
          {expiry && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
              Selected: <strong style={{ color: 'var(--accent)' }}>{formatExpiry(expiry)}</strong>
              {' · '}option contracts for this expiry will be used
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── EMA config ────────────────────────────────────────────────────────────────
function EMAConfig({ form, set }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
      <div>
        <label>EMA Short</label>
        <input type="number" value={form.emaShort} onChange={e => set('emaShort', e.target.value)} min={1} max={50} />
      </div>
      <div>
        <label>EMA Long</label>
        <input type="number" value={form.emaLong} onChange={e => set('emaLong', e.target.value)} min={1} max={200} />
      </div>
      <div>
        <label>Angle Threshold (°)</label>
        <input type="number" value={form.emaAngleThreshold} onChange={e => set('emaAngleThreshold', e.target.value)} min={0} max={90} step={1} />
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>0 = trade every crossover</div>
      </div>
    </div>
  );
}

// ── ORB config ────────────────────────────────────────────────────────────────
function ORBConfig({ form, set }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ padding: '12px 16px', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: 10, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
        <strong style={{ color: 'var(--purple)' }}>15-Min ORB Rules:</strong><br />
        📊 <strong>ORB Level</strong> = High &amp; Low of the <strong>09:15 candle</strong><br />
        📈 <strong>CE Entry</strong>: Close <em>above ORB High</em> → Buy CE<br />
        📉 <strong>PE Entry</strong>: Close <em>below ORB Low</em> → Buy PE<br />
        🛑 <strong>SL</strong>: Close back through the ORB level · 🎯 <strong>Target</strong>: 2× risk
      </div>
      <div style={{ display: 'flex', gap: 14 }}>
        {[['allowCE','CE Trades','var(--green)'],['allowPE','PE Trades','var(--red)']].map(([k, label, color]) => (
          <div key={k} style={{ flex: 1 }}>
            <label>{label}</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {['true','false'].map(v => (
                <button key={v} type="button" onClick={() => set(k, v)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${form[k] === v ? color : 'var(--border)'}`,
                  background: form[k] === v ? `${color}22` : 'var(--bg-secondary)',
                  color: form[k] === v ? color : 'var(--text-secondary)'
                }}>{v === 'true' ? '✓ Yes' : '✗ No'}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ORB levels table ──────────────────────────────────────────────────────────
function ORBLevelsTable({ levels }) {
  const [open, setOpen] = useState(false);
  if (!levels || !Object.keys(levels).length) return null;
  const rows = Object.entries(levels).sort((a, b) => b[0].localeCompare(a[0]));
  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontWeight: 600, fontSize: 14, width: '100%', padding: 0 }}>
        📏 Daily ORB Levels ({rows.length} days)
        {open ? <ChevronUp size={16} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={16} style={{ marginLeft: 'auto' }} />}
      </button>
      {open && (
        <div style={{ marginTop: 14, overflowX: 'auto', maxHeight: 280, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)' }}>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Date','ORB High','ORB Low','Range'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textAlign: 'left', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([date, lvl]) => (
                <tr key={date} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatExpiry(date)}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--green)' }}>₹{lvl.high?.toFixed(2)}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--red)' }}>₹{lvl.low?.toFixed(2)}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{lvl.range}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Option Data Manager ───────────────────────────────────────────────────────
function DataManagerPanel({ api, underlying, expiry, fromDate, toDate }) {
  const [status,      setStatus]      = useState(null);
  const [fetching,    setFetching]    = useState(false);
  const [checking,    setChecking]    = useState(false);
  const [fetchResult, setFetchResult] = useState(null);
  const [open,        setOpen]        = useState(false);

  const checkStatus = useCallback(async () => {
    if (!expiry || !fromDate || !toDate) return;
    setChecking(true);
    const from = dateOnly(fromDate);
    const to   = dateOnly(toDate);
    try {
      const res = await api('get',
        `/backtest/data-status?underlying=${encodeURIComponent(underlying)}&fromDate=${from}&toDate=${to}&expiry=${expiry}`
      );
      if (res?.success) setStatus(res);
    } catch (_) {}
    setChecking(false);
  }, [api, underlying, fromDate, toDate, expiry]);

  useEffect(() => {
    if (expiry && fromDate && toDate) checkStatus();
  }, [expiry, fromDate, toDate, checkStatus]);

  const handleFetch = async () => {
    if (!expiry || !fromDate || !toDate) return;
    setFetching(true);
    setFetchResult(null);
    const res = await api('post', '/backtest/fetch-data', {
      underlying,
      fromDate: dateOnly(fromDate),
      toDate:   dateOnly(toDate),
      expiry
    });
    setFetching(false);
    setFetchResult(res);
    if (res?.success) checkStatus();
  };

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 18 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', background: 'var(--bg-secondary)', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
      >
        <Database size={15} style={{ color: 'var(--accent)' }} />
        <span style={{ fontWeight: 600, fontSize: 13 }}>Option Data Manager</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>— save real option OHLCV for backtest</span>
        {status && (
          <span style={{ marginLeft: 'auto', marginRight: 8, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: status.hasData ? 'var(--green-dim)' : 'rgba(255,200,0,0.15)', color: status.hasData ? 'var(--green)' : 'var(--yellow)' }}>
            {status.hasData ? `✓ ${status.count.toLocaleString()} candles` : '⚠ No data'}
          </span>
        )}
        {open ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
      </button>

      {open && (
        <div style={{ padding: 16 }}>
          <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            Expiry: <strong style={{ color: 'var(--accent)' }}>{formatExpiry(expiry)}</strong>
            {' · '}Range: <strong style={{ color: 'var(--text-secondary)' }}>{dateOnly(fromDate)} → {dateOnly(toDate)}</strong>
          </div>

          {status && (
            <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 12, background: status.hasData ? 'var(--green-dim)' : 'rgba(255,200,0,0.1)', border: `1px solid ${status.hasData ? 'rgba(0,200,80,0.3)' : 'rgba(255,200,0,0.3)'}`, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
              {status.hasData
                ? <CheckCircle size={15} style={{ color: 'var(--green)', flexShrink: 0 }} />
                : <AlertCircle size={15} style={{ color: 'var(--yellow)', flexShrink: 0 }} />
              }
              <div style={{ flex: 1 }}>
                {status.hasData
                  ? <><strong style={{ color: 'var(--green)' }}>Real data available</strong>{' — '}{status.count.toLocaleString()} candles across {status.tokenCount} contracts. Backtest will use REAL prices.</>
                  : <><strong style={{ color: 'var(--yellow)' }}>No saved data</strong>{' — '}Fetch below for real prices, or run with estimated prices.</>
                }
              </div>
              <button onClick={checkStatus} disabled={checking} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <RefreshCw size={11} style={{ animation: checking ? 'spin 1s linear infinite' : 'none' }} />
                {checking ? '…' : 'Check'}
              </button>
            </div>
          )}

          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.7 }}>
            Downloads ATM±10 strike option OHLCV from Zerodha and saves to MongoDB. Once saved, future backtests for this expiry/range use real contract prices.
          </div>

          <button
            onClick={handleFetch}
            disabled={fetching || !expiry}
            style={{ width: '100%', padding: '11px 0', borderRadius: 10, fontSize: 14, fontWeight: 700, border: 'none', cursor: fetching ? 'not-allowed' : 'pointer', background: fetching ? 'var(--bg-secondary)' : 'linear-gradient(135deg, var(--accent), #0077aa)', color: fetching ? 'var(--text-muted)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Download size={15} />
            {fetching ? 'Fetching from Zerodha…' : `Fetch & Save — ${formatExpiry(expiry)}`}
          </button>

          {fetchResult && (
            <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, fontSize: 13, background: fetchResult.success ? 'var(--green-dim)' : 'var(--red-dim)', color: fetchResult.success ? 'var(--green)' : 'var(--red)', border: `1px solid ${fetchResult.success ? 'rgba(0,200,80,0.3)' : 'rgba(255,60,60,0.3)'}` }}>
              {fetchResult.success ? (
                <>✅ {fetchResult.message}
                  {fetchResult.tokens?.length > 0 && <div style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>{fetchResult.tokens.slice(0, 5).map(t => t.symbol).join(', ')}{fetchResult.tokens.length > 5 ? ` +${fetchResult.tokens.length - 5} more` : ''}</div>}
                </>
              ) : <>❌ {fetchResult.error}</>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Backtest() {
  const { api } = useTrading();

  const [form, setForm] = useState({
    underlying:        'NIFTY 50',
    expiry:            '',
    strategy:          'EMA_CROSSOVER',
    timeframe:         '5',
    fromDate:          '',
    toDate:            '',
    emaShort:          9,
    emaLong:           15,
    emaAngleThreshold: 30,
    lots:              1,
    allowCE:           'true',
    allowPE:           'true'
  });

  const [loading,       setLoading] = useState(false);
  const [loadingPreset, setLP]      = useState('');
  const [result,        setResult]  = useState(null);
  const [error,         setError]   = useState('');

  const getLotSize = () => form.underlying === 'NIFTY 50' ? 50 : 30;

  const set = (k, v) => {
    setForm(f => {
      if (k === 'underlying') return { ...f, [k]: v, expiry: '', lots: 1 };
      return { ...f, [k]: v };
    });
  };

  // Build query params — always include expiry for presets
  const presetQuery = () => {
    const p = new URLSearchParams({
      underlying:        form.underlying,
      strategy:          form.strategy,
      timeframe:         form.timeframe,
      emaShort:          form.emaShort,
      emaLong:           form.emaLong,
      emaAngleThreshold: form.emaAngleThreshold,
      lots:              form.lots,
      lotSize:           getLotSize(),
      allowCE:           form.allowCE,
      allowPE:           form.allowPE
    });
    if (form.expiry) p.set('expiry', form.expiry);
    return p.toString();
  };

  const run = async () => {
    if (!form.fromDate || !form.toDate) { setError('Please set from and to dates'); return; }
    setLoading(true); setError(''); setResult(null);
    const res = await api('post', '/backtest/run', { ...form, lotSize: getLotSize() });
    setLoading(false);
    if (res?.success) setResult(res);
    else setError(res?.error || 'Backtest failed');
  };

  const runPreset = async (preset) => {
    if (!form.expiry) { setError('Please wait for expiries to load, then select one before running'); return; }
    setLP(preset); setError(''); setResult(null);
    const res = await api('get', `/backtest/${preset}?${presetQuery()}`);
    setLP('');
    if (res?.success) setResult(res);
    else setError(res?.error || `No data for ${preset}`);
  };

  const isLoading = loading || !!loadingPreset;

  // Charts
  const chartData = (result?.trades || []).map((t, i) => ({
    name: toIST(t.entryTime, 'chart'),
    pnl:  t.pnl,
    cumPnl: result.trades.slice(0, i + 1).reduce((s, x) => s + (x.pnl || 0), 0)
  }));

  const dailyData = Object.entries(result?.summary?.dailyPnl || {})
    .map(([date, d]) => {
      const dd  = String(new Date(date + 'T00:00:00Z').getUTCDate()).padStart(2, '0');
      const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][new Date(date + 'T00:00:00Z').getUTCMonth()];
      return { date: `${dd} ${mon}`, pnl: d.pnl, trades: d.trades };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const maxCap    = result?.trades?.length ? Math.max(...result.trades.map(t => t.capitalRequired || 0)) : 0;
  const realCount = result?.priceStats?.realPrices || 0;
  const estCount  = result?.priceStats?.estimatedPrices || 0;

  const PRESETS    = [{ key: 'today', label: 'Today' }, { key: 'yesterday', label: 'Yesterday' }, { key: 'lastweek', label: 'Last Week' }, { key: 'lastmonth', label: 'Last Month' }];
  const STRATEGIES = [{ key: 'EMA_CROSSOVER', label: 'EMA 9/15 Crossover', color: 'var(--accent)', icon: '📈' }, { key: 'ORB_15MIN', label: '15-Min ORB Breakout', color: 'var(--purple)', icon: '🔲' }];
  const TIMEFRAMES = [{ v: '1', l: '1 Min' }, { v: '3', l: '3 Min' }, { v: '5', l: '5 Min' }, { v: '15', l: '15 Min' }];

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Backtest</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Test strategies on historical Zerodha data — with real option contract prices</p>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 24 }}>

        {/* Strategy */}
        <div style={{ marginBottom: 22 }}>
          <label style={{ marginBottom: 10, display: 'block' }}>Strategy</label>
          <div style={{ display: 'flex', gap: 12 }}>
            {STRATEGIES.map(s => (
              <button key={s.key} type="button" onClick={() => set('strategy', s.key)} style={{ flex: 1, padding: '14px 16px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: `2px solid ${form.strategy === s.key ? s.color : 'var(--border)'}`, background: form.strategy === s.key ? `${s.color}18` : 'var(--bg-secondary)', color: form.strategy === s.key ? s.color : 'var(--text-secondary)', textAlign: 'left', transition: 'all 0.15s' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                {s.label}
                {form.strategy === s.key && <div style={{ fontSize: 11, fontWeight: 400, marginTop: 3, opacity: 0.8 }}>Selected</div>}
              </button>
            ))}
          </div>
        </div>

        {/* Instrument + Expiry */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 18, marginBottom: 18 }}>
          <div>
            <label style={{ marginBottom: 6, display: 'block' }}>Instrument</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['NIFTY 50', 'NIFTY BANK'].map(u => (
                <button key={u} type="button" onClick={() => set('underlying', u)} style={{ padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left', border: `2px solid ${form.underlying === u ? (u === 'NIFTY 50' ? 'var(--accent)' : 'var(--purple)') : 'var(--border)'}`, background: form.underlying === u ? (u === 'NIFTY 50' ? 'var(--accent-dim)' : 'rgba(168,85,247,0.12)') : 'var(--bg-secondary)', color: form.underlying === u ? (u === 'NIFTY 50' ? 'var(--accent)' : 'var(--purple)') : 'var(--text-secondary)' }}>
                  {form.underlying === u ? '✓ ' : ''}{u}
                  <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.7, marginTop: 2 }}>{u === 'NIFTY 50' ? 'Weekly · Lot 50' : 'Weekly (Tue) · Lot 30'}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Expiry — always shown, always loaded from Zerodha */}
          <ExpirySelector
            api={api}
            underlying={form.underlying}
            expiry={form.expiry}
            onExpiryChange={v => set('expiry', v)}
          />
        </div>

        {/* Timeframe */}
        {form.strategy === 'EMA_CROSSOVER' && (
          <div style={{ marginBottom: 18 }}>
            <label>Candle Timeframe</label>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              {TIMEFRAMES.map(tf => (
                <button key={tf.v} type="button" onClick={() => set('timeframe', tf.v)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1px solid ${form.timeframe === tf.v ? 'var(--accent)' : 'var(--border)'}`, background: form.timeframe === tf.v ? 'var(--accent-dim)' : 'var(--bg-secondary)', color: form.timeframe === tf.v ? 'var(--accent)' : 'var(--text-secondary)' }}>{tf.l}</button>
              ))}
            </div>
          </div>
        )}
        {form.strategy === 'ORB_15MIN' && (
          <div style={{ marginBottom: 18, padding: '8px 14px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)' }}>
            ⏱ ORB always uses <strong style={{ color: 'var(--purple)' }}>15-minute candles</strong>
          </div>
        )}

        {/* Strategy params */}
        <div style={{ marginBottom: 18 }}>
          {form.strategy === 'EMA_CROSSOVER' ? <EMAConfig form={form} set={set} /> : <ORBConfig form={form} set={set} />}
        </div>

        {/* Lots */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
          <div>
            <label>Lots</label>
            <input type="number" value={form.lots} onChange={e => set('lots', e.target.value)} min={1} />
          </div>
          <div>
            <label>Lot Size (auto)</label>
            <input type="number" value={getLotSize()} disabled style={{ background: 'var(--bg-secondary)', cursor: 'not-allowed', opacity: 0.7 }} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{form.underlying === 'NIFTY 50' ? 'NIFTY = 50 units' : 'BANKNIFTY = 30 units'}</div>
          </div>
        </div>

        {/* Date range */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18, marginBottom: 18 }}>
          <label style={{ marginBottom: 10, display: 'block' }}>Date Range</label>

          {/* Expiry reminder for presets */}
          {form.expiry && (
            <div style={{ marginBottom: 10, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={12} style={{ color: 'var(--accent)' }} />
              Preset runs will use expiry: <strong style={{ color: 'var(--accent)', marginLeft: 4 }}>{formatExpiry(form.expiry)}</strong>
            </div>
          )}

          {/* Quick presets */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {PRESETS.map(p => (
              <button key={p.key} type="button" onClick={() => runPreset(p.key)} disabled={isLoading || !form.expiry} style={{ padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: (isLoading || !form.expiry) ? 'not-allowed' : 'pointer', border: '1px solid var(--border)', background: loadingPreset === p.key ? 'var(--accent-dim)' : 'var(--bg-secondary)', color: loadingPreset === p.key ? 'var(--accent)' : 'var(--text-secondary)', opacity: (isLoading && loadingPreset !== p.key) || !form.expiry ? 0.45 : 1, transition: 'all 0.15s' }}>
                {loadingPreset === p.key ? '⏳ ' : ''}{p.label}
              </button>
            ))}
            {!form.expiry && (
              <span style={{ fontSize: 11, color: 'var(--yellow)', alignSelf: 'center' }}>
                ⚠ Select an expiry above first
              </span>
            )}
          </div>

          {/* Custom dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label>From Date &amp; Time (IST)</label>
              <input type="datetime-local" value={form.fromDate} onChange={e => set('fromDate', e.target.value)} />
            </div>
            <div>
              <label>To Date &amp; Time (IST)</label>
              <input type="datetime-local" value={form.toDate} onChange={e => set('toDate', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Option Data Manager — only when custom dates AND expiry are set */}
        {form.fromDate && form.toDate && form.expiry && (
          <DataManagerPanel
            api={api}
            underlying={form.underlying}
            expiry={form.expiry}
            fromDate={form.fromDate}
            toDate={form.toDate}
          />
        )}

        {/* Run */}
        <button
          className="btn-primary"
          onClick={run}
          disabled={isLoading || !form.fromDate || !form.toDate || !form.expiry}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Play size={15} />
          {loading ? 'Running…' : 'Run Backtest'}
        </button>

        {!form.expiry && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--yellow)' }}>⚠ Select an expiry to enable Run Backtest</div>
        )}

        {error && (
          <div style={{ marginTop: 14, color: 'var(--red)', fontSize: 13, background: 'var(--red-dim)', padding: '10px 14px', borderRadius: 8 }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* ── Results ─────────────────────────────────────────────────────────── */}
      {result && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
            <FlaskConical size={18} style={{ color: 'var(--accent)' }} />
            <span className="badge-accent">{result.strategyName || result.strategy}</span>
            <span className="badge-accent">{result.preset || 'Custom Range'}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{result.underlying}</span>
            {result.expiry && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>📅 {formatExpiry(result.expiry)}</span>}
            {(realCount > 0 || estCount > 0) && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                {realCount > 0 && <span style={{ padding: '3px 10px', borderRadius: 20, background: 'var(--green-dim)', color: 'var(--green)', fontWeight: 600, fontSize: 12 }}>✓ {realCount} real</span>}
                {estCount > 0  && <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(255,200,0,0.15)', color: 'var(--yellow)', fontWeight: 600, fontSize: 12 }}>~ {estCount} estimated</span>}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 14 }}>
            <Stat label="Total PnL"     value={`₹${parseFloat(result.summary.totalPnl).toFixed(0)}`} color={result.summary.totalPnl >= 0 ? 'var(--green)' : 'var(--red)'} />
            <Stat label="Total Trades"  value={result.summary.totalTrades} />
            <Stat label="Win Rate"      value={`${result.summary.winRate}%`} color="var(--accent)" sub={`${result.summary.wins}W / ${result.summary.losses}L`} />
            <Stat label="Profit Factor" value={result.summary.profitFactor} color="var(--yellow)" />
            <Stat label="Max Capital"   value={`₹${maxCap.toFixed(0)}`} color="var(--orange)" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
            <Stat label="Avg Win"      value={`₹${result.summary.avgWin}`} color="var(--green)" />
            <Stat label="Avg Loss"     value={`₹${result.summary.avgLoss}`} color="var(--red)" />
            <Stat label="Max Drawdown" value={`₹${parseFloat(result.summary.maxDrawdown).toFixed(0)}`} color="var(--red)" />
            <Stat label="Wins / Losses" value={`${result.summary.wins} / ${result.summary.losses}`} />
          </div>

          {result.orbLevels && <ORBLevelsTable levels={result.orbLevels} />}

          <div className="card" style={{ padding: 20, marginBottom: 18 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Cumulative PnL Curve</h3>
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} /><stop offset="95%" stopColor="#00d4ff" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                  <Tooltip formatter={v => [`₹${v?.toFixed(0)}`, 'Cumulative PnL']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="cumPnl" stroke="var(--accent)" strokeWidth={2} fill="url(#cg)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No trades found</div>}
          </div>

          {dailyData.length > 0 && (
            <div className="card" style={{ padding: 20, marginBottom: 18 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Daily PnL</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={dailyData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                  <Tooltip formatter={(v, n) => [n === 'pnl' ? `₹${v?.toFixed(0)}` : v, n]} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <ReferenceLine y={0} stroke="var(--border)" />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {dailyData.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? 'var(--green)' : 'var(--red)'} fillOpacity={0.8} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>All Trades ({result.trades.length})</h3>
            {result.trades.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>No trades matched the strategy in this period</div>
            ) : (
              <div style={{ overflowX: 'auto', maxHeight: 500, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['#','Entry (IST)','Exit (IST)','Type','Strike', result.strategy === 'ORB_15MIN' ? 'ORB High' : 'Signal','SL Spot','Entry Opt','Exit Opt','Lots','Capital','Price','PnL','Reason'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.map((t, i) => (
                      <tr key={t.id || i} style={{ borderBottom: '1px solid var(--border)' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '7px 10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{i + 1}</td>
                        <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap' }}>{toIST(t.entryTime)}</td>
                        <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap' }}>{toIST(t.exitTime)}</td>
                        <td style={{ padding: '7px 10px' }}><span className={t.type === 'CE' ? 'badge-green' : 'badge-red'}>{t.type}</span></td>
                        <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>{t.strikePrice}</td>
                        <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {result.strategy === 'ORB_15MIN' ? `₹${t.orbHigh?.toFixed(0)}` : t.signal?.split('|')[0]?.trim()}
                        </td>
                        <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--red)' }}>₹{t.stopLossPrice?.toFixed(0)}</td>
                        <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>₹{t.entryPrice?.toFixed(1)}</td>
                        <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>₹{t.exitPrice?.toFixed(1)}</td>
                        <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{t.lots}</td>
                        <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--orange)', fontWeight: 600 }}>₹{(t.capitalRequired || 0).toFixed(0)}</td>
                        <td style={{ padding: '7px 10px' }}><PriceBadge source={t.priceSource} /></td>
                        <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontWeight: 700, whiteSpace: 'nowrap', color: t.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>₹{t.pnl?.toFixed(0)}</td>
                        <td style={{ padding: '7px 10px' }}>
                          <span className={t.exitReason === 'TARGET' ? 'badge-green' : t.exitReason === 'STOP_LOSS' ? 'badge-red' : 'badge-yellow'}>{t.exitReason}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}