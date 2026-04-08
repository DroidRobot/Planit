import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe, login as loginApi, signup as signupApi, logout as logoutApi, googleLogin as googleLoginApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await loginApi({ email, password });
    setUser(res.data.user);
    return res.data;
  };

  const signup = async (email, password, fullName, phoneNumber) => {
    const res = await signupApi({ email, password, fullName, phoneNumber });
    setUser(res.data.user);
    return res.data;
  };

  const googleLogin = async (credential) => {
    const res = await googleLoginApi(credential);
    setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    await logoutApi();
    setUser(null);
  };

  // Keep for backward-compat
  const setGoogleUser = (userData) => setUser(userData);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, googleLogin, logout, setGoogleUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
