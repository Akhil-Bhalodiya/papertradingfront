import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Shield, Percent } from 'lucide-react';

export default function StrategyConfig({ onUpdate, currentStrategy }) {
  const [config, setConfig] = useState({
    strategy: 'EMA_CROSSOVER', // 'EMA_CROSSOVER' or 'ORB_15MIN'
    symbol: 'NIFTY 50',
    timeframe: '5',
    emaShort: 9,
    emaLong: 15,
    emaAngleThreshold: 30,
    lots: 1,
    lotSize: 50,
    // Risk Management
    stopLossType: 'CANDLE', // 'CANDLE' or 'PERCENTAGE'
    stopLossPercent: 1,
    targetMultiplier: 2, // 2:1 risk-reward
    // Trailing Stop
    enableTrailing: false,
    trailingTriggerPercent: 50, // Activate when profit reaches 50% of target
    trailingStepPercent: 25, // Move stop loss by 25% of profit
    // Position Sizing
    maxPositions: 1,
    positionSizeType: 'LOTS', // 'LOTS' or 'PERCENTAGE'
    positionSizePercent: 10 // 10% of portfolio per trade
  });
  
  useEffect(() => {
    if (currentStrategy) {
      setConfig(prev => ({ ...prev, ...currentStrategy }));
    }
  }, [currentStrategy]);
  
  const handleChange = (key, value) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onUpdate(newConfig);
  };
  
  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Target size={16} style={{ color: 'var(--accent)' }} />
        Strategy Configuration
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {/* Symbol Selection */}
        <div>
          <label>Instrument</label>
          <select 
            value={config.symbol} 
            onChange={e => handleChange('symbol', e.target.value)}
          >
            <option value="NIFTY 50">NIFTY 50</option>
            <option value="NIFTY BANK">NIFTY BANK</option>
          </select>
        </div>
        
        {/* Timeframe */}
        <div>
          <label>Timeframe</label>
          <select 
            value={config.timeframe} 
            onChange={e => handleChange('timeframe', e.target.value)}
          >
            <option value="1">1 Minute</option>
            <option value="3">3 Minutes</option>
            <option value="5">5 Minutes</option>
            <option value="15">15 Minutes</option>
          </select>
        </div>
        
        {/* Lots */}
        <div>
          <label>Lots</label>
          <input 
            type="number" 
            value={config.lots} 
            onChange={e => handleChange('lots', parseInt(e.target.value))}
            min={1}
            max={10}
          />
        </div>
        
        {/* EMA Short */}
        <div>
          <label>EMA Short</label>
          <input 
            type="number" 
            value={config.emaShort} 
            onChange={e => handleChange('emaShort', parseInt(e.target.value))}
            min={3}
            max={50}
          />
        </div>
        
        {/* EMA Long */}
        <div>
          <label>EMA Long</label>
          <input 
            type="number" 
            value={config.emaLong} 
            onChange={e => handleChange('emaLong', parseInt(e.target.value))}
            min={5}
            max={200}
          />
        </div>
        
        {/* EMA Angle Threshold */}
        <div>
          <label>EMA Angle Threshold (°)</label>
          <input 
            type="number" 
            value={config.emaAngleThreshold} 
            onChange={e => handleChange('emaAngleThreshold', parseFloat(e.target.value))}
            min={0}
            max={90}
            step={5}
          />
        </div>
      </div>
      
      {/* Risk Management Section */}
      <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Shield size={14} style={{ color: 'var(--yellow)' }} />
          Risk Management
        </h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {/* Stop Loss Type */}
          <div>
            <label>Stop Loss Type</label>
            <select 
              value={config.stopLossType} 
              onChange={e => handleChange('stopLossType', e.target.value)}
            >
              <option value="CANDLE">Previous Candle High/Low</option>
              <option value="PERCENTAGE">Fixed Percentage</option>
            </select>
          </div>
          
          {config.stopLossType === 'PERCENTAGE' && (
            <div>
              <label>Stop Loss %</label>
              <input 
                type="number" 
                value={config.stopLossPercent} 
                onChange={e => handleChange('stopLossPercent', parseFloat(e.target.value))}
                min={0.1}
                max={5}
                step={0.1}
              />
            </div>
          )}
          
          {/* Target Multiplier */}
          <div>
            <label>Target Multiplier (Risk:Reward)</label>
            <select 
              value={config.targetMultiplier} 
              onChange={e => handleChange('targetMultiplier', parseFloat(e.target.value))}
            >
              <option value={1}>1:1</option>
              <option value={1.5}>1:1.5</option>
              <option value={2}>1:2</option>
              <option value={2.5}>1:2.5</option>
              <option value={3}>1:3</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Trailing Stop Section */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <input 
            type="checkbox" 
            checked={config.enableTrailing} 
            onChange={e => handleChange('enableTrailing', e.target.checked)}
            style={{ width: 'auto' }}
          />
          <label style={{ margin: 0, cursor: 'pointer' }}>
            Enable Trailing Stop Loss
          </label>
        </div>
        
        {config.enableTrailing && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginLeft: 24 }}>
            <div>
              <label>Trigger at (% of target)</label>
              <input 
                type="number" 
                value={config.trailingTriggerPercent} 
                onChange={e => handleChange('trailingTriggerPercent', parseFloat(e.target.value))}
                min={10}
                max={100}
                step={10}
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Activate trailing when profit reaches this % of target
              </div>
            </div>
            
            <div>
              <label>Trailing Step (% of profit)</label>
              <input 
                type="number" 
                value={config.trailingStepPercent} 
                onChange={e => handleChange('trailingStepPercent', parseFloat(e.target.value))}
                min={10}
                max={50}
                step={5}
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Move stop loss by this % of additional profit
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Position Sizing */}
      <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Percent size={14} style={{ color: 'var(--purple)' }} />
          Position Sizing
        </h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <div>
            <label>Max Concurrent Positions</label>
            <input 
              type="number" 
              value={config.maxPositions} 
              onChange={e => handleChange('maxPositions', parseInt(e.target.value))}
              min={1}
              max={5}
            />
          </div>
        </div>
      </div>
    </div>
  );
}