import React, { useEffect, useState } from 'react';
import { useTrading } from '../context/TradingContext';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, Target, Zap, Award } from 'lucide-react';

function StatCard({ label, value, sub, color = 'accent', icon: Icon }) {
  const colors = { accent: 'var(--accent)', green: 'var(--green)', red: 'var(--red)', yellow: 'var(--yellow)', purple: 'var(--purple)' };
  const c = colors[color] || colors.accent;
  return (
    <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
        {Icon && <Icon size={16} style={{ color: c, opacity: 0.8 }} />}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, color: c }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}

function PnlChart({ data }) {
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="card" style={{ padding: '10px 14px', fontSize: 13 }}>
        <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
        <div style={{ color: d?.pnl >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-mono)' }}>
          Day PnL: ₹{d?.pnl?.toFixed(0)}
        </div>
        <div style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
          Cumulative: ₹{d?.cumPnl?.toFixed(0)}
        </div>
      </div>
    );
  };
  if (!data?.length) return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No trade data yet</div>;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="cumPnl" stroke="var(--accent)" strokeWidth={2} fill="url(#pnlGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function DailyBarChart({ data }) {
  if (!data?.length) return <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No data</div>;
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
        <Tooltip formatter={(v) => [`₹${v?.toFixed(0)}`, 'PnL']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.pnl >= 0 ? 'var(--green)' : 'var(--red)'} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function Dashboard() {
  const { stats, closedTrades, api } = useTrading();
  const [chartData, setChartData] = useState([]);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    api('get', `/dashboard/pnl-chart?period=${period}`).then(res => {
      if (res?.data) setChartData(res.data);
    });
  }, [period, closedTrades.length, api]);

  const allTrades = closedTrades;
  const wins = allTrades.filter(t => t.pnl > 0);
  const losses = allTrades.filter(t => t.pnl <= 0);
  const totalPnl = allTrades.reduce((s, t) => s + (t.pnl || 0), 0);
  const winRate = allTrades.length ? ((wins.length / allTrades.length) * 100).toFixed(1) : 0;
  const avgWin = wins.length ? (wins.reduce((s, t) => s + t.pnl, 0) / wins.length).toFixed(0) : 0;
  const avgLoss = losses.length ? (losses.reduce((s, t) => s + t.pnl, 0) / losses.length).toFixed(0) : 0;

  const pieData = [
    { name: 'Wins', value: wins.length || 1 },
    { name: 'Losses', value: losses.length || 0 }
  ];

  return (
    <div style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>EMA 9/15 Crossover Strategy Performance</p>
      </div>

      {/* Period tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['today','week','month','all'].map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{
            padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
            background: period === p ? 'var(--accent)' : 'var(--bg-card)',
            color: period === p ? '#000' : 'var(--text-secondary)', textTransform: 'capitalize'
          }}>{p}</button>
        ))}
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total PnL" value={`₹${totalPnl.toFixed(0)}`} sub="All time" color={totalPnl >= 0 ? 'green' : 'red'} icon={totalPnl >= 0 ? TrendingUp : TrendingDown} />
        <StatCard label="Today's PnL" value={`₹${stats.today.pnl.toFixed(0)}`} sub={`${stats.today.trades} trades`} color={stats.today.pnl >= 0 ? 'green' : 'red'} icon={Activity} />
        <StatCard label="Win Rate" value={`${winRate}%`} sub={`${wins.length}W / ${losses.length}L`} color="accent" icon={Target} />
        <StatCard label="Total Trades" value={allTrades.length} sub={`Avg win ₹${avgWin}`} color="yellow" icon={Zap} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <StatCard label="Avg Win" value={`₹${avgWin}`} color="green" icon={TrendingUp} />
        <StatCard label="Avg Loss" value={`₹${avgLoss}`} color="red" icon={TrendingDown} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Cumulative PnL</h3>
          </div>
          <PnlChart data={chartData} />
        </div>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Win / Loss Ratio</h3>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <PieChart width={160} height={160}>
              <Pie data={pieData} cx={75} cy={75} innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                <Cell fill="var(--green)" fillOpacity={0.85} />
                <Cell fill="var(--red)" fillOpacity={0.85} />
              </Pie>
            </PieChart>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: 12 }}>
            <span style={{ color: 'var(--green)' }}>● Wins {wins.length}</span>
            <span style={{ color: 'var(--red)' }}>● Losses {losses.length}</span>
          </div>
        </div>
      </div>

      {/* Daily bar chart */}
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Daily PnL</h3>
        <DailyBarChart data={chartData} />
      </div>

      {/* Recent trades */}
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Recent Trades</h3>
        {allTrades.length === 0
          ? <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No closed trades yet</div>
          : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Time','Symbol','Type','Entry','Exit','Lots','PnL','Reason'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allTrades.slice(0, 20).map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background='var(--bg-card-hover)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{t.entryTime?.slice(11,16)}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 600, fontSize: 12 }}>{t.symbol}</td>
                      <td style={{ padding: '8px 10px' }}><span className={t.type === 'CE' ? 'badge-green' : 'badge-red'}>{t.type}</span></td>
                      <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>₹{t.entryPrice?.toFixed(1)}</td>
                      <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>₹{t.exitPrice?.toFixed(1)}</td>
                      <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{t.lots}</td>
                      <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: t.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>₹{t.pnl?.toFixed(0)}</td>
                      <td style={{ padding: '8px 10px' }}><span className={t.exitReason === 'TARGET' ? 'badge-green' : t.exitReason === 'STOP_LOSS' ? 'badge-red' : 'badge-yellow'}>{t.exitReason}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </div>
  );
}
