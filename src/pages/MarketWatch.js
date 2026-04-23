import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrading } from '../context/TradingContext';
import { TrendingUp, TrendingDown, RefreshCw, Star, Eye, ChevronDown, Database,Download    } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MarketWatch() {
  const navigate = useNavigate();
  const { socket, api, credentials } = useTrading();
  const [segments, setSegments] = useState([]);
  const [selectedSegment, setSelectedSegment] = useState('indices');
  const [stocks, setStocks] = useState([]);
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState('');
  const [livePrices, setLivePrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('watchlist');
    return saved ? JSON.parse(saved) : [];
  });

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

  // Filter stocks based on dropdown selection
  useEffect(() => {
    if (selectedStock) {
      const filtered = stocks.filter(s => s.symbol === selectedStock);
      setFilteredStocks(filtered.length ? filtered : stocks);
    } else {
      setFilteredStocks(stocks);
    }
  }, [selectedStock, stocks]);

  // Subscribe to live prices via socket
  useEffect(() => {
    if (!socket) return;

    socket.on('live_prices', (prices) => {
      setLivePrices(prev => ({ ...prev, ...prices }));
    });

    return () => socket.off('live_prices');
  }, [socket]);

  // Save watchlist to localStorage
  useEffect(() => {
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  const fetchSegments = async () => {
    try {
      const res = await api('get', '/marketdata/segments');
      if (res.success) {
        setSegments(res.segments);
      }
    } catch (error) {
      console.error('Error fetching segments:', error);
    }
  };

  const fetchStocks = async (segmentId) => {
    setLoading(true);
    try {
      const res = await api('get', `/marketdata/stocks/${segmentId}`);
      console.log('Stocks response:', res);
      if (res.success && res.stocks) {
        setStocks(res.stocks);
        setSelectedStock('');
        // Request live prices for these stocks
        if (res.stocks.length > 0) {
          const tokens = res.stocks.map(s => ({ instrument_token: s.instrument_token }));
          socket?.emit('get_live_prices', tokens);
        }
      } else {
        console.error('No stocks in response:', res);
        setStocks([]);
      }
    } catch (error) {
      console.error('Error fetching stocks:', error);
      setStocks([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshPrices = () => {
    const tokens = stocks.map(s => ({ instrument_token: s.instrument_token }));
    socket?.emit('get_live_prices', tokens);
    toast.success('Refreshing prices...');
  };

  const syncInstruments = async () => {
    // if (!credentials?.connected) {
    //   toast.error('Please connect to Zerodha first');
    //   return;
    // }
    
    setSyncing(true);
    toast.loading('Syncing instruments from Zerodha...', { id: 'sync' });
    
    try {
      const res = await api('post', '/marketdata/sync-now');
      if (res.success) {
        toast.success(`✅ Synced ${res.stocksCount || ''} instruments!`, { id: 'sync' });
        // Refresh current segment stocks
        fetchStocks(selectedSegment);
      } else {
        toast.error(`Sync failed: ${res.error}`, { id: 'sync' });
      }
    } catch (error) {
      toast.error('Sync failed', { id: 'sync' });
    } finally {
      setSyncing(false);
    }
  };

  const toggleWatchlist = (stock) => {
    setWatchlist(prev => {
      const exists = prev.find(s => s.instrument_token === stock.instrument_token);
      if (exists) {
        toast.success(`Removed ${stock.symbol} from watchlist`);
        return prev.filter(s => s.instrument_token !== stock.instrument_token);
      } else {
        toast.success(`Added ${stock.symbol} to watchlist`);
        return [...prev, stock];
      }
    });
  };

  const isInWatchlist = (token) => {
    return watchlist.some(s => s.instrument_token === token);
  };

  const getPriceChange = (stock) => {
    const price = livePrices[`NSE:${stock.instrument_token}`]?.last_price || stock.last_price || 0;
    const change = stock.day_change || 0;
    const changePercent = stock.day_change_percent || 0;
    return { price, change, changePercent };
  };

  const handleViewOptions = (symbol) => {
    navigate(`/options/${symbol}`);
  };

  // Get unique symbols for dropdown
  const uniqueSymbols = [...new Set(stocks.map(s => s.symbol))].sort();

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Market Watch</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Live stock prices and market data</p>
        </div>
        
        {/* Sync Button */}
        <button 
          className="btn-primary" 
          onClick={syncInstruments}
          disabled={syncing || !credentials?.connected}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          title={!credentials?.connected ? 'Connect to Zerodha first' : 'Sync instruments from Zerodha'}
        >
          {syncing ? (
            <><RefreshCw size={16} className="spin" /> Syncing...</>
          ) : (
            <><Download  size={16} /> Sync Instruments</>
          )}
        </button>
      </div>

      {/* Segments Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {segments.map(seg => (
          <button
            key={seg.id}
            onClick={() => setSelectedSegment(seg.id)}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              border: `2px solid ${selectedSegment === seg.id ? 'var(--accent)' : 'var(--border)'}`,
              background: selectedSegment === seg.id ? 'var(--accent-dim)' : 'var(--bg-card)',
              color: selectedSegment === seg.id ? 'var(--accent)' : 'var(--text-secondary)',
              transition: 'all 0.15s'
            }}
          >
            {seg.name}
          </button>
        ))}
      </div>

      {/* Filter and Refresh Bar */}
      <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Filter by Symbol:</span>
          <div style={{ position: 'relative', minWidth: 200 }}>
            <select
              value={selectedStock}
              onChange={e => setSelectedStock(e.target.value)}
              style={{ 
                width: '100%', 
                paddingRight: 30,
                appearance: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">All Stocks ({stocks.length})</option>
              {uniqueSymbols.map(symbol => (
                <option key={symbol} value={symbol}>{symbol}</option>
              ))}
            </select>
            <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          </div>
        </div>
        <button className="btn-ghost" onClick={refreshPrices} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} /> Refresh Prices
        </button>
      </div>

      {/* Rest of the component remains the same... */}
      {/* Watchlist Section */}
      {watchlist.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Star size={16} style={{ color: 'var(--yellow)' }} />
            Watchlist ({watchlist.length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {watchlist.map(stock => {
              const { price, change, changePercent } = getPriceChange(stock);
              const isPositive = change >= 0;
              return (
                <div key={stock.instrument_token} className="card" style={{ padding: 12, cursor: 'pointer' }}
                  onClick={() => handleViewOptions(stock.symbol)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{stock.symbol}</span>
                    {isPositive ? <TrendingUp size={14} style={{ color: 'var(--green)' }} /> : <TrendingDown size={14} style={{ color: 'var(--red)' }} />}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700 }}>₹{price?.toFixed(2)}</span>
                    <span style={{ fontSize: 12, color: isPositive ? 'var(--green)' : 'var(--red)' }}>
                      {isPositive ? '+' : ''}{changePercent?.toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stocks Table */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>
            {selectedStock ? `${selectedStock} ` : 'All Stocks '} 
            ({filteredStocks.length} {filteredStocks.length === 1 ? 'stock' : 'stocks'})
          </h3>
          {loading && <RefreshCw size={14} className="spin" style={{ color: 'var(--text-muted)' }} />}
        </div>

        {filteredStocks.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 40 }}>
            {loading ? 'Loading...' : (credentials?.connected ? 'No stocks found. Click "Sync Instruments" to load data.' : 'Connect to Zerodha and sync instruments to see stocks.')}
          </div>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: 500, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textAlign: 'left' }}>SYMBOL</th>
                  <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textAlign: 'left' }}>NAME</th>
                  <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textAlign: 'right' }}>LTP</th>
                  <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textAlign: 'right' }}>CHANGE</th>
                  <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textAlign: 'right' }}>CHANGE %</th>
                  <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredStocks.map(stock => {
                  const { price, change, changePercent } = getPriceChange(stock);
                  const isPositive = change >= 0;
                  const inWatchlist = isInWatchlist(stock.instrument_token);
                  
                  return (
                    <tr key={stock.instrument_token} style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{stock.symbol}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: 12 }}>{stock.name}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontWeight: 600, textAlign: 'right' }}>₹{price?.toFixed(2) || '—'}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', textAlign: 'right', color: isPositive ? 'var(--green)' : 'var(--red)' }}>
                        {isPositive ? '+' : ''}{change?.toFixed(2) || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', textAlign: 'right', color: isPositive ? 'var(--green)' : 'var(--red)' }}>
                        {changePercent ? `${isPositive ? '+' : ''}${changePercent.toFixed(2)}%` : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            onClick={() => toggleWatchlist(stock)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: inWatchlist ? 'var(--yellow)' : 'var(--text-muted)',
                              padding: '4px 6px', borderRadius: 4
                            }}
                            title={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                          >
                            <Star size={14} fill={inWatchlist ? 'var(--yellow)' : 'none'} />
                          </button>
                          <button
                            onClick={() => handleViewOptions(stock.symbol)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: 'var(--accent)', padding: '4px 6px', borderRadius: 4
                            }}
                            title="View Options Chain"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}