import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { TradingProvider, useTrading } from './context/TradingContext';
import Dashboard from './pages/Dashboard';
import LiveTrading from './pages/LiveTrading';
import Backtest from './pages/Backtest';
import PaperTrading from './pages/PaperTradings';
import Settings from './pages/Settings';
import TokenGenerator from './pages/TokenGenerator';
import MarketWatch from './pages/MarketWatch';
import OptionsChain from './pages/OptionsChain';
import HistoricalData from './pages/HistoricalData';
import {
  LayoutDashboard, Activity, FlaskConical,  
  BookOpen, Settings2, Wifi, WifiOff, CircleDot, Key, TrendingUp, Database
} from 'lucide-react';

function Sidebar() {
  const { connected, wsConnected, engineStatus, credentials, zerodhaConnected } = useTrading();
    const isZerodhaConnected = zerodhaConnected || credentials?.connected;

  const nav = [
    { to: '/token', icon: Key, label: 'Token Generator' },
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/market', icon: TrendingUp, label: 'Market Watch' },
    { to: '/historical', icon: Database, label: 'Historical Data' },
    { to: '/live', icon: Activity, label: 'Live Trading' },
    { to: '/paper', icon: BookOpen, label: 'Paper Trade' },
    { to: '/backtest', icon: FlaskConical, label: 'Backtest' },
    { to: '/settings', icon: Settings2, label: 'Settings' },
  ];
  return (
    <aside style={{ width: 220, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 100 }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, var(--accent), #0077aa)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.2 }}>AlgoTrader</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>EMA 9/15</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 12px' }}>
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8,
            color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
            background: isActive ? 'var(--accent-dim)' : 'transparent',
            textDecoration: 'none', fontSize: 14, fontWeight: 500, marginBottom: 2,
            transition: 'all 0.15s', border: isActive ? '1px solid rgba(0,212,255,0.2)' : '1px solid transparent'
          })}>
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Status */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
           {isZerodhaConnected ? (
            <>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} className="pulse-green" />
              <span style={{ color: 'var(--green)' }}>Zerodha Connected</span>
            </>
          ) : (
            <>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)' }} />
              <span style={{ color: 'var(--text-muted)' }}>Zerodha Disconnected</span>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          {wsConnected
            ? <><Wifi size={12} style={{ color: 'var(--green)' }} /><span style={{ color: 'var(--green)' }}>Live Feed Active</span></>
            : <><WifiOff size={12} style={{ color: 'var(--text-muted)' }} /><span style={{ color: 'var(--text-muted)' }}>Feed Inactive</span></>
          }
        </div>
        {engineStatus.running && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <CircleDot size={12} style={{ color: engineStatus.mode === 'paper' ? 'var(--yellow)' : 'var(--green)' }} className={engineStatus.mode === 'paper' ? '' : 'pulse-green'} />
            <span style={{ color: engineStatus.mode === 'paper' ? 'var(--yellow)' : 'var(--green)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', fontSize: 11 }}>
              {engineStatus.mode} running
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}

function Layout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, minHeight: '100vh', background: 'var(--bg-primary)' }}>
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <TradingProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontFamily: 'var(--font-sans)' }
        }} />
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/market" element={<MarketWatch />} />
            <Route path="/options/:symbol" element={<OptionsChain />} />
            <Route path="/historical" element={<HistoricalData />} />
            <Route path="/live" element={<LiveTrading />} />
            <Route path="/paper" element={<PaperTrading />} />
            <Route path="/backtest" element={<Backtest />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/token" element={<TokenGenerator />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TradingProvider>
  );
}