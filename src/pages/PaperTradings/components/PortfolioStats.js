import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react';

export default function PortfolioStats({ portfolio, openPositions, isRunning }) {
  const {
    initialCapital = 100000,
    currentCapital = 100000,
    totalPnl = 0,
    totalPnlPercent = 0,
    totalTrades = 0,
    winningTrades = 0,
    losingTrades = 0,
    winRate = 0
  } = portfolio;
  
  const unrealizedPnl = openPositions.reduce((sum, pos) => sum + (pos.unrealizedPnl || 0), 0);
  const availableCapital = currentCapital - openPositions.reduce((sum, pos) => sum + (pos.margin || 0), 0);
  
  const formatCurrency = (val) => {
    if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    return `₹${val.toFixed(0)}`;
  };
  
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(4, 1fr)', 
      gap: 16,
      marginBottom: 20 
    }}>
      {/* Capital */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase' }}>
            Portfolio Value
          </span>
          <DollarSign size={16} style={{ color: 'var(--accent)' }} />
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, marginTop: 8 }}>
          {formatCurrency(currentCapital)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          Available: {formatCurrency(availableCapital)}
        </div>
      </div>
      
      {/* Total P&L */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase' }}>
            Total P&L
          </span>
          {totalPnl >= 0 ? (
            <TrendingUp size={16} style={{ color: 'var(--green)' }} />
          ) : (
            <TrendingDown size={16} style={{ color: 'var(--red)' }} />
          )}
        </div>
        <div style={{ 
          fontFamily: 'var(--font-mono)', 
          fontSize: 28, 
          fontWeight: 700, 
          marginTop: 8,
          color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)'
        }}>
          {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
        </div>
        <div style={{ 
          fontSize: 12, 
          color: totalPnlPercent >= 0 ? 'var(--green)' : 'var(--red)',
          marginTop: 4 
        }}>
          {totalPnlPercent >= 0 ? '+' : ''}{totalPnlPercent.toFixed(2)}%
          {unrealizedPnl !== 0 && (
            <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
              (Unrealized: {formatCurrency(unrealizedPnl)})
            </span>
          )}
        </div>
      </div>
      
      {/* Win Rate */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase' }}>
            Win Rate
          </span>
          <BarChart3 size={16} style={{ color: 'var(--yellow)' }} />
        </div>
        <div style={{ 
          fontFamily: 'var(--font-mono)', 
          fontSize: 28, 
          fontWeight: 700, 
          marginTop: 8,
          color: 'var(--yellow)'
        }}>
          {winRate.toFixed(1)}%
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          {winningTrades}W / {losingTrades}L ({totalTrades} total)
        </div>
      </div>
      
      {/* Open Positions */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase' }}>
            Open Positions
          </span>
          {isRunning && (
            <div style={{ 
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              background: 'var(--green)',
              animation: 'pulse 1.5s infinite'
            }} />
          )}
        </div>
        <div style={{ 
          fontFamily: 'var(--font-mono)', 
          fontSize: 28, 
          fontWeight: 700, 
          marginTop: 8,
          color: 'var(--accent)'
        }}>
          {openPositions.length}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          Max: {portfolio.maxPositions || 1}
        </div>
      </div>
    </div>
  );
}