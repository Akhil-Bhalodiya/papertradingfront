import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Wifi, WifiOff, TrendingUp, TrendingDown, Clock } from 'lucide-react';

export default function LiveChart({ data, symbol, isConnected, isRunning, onTimeframeChange }) {
  const canvasRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 450 });
  const [hoverInfo, setHoverInfo] = useState(null);
  const [mousePos, setMousePos] = useState(null);
  const containerRef = useRef(null);
  const [timeframe, setTimeframe] = useState('5'); // Default 5 min
  const [chartData, setChartData] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  
  // Calculate EMA values
  const calculateEMA = useCallback((prices, period) => {
    if (prices.length < period) return [];
    const k = 2 / (period + 1);
    const ema = [];
    let sum = 0;
    for (let i = 0; i < period; i++) sum += prices[i];
    ema[period - 1] = sum / period;
    for (let i = period; i < prices.length; i++) {
      ema[i] = prices[i] * k + ema[i - 1] * (1 - k);
    }
    return ema;
  }, []);
  
  // Process incoming data and build chart data
  useEffect(() => {
    if (!data?.candles || data.candles.length === 0) return;
    
    // Filter candles based on timeframe
    const candles = data.candles.slice(-100);
    const closes = candles.map(c => c.c);
    const ema9 = calculateEMA(closes, 9);
    const ema15 = calculateEMA(closes, 15);
    
    const processed = candles.map((c, i) => ({
      ...c,
      ema9: ema9[i] || null,
      ema15: ema15[i] || null,
      isUp: c.c >= c.o
    }));
    
    setChartData(processed);
    setLastUpdate(Date.now());
  }, [data, calculateEMA]);
  
  // Also update on tick for real-time current price
  useEffect(() => {
    if (data?.price) {
      setLastUpdate(Date.now());
    }
  }, [data?.price]);
  
  const currentPrice = data?.price || (chartData.length > 0 ? chartData[chartData.length - 1]?.c : null);
  const prevPrice = chartData.length > 1 ? chartData[chartData.length - 2]?.c : currentPrice;
  const priceChange = currentPrice && prevPrice ? currentPrice - prevPrice : 0;
  const priceChangePercent = prevPrice ? (priceChange / prevPrice) * 100 : 0;
  const isPriceUp = priceChange >= 0;
  
  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: Math.max(width - 40, 400), height: 450 });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);
  
  // Handle timeframe change
  const handleTimeframeChange = (newTimeframe) => {
    setTimeframe(newTimeframe);
    if (onTimeframeChange) {
      onTimeframeChange(newTimeframe);
    }
  };
  
  // Draw chart - re-runs when chartData, dimensions, or lastUpdate changes
  useEffect(() => {
    if (!canvasRef.current || chartData.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = dimensions;
    
    // Fix blurry canvas: account for device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Chart margins
    const margin = { top: 30, right: 80, bottom: 80, left: 70 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Calculate price range
    const allPrices = chartData.flatMap(d => [d.h, d.l, d.ema9, d.ema15].filter(v => v !== null && !isNaN(v)));
    if (currentPrice) allPrices.push(currentPrice);
    
    const minPrice = Math.min(...allPrices) * 0.999;
    const maxPrice = Math.max(...allPrices) * 1.001;
    const priceRange = maxPrice - minPrice;
    
    // Calculate volume range
    const volumes = chartData.map(d => d.v || 0);
    const maxVolume = Math.max(...volumes, 1) * 1.2;
    
    // Scale functions
    const getX = (index) => margin.left + (index / (chartData.length - 1)) * chartWidth;
    const getY = (price) => margin.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
    const getVolumeY = (volume) => margin.top + chartHeight - (volume / maxVolume) * (chartHeight * 0.25) + 40;
    
    // Draw background
    ctx.fillStyle = '#131c30';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = '#1e2d4a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const y = margin.top + (i / 5) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + chartWidth, y);
      ctx.stroke();
      
      const price = maxPrice - (i / 5) * priceRange;
      ctx.fillStyle = '#8899b8';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`₹${price.toFixed(0)}`, margin.left - 8, y + 4);
    }
    
    // Draw volume bars
    chartData.forEach((d, i) => {
      const x = getX(i);
      const barWidth = Math.max(chartWidth / chartData.length * 0.7, 1);
      const volumeY = getVolumeY(d.v || 0);
      const volumeHeight = margin.top + chartHeight + 40 - volumeY;
      
      ctx.fillStyle = d.isUp ? '#00ff9d33' : '#ff475733';
      ctx.fillRect(x - barWidth/2, volumeY, barWidth, Math.max(volumeHeight, 1));
    });
    
    // Draw EMA 9
    ctx.beginPath();
    let firstPoint = true;
    chartData.forEach((d, i) => {
      if (d.ema9 !== null && !isNaN(d.ema9)) {
        const x = getX(i);
        const y = getY(d.ema9);
        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw EMA 15
    ctx.beginPath();
    firstPoint = true;
    chartData.forEach((d, i) => {
      if (d.ema15 !== null && !isNaN(d.ema15)) {
        const x = getX(i);
        const y = getY(d.ema15);
        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw candlesticks
    chartData.forEach((d, i) => {
      const x = getX(i);
      const candleWidth = Math.max(chartWidth / chartData.length * 0.6, 2);
      
      const highY = getY(d.h);
      const lowY = getY(d.l);
      const openY = getY(d.o);
      const closeY = getY(d.c);
      
      // Wick
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.strokeStyle = d.isUp ? '#00ff9d' : '#ff4757';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Body
      ctx.fillStyle = d.isUp ? '#00ff9d' : '#ff4757';
      ctx.fillRect(
        x - candleWidth/2,
        Math.min(openY, closeY),
        candleWidth,
        Math.max(Math.abs(closeY - openY), 1)
      );
    });
    
    // Draw current price line
    if (currentPrice) {
      const currentY = getY(currentPrice);
      ctx.beginPath();
      ctx.moveTo(margin.left, currentY);
      ctx.lineTo(margin.left + chartWidth, currentY);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`₹${currentPrice.toFixed(2)}`, margin.left + chartWidth - 5, currentY - 5);
    }
    
    // Draw X-axis labels
    ctx.fillStyle = '#8899b8';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(chartData.length / 6));
    for (let i = 0; i < chartData.length; i += step) {
      const d = chartData[i];
      const x = getX(i);
      const time = new Date(d.t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      ctx.fillText(time, x, margin.top + chartHeight + 20);
    }
    
    // Draw hover tooltip
    if (hoverInfo && mousePos) {
      const { index, candle } = hoverInfo;
      const x = getX(index);
      
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + chartHeight);
      ctx.strokeStyle = '#8899b8';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      
      const tooltipX = Math.min(x + 10, width - 150);
      const tooltipY = margin.top + 10;
      
      ctx.fillStyle = '#131c30';
      ctx.strokeStyle = '#1e2d4a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(tooltipX, tooltipY, 140, 110, 6);
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = '#e2e8f5';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`O: ₹${candle.o.toFixed(2)}`, tooltipX + 10, tooltipY + 20);
      ctx.fillText(`H: ₹${candle.h.toFixed(2)}`, tooltipX + 10, tooltipY + 35);
      ctx.fillText(`L: ₹${candle.l.toFixed(2)}`, tooltipX + 10, tooltipY + 50);
      ctx.fillText(`C: ₹${candle.c.toFixed(2)}`, tooltipX + 10, tooltipY + 65);
      ctx.fillText(`V: ${(candle.v || 0).toLocaleString()}`, tooltipX + 10, tooltipY + 80);
      
      if (candle.ema9) {
        ctx.fillStyle = '#00d4ff';
        ctx.fillText(`EMA9: ₹${candle.ema9.toFixed(2)}`, tooltipX + 10, tooltipY + 95);
      }
    }
    
  }, [chartData, dimensions, currentPrice, hoverInfo, mousePos, lastUpdate]);
  
  const handleMouseMove = (e) => {
    if (!canvasRef.current || chartData.length === 0) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    // Use CSS coordinates directly (rect matches CSS size after our dpr fix)
    const mouseX = e.clientX - rect.left;
    
    const margin = { left: 70, right: 80 };
    const chartWidth = dimensions.width - margin.left - margin.right;
    
    if (mouseX < margin.left || mouseX > margin.left + chartWidth) {
      setHoverInfo(null);
      return;
    }
    
    const relativeX = mouseX - margin.left;
    const index = Math.round((relativeX / chartWidth) * (chartData.length - 1));
    
    if (index >= 0 && index < chartData.length) {
      setHoverInfo({ index, candle: chartData[index] });
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };
  
  const handleMouseLeave = () => {
    setHoverInfo(null);
    setMousePos(null);
  };
  
  // Add roundRect method
  useEffect(() => {
    if (!CanvasRenderingContext2D.prototype.roundRect) {
      CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.moveTo(x + r, y);
        this.lineTo(x + w - r, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r);
        this.lineTo(x + w, y + h - r);
        this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.lineTo(x + r, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r);
        this.lineTo(x, y + r);
        this.quadraticCurveTo(x, y, x + r, y);
        return this;
      };
    }
  }, []);
  
  const timeframes = [
    { value: '1', label: '1m' },
    { value: '3', label: '3m' },
    { value: '5', label: '5m' },
    { value: '15', label: '15m' }
  ];
  
  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{symbol}</h3>
          
          {/* Timeframe Selector */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-secondary)', borderRadius: 6, padding: 2 }}>
            {timeframes.map(tf => (
              <button
                key={tf.value}
                onClick={() => handleTimeframeChange(tf.value)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: timeframe === tf.value ? 'var(--accent)' : 'transparent',
                  color: timeframe === tf.value ? '#000' : 'var(--text-secondary)',
                  transition: 'all 0.15s'
                }}
              >
                {tf.label}
              </button>
            ))}
          </div>
          
          {currentPrice && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ 
                fontFamily: 'var(--font-mono)', 
                fontSize: 20, 
                fontWeight: 700,
                color: isPriceUp ? 'var(--green)' : 'var(--red)'
              }}>
                ₹{currentPrice.toFixed(2)}
              </span>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 4,
                background: isPriceUp ? 'var(--green-dim)' : 'var(--red-dim)',
              }}>
                {isPriceUp ? 
                  <TrendingUp size={12} style={{ color: 'var(--green)' }} /> : 
                  <TrendingDown size={12} style={{ color: 'var(--red)' }} />
                }
                <span style={{ 
                  fontSize: 11, 
                  fontFamily: 'var(--font-mono)',
                  color: isPriceUp ? 'var(--green)' : 'var(--red)'
                }}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ 
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              background: isConnected ? 'var(--green)' : 'var(--yellow)',
              boxShadow: isConnected ? '0 0 10px var(--green)' : 'none',
              animation: isConnected ? 'none' : 'pulse 1.5s infinite'
            }} />
            {isConnected ? (
              <>
                <Wifi size={14} style={{ color: 'var(--green)' }} />
                <span style={{ fontSize: 12, color: 'var(--green)' }}>Live</span>
              </>
            ) : (
              <>
                <WifiOff size={14} style={{ color: 'var(--yellow)' }} />
                <span style={{ fontSize: 12, color: 'var(--yellow)' }}>Reconnecting...</span>
              </>
            )}
          </div>
          
          {isRunning && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                background: 'var(--green)',
                animation: 'pulse 1.5s infinite'
              }} />
              <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>
                Auto-Trading
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Chart */}
      <div ref={containerRef} style={{ position: 'relative' }}>
        {chartData.length > 0 ? (
          <canvas
            ref={canvasRef}
            style={{ display: 'block', cursor: 'crosshair' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
        ) : (
          <div style={{ 
            height: 450, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--text-muted)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: 40, 
                height: 40, 
                borderRadius: '50%', 
                border: '2px solid var(--border)',
                borderTopColor: 'var(--accent)',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 12px'
              }} />
              Loading {timeframe}m chart data...
            </div>
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: 30, 
        marginTop: 12,
        paddingTop: 12,
        borderTop: '1px solid var(--border)',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 3, background: '#00d4ff' }} />
          <span style={{ fontSize: 11, color: '#00d4ff' }}>EMA 9</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 3, background: '#ffd700' }} />
          <span style={{ fontSize: 11, color: '#ffd700' }}>EMA 15</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, background: '#00ff9d', borderRadius: 2 }} />
          <span style={{ fontSize: 11, color: 'var(--green)' }}>Bullish</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, background: '#ff4757', borderRadius: 2 }} />
          <span style={{ fontSize: 11, color: 'var(--red)' }}>Bearish</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={12} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeframe}m candles</span>
        </div>
      </div>
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}