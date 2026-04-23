import React, { useState, useEffect } from 'react';
import { useTrading } from '../context/TradingContext';
import { Calendar, Download, RefreshCw, BarChart3, ChevronDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function HistoricalData() {
  const { api } = useTrading();
  const [segments, setSegments] = useState([]);
  const [selectedSegment, setSelectedSegment] = useState('');
  const [stocks, setStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [timeframe, setTimeframe] = useState('5minute');
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  // Fetch segments on mount
  useEffect(() => {
    fetchSegments();
  }, []);

  // Fetch stocks when segment changes
  useEffect(() => {
    if (selectedSegment) {
      fetchStocks(selectedSegment);
    }
  }, [selectedSegment]);

  const fetchSegments = async () => {
    try {
      const res = await api('get', '/marketdata/segments');
      if (res.success) {
        setSegments(res.segments);
        if (res.segments.length > 0) {
          setSelectedSegment(res.segments[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching segments:', error);
    }
  };

  const fetchStocks = async (segmentId) => {
    try {
      const res = await api('get', `/marketdata/stocks/${segmentId}`);
      if (res.success) {
        setStocks(res.stocks);
      }
    } catch (error) {
      console.error('Error fetching stocks:', error);
    }
  };

  const fetchHistoricalData = async () => {
    if (!selectedStock) return;
    setLoading(true);
    try {
      const res = await api('get', `/marketdata/historical/${selectedStock.instrument_token}?from=${dateRange.from}&to=${dateRange.to}`);
      if (res.success) {
        setHistoricalData(res.data);
        calculateStats(res.data);
      }
    } catch (error) {
      console.error('Error fetching historical data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    if (!data.length) return;
    const prices = data.map(d => d.c);
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252);
    
    setStats({
      high: Math.max(...data.map(d => d.h)),
      low: Math.min(...data.map(d => d.l)),
      avgClose: prices.reduce((a, b) => a + b, 0) / prices.length,
      volatility: volatility * 100,
      totalVolume: data.reduce((a, b) => a + (b.v || 0), 0),
      dataPoints: data.length,
      startPrice: data[0]?.c,
      endPrice: data[data.length - 1]?.c,
      change: data[data.length - 1]?.c - data[0]?.c,
      changePercent: ((data[data.length - 1]?.c - data[0]?.c) / data[0]?.c) * 100
    });
  };

  const exportToCSV = () => {
    if (!historicalData.length) return;
    const rows = [['Date', 'Open', 'High', 'Low', 'Close', 'Volume'].join(',')];
    historicalData.forEach(d => {
      rows.push([new Date(d.t).toISOString(), d.o, d.h, d.l, d.c, d.v].join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedStock?.symbol}_${dateRange.from}_${dateRange.to}.csv`;
    a.click();
  };

  const chartData = historicalData.slice(-100).map(d => ({
    time: new Date(d.t).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    price: d.c,
    volume: d.v
  }));

  const isPositive = stats?.change >= 0;

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Historical Data</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>View and export historical price data for backtesting</p>
      </div>

      {/* Selection Card */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <label>Select Segment</label>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedSegment}
                onChange={e => {
                  setSelectedSegment(e.target.value);
                  setSelectedStock(null);
                }}
                style={{ width: '100%', paddingRight: 30, appearance: 'none', cursor: 'pointer' }}
              >
                <option value="">Select Segment</option>
                {segments.map(seg => (
                  <option key={seg.id} value={seg.id}>{seg.name}</option>
                ))}
              </select>
              <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            </div>
          </div>

          <div>
            <label>Select Stock</label>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedStock?.instrument_token || ''}
                onChange={e => {
                  const stock = stocks.find(s => s.instrument_token === parseInt(e.target.value));
                  setSelectedStock(stock);
                }}
                style={{ width: '100%', paddingRight: 30, appearance: 'none', cursor: 'pointer' }}
                disabled={!stocks.length}
              >
                <option value="">Select Stock ({stocks.length} available)</option>
                {stocks.map(stock => (
                  <option key={stock.instrument_token} value={stock.instrument_token}>
                    {stock.symbol} - {stock.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            </div>
          </div>
        </div>

        {selectedStock && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label>Timeframe</label>
                <div style={{ position: 'relative' }}>
                  <select 
                    value={timeframe} 
                    onChange={e => setTimeframe(e.target.value)}
                    style={{ width: '100%', paddingRight: 30, appearance: 'none', cursor: 'pointer' }}
                  >
                    <option value="minute">1 Minute</option>
                    <option value="3minute">3 Minutes</option>
                    <option value="5minute">5 Minutes</option>
                    <option value="15minute">15 Minutes</option>
                    <option value="60minute">1 Hour</option>
                    <option value="day">Daily</option>
                  </select>
                  <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                </div>
              </div>
              <div>
                <label>From Date</label>
                <input type="date" value={dateRange.from} onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))} />
              </div>
              <div>
                <label>To Date</label>
                <input type="date" value={dateRange.to} onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" onClick={fetchHistoricalData} disabled={loading}>
                {loading ? <RefreshCw size={16} className="spin" /> : <BarChart3 size={16} />}
                {loading ? 'Loading...' : 'Fetch Data'}
              </button>
              {historicalData.length > 0 && (
                <button className="btn-ghost" onClick={exportToCSV}>
                  <Download size={16} /> Export CSV
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Selected Stock Info */}
      {selectedStock && (
        <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Selected:</span>
            <span style={{ marginLeft: 8, fontWeight: 600 }}>{selectedStock.symbol}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Name:</span>
            <span style={{ marginLeft: 8 }}>{selectedStock.name}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Token:</span>
            <span style={{ marginLeft: 8, fontFamily: 'var(--font-mono)' }}>{selectedStock.instrument_token}</span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>PERIOD CHANGE</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: isPositive ? 'var(--green)' : 'var(--red)' }}>
              {isPositive ? '+' : ''}{stats.changePercent?.toFixed(2)}%
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: isPositive ? 'var(--green)' : 'var(--red)' }}>
              ₹{stats.change?.toFixed(2)}
            </div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>RANGE</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600 }}>₹{stats.low?.toFixed(2)} - ₹{stats.high?.toFixed(2)}</div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>VOLATILITY (ANN)</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--yellow)' }}>{stats.volatility?.toFixed(2)}%</div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>DATA POINTS</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700 }}>{stats.dataPoints}</div>
          </div>
        </div>
      )}

      {/* Chart */}
      {historicalData.length > 0 && (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
            {selectedStock?.symbol} - {timeframe} Chart
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(value) => [`₹${value?.toFixed(2)}`, 'Price']}
              />
              <Line type="monotone" dataKey="price" stroke={isPositive ? 'var(--green)' : 'var(--red)'} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}