import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const RegisterSelectionPage = () => {
  const navigate = useNavigate();
  // State lưu trữ lựa chọn: 'personal' hoặc 'business' (Mặc định chọn 'personal' như Figma)
  const [selectedRole, setSelectedRole] = useState('personal'); 

  const handleContinue = () => {
    if (selectedRole === 'personal') {
      navigate('/auth/register/personal');
    } else {
      navigate('/auth/register/business');
    }
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="flex flex-col items-center mb-6">
        <div className="w-12 h-12 bg-[#244f4d] rounded-md flex items-center justify-center mb-4 text-white">
          <span className="material-symbols-outlined">autorenew</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mt-2">Chào mừng bạn đến với HomeCycle</h2>
        <p className="text-sm text-slate-500 text-center mt-2 px-2">Vui lòng chọn loại tài khoản phù hợp với nhu cầu của bạn để bắt đầu.</p>
      </div>

      <div className="space-y-4">
        {/* --- NÚT CÁ NHÂN --- */}
        <div 
          onClick={() => setSelectedRole('personal')} 
          className={`cursor-pointer rounded-lg p-4 flex gap-4 relative transition duration-200 ${
            selectedRole === 'personal' 
              ? 'border-2 border-[#244f4d] bg-white' // Khi được chọn
              : 'border border-slate-200 bg-slate-50 hover:border-slate-300' // Khi không được chọn
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition ${
            selectedRole === 'personal' ? 'bg-[#e6f2f1] text-[#244f4d]' : 'bg-slate-200 text-slate-500'
          }`}>
             <span className="material-symbols-outlined">person</span>
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Tài khoản Cá nhân</h3>
            <p className="text-xs text-slate-500 mt-1">Dành cho người dùng muốn đăng tin thanh lý đồ gia dụng cũ, tìm mua sản phẩm và thương lượng giá trực tiếp.</p>
          </div>
          {/* Nút check chỉ hiện khi được chọn */}
          {selectedRole === 'personal' && (
            <div className="absolute top-4 right-4 text-[#244f4d]">
              <span className="material-symbols-outlined filled">check_circle</span>
            </div>
          )}
        </div>

        {/* --- NÚT DOANH NGHIỆP --- */}
        <div 
          onClick={() => setSelectedRole('business')} 
          className={`cursor-pointer rounded-lg p-4 flex gap-4 relative transition duration-200 ${
            selectedRole === 'business' 
              ? 'border-2 border-[#244f4d] bg-white' 
              : 'border border-slate-200 bg-slate-50 hover:border-slate-300'
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition ${
            selectedRole === 'business' ? 'bg-[#e6f2f1] text-[#244f4d]' : 'bg-slate-200 text-slate-500'
          }`}>
             <span className="material-symbols-outlined">domain</span>
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Tài khoản Doanh nghiệp</h3>
            <p className="text-xs text-slate-500 mt-1">Dành cho các đơn vị thu mua, hộ kinh doanh muốn đăng tin thu mua, quản lý đơn hàng lớn và tiếp cận nguồn hàng thanh lý ổn định.</p>
          </div>
          {/* Nút check chỉ hiện khi được chọn */}
          {selectedRole === 'business' && (
            <div className="absolute top-4 right-4 text-[#244f4d]">
              <span className="material-symbols-outlined filled">check_circle</span>
            </div>
          )}
        </div>
      </div>

      <button 
        onClick={handleContinue} 
        className="w-full bg-[#244f4d] text-white py-3 rounded-md font-medium mt-6 hover:bg-[#1a3a38] transition"
      >
        Tiếp tục
      </button>
      
      <div className="mt-6 text-center text-sm text-slate-600">
          Bạn đã có tài khoản? <Link to="/auth/login" className="font-bold text-[#244f4d] hover:underline">Đăng nhập ngay</Link>
      </div>
    </div>
  );
};

export default RegisterSelectionPage;