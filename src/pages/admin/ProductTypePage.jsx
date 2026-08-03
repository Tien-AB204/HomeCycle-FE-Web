// src/pages/admin/ProductTypePage.jsx
import { useState } from "react";

export default function ProductTypePage() {
  // 1. MOCK DATA LOẠI SP & THUỘC TÍNH
  const initialProductTypes = [
    {
      id: "PT_001",
      name: "Tủ lạnh",
      category: "Điện máy",
      attributes: [
        "Tình trạng máy",
        "Hình thức",
        "Yêu cầu vận chuyển",
        "Dung tích (Lít)",
      ],
      status: "active",
    },
    {
      id: "PT_002",
      name: "Máy giặt",
      category: "Điện máy",
      attributes: [
        "Tình trạng máy",
        "Hình thức",
        "Yêu cầu vận chuyển",
        "Loại lồng giặt",
      ],
      status: "active",
    },
    {
      id: "PT_003",
      name: "Sofa",
      category: "Nội thất",
      attributes: [
        "Tình trạng",
        "Hình thức",
        "Chất liệu (Da/Nỉ/Gỗ)",
        "Kích thước",
      ],
      status: "active",
    },
    {
      id: "PT_004",
      name: "Bàn làm việc",
      category: "Nội thất",
      attributes: ["Tình trạng", "Hình thức", "Yêu cầu tháo lắp", "Chất liệu"],
      status: "active",
    },
    {
      id: "PT_005",
      name: "Lò vi sóng",
      category: "Gia dụng",
      attributes: [
        "Tình trạng máy",
        "Hình thức",
        "Yêu cầu vận chuyển",
        "Công suất",
      ],
      status: "inactive", // Đang tạm ẩn
    },
  ];

  const [productTypes, setProductTypes] = useState(initialProductTypes);
  const [searchTerm, setSearchTerm] = useState("");

  // 2. XỬ LÝ TÌM KIẾM
  const filteredTypes = productTypes.filter(
    (type) =>
      type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* --- HEADER CỦA BẢNG --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            Loại Sản Phẩm & Thuộc Tính
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý {productTypes.length} loại sản phẩm và các thuộc tính động
          </p>
        </div>

        <button className="bg-[#16a34a] text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 hover:bg-green-700 transition">
          <span className="material-symbols-outlined text-[20px]">add</span>
          Thêm Loại SP mới
        </button>
      </div>

      {/* --- THANH TÌM KIẾM --- */}
      <div className="mb-6 relative w-full md:w-1/2">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">
          search
        </span>
        <input
          type="text"
          placeholder="Tìm kiếm theo tên loại SP hoặc danh mục..."
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
              <th className="p-4 font-semibold">Tên Loại SP</th>
              <th className="p-4 font-semibold">Thuộc Danh mục</th>
              <th className="p-4 font-semibold w-2/5">
                Các Thuộc Tính Cấu Hình
              </th>
              <th className="p-4 font-semibold">Trạng thái</th>
              <th className="p-4 font-semibold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {filteredTypes.length > 0 ? (
              filteredTypes.map((type) => (
                <tr
                  key={type.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="p-4 font-bold text-[#244f4d]">{type.name}</td>
                  <td className="p-4 text-gray-600 font-medium">
                    {type.category}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1.5">
                      {type.attributes.map((attr, index) => (
                        <span
                          key={index}
                          className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-1 rounded text-xs"
                        >
                          {attr}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        type.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {type.status === "active" ? "Hoạt động" : "Đang ẩn"}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition"
                      title="Chỉnh sửa cấu hình"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        settings
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
                <td colSpan="5" className="p-8 text-center text-gray-500">
                  {searchTerm ? (
                    <span>
                      Không tìm thấy loại sản phẩm nào khớp với "{searchTerm}"
                    </span>
                  ) : (
                    <span>Chưa có loại sản phẩm nào.</span>
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
