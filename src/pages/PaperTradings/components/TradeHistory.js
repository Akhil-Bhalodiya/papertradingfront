import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function TradeHistory({ trades }) {
  if (trades.length === 0) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Trade History</h3>
        <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 40 }}>
          No closed trades yet
        </div>
      </div>
    );
  }
  
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl <= 0);
  
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600 }}>Trade History ({trades.length})</h3>
        <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
          <span>
            <span style={{ color: 'var(--green)' }}>Wins: {wins.length}</span>
          </span>
          <span>
            <span style={{ color: 'var(--red)' }}>Losses: {losses.length}</span>
          </span>
          <span style={{ 
            fontFamily: 'var(--font-mono)', 
            fontWeight: 700,
            color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)'
          }}>
            Total: {totalPnl >= 0 ? '+' : ''}₹{totalPnl.toFixed(0)}
          </span>
        </div>
      </div>
      
      <div style={{ overflowX: 'auto', maxHeight: 300, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 11, textAlign: 'left' }}>TIME</th>
              <th style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 11, textAlign: 'left' }}>SYMBOL</th>
              <th style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 11, textAlign: 'left' }}>TYPE</th>
              <th style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 11, textAlign: 'right' }}>ENTRY</th>
              <th style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 11, textAlign: 'right' }}>EXIT</th>
              <th style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 11, textAlign: 'right' }}>QTY</th>
              <th style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 11, textAlign: 'right' }}>P&L</th>
              <th style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 11, textAlign: 'left' }}>REASON</th>
            </tr>
          </thead>
          <tbody>
            {trades.slice().reverse().map(trade => (
              <tr key={trade.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(trade.exitTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td style={{ padding: '8px 10px', fontWeight: 600 }}>{trade.symbol}</td>
                <td style={{ padding: '8px 10px' }}>
                  <span className={trade.type === 'CE' ? 'badge-green' : 'badge-red'}>{trade.type}</span>
                </td>
                <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                  ₹{trade.entryPrice.toFixed(2)}
                </td>
                <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                  ₹{trade.exitPrice.toFixed(2)}
                </td>
                <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                  {trade.quantity}
                </td>
                <td style={{ 
                  padding: '8px 10px', 
                  fontFamily: 'var(--font-mono)', 
                  fontWeight: 700, 
                  textAlign: 'right',
                  color: trade.pnl >= 0 ? 'var(--green)' : 'var(--red)'
                }}>
                  {trade.pnl >= 0 ? '+' : ''}₹{trade.pnl.toFixed(0)}
                </td>
                <td style={{ padding: '8px 10px' }}>
                  <span className={
                    trade.exitReason === 'TARGET' ? 'badge-green' : 
                    trade.exitReason === 'STOP_LOSS' ? 'badge-red' : 
                    'badge-yellow'
                  }>
                    {trade.exitReason}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}