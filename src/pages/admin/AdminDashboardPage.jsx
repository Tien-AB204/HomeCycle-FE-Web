// src/pages/admin/AdminDashboardPage.jsx
import React from 'react';

export default function AdminDashboardPage() {
  const stats = [
    { title: 'Tổng người dùng', value: '1,248', icon: '👥', change: '+12%', isUp: true },
    { title: 'Doanh nghiệp / Hộ KD', value: '86', icon: '🏢', change: '+5%', isUp: true },
    { title: 'Giao dịch thành công', value: '3,420', icon: '🛒', change: '+18%', isUp: true },
    { title: 'Tranh chấp cần xử lý', value: '4', icon: '⚠️', change: '-2', isUp: false },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header trang */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Tổng quan hệ thống</h1>
        <p className="text-sm text-gray-500">
          Thống kê hoạt động và chỉ số vận hành trên nền tảng HomeCycle
        </p>
      </div>

      {/* Thẻ thống kê nhanh */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((item, index) => (
          <div
            key={index}
            className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center"
          >
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {item.title}
              </p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{item.value}</h3>
              <span
                className={`text-xs font-medium inline-block mt-1 ${
                  item.isUp ? 'text-green-600' : 'text-amber-600'
                }`}
              >
                {item.change} so với tháng trước
              </span>
            </div>
            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-2xl">
              {item.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Khu vực biểu đồ (Khung placeholder) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-64 flex flex-col justify-center items-center text-gray-400">
          <p className="font-semibold text-gray-700 mb-1">Tăng trưởng người dùng mới</p>
          <p className="text-xs text-gray-400">(Khu vực biểu đồ Thống kê người dùng)</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-64 flex flex-col justify-center items-center text-gray-400">
          <p className="font-semibold text-gray-700 mb-1">Biến động dòng tiền ví hệ thống</p>
          <p className="text-xs text-gray-400">(Khu vực biểu đồ Báo cáo tài chính)</p>
        </div>
      </div>
    </div>
  );
}