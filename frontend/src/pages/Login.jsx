import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Eye, EyeOff, Loader2, Grid } from 'lucide-react';
import api from '../services/api';

const Login = () => {
  const [view, setView] = useState('login'); // 'login', 'forgot', 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [specialCode, setSpecialCode] = useState('');
  const [emailedCode, setEmailedCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError('Please enter your email to request a reset.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/auth/forgot-password', { email });
      setSuccess(response.data.message);
      // Don't change view automatically so they can read the success message,
      // but maybe show a button to go to "Enter Reset Code"
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit reset request.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !specialCode || !emailedCode || !password) {
      setError('All fields are required.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/auth/reset-password', {
        email,
        special_access_code: specialCode,
        emailed_code: emailedCode,
        new_password: password
      });
      setSuccess(response.data.message);
      setTimeout(() => {
        setView('login');
        setPassword('');
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', fontFamily: "'Inter', sans-serif" }}>

      {/* Left Pane (Dark) */}
      <div style={{
        flex: 1,
        backgroundColor: 'var(--c-midnight-blue, #16232A)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '60px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Abstract background pattern/decoration */}
        <div style={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(7,80,86,0.4) 0%, rgba(22,35,42,0) 70%)',
          zIndex: 0
        }} />

        <div style={{ zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: '40px', height: '40px',
              backgroundColor: 'var(--c-kimchi, #FF5B04)',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Grid size={24} color="white" />
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', margin: 0, letterSpacing: '-0.5px' }}>
              TransitOps
            </h1>
          </div>
          <p style={{ color: '#9CA3AF', fontSize: '1.05rem', margin: 0 }}>
            Smart Transport Operations Platform
          </p>
        </div>

        {/*<div style={{ zIndex: 1 }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '500', marginBottom: '20px', color: '#E4EEF0' }}>
            One login, four roles:
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'].map((role, idx) => (
              <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#D1D5DB' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--c-kimchi, #FF5B04)' }}></span>
                {role}
              </li>
            ))}
          </ul>
        </div>*/}

        <div style={{ zIndex: 1, color: '#6B7280', fontSize: '0.8rem', letterSpacing: '1px' }}>
          TRANSITOPS © 2026 · RBAC ENABLED · BY UrFlow
        </div>
      </div>

      {/* Right Pane (Light) */}
      <div style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px'
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
            {view === 'login' ? 'Sign in to your account' : view === 'forgot' ? 'Reset your password' : 'Enter access codes'}
          </h2>
          <p style={{ color: '#6B7280', marginBottom: '32px' }}>
            {view === 'login' ? 'Enter your credentials to continue' : view === 'forgot' ? 'Request a reset code from your Fleet Manager' : 'Enter the codes provided to you'}
          </p>

          {/* Error & Success States */}
          {error && (
            <div style={{
              backgroundColor: '#FEF2F2',
              borderLeft: '4px solid var(--c-kimchi, #FF5B04)',
              color: '#B91C1C',
              padding: '12px 16px',
              borderRadius: '0 8px 8px 0',
              fontSize: '0.9rem',
              fontWeight: '500',
              marginBottom: '24px',
              display: 'flex', alignItems: 'flex-start', gap: '8px'
            }}>
              <span>✖</span>
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div style={{
              backgroundColor: '#ECFDF5',
              borderLeft: '4px solid #10B981',
              color: '#047857',
              padding: '12px 16px',
              borderRadius: '0 8px 8px 0',
              fontSize: '0.9rem',
              fontWeight: '500',
              marginBottom: '24px'
            }}>
              {success}
            </div>
          )}

          {/* LOGIN VIEW */}
          {view === 'login' && (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '8px',
                    border: '1px solid #D1D5DB', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--c-deep-sea, #075056)'}
                  onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                  placeholder="admin@transitops.in"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%', padding: '12px 40px 12px 16px', borderRadius: '8px',
                      border: '1px solid #D1D5DB', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--c-deep-sea, #075056)'}
                    onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0
                    }}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '-4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#4B5563', cursor: 'pointer' }}>
                  <input type="checkbox" style={{ accentColor: 'var(--c-deep-sea, #075056)', width: '16px', height: '16px' }} />
                  Remember me
                </label>
                <button type="button" onClick={() => { setView('forgot'); setError(''); setSuccess(''); }} style={{ fontSize: '0.9rem', color: 'var(--c-deep-sea, #075056)', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                style={{
                  width: '100%', padding: '14px', marginTop: '8px', borderRadius: '8px',
                  backgroundColor: 'var(--c-kimchi, #FF5B04)', color: 'white', fontSize: '1rem',
                  fontWeight: '600', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s',
                  display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}
                disabled={loading}
              >
                {loading ? <Loader2 size={20} className="spin" /> : 'Sign In'}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD VIEW */}
          {view === 'forgot' && (
            <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '8px',
                    border: '1px solid #D1D5DB', fontSize: '1rem', outline: 'none'
                  }}
                  placeholder="Enter your email"
                />
              </div>

              <button
                type="submit"
                style={{
                  width: '100%', padding: '14px', borderRadius: '8px',
                  backgroundColor: 'var(--c-deep-sea, #075056)', color: 'white', fontSize: '1rem',
                  fontWeight: '600', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center'
                }}
                disabled={loading}
              >
                {loading ? <Loader2 size={20} className="spin" /> : 'Request Access Code'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <button type="button" onClick={() => setView('reset_code')} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline' }}>
                  I already have an access code
                </button>
              </div>
              <div style={{ textAlign: 'center', marginTop: '-10px' }}>
                <button type="button" onClick={() => setView('login')} style={{ background: 'none', border: 'none', color: 'var(--c-kimchi, #FF5B04)', fontSize: '0.9rem', cursor: 'pointer', fontWeight: '600' }}>
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {/* RESET CODE VIEW */}
          {view === 'reset_code' && (
            <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase' }}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.95rem', outline: 'none' }} placeholder="Your email" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase' }}>Special Access Code (from Admin)</label>
                <input type="text" value={specialCode} onChange={(e) => setSpecialCode(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.95rem', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase' }}>Emailed Code</label>
                <input type="text" value={emailedCode} onChange={(e) => setEmailedCode(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.95rem', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase' }}>New Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.95rem', outline: 'none' }} />
              </div>

              <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: '8px', backgroundColor: 'var(--c-kimchi, #FF5B04)', color: 'white', fontSize: '1rem', fontWeight: '600', border: 'none', cursor: 'pointer', marginTop: '8px' }}>
                {loading ? <Loader2 size={20} className="spin" /> : 'Reset Password'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <button type="button" onClick={() => setView('login')} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: '0.9rem', cursor: 'pointer', fontWeight: '500' }}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Access Scoped Legend */}
          {/*<div style={{ marginTop: '48px', borderTop: '1px solid #E5E7EB', paddingTop: '24px' }}>
            <h4 style={{ fontSize: '0.8rem', color: '#9CA3AF', fontWeight: '500', marginBottom: '12px' }}>Access is scoped by role after login:</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#6B7280' }}>
              <li>• Fleet Manager → Fleet, Maintenance, Settings</li>
              <li>• Dispatcher → Dashboard, Trips</li>
              <li>• Safety Officer → Drivers, Compliance</li>
              <li>• Financial Analyst → Fuel & Expenses, Analytics</li>
            </ul>
          </div>*/}
        </div>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Login;
