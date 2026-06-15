import { createContext, useContext, useState, useEffect } from 'react';
import { setToken as setApiToken, isTokenValid } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(sessionStorage.getItem('jwt_token') || null);
  const [authenticated, setAuthenticated] = useState(isTokenValid());

  useEffect(() => {
    setAuthenticated(isTokenValid());
  }, [token]);

  const login = (jwt) => {
    setApiToken(jwt);
    setTokenState(jwt);
    setAuthenticated(true);
  };

  const logout = () => {
    setApiToken(null);
    setTokenState(null);
    setAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: authenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
