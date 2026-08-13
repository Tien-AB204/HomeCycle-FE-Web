import { useState } from "react";
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
      <div className="mb-7">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6F9F]">Bắt đầu với HomeCycle</p>
        <h2 className="mt-2 text-3xl font-black text-[#183F41]">Chọn loại tài khoản</h2>
        <p className="mt-2 text-sm leading-6 text-[#68807F]">Vui lòng chọn loại tài khoản phù hợp với nhu cầu của bạn để bắt đầu.</p>
      </div>

      <div className="space-y-4">
        {/* --- NÚT CÁ NHÂN --- */}
        <div 
          onClick={() => setSelectedRole('personal')} 
          className={`relative flex cursor-pointer gap-4 rounded-xl p-5 transition duration-200 ${
            selectedRole === 'personal' 
              ? 'border-2 border-[#4F8588] bg-[#F1F7F5] shadow-[0_8px_24px_rgba(24,63,65,0.06)]'
              : 'border border-[#DCE8E5] bg-white hover:border-[#9FBFBA]'
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition ${
            selectedRole === 'personal' ? 'bg-[#DCEFEB] text-[#285E62]' : 'bg-[#F0F4F3] text-[#68807F]'
          }`}>
             <span className="material-symbols-outlined">person</span>
          </div>
          <div>
            <h3 className="font-black text-[#183F41]">Tài khoản Cá nhân</h3>
            <p className="mt-1 text-xs leading-5 text-[#68807F]">Dành cho người dùng muốn đăng tin thanh lý đồ gia dụng cũ, tìm mua sản phẩm và thương lượng giá trực tiếp.</p>
          </div>
          {/* Nút check chỉ hiện khi được chọn */}
          {selectedRole === 'personal' && (
            <div className="absolute right-4 top-4 text-[#4F8588]">
              <span className="material-symbols-outlined filled">check_circle</span>
            </div>
          )}
        </div>

        {/* --- NÚT DOANH NGHIỆP --- */}
        <div 
          onClick={() => setSelectedRole('business')} 
          className={`relative flex cursor-pointer gap-4 rounded-xl p-5 transition duration-200 ${
            selectedRole === 'business' 
              ? 'border-2 border-[#4F8588] bg-[#F1F7F5] shadow-[0_8px_24px_rgba(24,63,65,0.06)]'
              : 'border border-[#DCE8E5] bg-white hover:border-[#9FBFBA]'
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition ${
            selectedRole === 'business' ? 'bg-[#E4EFF8] text-[#2F6F9F]' : 'bg-[#F0F4F3] text-[#68807F]'
          }`}>
             <span className="material-symbols-outlined">domain</span>
          </div>
          <div>
            <h3 className="font-black text-[#183F41]">Tài khoản Doanh nghiệp</h3>
            <p className="mt-1 text-xs leading-5 text-[#68807F]">Dành cho các đơn vị thu mua, hộ kinh doanh muốn đăng tin thu mua, quản lý đơn hàng lớn và tiếp cận nguồn hàng thanh lý ổn định.</p>
          </div>
          {/* Nút check chỉ hiện khi được chọn */}
          {selectedRole === 'business' && (
            <div className="absolute right-4 top-4 text-[#4F8588]">
              <span className="material-symbols-outlined filled">check_circle</span>
            </div>
          )}
        </div>
      </div>

      <button 
        onClick={handleContinue} 
        className="mt-6 w-full rounded-xl bg-[#4F8588] py-3 font-black text-white shadow-sm transition hover:bg-[#356A70]"
      >
        Tiếp tục
      </button>
      
      <div className="mt-6 border-t border-[#E2ECE9] pt-5 text-center text-sm text-[#68807F]">
          Bạn đã có tài khoản? <Link to="/auth/login" className="font-bold text-[#2F6F9F] hover:underline">Đăng nhập ngay</Link>
      </div>
    </div>
  );
};

export default RegisterSelectionPage;