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
        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Bắt đầu với HomeCycle</p>
        <h2 className="mt-2 text-3xl font-black text-text">Chọn loại tài khoản</h2>
        <p className="mt-2 text-sm leading-6 text-textLight">Vui lòng chọn loại tài khoản phù hợp với nhu cầu của bạn để bắt đầu.</p>
      </div>

      <div className="space-y-4">
        {/* --- NÚT CÁ NHÂN --- */}
        <div 
          onClick={() => setSelectedRole('personal')} 
          className={`relative flex cursor-pointer gap-4 rounded-xl p-5 transition duration-200 ${
            selectedRole === 'personal' 
              ? 'border-2 border-primary bg-primary/10 shadow-[0_8px_24px_rgba(23,40,48,0.06)]'
              : 'border border-border bg-white hover:border-primary'
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition ${
            selectedRole === 'personal' ? 'bg-primary/10 text-primary' : 'bg-background text-textLight'
          }`}>
             <span className="material-symbols-outlined">person</span>
          </div>
          <div>
            <h3 className="font-black text-text">Tài khoản Cá nhân</h3>
            <p className="mt-1 text-xs leading-5 text-textLight">Dành cho người dùng muốn đăng tin thanh lý đồ gia dụng cũ, tìm mua sản phẩm và thương lượng giá trực tiếp.</p>
          </div>
          {/* Nút check chỉ hiện khi được chọn */}
          {selectedRole === 'personal' && (
            <div className="absolute right-4 top-4 text-primary">
              <span className="material-symbols-outlined filled">check_circle</span>
            </div>
          )}
        </div>

        {/* --- NÚT DOANH NGHIỆP --- */}
        <div 
          onClick={() => setSelectedRole('business')} 
          className={`relative flex cursor-pointer gap-4 rounded-xl p-5 transition duration-200 ${
            selectedRole === 'business' 
              ? 'border-2 border-primary bg-primary/10 shadow-[0_8px_24px_rgba(23,40,48,0.06)]'
              : 'border border-border bg-white hover:border-primary'
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition ${
            selectedRole === 'business' ? 'bg-primary/10 text-primary' : 'bg-background text-textLight'
          }`}>
             <span className="material-symbols-outlined">domain</span>
          </div>
          <div>
            <h3 className="font-black text-text">Tài khoản Doanh nghiệp</h3>
            <p className="mt-1 text-xs leading-5 text-textLight">Dành cho các đơn vị thu mua, hộ kinh doanh muốn đăng tin thu mua, quản lý đơn hàng lớn và tiếp cận nguồn hàng thanh lý ổn định.</p>
          </div>
          {/* Nút check chỉ hiện khi được chọn */}
          {selectedRole === 'business' && (
            <div className="absolute right-4 top-4 text-primary">
              <span className="material-symbols-outlined filled">check_circle</span>
            </div>
          )}
        </div>
      </div>

      <button 
        onClick={handleContinue} 
        className="mt-6 w-full rounded-xl bg-primary py-3 font-black text-white shadow-sm transition hover:bg-primary/90"
      >
        Tiếp tục
      </button>
      
      <div className="mt-6 border-t border-border pt-5 text-center text-sm text-textLight">
          Bạn đã có tài khoản? <Link to="/auth/login" className="font-bold text-primary hover:underline">Đăng nhập ngay</Link>
      </div>
    </div>
  );
};

export default RegisterSelectionPage;