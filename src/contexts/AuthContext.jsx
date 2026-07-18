// src/contexts/AuthContext.jsx
import React, { createContext, useState } from 'react';
import { mockUsers } from '../utils/mockData'; // Đảm bảo đường dẫn đúng

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Ban đầu chưa ai đăng nhập nên user là null
  const [user, setUser] = useState(null);

  // Hàm xử lý đăng nhập thực tế (Tạm dùng mockUsers thay cho gọi API backend)
  const login = (email, password) => {
    const foundUser = mockUsers.find(u => u.email === email && u.password === password);
    if (foundUser) {
      setUser(foundUser);
      return foundUser; // BƯỚC SỬA: Trả về nguyên object user để LoginPage biết role là gì
    }
    return null; // BƯỚC SỬA: Trả về null nếu sai email/password
  };

  const logout = () => setUser(null);

  // Trạng thái true/false xem đã đăng nhập chưa
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};