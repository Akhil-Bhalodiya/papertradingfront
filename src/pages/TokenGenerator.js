import React, { useState, useEffect } from 'react';
import { useTrading } from '../context/TradingContext';
import { Key, ExternalLink, Copy, CheckCircle, AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';

export default function TokenGenerator() {
  const { credentials, api, connectZerodha } = useTrading();
  const [apiKey, setApiKey]       = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [requestToken, setRequestToken] = useState('');
  const [loginUrl, setLoginUrl]   = useState('');
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [copied, setCopied]       = useState('');
  const [step, setStep]           = useState(1);

  // Auto-fill apiKey if already saved
  useEffect(() => {
    if (credentials?.apiKey && credentials.apiKey !== '***') setApiKey(credentials.apiKey);
  }, [credentials]);

  const handleGetLoginUrl = async () => {
    if (!apiKey) return;
    // Save api key first so backend knows it
    await api('post', '/trading/connect', { apiKey, accessToken: 'placeholder' });
    const res = await api('get', '/token/login-url');
    if (res.success) {
      setLoginUrl(res.url);
      setStep(2);
    }
  };

  const handleGenerate = async () => {
    if (!requestToken || !apiSecret) return;
    setLoading(true);
    setResult(null);
    const res = await api('post', '/token/generate', { requestToken, apiSecret });
    setLoading(false);
    setResult(res);
    if (res.success) setStep(4);
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const stepStyle = (n) => ({
    display: 'flex', alignItems: 'flex-start', gap: 16, padding: '18px 20px',
    borderRadius: 12, marginBottom: 12,
    background: step === n ? 'rgba(0,212,255,0.06)' : step > n ? 'rgba(0,255,157,0.04)' : 'var(--bg-secondary)',
    border: `1px solid ${step === n ? 'rgba(0,212,255,0.3)' : step > n ? 'rgba(0,255,157,0.2)' : 'var(--border)'}`,
    opacity: step < n ? 0.5 : 1,
    transition: 'all 0.2s'
  });

  const stepNum = (n) => ({
    minWidth: 32, height: 32, borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700,
    background: step > n ? 'var(--green)' : step === n ? 'var(--accent)' : 'var(--border)',
    color: step > n || step === n ? '#000' : 'var(--text-muted)'
  });

  return (
    <div style={{ padding: 28, maxWidth: 700 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Daily Token Generator</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Zerodha access tokens expire every day at midnight IST. Run this each morning before market open (9:15 AM).
        </p>
      </div>

      {/* Why needed */}
      <div style={{ padding: '12px 16px', background: 'var(--accent-dim)', border: '1px solid rgba(0,212,255,0.25)', borderRadius: 10, marginBottom: 24, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--accent)' }}>You need this for:</strong> Historical data (backtest) and live market prices (paper trading).
        Paper trading with simulated prices works without any token — only real NSE data and backtest need it.
      </div>

      {/* Step 1 — Enter API key */}
      <div style={stepStyle(1)}>
        <div style={stepNum(1)}>{step > 1 ? '✓' : '1'}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: step === 1 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            Enter your API Key &amp; Secret
          </div>
          <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
            <div>
              <label>API Key</label>
              <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="your_api_key" type="text" />
            </div>
            <div>
              <label>API Secret</label>
              <input value={apiSecret} onChange={e => setApiSecret(e.target.value)} placeholder="your_api_secret" type="password" />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Find both at: <strong style={{ color: 'var(--accent)' }}>developers.kite.trade → My Apps → your app</strong>
              </div>
            </div>
          </div>
          {step === 1 && (
            <button className="btn-primary" onClick={handleGetLoginUrl} disabled={!apiKey || !apiSecret}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Continue <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Step 2 — Open login URL */}
      <div style={stepStyle(2)}>
        <div style={stepNum(2)}>{step > 2 ? '✓' : '2'}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: step === 2 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            Login to Zerodha
          </div>
          {loginUrl && (
            <>
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, wordBreak: 'break-all', color: 'var(--accent)', marginBottom: 12 }}>
                {loginUrl}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <a href={loginUrl} target="_blank" rel="noopener noreferrer" className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', fontSize: 13 }}
                  onClick={() => setStep(3)}>
                  <ExternalLink size={14} /> Open Login Page
                </a>
                <button className="btn-ghost" onClick={() => copy(loginUrl, 'url')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  {copied === 'url' ? <><CheckCircle size={13} /> Copied!</> : <><Copy size={13} /> Copy URL</>}
                </button>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                👆 Click the button above → Login with Zerodha ID + password + TOTP/OTP<br />
                After login you'll be redirected to a URL. <strong style={{ color: 'var(--yellow)' }}>Copy the <code>request_token</code> from that URL.</strong><br />
                Example: <code style={{ color: 'var(--text-secondary)', fontSize: 11 }}>https://yourapp.com/?request_token=<strong style={{ color: 'var(--green)' }}>AbCdEf123456789</strong>&status=success</code>
              </div>
              {step === 2 && (
                <button className="btn-ghost" style={{ marginTop: 12, fontSize: 13 }} onClick={() => setStep(3)}>
                  I've logged in → Next <ArrowRight size={13} style={{ display: 'inline' }} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Step 3 — Paste request_token */}
      <div style={stepStyle(3)}>
        <div style={stepNum(3)}>{step > 3 ? '✓' : '3'}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: step === 3 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            Paste the <code style={{ color: 'var(--accent)', fontSize: 13 }}>request_token</code> from the redirect URL
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>Request Token</label>
            <input
              value={requestToken}
              onChange={e => setRequestToken(e.target.value.trim())}
              placeholder="Paste the request_token here (e.g. AbCdEf123456789)"
              type="text"
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              It's the value after <code>?request_token=</code> and before <code>&status=success</code> in the redirect URL
            </div>
          </div>
          {step === 3 && (
            <button className="btn-primary" onClick={handleGenerate} disabled={loading || !requestToken}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {loading ? <><RefreshCw size={14} className="spin" /> Generating...</> : <>Generate Access Token <ArrowRight size={14} /></>}
            </button>
          )}
        </div>
      </div>

      {/* Step 4 — Result */}
      <div style={stepStyle(4)}>
        <div style={stepNum(4)}>{step >= 4 ? '✓' : '4'}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: step === 4 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            Access Token Generated &amp; Saved
          </div>

          {result?.success && (
            <div>
              <div style={{ padding: '12px 16px', background: 'var(--green-dim)', border: '1px solid rgba(0,255,157,0.3)', borderRadius: 8, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <CheckCircle size={16} style={{ color: 'var(--green)' }} />
                  <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                    ✅ Token generated and auto-saved! Zerodha is {result.connected ? 'connected' : 'ready'}.
                  </span>
                </div>
                {result.user_name && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Logged in as: <strong>{result.user_name}</strong> ({result.email})</div>}
                {result.login_time && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Login time: {result.login_time}</div>}
              </div>

              <div style={{ marginBottom: 12 }}>
                <label>Access Token (auto-saved to session)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    readOnly
                    value={result.access_token}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 11, flex: 1 }}
                  />
                  <button className="btn-ghost" onClick={() => copy(result.access_token, 'token')}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', fontSize: 12 }}>
                    {copied === 'token' ? <><CheckCircle size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                  </button>
                </div>
              </div>

              <div style={{ padding: '10px 14px', background: 'var(--yellow-dim)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 8, fontSize: 12, color: 'var(--yellow)', lineHeight: 1.6 }}>
                <AlertTriangle size={12} style={{ display: 'inline', marginRight: 6 }} />
                This token expires at midnight tonight IST. Run this page again tomorrow morning before trading.
              </div>

              <button className="btn-ghost" style={{ marginTop: 14, fontSize: 13 }} onClick={() => { setStep(1); setResult(null); setRequestToken(''); }}>
                <RefreshCw size={13} style={{ display: 'inline', marginRight: 6 }} />Generate another token (next day)
              </button>
            </div>
          )}

          {result && !result.success && (
            <div style={{ padding: '12px 14px', background: 'var(--red-dim)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 8, color: 'var(--red)', fontSize: 13 }}>
              ❌ Error: {result.error}<br />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
                Common issues: request_token already used (each token is single-use) — go back to step 2 and login again to get a fresh one.
              </span>
              <button className="btn-ghost" style={{ marginTop: 10, fontSize: 12 }} onClick={() => { setStep(2); setRequestToken(''); setResult(null); }}>
                ← Try again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* How to set redirect URL */}
      <div className="card" style={{ padding: 20, marginTop: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>⚙️ One-time Zerodha App Setup</h3>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <div style={{ marginBottom: 8 }}>In your Zerodha developer app settings, set the <strong style={{ color: 'var(--text-primary)' }}>Redirect URL</strong> to:</div>
          <div style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 6, fontSize: 12, color: 'var(--accent)', marginBottom: 12 }}>
            https://127.0.0.1
          </div>
          <div>After login, the browser will try to open <code>https://127.0.0.1/?request_token=XYZ&status=success</code> — it may show an error page but <strong style={{ color: 'var(--yellow)' }}>just copy the URL from your browser's address bar</strong> and paste the token above.</div>
        </div>
      </div>

      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}