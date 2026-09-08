import { ConfigProvider } from 'antd';

import viVN from "antd/locale/vi_VN";
import { BrowserRouter } from 'react-router-dom';
import AppRouter from './routes/AppRouter';
import { AuthProvider } from './contexts/AuthContext';
import ApiErrorRedirect from './components/shared/ApiErrorRedirect';

const App = () => {
  return (
    // BrowserRouter bắt buộc phải nằm ngoài cùng để quản lý URL
    <BrowserRouter>
      <ConfigProvider locale={viVN}
        theme={{
          token: {
            colorPrimary: '#2B5659',
            colorBgBase: '#F8F9FA',
          },
        }}
      >
        <ApiErrorRedirect />
        {/* Bọc AuthProvider ở đây để toàn bộ các Route và Component đều lấy được thông tin User */}
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ConfigProvider>
    </BrowserRouter>
  );
};

export default App;
