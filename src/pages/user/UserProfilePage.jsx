// src/pages/user/UserProfilePage.jsx
import { useEffect, useState } from "react";
import { userService } from "../../services/userService";

export default function UserProfilePage() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("personal"); // 'personal', 'kyc', 'bank'

  // GỌI API KHI COMPONENT ĐƯỢC MOUNT
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const response = await userService.getProfile();

        // Nhớ lại file axiosClient: response đã là object bọc ngoài chứa { data, isSuccess, error }
        if (response.isSuccess) {
          setProfile(response.data);
        } else {
          setError(response.error?.message || "Lỗi khi tải dữ liệu");
        }
      } catch (err) {
        setError("Không thể kết nối đến máy chủ.");
        console.error("Fetch profile error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#244f4d]">
        <span className="material-symbols-outlined animate-spin text-4xl">
          refresh
        </span>
        <span className="ml-3 font-medium">Đang tải hồ sơ...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        <p className="font-bold">Đã xảy ra lỗi:</p>
        <p>{error}</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-5xl mx-auto py-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Quản lý Hồ sơ</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* --- CỘT TRÁI: SIDEBAR MENU TABS & TỔNG QUAN --- */}
        <div className="md:col-span-1 space-y-4">
          {/* Card Tổng quan */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
            <div className="relative">
              <img
                src={profile.avatarUrl || "https://via.placeholder.com/150"}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-4 border-slate-50"
              />
              <button className="absolute bottom-0 right-0 bg-[#244f4d] text-white p-1.5 rounded-full hover:bg-[#1a3a38] transition">
                <span className="material-symbols-outlined text-[16px]">
                  edit
                </span>
              </button>
            </div>
            <h2 className="mt-3 font-bold text-slate-800 text-lg">
              {profile.fullName}
            </h2>
            <p className="text-sm text-slate-500 mb-3">@{profile.username}</p>

            <div className="flex flex-wrap justify-center gap-2 mb-4">
              <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {profile.role}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  profile.verificationStatus === "Verified"
                    ? "bg-green-50 text-green-700"
                    : "bg-orange-50 text-orange-700"
                }`}
              >
                {profile.verificationStatus === "Verified"
                  ? "Đã xác minh"
                  : "Chưa xác minh"}
              </span>
            </div>

            <div className="w-full bg-slate-50 rounded-lg p-3 border border-slate-100">
              <p className="text-xs text-slate-500 font-medium mb-1">
                Điểm uy tín
              </p>
              <div className="flex items-center justify-center gap-1 text-[#244f4d] font-black text-xl">
                <span className="material-symbols-outlined text-yellow-500">
                  star
                </span>
                {profile.reputationScore}
              </div>
            </div>
          </div>

          {/* Menu Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <button
              onClick={() => setActiveTab("personal")}
              className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-colors border-l-4 ${activeTab === "personal" ? "border-[#244f4d] bg-slate-50 text-[#244f4d]" : "border-transparent text-slate-600 hover:bg-slate-50"}`}
            >
              <span className="material-symbols-outlined text-[20px]">
                person
              </span>
              Thông tin cá nhân
            </button>
            <button
              onClick={() => setActiveTab("kyc")}
              className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-colors border-l-4 border-t border-slate-100 ${activeTab === "kyc" ? "border-l-[#244f4d] bg-slate-50 text-[#244f4d]" : "border-l-transparent text-slate-600 hover:bg-slate-50"}`}
            >
              <span className="material-symbols-outlined text-[20px]">
                badge
              </span>
              Xác minh danh tính
            </button>
            <button
              onClick={() => setActiveTab("bank")}
              className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-colors border-l-4 border-t border-slate-100 ${activeTab === "bank" ? "border-l-[#244f4d] bg-slate-50 text-[#244f4d]" : "border-l-transparent text-slate-600 hover:bg-slate-50"}`}
            >
              <span className="material-symbols-outlined text-[20px]">
                account_balance
              </span>
              Tài khoản ngân hàng
            </button>
          </div>
        </div>

        {/* --- CỘT PHẢI: NỘI DUNG TABS --- */}
        <div className="md:col-span-3 bg-white rounded-xl shadow-sm border border-slate-100 p-6 min-h-[400px]">
          {/* TAB 1: THÔNG TIN CÁ NHÂN */}
          {activeTab === "personal" && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-bold text-slate-800 mb-6 border-b pb-3">
                Thông tin cá nhân
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    HỌ VÀ TÊN
                  </label>
                  <input
                    type="text"
                    defaultValue={profile.fullName}
                    readOnly
                    className="w-full bg-slate-50 border border-slate-200 rounded-md py-2.5 px-3 text-sm text-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    SỐ ĐIỆN THOẠI
                  </label>
                  <input
                    type="text"
                    defaultValue={profile.phoneNumber}
                    readOnly
                    className="w-full bg-slate-50 border border-slate-200 rounded-md py-2.5 px-3 text-sm text-slate-700 outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    ĐỊA CHỈ EMAIL
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      defaultValue={profile.email}
                      readOnly
                      className="w-full bg-slate-50 border border-slate-200 rounded-md py-2.5 px-3 text-sm text-slate-700 outline-none"
                    />
                    {profile.isEmailVerified && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 flex items-center text-xs font-bold gap-1">
                        <span className="material-symbols-outlined text-[16px]">
                          check_circle
                        </span>{" "}
                        Đã xác thực
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    NGÀY THAM GIA
                  </label>
                  <input
                    type="text"
                    defaultValue={new Date(
                      profile.createdAt,
                    ).toLocaleDateString("vi-VN")}
                    readOnly
                    className="w-full bg-slate-50 border border-slate-200 rounded-md py-2.5 px-3 text-sm text-slate-700 outline-none"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button className="bg-[#244f4d] text-white px-5 py-2.5 rounded-md font-medium hover:bg-[#1a3a38] transition flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">
                    edit_note
                  </span>{" "}
                  Cập nhật thông tin
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: KYC */}
          {activeTab === "kyc" && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-bold text-slate-800 mb-6 border-b pb-3">
                Xác minh danh tính (KYC)
              </h3>
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-md mb-6 flex items-start gap-3 text-orange-800">
                <span className="material-symbols-outlined">warning</span>
                <div>
                  <p className="font-bold text-sm">
                    Trạng thái: {profile.verificationStatus}
                  </p>
                  <p className="text-xs mt-1">
                    Tài khoản của bạn chưa được xác minh. Vui lòng cập nhật đầy
                    đủ ảnh CMND/CCCD để tăng độ uy tín khi giao dịch.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-2">
                    ẢNH MẶT TRƯỚC
                  </p>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-2 h-40 flex items-center justify-center bg-slate-50 overflow-hidden">
                    {profile.frontIDCardImage ? (
                      <img
                        src={profile.frontIDCardImage}
                        alt="Mặt trước"
                        className="object-contain h-full w-full"
                      />
                    ) : (
                      <span className="text-slate-400 text-sm">
                        Chưa có ảnh
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-2">
                    ẢNH MẶT SAU
                  </p>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-2 h-40 flex items-center justify-center bg-slate-50 overflow-hidden">
                    {profile.backIDCardImage ? (
                      <img
                        src={profile.backIDCardImage}
                        alt="Mặt sau"
                        className="object-contain h-full w-full"
                      />
                    ) : (
                      <span className="text-slate-400 text-sm">
                        Chưa có ảnh
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NGÂN HÀNG */}
          {activeTab === "bank" && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-bold text-slate-800 mb-6 border-b pb-3">
                Tài khoản ngân hàng
              </h3>
              {profile.bankAccount ? (
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white shadow-md max-w-sm relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 opacity-10">
                    <span className="material-symbols-outlined text-[150px]">
                      account_balance
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 font-medium mb-1">
                    Ngân hàng
                  </p>
                  <p className="font-bold text-lg mb-6">
                    {profile.bankAccount.bankName}
                  </p>

                  <p className="text-sm text-slate-300 font-medium mb-1">
                    Số tài khoản
                  </p>
                  <p className="font-mono text-xl tracking-widest mb-6">
                    {profile.bankAccount.accountNumber}
                  </p>

                  <p className="text-sm text-slate-300 font-medium mb-1">
                    Chủ tài khoản
                  </p>
                  <p className="font-bold uppercase tracking-wide">
                    {profile.bankAccount.accountName}
                  </p>
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <span className="material-symbols-outlined text-slate-300 text-5xl mb-2">
                    account_balance_wallet
                  </span>
                  <p className="text-slate-500 font-medium">
                    Bạn chưa liên kết tài khoản ngân hàng nào.
                  </p>
                </div>
              )}
              <div className="mt-6">
                <button className="bg-slate-100 text-slate-700 px-5 py-2.5 rounded-md font-medium hover:bg-slate-200 transition border border-slate-300">
                  {profile.bankAccount
                    ? "Đổi tài khoản ngân hàng"
                    : "Thêm tài khoản ngân hàng"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
