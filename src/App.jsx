import { App as AntdApp, ConfigProvider } from 'antd';

import viVN from "antd/locale/vi_VN";
import { BrowserRouter } from 'react-router-dom';
import AppRouter from './routes/AppRouter';
import { AuthProvider } from './contexts/AuthContext';
import { ChatRealtimeProvider } from './contexts/ChatRealtimeProvider';
import { NotificationProvider } from './contexts/NotificationProvider';
import ApiErrorRedirect from './components/shared/ApiErrorRedirect';
import NotificationToast from './components/shared/NotificationToast';

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
        <AntdApp component={false}>
          <ApiErrorRedirect />
          {/* Bọc AuthProvider ở đây để toàn bộ các Route và Component đều lấy được thông tin User */}
          <AuthProvider>
            <ChatRealtimeProvider>
              <NotificationProvider>
                <NotificationToast />
                <AppRouter />
              </NotificationProvider>
            </ChatRealtimeProvider>
          </AuthProvider>
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
  );
};

export default App;
