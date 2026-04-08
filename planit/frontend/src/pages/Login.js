import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to log in');
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
      <p>Welcome back! Log in to your account.</p>
      <div className="auth-form">
        {error && <div className="error-msg">{error}</div>}

        {process.env.REACT_APP_GOOGLE_CLIENT_ID && (
          <>
            <div className="google-btn-wrapper">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google sign-in failed')}
                useOneTap
                width="100%"
              />
            </div>
            <div className="auth-divider"><span>or</span></div>
          </>
        )}

        <form onSubmit={handleSubmit}>
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
              placeholder="Your password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">Log In</button>
        </form>
      </div>
      <div className="auth-toggle">
        Don't have an account? <Link to="/signup">Sign up</Link>
      </div>
    </div>
  );
}

export default Login;
