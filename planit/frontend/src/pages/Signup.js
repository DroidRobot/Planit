import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const { signup, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    try {
      await signup(email, password, fullName, phoneNumber || undefined);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create account');
    }
  };

  const handleGoogleSuccess = async ({ credential }) => {
    setError('');
    try {
      await googleLogin(credential);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Google sign-in failed');
    }
  };

  return (
    <div className="auth-container">
      <h1>Planit</h1>
      <p>Create your account and start planning.</p>
      <div className="auth-form">
        {error && <div className="error-msg">{error}</div>}

        {process.env.REACT_APP_GOOGLE_CLIENT_ID && (
          <>
            <div className="google-btn-wrapper">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google sign-in failed')}
                width="100%"
              />
            </div>
            <div className="auth-divider"><span>or</span></div>
          </>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
            />
          </div>
          <div className="form-group">
            <label>Phone Number <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional — for SMS reminders)</span></label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 555 000 0000"
            />
          </div>
          <button type="submit" className="btn btn-primary">Sign Up</button>
        </form>
      </div>
      <div className="auth-toggle">
        Already have an account? <Link to="/login">Log in</Link>
      </div>
    </div>
  );
}

export default Signup;
