import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, Cell
} from 'recharts';
import { FlaskConical, Play, ChevronDown, ChevronUp } from 'lucide-react';

// ── IST formatter ─────────────────────────────────────────────────
function toIST(isoStr, format = 'datetime') {
  if (!isoStr) return '—';
  const istMs = new Date(isoStr).getTime() + 5.5 * 60 * 60 * 1000;
  const d     = new Date(istMs);
  const dd    = String(d.getUTCDate()).padStart(2, '0');
  const mon   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()];
  const hh    = d.getUTCHours(), mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ampm  = hh >= 12 ? 'PM' : 'AM';
  const hh12  = String(hh % 12 || 12).padStart(2, '0');
  if (format === 'date')  return `${dd} ${mon} ${d.getUTCFullYear()}`;
  if (format === 'time')  return `${hh12}:${mm} ${ampm}`;
  if (format === 'chart') return `${dd} ${mon} ${hh12}:${mm}`;
  return `${dd} ${mon}, ${hh12}:${mm} ${ampm}`;
}

function toISTDate(isoStr) {
  if (!isoStr) return '';
  const istMs = new Date(isoStr).getTime() + 5.5 * 60 * 60 * 1000;
  const d = new Date(istMs);
  const dd  = String(d.getUTCDate()).padStart(2,'0');
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()];
  return `${dd} ${mon}`;
}

// ── Stat card ─────────────────────────────────────────────────────
function Stat({ label, value, color, sub }) {
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ── Strategy config panels ─────────────────────────────────────────
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
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Min slope of EMA {form.emaLong}</div>
      </div>
    </div>
  );
}

