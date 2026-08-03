import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authApi from '../../services/apis/authApi';

const RegisterPersonalPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    fullName: '',
    phoneNumber: '',
    representativeCode: '',
    representativeName: '',
    representativeDob: '',
    representativeAddress: '',
    bankCode: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu và xác nhận mật khẩu không khớp.');
      return;
    }

    setLoading(true);
    try {
      const payload = new FormData();
      payload.append('Username', form.username || form.email);
      payload.append('Password', form.password);
      payload.append('PhoneNumber', form.phoneNumber);
      payload.append('AvatarUrl', '');
      payload.append('FullName', form.fullName);
      payload.append('RepresentativeCode', form.representativeCode);
      payload.append('RepresentativeName', form.representativeName);
      payload.append('RepresentativeDob', form.representativeDob);
      payload.append('RepresentativeAddress', form.representativeAddress);
      payload.append('BankCode', form.bankCode);
      payload.append('BankName', form.bankName);
      payload.append('AccountNumber', form.accountNumber);
      payload.append('AccountName', form.accountName);

      await authApi.registerPersonal(payload);
      alert('Đăng ký thành công. Vui lòng đăng nhập.');
      navigate('/auth/login');
    } catch (registerError) {
      console.error('Lỗi đăng ký:', registerError);
      setError(
        registerError?.response?.data?.message ||
          registerError?.message ||
          'Đăng ký thất bại. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full animate-fade-in max-w-xl mx-auto">
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 bg-[#244f4d] rounded-md flex items-center justify-center mb-4 text-white">
          <span className="material-symbols-outlined">autorenew</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Đăng ký tài khoản cá nhân</h2>
        <p className="text-sm text-slate-500 mt-2 text-center">
          Hoàn thiện thông tin để bắt đầu đăng tin và mua bán trên HomeCycle.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            placeholder="Nhập địa chỉ email"
            className="w-full border border-slate-300 rounded-md py-2.5 px-3 focus:outline-none focus:border-[#244f4d] text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Mật khẩu</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              placeholder="Tạo mật khẩu"
              className="w-full border border-slate-300 rounded-md py-2.5 px-3 focus:outline-none focus:border-[#244f4d] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Xác nhận mật khẩu</label>
            <input
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Nhập lại mật khẩu"
              className="w-full border border-slate-300 rounded-md py-2.5 px-3 focus:outline-none focus:border-[#244f4d] text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">Họ và tên</label>
          <input
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            required
            placeholder="Nhập họ và tên"
            className="w-full border border-slate-300 rounded-md py-2.5 px-3 focus:outline-none focus:border-[#244f4d] text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">Số điện thoại</label>
          <input
            name="phoneNumber"
            type="tel"
            value={form.phoneNumber}
            onChange={handleChange}
            required
            placeholder="Nhập số điện thoại"
            className="w-full border border-slate-300 rounded-md py-2.5 px-3 focus:outline-none focus:border-[#244f4d] text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Mã đại diện</label>
            <input
              name="representativeCode"
              value={form.representativeCode}
              onChange={handleChange}
              placeholder="Mã đại diện"
              className="w-full border border-slate-300 rounded-md py-2.5 px-3 focus:outline-none focus:border-[#244f4d] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Tên đại diện</label>
            <input
              name="representativeName"
              value={form.representativeName}
              onChange={handleChange}
              placeholder="Tên đại diện"
              className="w-full border border-slate-300 rounded-md py-2.5 px-3 focus:outline-none focus:border-[#244f4d] text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Ngày sinh</label>
            <input
              name="representativeDob"
              type="date"
              value={form.representativeDob}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-md py-2.5 px-3 focus:outline-none focus:border-[#244f4d] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Địa chỉ đại diện</label>
            <input
              name="representativeAddress"
              value={form.representativeAddress}
              onChange={handleChange}
              placeholder="Địa chỉ đại diện"
              className="w-full border border-slate-300 rounded-md py-2.5 px-3 focus:outline-none focus:border-[#244f4d] text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Ngân hàng</label>
            <input
              name="bankName"
              value={form.bankName}
              onChange={handleChange}
              placeholder="Tên ngân hàng"
              className="w-full border border-slate-300 rounded-md py-2.5 px-3 focus:outline-none focus:border-[#244f4d] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Mã ngân hàng</label>
            <input
              name="bankCode"
              value={form.bankCode}
              onChange={handleChange}
              placeholder="Mã ngân hàng"
              className="w-full border border-slate-300 rounded-md py-2.5 px-3 focus:outline-none focus:border-[#244f4d] text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Số tài khoản</label>
            <input
              name="accountNumber"
              value={form.accountNumber}
              onChange={handleChange}
              placeholder="Số tài khoản"
              className="w-full border border-slate-300 rounded-md py-2.5 px-3 focus:outline-none focus:border-[#244f4d] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Chủ tài khoản</label>
            <input
              name="accountName"
              value={form.accountName}
              onChange={handleChange}
              placeholder="Chủ tài khoản"
              className="w-full border border-slate-300 rounded-md py-2.5 px-3 focus:outline-none focus:border-[#244f4d] text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#244f4d] text-white py-3 rounded-md font-medium hover:bg-[#1a3a38] transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'ĐANG GỬI ĐĂNG KÝ...' : 'ĐĂNG KÝ'}
        </button>

        <div className="text-sm text-center text-slate-600">
          Bạn đã có tài khoản?{' '}
          <Link to="/auth/login" className="font-bold text-[#244f4d] hover:underline">
            Đăng nhập ngay
          </Link>
        </div>
      </form>
    </div>
  );
};

export default RegisterPersonalPage;
