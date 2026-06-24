import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRouter from './routes/AppRouter';

// import { AuthProvider } from './contexts/AuthContext'; // Tương lai sẽ mở comment dòng này

const App = () => {
  return (
    // BrowserRouter bắt buộc phải nằm ngoài cùng để quản lý URL
    <BrowserRouter>
      {/* Sau khi code xong AuthContext, ta sẽ bọc <AuthProvider> ở đây 
        để truyền thông tin User xuống toàn bộ AppRouter 
      */}
      <AppRouter />
    </BrowserRouter>
  );
};

export default App;