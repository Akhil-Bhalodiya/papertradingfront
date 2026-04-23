import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrading } from '../context/TradingContext';
import { ArrowLeft, TrendingUp, TrendingDown, RefreshCw, Download, Database, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OptionsChain() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const { socket, api, credentials } = useTrading();
  const [expiries, setExpiries] = useState([]);
  const [selectedExpiry, setSelectedExpiry] = useState('');
  const [optionChain, setOptionChain] = useState([]);
  const [spotPrice, setSpotPrice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [storing, setStoring] = useState(false);
  const [storeProgress, setStoreProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (symbol) {
      fetchExpiries();
      fetchSpotPrice();
    }
  }, [symbol]);

  useEffect(() => {
    if (selectedExpiry) {
      fetchOptionChain();
    }
  }, [selectedExpiry]);

  const fetchExpiries = async () => {
    try {
      const res = await api('get', `/marketdata/expiries/${symbol}`);
      if (res.success && res.expiries.length > 0) {
        setExpiries(res.expiries);
        setSelectedExpiry(res.expiries[0]);
      }
    } catch (error) {
      console.error('Error fetching expiries:', error);
    }
  };

  const fetchSpotPrice = async () => {
    try {
      const res = await api('get', `/marketdata/spot/${symbol}`);
      if (res.success) {
        setSpotPrice(res.price);
      }
    } catch (error) {
      console.error('Error fetching spot price:', error);
    }
  };

  const fetchOptionChain = async () => {
    setLoading(true);
    try {
      const res = await api('get', `/marketdata/option-chain/${symbol}?expiry=${selectedExpiry}`);
      if (res.success) {
        setOptionChain(res.chain);
      }
    } catch (error) {
      console.error('Error fetching option chain:', error);
      toast.error('Failed to fetch option chain');
    } finally {
      setLoading(false);
    }
  };

  const storeOptionData = async () => {
    if (!credentials?.connected) {
      toast.error('Please connect to Zerodha first');
      return;
    }

    const totalOptions = optionChain.reduce((count, row) => {
      if (row.CE) count++;
      if (row.PE) count++;
      return count;
    }, 0);

    setStoring(true);
    setStoreProgress({ current: 0, total: totalOptions });
    
    toast.loading(`Storing data for ${totalOptions} options...`, { id: 'store-options' });
    
    try {
      let stored = 0;
      let failed = 0;
      
      for (const row of optionChain) {
        if (row.CE) {
          try {
            await api('post', `/marketdata/store-option-data/${row.CE.instrument_token}`, { timeframe: '5minute' });
            stored++;
          } catch (e) {
            failed++;
          }
          setStoreProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }
        if (row.PE) {
          try {
            await api('post', `/marketdata/store-option-data/${row.PE.instrument_token}`, { timeframe: '5minute' });
            stored++;
          } catch (e) {
            failed++;
          }
          setStoreProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }
      }
      
      if (stored > 0) {
        toast.success(`✅ Stored data for ${stored} options! ${failed > 0 ? `(${failed} failed)` : ''}`, { id: 'store-options' });
      } else {
        toast.error('Failed to store option data', { id: 'store-options' });
      }
    } catch (error) {
      console.error('Error storing option data:', error);
      toast.error('Error storing option data', { id: 'store-options' });
    } finally {
      setStoring(false);
      setStoreProgress({ current: 0, total: 0 });
    }
  };

  const storeAllExpiries = async () => {
    if (!credentials?.connected) {
      toast.error('Please connect to Zerodha first');
      return;
    }

    toast.loading(`Storing data for all expiries...`, { id: 'store-all' });
    
    try {
      let totalStored = 0;
      
      for (const expiry of expiries) {
        const res = await api('get', `/marketdata/option-chain/${symbol}?expiry=${expiry}`);
        if (res.success) {
          for (const row of res.chain) {
            if (row.CE) {
              await api('post', `/marketdata/store-option-data/${row.CE.instrument_token}`, { timeframe: '5minute' });
              totalStored++;
            }
            if (row.PE) {
              await api('post', `/marketdata/store-option-data/${row.PE.instrument_token}`, { timeframe: '5minute' });
              totalStored++;
            }
          }
        }
      }
      
      toast.success(`✅ Stored data for ${totalStored} options across ${expiries.length} expiries!`, { id: 'store-all' });
    } catch (error) {
      toast.error('Error storing all expiries', { id: 'store-all' });
    }
  };

  const exportToCSV = () => {
    const rows = [];
    rows.push(['Strike', 'CE LTP', 'CE OI', 'CE Volume', 'CE IV', 'PE LTP', 'PE OI', 'PE Volume', 'PE IV'].join(','));
    
    optionChain.forEach(row => {
      rows.push([
        row.strike,
        row.CE?.last_price || '',
        row.CE?.open_interest || '',
        row.CE?.volume || '',
        row.CE?.implied_volatility || '',
        row.PE?.last_price || '',
        row.PE?.open_interest || '',
        row.PE?.volume || '',
        row.PE?.implied_volatility || ''
      ].join(','));
    });
    
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${symbol}_${selectedExpiry}_options.csv`;
    a.click();
    
    toast.success('CSV exported!');
  };

  const getATMStrike = () => {
    if (!spotPrice || !optionChain.length) return null;
    return optionChain.reduce((prev, curr) => 
      Math.abs(curr.strike - spotPrice) < Math.abs(prev.strike - spotPrice) ? curr : prev
    );
  };

  const atmStrike = getATMStrike();

  return (
    <div style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button className="btn-ghost" onClick={() => navigate(-1)} style={{ padding: '8px 12px' }}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{symbol} Options Chain</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Spot: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>₹{spotPrice?.toFixed(2) || '—'}</span>
          </p>
        </div>
        
        {/* Sync Status Indicator */}
        {!credentials?.connected && (
          <div style={{ 
            padding: '8px 16px', 
            background: 'var(--yellow-dim)', 
            border: '1px solid var(--yellow)', 
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: 'var(--yellow)'
          }}>
            <AlertCircle size={16} />
            Connect to Zerodha to sync real data
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ marginBottom: 0 }}>Expiry:</label>
          <select value={selectedExpiry} onChange={e => setSelectedExpiry(e.target.value)} style={{ width: 'auto', minWidth: 150 }}>
            {expiries.map(exp => (
              <option key={exp} value={exp}>{exp}</option>
            ))}
          </select>
        </div>
        
        <button className="btn-ghost" onClick={fetchOptionChain} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
        
        <button className="btn-ghost" onClick={exportToCSV} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Download size={14} /> Export CSV
        </button>
        
        <button 
          className="btn-primary" 
          onClick={storeOptionData} 
          disabled={storing || !credentials?.connected}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          title={!credentials?.connected ? 'Connect to Zerodha first' : 'Store current expiry data'}
        >
          <Save size={14} /> {storing ? `Storing (${storeProgress.current}/${storeProgress.total})...` : 'Store Current Expiry'}
        </button>
        
        <button 
          className="btn-primary" 
          onClick={storeAllExpiries} 
          disabled={storing || !credentials?.connected || expiries.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, var(--purple), #7c3aed)' }}
          title={!credentials?.connected ? 'Connect to Zerodha first' : 'Store all expiries data'}
        >
          <Database size={14} /> Store All Expiries
        </button>
      </div>

      {/* Option Chain Table */}
      <div className="card" style={{ padding: 20 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 60 }}>
            <RefreshCw size={24} className="spin" style={{ color: 'var(--accent)' }} />
            <span style={{ marginLeft: 12, color: 'var(--text-muted)' }}>Loading option chain...</span>
          </div>
        ) : optionChain.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 60 }}>
            {credentials?.connected ? 'No option chain data available. Click Refresh to try again.' : 'Connect to Zerodha to view option chain data.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: 600, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                <tr>
                  <th colSpan="5" style={{ padding: '10px', textAlign: 'center', background: 'var(--green-dim)', color: 'var(--green)', borderBottom: '2px solid var(--green)' }}>CALLS (CE)</th>
                  <th style={{ padding: '10px', textAlign: 'center', background: 'var(--bg-secondary)' }}>STRIKE</th>
                  <th colSpan="5" style={{ padding: '10px', textAlign: 'center', background: 'var(--red-dim)', color: 'var(--red)', borderBottom: '2px solid var(--red)' }}>PUTS (PE)</th>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '8px 8px', color: 'var(--text-muted)', fontSize: 11, textAlign: 'right' }}>LTP</th>
                  <th style={{ padding: '8px 8px', color: 'var(--text-muted)', fontSize: 11, textAlign: 'right' }}>OI</th>
                  <th style={{ padding: '8px 8px', color: 'var(--text-muted)', fontSize: 11, textAlign: 'right' }}>Volume</th>
                  <th style={{ padding: '8px 8px', color: 'var(--text-muted)', fontSize: 11, textAlign: 'right' }}>IV</th>
                  <th style={{ padding: '8px 8px', color: 'var(--text-muted)', fontSize: 11, textAlign: 'right' }}>Δ</th>
                  <th style={{ padding: '8px 8px', color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', fontWeight: 700 }}>Strike</th>
                  <th style={{ padding: '8px 8px', color: 'var(--text-muted)', fontSize: 11, textAlign: 'left' }}>LTP</th>
                  <th style={{ padding: '8px 8px', color: 'var(--text-muted)', fontSize: 11, textAlign: 'left' }}>OI</th>
                  <th style={{ padding: '8px 8px', color: 'var(--text-muted)', fontSize: 11, textAlign: 'left' }}>Volume</th>
                  <th style={{ padding: '8px 8px', color: 'var(--text-muted)', fontSize: 11, textAlign: 'left' }}>IV</th>
                  <th style={{ padding: '8px 8px', color: 'var(--text-muted)', fontSize: 11, textAlign: 'left' }}>Δ</th>
                </tr>
              </thead>
              <tbody>
                {optionChain.map(row => {
                  const isATM = atmStrike?.strike === row.strike;
                  return (
                    <tr key={row.strike} style={{
                      borderBottom: '1px solid var(--border)',
                      background: isATM ? 'var(--accent-dim)' : 'transparent'
                    }}>
                      {/* CE Side */}
                      <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: row.CE ? 'var(--green)' : 'var(--text-muted)' }}>
                        {row.CE ? `₹${row.CE.last_price?.toFixed(2)}` : '—'}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {row.CE?.open_interest?.toLocaleString() || '—'}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {row.CE?.volume?.toLocaleString() || '—'}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {row.CE?.implied_volatility ? `${row.CE.implied_volatility.toFixed(1)}%` : '—'}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {row.CE?.delta?.toFixed(2) || '—'}
                      </td>
                      
                      {/* Strike */}
                      <td style={{
                        padding: '8px',
                        textAlign: 'center',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        fontSize: 14,
                        background: isATM ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                        color: isATM ? 'var(--accent)' : 'var(--text-primary)'
                      }}>
                        {row.strike}
                      </td>
                      
                      {/* PE Side */}
                      <td style={{ padding: '8px', textAlign: 'left', fontFamily: 'var(--font-mono)', color: row.PE ? 'var(--red)' : 'var(--text-muted)' }}>
                        {row.PE ? `₹${row.PE.last_price?.toFixed(2)}` : '—'}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'left', fontFamily: 'var(--font-mono)' }}>
                        {row.PE?.open_interest?.toLocaleString() || '—'}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'left', fontFamily: 'var(--font-mono)' }}>
                        {row.PE?.volume?.toLocaleString() || '—'}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'left', fontFamily: 'var(--font-mono)' }}>
                        {row.PE?.implied_volatility ? `${row.PE.implied_volatility.toFixed(1)}%` : '—'}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'left', fontFamily: 'var(--font-mono)' }}>
                        {row.PE?.delta?.toFixed(2) || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="card" style={{ padding: 16, marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
        <strong style={{ color: 'var(--text-secondary)' }}>📊 Data Storage:</strong> 
        Click "Store Current Expiry" to save this expiry's option data to MongoDB. 
        Click "Store All Expiries" to save data for all available expiries. 
        Data is also auto-saved daily at 3:30 PM IST if the application is running.
      </div>

      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}