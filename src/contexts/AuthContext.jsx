import React, { createContext, useState } from 'react';
import authApi from '../services/apis/authApi';

export const AuthContext = createContext(null);

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser());

  const saveAuth = ({ user: userData, accessToken, refreshToken }) => {
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
    }
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const login = async (email, password) => {
    const authResult = await authApi.login({ email, password });

    const userInfo = authResult?.user || authResult?.data || authResult;
    const accessToken = authResult?.accessToken || authResult?.token || '';
    const refreshToken = authResult?.refreshToken || authResult?.refresh_token || '';

    if (!userInfo) {
      throw new Error('Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    }

    saveAuth({ user: userInfo, accessToken, refreshToken });
    return userInfo;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
