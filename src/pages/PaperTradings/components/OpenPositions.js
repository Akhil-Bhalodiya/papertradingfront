import React from 'react';
import { TrendingUp, TrendingDown, X } from 'lucide-react';

export default function OpenPositions({ positions, currentPrice, isRunning }) {
  if (positions.length === 0) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Open Positions</h3>
        <div style={{ 
          color: 'var(--text-muted)', 
          fontSize: 13, 
          textAlign: 'center', 
          padding: 40 
        }}>
          {isRunning ? 'Waiting for trading signals...' : 'No open positions'}
        </div>
      </div>
    );
  }
  
  return (
    <div className="card" style={{ padding: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
        Open Positions ({positions.length})
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {positions.map(position => (
          <PositionCard 
            key={position.id} 
            position={position}
            currentPrice={currentPrice}
          />
        ))}
      </div>
    </div>
  );
}

function PositionCard({ position }) {
  const {
    type,
    symbol,
    entryPrice,
    currentPrice: livePrice,
    quantity,
    unrealizedPnl,
    unrealizedPnlPercent,
    stopLoss,
    target,
    trailingStop,
    entryTime
  } = position;
  
  const isProfit = unrealizedPnl >= 0;
  const progressToTarget = target ? ((livePrice - entryPrice) / (target - entryPrice)) * 100 : 0;
  
  return (
    <div style={{
      padding: 16,
      background: 'var(--bg-secondary)',
      borderRadius: 8,
      borderLeft: `3px solid ${type === 'CE' ? 'var(--green)' : 'var(--red)'}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 14, marginRight: 8 }}>{symbol}</span>
          <span className={type === 'CE' ? 'badge-green' : 'badge-red'}>{type}</span>
        </div>
        <div style={{ 
          fontFamily: 'var(--font-mono)', 
          fontWeight: 700,
          color: isProfit ? 'var(--green)' : 'var(--red)'
        }}>
          {isProfit ? '+' : ''}₹{unrealizedPnl.toFixed(0)} ({unrealizedPnlPercent.toFixed(2)}%)
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Entry: </span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>₹{entryPrice.toFixed(2)}</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Current: </span>
          <span style={{ fontFamily: 'var(--font-mono)', color: isProfit ? 'var(--green)' : 'var(--red)' }}>
            ₹{livePrice.toFixed(2)}
          </span>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Qty: </span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{quantity}</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>SL: </span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--red)' }}>
            ₹{stopLoss?.toFixed(2) || '—'}
          </span>
          {trailingStop && (
            <span style={{ marginLeft: 4, color: 'var(--yellow)' }}>→ ₹{trailingStop.toFixed(2)}</span>
          )}
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Target: </span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>
            ₹{target?.toFixed(2) || '—'}
          </span>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Time: </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            {new Date(entryTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
      
      {/* Progress bar to target */}
      {target && (
        <div style={{ marginTop: 8 }}>
          <div style={{ 
            height: 4, 
            background: 'var(--border)', 
            borderRadius: 2,
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${Math.min(Math.max(progressToTarget, 0), 100)}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--accent), var(--green))',
              transition: 'width 0.3s'
            }} />
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: 10, 
            color: 'var(--text-muted)',
            marginTop: 4
          }}>
            <span>Entry</span>
            <span>{progressToTarget.toFixed(0)}% to target</span>
            <span>Target</span>
          </div>
        </div>
      )}
    </div>
  );
}