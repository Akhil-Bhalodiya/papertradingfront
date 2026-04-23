import React from 'react';
import { Activity, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export default function SignalsLog({ signals }) {
  const getSignalIcon = (type) => {
    if (type.includes('CROSSOVER')) return <Activity size={14} style={{ color: 'var(--accent)' }} />;
    if (type.includes('TRADE_OPENED')) return <CheckCircle size={14} style={{ color: 'var(--green)' }} />;
    if (type.includes('TRADE_CLOSED')) return <XCircle size={14} style={{ color: 'var(--red)' }} />;
    if (type.includes('REJECTED')) return <AlertCircle size={14} style={{ color: 'var(--yellow)' }} />;
    return <Activity size={14} style={{ color: 'var(--text-muted)' }} />;
  };
  
  const getSignalColor = (type) => {
    if (type.includes('CROSSOVER')) return 'var(--accent)';
    if (type.includes('TRADE_OPENED')) return 'var(--green)';
    if (type.includes('TRADE_CLOSED')) return 'var(--red)';
    if (type.includes('REJECTED')) return 'var(--yellow)';
    return 'var(--text-muted)';
  };
  
  return (
    <div className="card" style={{ padding: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Activity size={16} style={{ color: 'var(--accent)' }} />
        Signal Feed
      </h3>
      
      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {signals.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>
            Waiting for signals...
          </div>
        ) : (
          signals.slice(0, 30).map((signal, i) => (
            <div key={i} style={{
              padding: '10px 12px',
              marginBottom: 6,
              background: 'var(--bg-secondary)',
              borderRadius: 6,
              borderLeft: `3px solid ${getSignalColor(signal.type)}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                {getSignalIcon(signal.type)}
                <span style={{ fontWeight: 600, fontSize: 12, color: getSignalColor(signal.type) }}>
                  {signal.type.replace(/_/g, ' ')}
                </span>
                <span style={{ 
                  marginLeft: 'auto', 
                  fontSize: 10, 
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {new Date(signal.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {signal.message}
              </div>
              {signal.details && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                  {Object.entries(signal.details).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}