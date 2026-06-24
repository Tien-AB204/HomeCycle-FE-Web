import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-[#f4f7f6] flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-[440px] rounded-lg shadow-sm border border-slate-100 p-8 sm:p-10">
        {/* Nơi các màn hình Login/Register sẽ được "nhúng" vào */}
        <Outlet /> 
      </div>
    </div>
  );
};

export default AuthLayout;