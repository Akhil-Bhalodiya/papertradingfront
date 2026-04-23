import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { Play, Square, Wifi, TrendingUp, TrendingDown, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

function SignalFeed({ signals }) {
  const typeColors = {
    BULLISH_CROSSOVER: 'var(--green)', BEARISH_CROSSOVER: 'var(--red)',
    ANGLE_REJECTED: 'var(--yellow)', ORDER_FAILED: 'var(--red)'
  };
  return (
    <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {signals.length === 0
        ? <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>Waiting for signals...</div>
        : signals.map((s, i) => (
          <div key={i} className="card" style={{ padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'flex-start', borderLeft: `3px solid ${typeColors[s.type] || 'var(--border)'}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: typeColors[s.type] || 'var(--text-primary)' }}>{s.type?.replace(/_/g, ' ')}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{s.time?.slice(11, 19)}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {s.underlying && <span>{s.underlying} </span>}
                {s.spotPrice && <span>Spot: ₹{s.spotPrice?.toFixed(0)} </span>}
                {s.atmStrike && <span>Strike: {s.atmStrike} </span>}
                {s.angle !== undefined && <span>Angle: {s.angle?.toFixed(1)}°</span>}
              </div>
            </div>
          </div>
        ))
      }
    </div>
  );
}

function TradeCard({ trade, onClose, showClose }) {
  const pnlColor = trade.pnl >= 0 ? 'var(--green)' : 'var(--red)';
  return (
    <div className="card" style={{ padding: 16, borderLeft: `3px solid ${trade.type === 'CE' ? 'var(--green)' : 'var(--red)'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{trade.symbol}</div>
          <span className={trade.type === 'CE' ? 'badge-green' : 'badge-red'}>{trade.type === 'CE' ? '📈 CALL' : '📉 PUT'}</span>
        </div>
        {trade.pnl !== null && trade.pnl !== undefined && (
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, color: pnlColor }}>
            ₹{trade.pnl?.toFixed(0)}
          </div>
        )}
        {trade.status === 'open' && showClose && (
          <button className="btn-danger" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => onClose(trade.id)}>Close</button>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
        <div><span style={{ color: 'var(--text-muted)' }}>Entry: </span><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>₹{trade.entryPrice?.toFixed(1)}</span></div>
        <div><span style={{ color: 'var(--text-muted)' }}>SL: </span><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--red)' }}>₹{trade.stopLossPrice?.toFixed(1)}</span></div>
        <div><span style={{ color: 'var(--text-muted)' }}>Target: </span><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>₹{trade.targetPrice?.toFixed(1)}</span></div>
        <div><span style={{ color: 'var(--text-muted)' }}>Lots: </span><span style={{ fontFamily: 'var(--font-mono)' }}>{trade.lots}</span></div>
        <div><span style={{ color: 'var(--text-muted)' }}>Spot: </span><span style={{ fontFamily: 'var(--font-mono)' }}>₹{trade.spotPrice?.toFixed(0)}</span></div>
        <div><span style={{ color: 'var(--text-muted)' }}>Strike: </span><span style={{ fontFamily: 'var(--font-mono)' }}>{trade.strikePrice}</span></div>
      </div>
      {trade.signal && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Crossover: {trade.signal.crossover?.toUpperCase()} | Angle: {trade.signal.angle?.toFixed(1)}°
        </div>
      )}
    </div>
  );
}

export default function LiveTrading() {
  const { engineStatus, liveTrades, closedTrades, signals, ticks, credentials, startTrading, stopTrading, api } = useTrading();
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    await startTrading('live');
    setLoading(false);
  };

  const handleStop = async () => {
    setLoading(true);
    await stopTrading();
    setLoading(false);
  };

  const handleCloseTrade = async (id) => {
    await api('post', `/trading/close-trade/${id}`, { exitPrice: 0 });
  };

  const todayTrades = closedTrades.filter(t => {
    const today = new Date().toDateString();
    return new Date(t.exitTime).toDateString() === today;
  });
  const todayPnl = todayTrades.reduce((s, t) => s + (t.pnl || 0), 0);

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Live Trading</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Automated EMA 9/15 crossover execution on Zerodha</p>
      </div>

      {/* Control bar */}
      <div className="card" style={{ padding: 20, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {!engineStatus.running ? (
          <button className="btn-green" onClick={handleStart} disabled={loading || !credentials?.connected}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Play size={16} />{loading ? 'Starting...' : 'Start Live Trading'}
          </button>
        ) : (
          <button className="btn-danger" onClick={handleStop} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Square size={16} />{loading ? 'Stopping...' : 'Stop Trading'}
          </button>
        )}

        <div style={{ display: 'flex', gap: 16, marginLeft: 'auto', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>STATUS</div>
            <span className={engineStatus.running && engineStatus.mode === 'live' ? 'badge-green' : 'badge-yellow'}>
              {engineStatus.running && engineStatus.mode === 'live' ? '● ACTIVE' : '○ IDLE'}
            </span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>OPEN TRADES</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>{liveTrades.length}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>TODAY PnL</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: todayPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>₹{todayPnl.toFixed(0)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>TODAY TRADES</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{todayTrades.length}</div>
          </div>
        </div>
      </div>

      {!credentials?.connected && (
        <div className="card" style={{ padding: 16, marginBottom: 20, borderColor: 'rgba(255,71,87,0.4)', background: 'var(--red-dim)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={16} style={{ color: 'var(--red)' }} />
          <span style={{ color: 'var(--red)', fontSize: 14 }}>Not connected to Zerodha. Go to Settings to enter your API credentials.</span>
        </div>
      )}

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Open Trades */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Activity size={16} style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Open Positions ({liveTrades.length})</h3>
          </div>
          {liveTrades.length === 0
            ? <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 24 }}>No open trades</div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {liveTrades.map(t => <TradeCard key={t.id} trade={t} onClose={handleCloseTrade} showClose={true} />)}
              </div>
          }
        </div>

        {/* Signal Feed */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Wifi size={16} style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Live Signal Feed</h3>
          </div>
          <SignalFeed signals={signals} />
        </div>

        {/* Today's closed trades */}
        <div className="card" style={{ padding: 20, gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Clock size={16} style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Today's Closed Trades ({todayTrades.length})</h3>
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontWeight: 700, color: todayPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>₹{todayPnl.toFixed(0)}</span>
          </div>
          {todayTrades.length === 0
            ? <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>No closed trades today</div>
            : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Time','Symbol','Type','Entry','Exit','SL','Target','Lots','PnL','Reason'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textAlign: 'left', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {todayTrades.map(t => (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{t.entryTime?.slice(11,16)}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, fontSize: 12 }}>{t.symbol}</td>
                        <td style={{ padding: '8px 10px' }}><span className={t.type === 'CE' ? 'badge-green' : 'badge-red'}>{t.type}</span></td>
                        <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>₹{t.entryPrice?.toFixed(1)}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>₹{t.exitPrice?.toFixed(1)}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--red)' }}>₹{t.stopLossPrice?.toFixed(1)}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--green)' }}>₹{t.targetPrice?.toFixed(1)}</td>
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
    </div>
  );
}