function ORBConfig({ form, set }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ padding: '12px 16px', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: 10, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
        <strong style={{ color: 'var(--purple)' }}>15-Min ORB Rules:</strong><br />
        📊 <strong>ORB Level</strong> = High &amp; Low of the <strong>09:15 candle</strong> (first 15-min candle of the day)<br />
        📈 <strong>CE Entry</strong>: Any candle closes <em>above ORB High</em> → Buy CE at that close's ATM strike<br />
        📉 <strong>PE Entry</strong>: Any candle closes <em>below ORB Low</em> → Buy PE at that close's ATM strike<br />
        🛑 <strong>SL (CE)</strong>: Any candle closes below the ORB High → Exit<br />
        🛑 <strong>SL (PE)</strong>: Any candle closes above the ORB Low → Exit<br />
        🎯 <strong>Target</strong>: 2× the risk (distance from entry to SL level)
      </div>
      <div style={{ display: 'flex', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <label>Allow CE Trades</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {['true','false'].map(v => (
              <button key={v} type="button" onClick={() => set('allowCE', v)} style={{
                flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${form.allowCE === v ? 'var(--green)' : 'var(--border)'}`,
                background: form.allowCE === v ? 'var(--green-dim)' : 'var(--bg-secondary)',
                color: form.allowCE === v ? 'var(--green)' : 'var(--text-secondary)'
              }}>{v === 'true' ? '✓ Yes' : '✗ No'}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <label>Allow PE Trades</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {['true','false'].map(v => (
              <button key={v} type="button" onClick={() => set('allowPE', v)} style={{
                flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${form.allowPE === v ? 'var(--red)' : 'var(--border)'}`,
                background: form.allowPE === v ? 'var(--red-dim)' : 'var(--bg-secondary)',
                color: form.allowPE === v ? 'var(--red)' : 'var(--text-secondary)'
              }}>{v === 'true' ? '✓ Yes' : '✗ No'}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ORB Levels table ───────────────────────────────────────────────
function ORBLevelsTable({ levels }) {
  const [open, setOpen] = useState(false);
  if (!levels || !Object.keys(levels).length) return null;
  const rows = Object.entries(levels).sort((a,b) => b[0].localeCompare(a[0]));
  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontWeight: 600, fontSize: 14, width: '100%', padding: 0 }}>
        📏 Daily ORB Levels ({rows.length} days)
        {open ? <ChevronUp size={16} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />}
      </button>
      {open && (
        <div style={{ marginTop: 14, overflowX: 'auto', maxHeight: 280, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)' }}>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Date','ORB High','ORB Low','Range (pts)'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textAlign: 'left', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([date, lvl]) => (
                <tr key={date} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{toISTDate(date + 'T03:45:00Z')}</td>
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

// ── Main page ──────────────────────────────────────────────────────
export default function Backtest() {
  const { api } = useTrading();
  const [form, setForm] = useState({
    underlying: 'NIFTY 50',
    strategy: 'EMA_CROSSOVER',
    timeframe: '5',
    fromDate: '', toDate: '',
    emaShort: 9, emaLong: 15, emaAngleThreshold: 30,
    lots: 1,
    allowCE: 'true', allowPE: 'true'
  });
  const [loading, setLoading]   = useState(false);
  const [loadingPreset, setLP]  = useState('');
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');

  // Get lot size based on underlying (same for both strategies)
  const getLotSize = () => {
    return form.underlying === 'NIFTY 50' ? 65 : 30;
  };

  const set = (k, v) => {
    if (k === 'underlying') {
      // Reset lots when underlying changes
      setForm(f => ({ ...f, [k]: v, lots: 1 }));
    } else {
      setForm(f => ({ ...f, [k]: v }));
    }
  };

  // Build query string from current non-date params
  const presetQuery = () => {
    const q = new URLSearchParams({
      underlying: form.underlying, strategy: form.strategy, timeframe: form.timeframe,
      emaShort: form.emaShort, emaLong: form.emaLong, emaAngleThreshold: form.emaAngleThreshold,
      lots: form.lots, lotSize: getLotSize(), allowCE: form.allowCE, allowPE: form.allowPE
    });
    return q.toString();
  };

  const run = async () => {
    setLoading(true); setError(''); setResult(null);
    const payload = { ...form, lotSize: getLotSize() };
    const res = await api('post', '/backtest/run', payload);
    setLoading(false);
    if (res.success) setResult(res); else setError(res.error || 'Backtest failed');
  };

  const runPreset = async (preset) => {
    setLP(preset); setError(''); setResult(null);
    const res = await api('get', `/backtest/${preset}?${presetQuery()}`);
    setLP('');
    if (res.success) setResult(res); else setError(res.error || `No data for ${preset}`);
  };

  const isLoading = loading || !!loadingPreset;

  // Build chart data
  const chartData = (result?.trades || []).map((t, i) => {
    const cumPnl = result.trades.slice(0, i + 1).reduce((s, x) => s + (x.pnl || 0), 0);
    return { name: toIST(t.entryTime, 'chart'), pnl: t.pnl, cumPnl };
  });

  const dailyData = Object.entries(result?.summary?.dailyPnl || {}).map(([date, d]) => {
    const istMs = new Date(date + 'T03:45:00Z').getTime() + 5.5*60*60*1000;
    const ist = new Date(istMs);
    const dd  = String(ist.getUTCDate()).padStart(2,'0');
    const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][ist.getUTCMonth()];
    return { date: `${dd} ${mon}`, pnl: d.pnl, trades: d.trades };
  }).sort((a,b) => a.date.localeCompare(b.date));

  // Calculate maximum capital required from trades (using backend-provided capitalRequired field)
  const maxCapitalRequired = result?.trades?.length ? 
    Math.max(...result.trades.map(t => t.capitalRequired || 0)) : 0;

  const PRESETS = [
    { key: 'today',     label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'lastweek',  label: 'Last Week' },
    { key: 'lastmonth', label: 'Last Month' },
  ];

  const STRATEGIES = [
    { key: 'EMA_CROSSOVER', label: 'EMA 9/15 Crossover', color: 'var(--accent)', icon: '📈' },
    { key: 'ORB_15MIN',     label: '15-Min ORB Breakout', color: 'var(--purple)', icon: '🔲' },
  ];

  const TIMEFRAMES = [
    { v:'1',l:'1 Min'},{v:'3',l:'3 Min'},{v:'5',l:'5 Min'},{v:'15',l:'15 Min'}
  ];

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Backtest</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Test trading strategies on historical Zerodha data</p>
      </div>

      {/* Config card */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>

        {/* Strategy selector */}
        <div style={{ marginBottom: 22 }}>
          <label style={{ marginBottom: 10, display: 'block' }}>Strategy</label>
          <div style={{ display: 'flex', gap: 12 }}>
            {STRATEGIES.map(s => (
              <button key={s.key} type="button" onClick={() => set('strategy', s.key)} style={{
                flex: 1, padding: '14px 16px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                border: `2px solid ${form.strategy === s.key ? s.color : 'var(--border)'}`,
                background: form.strategy === s.key ? `${s.color}18` : 'var(--bg-secondary)',
                color: form.strategy === s.key ? s.color : 'var(--text-secondary)',
                textAlign: 'left', transition: 'all 0.15s'
              }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                {s.label}
                {form.strategy === s.key && <div style={{ fontSize: 11, fontWeight: 400, marginTop: 3, opacity: 0.8 }}>Selected</div>}
              </button>
            ))}
          </div>
        </div>

        {/* Instrument */}
        <div style={{ marginBottom: 18 }}>
          <label>Instrument</label>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            {['NIFTY 50','NIFTY BANK'].map(u => (
              <button key={u} type="button" onClick={() => set('underlying', u)} style={{
                padding: '9px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: `2px solid ${form.underlying === u ? (u === 'NIFTY 50' ? 'var(--accent)' : 'var(--purple)') : 'var(--border)'}`,
                background: form.underlying === u ? (u === 'NIFTY 50' ? 'var(--accent-dim)' : 'rgba(168,85,247,0.12)') : 'var(--bg-secondary)',
                color: form.underlying === u ? (u === 'NIFTY 50' ? 'var(--accent)' : 'var(--purple)') : 'var(--text-secondary)',
              }}>{form.underlying === u ? '✓ ' : ''}{u}</button>
            ))}
          </div>
        </div>

        {/* Timeframe (hidden for ORB — always 15min) */}
        {form.strategy === 'EMA_CROSSOVER' && (
          <div style={{ marginBottom: 18 }}>
            <label>Candle Timeframe</label>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              {TIMEFRAMES.map(tf => (
                <button key={tf.v} type="button" onClick={() => set('timeframe', tf.v)} style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${form.timeframe === tf.v ? 'var(--accent)' : 'var(--border)'}`,
                  background: form.timeframe === tf.v ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                  color: form.timeframe === tf.v ? 'var(--accent)' : 'var(--text-secondary)',
                }}>{tf.l}</button>
              ))}
            </div>
          </div>
        )}
        {form.strategy === 'ORB_15MIN' && (
          <div style={{ marginBottom: 18, padding: '8px 14px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)' }}>
            ⏱ ORB always uses <strong style={{ color: 'var(--purple)' }}>15-minute candles</strong> (09:15 candle sets the range)
          </div>
        )}

        {/* Strategy-specific config */}
        <div style={{ marginBottom: 18 }}>
          {form.strategy === 'EMA_CROSSOVER'
            ? <EMAConfig form={form} set={set} />
            : <ORBConfig form={form} set={set} />
          }
        </div>

        {/* Lots - Locked based on underlying */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
          <div>
            <label>Lots</label>
            <input 
              type="number" 
              value={form.lots} 
              onChange={e => set('lots', e.target.value)} 
              min={1} 
            />
          </div>
          <div>
            <label>Lot Size (Auto-locked)</label>
            <input 
              type="number" 
              value={getLotSize()} 
              disabled 
              style={{ 
                background: 'var(--bg-secondary)', 
                cursor: 'not-allowed',
                opacity: 0.7
              }} 
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              {form.underlying === 'NIFTY 50' ? 'NIFTY = 65 lots' : 'BANKNIFTY = 30 lots'}
            </div>
          </div>
        </div>

        {/* Date range */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18, marginBottom: 18 }}>
          <label style={{ marginBottom: 10, display: 'block' }}>Date Range</label>

          {/* Quick presets */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {PRESETS.map(p => (
              <button key={p.key} type="button" onClick={() => runPreset(p.key)} disabled={isLoading} style={{
                padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer',
                border: '1px solid var(--border)',
                background: loadingPreset === p.key ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                color: loadingPreset === p.key ? 'var(--accent)' : 'var(--text-secondary)',
                opacity: isLoading && loadingPreset !== p.key ? 0.5 : 1,
                transition: 'all 0.15s'
              }}>
                {loadingPreset === p.key ? '⏳ ' : ''}{p.label}
              </button>
            ))}
            <div style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 4 }}>— or pick custom dates below</div>
          </div>

          {/* Custom date inputs */}
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

        <button className="btn-primary" onClick={run} disabled={isLoading || !form.fromDate || !form.toDate}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Play size={15} />{loading ? 'Running...' : 'Run Custom Backtest'}
        </button>

        {error && (
          <div style={{ marginTop: 14, color: 'var(--red)', fontSize: 13, background: 'var(--red-dim)', padding: '10px 14px', borderRadius: 8 }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="animate-fade-in">
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Results for</div>
            <span className="badge-accent">{result.strategyName || result.strategy}</span>
            <span className="badge-accent">{result.preset || 'Custom Range'}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>{form.underlying}</span>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 14 }}>
            <Stat label="Total PnL"    value={`₹${parseFloat(result.summary.totalPnl).toFixed(0)}`}
              color={parseFloat(result.summary.totalPnl) >= 0 ? 'var(--green)' : 'var(--red)'} />
            <Stat label="Total Trades" value={result.summary.totalTrades} />
            <Stat label="Win Rate"     value={`${result.summary.winRate}%`} color="var(--accent)"
              sub={`${result.summary.wins}W / ${result.summary.losses}L`} />
            <Stat label="Profit Factor" value={result.summary.profitFactor} color="var(--yellow)" />
            <Stat label="Max Capital Required" value={`₹${maxCapitalRequired.toFixed(0)}`} color="var(--orange)" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
            <Stat label="Avg Win"      value={`₹${result.summary.avgWin}`}      color="var(--green)" />
            <Stat label="Avg Loss"     value={`₹${result.summary.avgLoss}`}      color="var(--red)" />
            <Stat label="Max Drawdown" value={`₹${parseFloat(result.summary.maxDrawdown).toFixed(0)}`} color="var(--red)" />
            <Stat label="Wins / Losses" value={`${result.summary.wins} / ${result.summary.losses}`} />
          </div>

          {/* ORB Levels collapsible */}
          {result.orbLevels && <ORBLevelsTable levels={result.orbLevels} />}

          {/* Cumulative PnL chart */}
          <div className="card" style={{ padding: 20, marginBottom: 18 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Cumulative PnL Curve</h3>
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                  <Tooltip formatter={(v) => [`₹${v?.toFixed(0)}`, 'Cumulative PnL']}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="cumPnl" stroke="var(--accent)" strokeWidth={2} fill="url(#cg)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No trades found</div>}
          </div>

          {/* Daily PnL bars */}
          {dailyData.length > 0 && (
            <div className="card" style={{ padding: 20, marginBottom: 18 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Daily PnL</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={dailyData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                  <Tooltip formatter={(v, n) => [n === 'pnl' ? `₹${v?.toFixed(0)}` : v, n]}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <ReferenceLine y={0} stroke="var(--border)" />
                  <Bar dataKey="pnl" radius={[4,4,0,0]}>
                    {dailyData.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? 'var(--green)' : 'var(--red)'} fillOpacity={0.8} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Trade table */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
              All Trades ({result.trades.length})
            </h3>
            {result.trades.length === 0
              ? <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>No trades matched the strategy in this period</div>
              : (
                <div style={{ overflowX: 'auto', maxHeight: 460, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      {['#','Entry (IST)','Exit (IST)','Type','Strike',
        result.strategy === 'ORB_15MIN' ? 'ORB High' : 'EMA Signal',
        result.strategy === 'ORB_15MIN' ? 'ORB Low'  : 'SL Level',
        'Entry Opt','Exit Opt','Lots','Capital Req.','Price Source','PnL','Reason'].map(h => (
        <th key={h} style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
      ))}
    </tr>
  </thead>
  <tbody>
    {result.trades.map((t, i) => (
      <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}
        onMouseEnter={e => e.currentTarget.style.background='var(--bg-card-hover)'}
        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
        <td style={{ padding: '7px 10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{i+1}</td>
        <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap' }}>{toIST(t.entryTime)}</td>
        <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap' }}>{toIST(t.exitTime)}</td>
        <td style={{ padding: '7px 10px' }}><span className={t.type === 'CE' ? 'badge-green' : 'badge-red'}>{t.type}</span></td>
        <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>{t.strikePrice}</td>
        <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--green)' }}>
          {result.strategy === 'ORB_15MIN' ? `₹${t.orbHigh?.toFixed(0)}` : t.signal?.split('|')[0]?.trim()}
        </td>
        <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--red)' }}>
          {result.strategy === 'ORB_15MIN' ? `₹${t.orbLow?.toFixed(0)}` : `₹${t.stopLossPrice?.toFixed(0)}`}
        </td>
        <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>₹{t.entryPrice?.toFixed(1)}</td>
        <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>₹{t.exitPrice?.toFixed(1)}</td>
        <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{t.lots}</td>
        <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--orange)' }}>
          ₹{t.capitalRequired?.toFixed(0) || 0}
        </td>
        <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          <span className={t.priceSource === 'REAL' ? 'badge-green' : 'badge-yellow'}>
            {t.priceSource === 'REAL' ? 'REAL' : 'EST'}
          </span>
        </td>
        <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontWeight: 700, whiteSpace: 'nowrap',
          color: t.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>₹{t.pnl?.toFixed(0)}</td>
        <td style={{ padding: '7px 10px' }}>
          <span className={t.exitReason === 'TARGET' ? 'badge-green' : t.exitReason === 'STOP_LOSS' ? 'badge-red' : 'badge-yellow'}>
            {t.exitReason}
          </span>
        </td>
      </tr>
    ))}
  </tbody>
</table>
                </div>
              )
            }
          </div>
        </div>
      )}
    </div>
  );
}