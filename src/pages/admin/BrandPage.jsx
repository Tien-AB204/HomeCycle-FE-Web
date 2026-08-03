// src/pages/admin/BrandPage.jsx
import { useState } from "react";

export default function BrandPage() {
  // 1. MOCK DATA THƯƠNG HIỆU (Trích xuất từ các tên sản phẩm trong mockData)
  const initialBrands = [
    {
      id: "BR_001",
      name: "Samsung",
      categories: ["Điện máy", "Gia dụng"],
      postCount: 124,
      status: "active",
      color: "bg-blue-600",
    },
    {
      id: "BR_002",
      name: "LG",
      categories: ["Điện máy", "Gia dụng"],
      postCount: 98,
      status: "active",
      color: "bg-red-600",
    },
    {
      id: "BR_003",
      name: "Sony",
      categories: ["Điện máy"],
      postCount: 85,
      status: "active",
      color: "bg-black",
    },
    {
      id: "BR_004",
      name: "Sharp",
      categories: ["Gia dụng"],
      postCount: 42,
      status: "active",
      color: "bg-red-500",
    },
    {
      id: "BR_005",
      name: "Panasonic",
      categories: ["Điện máy", "Gia dụng"],
      postCount: 110,
      status: "active",
      color: "bg-blue-700",
    },
    {
      id: "BR_006",
      name: "Philips",
      categories: ["Gia dụng"],
      postCount: 36,
      status: "inactive", // Đang tạm ẩn
      color: "bg-blue-500",
    },
  ];

  const [brands, setBrands] = useState(initialBrands);
  const [searchTerm, setSearchTerm] = useState("");

  // 2. XỬ LÝ TÌM KIẾM
  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* --- HEADER CỦA BẢNG --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            Quản lý Thương hiệu
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý {brands.length} thương hiệu sản phẩm trên hệ thống
          </p>
        </div>

        {/* Nút thêm mới */}
        <button className="bg-[#16a34a] text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 hover:bg-green-700 transition">
          <span className="material-symbols-outlined text-[20px]">add</span>
          Thêm thương hiệu mới
        </button>
      </div>

      {/* --- THANH TÌM KIẾM --- */}
      <div className="mb-6 relative w-full md:w-1/2">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">
          search
        </span>
        <input
          type="text"
          placeholder="Tìm kiếm theo tên thương hiệu..."
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
              <th className="p-4 font-semibold w-16">Logo</th>
              <th className="p-4 font-semibold">Tên Thương hiệu</th>
              <th className="p-4 font-semibold">Thuộc Danh mục</th>
              <th className="p-4 font-semibold text-center">Số bài viết</th>
              <th className="p-4 font-semibold">Trạng thái</th>
              <th className="p-4 font-semibold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {filteredBrands.length > 0 ? (
              filteredBrands.map((brand) => (
                <tr
                  key={brand.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="p-4">
                    {/* Tạo Logo giả lập bằng chữ cái đầu */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${brand.color}`}
                    >
                      {brand.name.charAt(0)}
                    </div>
                  </td>
                  <td className="p-4 font-bold text-[#244f4d]">{brand.name}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {brand.categories.map((cat, index) => (
                        <span
                          key={index}
                          className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-medium"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-center font-medium">
                    {brand.postCount}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        brand.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {brand.status === "active" ? "Hoạt động" : "Đang ẩn"}
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
                      Không tìm thấy thương hiệu nào khớp với "{searchTerm}"
                    </span>
                  ) : (
                    <span>Chưa có thương hiệu nào.</span>
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
