import { BrowserRouter } from 'react-router-dom';
import AppRouter from './routes/AppRouter';
import { AuthProvider } from './contexts/AuthContext';
import ApiErrorRedirect from './components/shared/ApiErrorRedirect';

const App = () => {
  return (
    // BrowserRouter bắt buộc phải nằm ngoài cùng để quản lý URL
    <BrowserRouter>
      <ApiErrorRedirect />
      {/* Bọc AuthProvider ở đây để toàn bộ các Route và Component đều lấy được thông tin User */}
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
