import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  // Ao carregar, valida token salvo
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) { setChecking(false); return; }

    api.get('/auth/me')
      .then(() => setIsAdmin(true))
      .catch(() => { localStorage.removeItem('admin_token'); })
      .finally(() => setChecking(false));
  }, []);

  // Interceptor: injeta token em todas as requisições
  useEffect(() => {
    const id = api.interceptors.request.use((config) => {
      const token = localStorage.getItem('admin_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    return () => api.interceptors.request.eject(id);
  }, []);

  const login = async (pin) => {
    const { data } = await api.post('/auth/login', { pin });
    localStorage.setItem('admin_token', data.token);
    setIsAdmin(true);
    toast.success('Acesso admin liberado!');
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setIsAdmin(false);
    toast('Sessão encerrada.');
  };

  return (
    <AuthContext.Provider value={{ isAdmin, checking, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
