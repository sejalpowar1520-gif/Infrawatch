import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/client';

const DEMO_ACCOUNTS = [
  {
    label: 'Admin',
    name: 'Admin User',
    email: 'admin@infrawatch.gov.in',
    role: 'System-wide access',
  },
  {
    label: 'Inspector',
    name: 'Priya Menon',
    email: 'priya.menon@bbmp.gov.in',
    role: 'Koramangala + HSR Layout',
  },
  {
    label: 'Field',
    name: 'Suresh Kumar',
    email: 'suresh.kumar@bbmp.gov.in',
    role: 'Electronic City',
  },
];

export default function LoginPage({ onOpenCitizenReport }) {
  const { login } = useAuth();
  const [step, setStep] = useState('email'); // email | otp | password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const applyDemoAccount = (account) => {
    setEmail(account.email);
    setPassword('infrawatch123');
    setOtp('');
    setError('');
    setStep('password');
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.requestOtp(email);
      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.verifyOtp(email, otp);
      login(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      login(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', backgroundImage: 'radial-gradient(circle, #1E2533 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      <div style={{ width: 440, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'Space Mono', fontSize: 28, fontWeight: 700, color: 'var(--am)', letterSpacing: '.08em', marginBottom: 4 }}>INFRAWATCH</div>
          <div style={{ fontFamily: 'Space Mono', fontSize: 10, color: 'var(--mt)', letterSpacing: '.1em', textTransform: 'uppercase' }}>Urban Safety Crisis Response Platform</div>
          <div style={{ width: 60, height: 2, background: 'var(--am)', margin: '16px auto 0' }} />
        </div>

        <div className="card" style={{ padding: 28 }}>
          <div className="slb" style={{ marginBottom: 16, color: 'var(--am)' }}>
            {step === 'email' ? 'OFFICER LOGIN' : step === 'otp' ? 'VERIFY OTP' : 'PASSWORD LOGIN'}
          </div>

          <div style={{ marginBottom: 18, padding: '12px 14px', background: 'var(--ev)', borderRadius: 4, border: '1px solid var(--bd)' }}>
            <div style={{ fontSize: 10, color: 'var(--mt)', marginBottom: 8, fontFamily: 'Space Mono', letterSpacing: '.08em' }}>DEMO QUICK START</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  className="btn bs"
                  onClick={() => applyDemoAccount(account)}
                  style={{ width: '100%', justifyContent: 'space-between', paddingInline: 12 }}
                >
                  <span>{account.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--mt)' }}>{account.role}</span>
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--mt)', marginTop: 10 }}>
              Password for all seeded demo accounts: <span style={{ fontFamily: 'Space Mono', color: 'var(--am)' }}>infrawatch123</span>
            </div>
          </div>

          {step === 'email' && (
            <form onSubmit={handleRequestOtp}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: 'var(--mt)', display: 'block', marginBottom: 5 }}>Government Email</label>
                <input
                  type="email"
                  placeholder="officer@bbmp.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {error && <div style={{ color: 'var(--rd)', fontSize: 12, marginBottom: 10 }}>{error}</div>}
              <button className="btn bp" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}>
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
              <button type="button" className="btn bs" onClick={() => setStep('password')} style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>
                Use Password Instead
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp}>
              <div style={{ fontSize: 12, color: 'var(--sc)', marginBottom: 14, padding: '8px 12px', background: 'var(--ev)', borderRadius: 4, border: '1px solid var(--bd)' }}>
                OTP sent to <span style={{ fontFamily: 'Space Mono', color: 'var(--am)' }}>{email}</span>
                <br />
                <span style={{ fontSize: 10, color: 'var(--mt)' }}>Check server console in dev mode</span>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: 'var(--mt)', display: 'block', marginBottom: 5 }}>6-Digit OTP</label>
                <input
                  type="text"
                  placeholder="123456"
                  value={otp}
                  maxLength={6}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                  style={{ fontFamily: 'Space Mono', fontSize: 20, textAlign: 'center', letterSpacing: '0.3em' }}
                />
              </div>
              {error && <div style={{ color: 'var(--rd)', fontSize: 12, marginBottom: 10 }}>{error}</div>}
              <button className="btn bp" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}>
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>
              <button
                type="button"
                className="btn bs"
                onClick={() => {
                  setStep('email');
                  setOtp('');
                  setError('');
                }}
                style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
              >
                Back
              </button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handlePasswordLogin}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: 'var(--mt)', display: 'block', marginBottom: 5 }}>Email</label>
                <input
                  type="email"
                  placeholder="officer@bbmp.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: 'var(--mt)', display: 'block', marginBottom: 5 }}>Password</label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <div style={{ color: 'var(--rd)', fontSize: 12, marginBottom: 10 }}>{error}</div>}
              <button className="btn bp" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <button
                type="button"
                className="btn bs"
                onClick={() => {
                  setStep('email');
                  setPassword('');
                  setError('');
                }}
                style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
              >
                Use OTP Instead
              </button>
            </form>
          )}
        </div>

        {onOpenCitizenReport && (
          <div style={{
            marginTop: 18,
            padding: '14px 16px',
            background: 'rgba(52,199,89,0.06)',
            border: '1px solid rgba(52,199,89,0.3)',
            borderLeft: '3px solid #34C759',
            borderRadius: 6,
          }}>
            <div style={{ fontSize: 11, color: '#34C759', fontWeight: 600, marginBottom: 4, letterSpacing: '0.05em' }}>
              🏙️ NOT A BBMP OFFICER?
            </div>
            <div style={{ fontSize: 12, color: 'var(--sc)', lineHeight: 1.5, marginBottom: 10 }}>
              Citizens of Bengaluru can report illegal construction directly — no login required. Your report reaches BBMP enforcement within 24 hours.
            </div>
            <button
              type="button"
              onClick={() => {
                window.history.pushState({}, '', '/?report=1');
                onOpenCitizenReport();
              }}
              className="btn bs"
              style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
            >
              🚨 Report a Violation (Public Portal)
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 10, color: 'var(--mt)', fontFamily: 'Space Mono' }}>
          BBMP Municipal Corporation · Bengaluru · SDG 11 + 16
        </div>
      </div>
    </div>
  );
}
