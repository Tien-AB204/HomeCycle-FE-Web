// src/pages/admin/CategoryPage.jsx
import { useState } from "react";

export default function CategoryPage() {
  // 1. MOCK DATA DANH MỤC (Dựa trên dữ liệu bài viết của bạn)
  const initialCategories = [
    {
      id: "CAT_001",
      code: "ELECTRONIC",
      name: "Điện máy",
      description: "Tivi, tủ lạnh, máy giặt, máy lạnh...",
      postCount: 156,
      status: "active",
    },
    {
      id: "CAT_002",
      code: "APPLIANCE",
      name: "Gia dụng",
      description: "Lò vi sóng, nồi chiên không dầu, quạt máy...",
      postCount: 89,
      status: "active",
    },
    {
      id: "CAT_003",
      code: "FURNITURE",
      name: "Nội thất",
      description: "Bàn ghế, giường tủ, sofa...",
      postCount: 210,
      status: "active",
    },
    
  ];

  const [categories, setCategories] = useState(initialCategories);
  const [searchTerm, setSearchTerm] = useState("");

  // 2. XỬ LÝ TÌM KIẾM
  const filteredCategories = categories.filter(
    (cat) =>
      cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.code.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* --- HEADER CỦA BẢNG --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            Danh sách Danh mục
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý {categories.length} danh mục hiện có trên hệ thống
          </p>
        </div>

        {/* Nút thêm mới giống trong ảnh của bạn */}
        <button className="bg-[#16a34a] text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 hover:bg-green-700 transition">
          <span className="material-symbols-outlined text-[20px]">add</span>
          Thêm danh mục mới
        </button>
      </div>

      {/* --- THANH TÌM KIẾM --- */}
      <div className="mb-6 relative w-full md:w-1/2">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">
          search
        </span>
        <input
          type="text"
          placeholder="Tìm kiếm theo tên hoặc mã danh mục..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#16a34a] focus:border-[#16a34a] text-sm"
        />
      </div>

      {/* --- BẢNG DỮ LIỆU --- */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
              <th className="p-4 font-semibold">Mã DM</th>
              <th className="p-4 font-semibold">Tên Danh mục</th>
              <th className="p-4 font-semibold">Mô tả</th>
              <th className="p-4 font-semibold text-center">Số bài viết</th>
              <th className="p-4 font-semibold">Trạng thái</th>
              <th className="p-4 font-semibold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{cat.code}</td>
                  <td className="p-4 font-bold text-[#244f4d]">{cat.name}</td>
                  <td className="p-4 text-gray-600 truncate max-w-[200px]">
                    {cat.description}
                  </td>
                  <td className="p-4 text-center font-medium">
                    {cat.postCount}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        cat.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {cat.status === "active" ? "Hoạt động" : "Đang ẩn"}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition"
                      title="Chỉnh sửa"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        edit
                      </span>
                    </button>
                    <button
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition"
                      title="Xóa"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        delete
                      </span>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="p-8 text-center text-gray-500">
                  {searchTerm ? (
                    <span>
                      Không tìm thấy danh mục nào khớp với "{searchTerm}"
                    </span>
                  ) : (
                    <span>Chưa có danh mục nào.</span>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
