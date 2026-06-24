import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Import Global CSS (Tailwind) theo đúng cấu trúc thư mục mới
// Hãy đảm bảo bạn đã chuyển file index.css/App.css vào thư mục này
import './assets/styles/index.css'; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);