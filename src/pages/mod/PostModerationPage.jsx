import { useState } from "react";
import { POST_STATUS } from "../../constants/roles";
import { mockPostsToModerate } from "../../utils/mockData"; // Lấy data bạn vừa tạo

const PostModerationPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");

  // Hàm render Badge màu sắc tùy theo trạng thái
  const renderStatusBadge = (status, reportReason) => {
    if (status === POST_STATUS.PENDING) {
      return (
        <span className="px-2 py-1 text-xs font-bold text-yellow-700 bg-yellow-100 rounded-md">
          Chờ duyệt
        </span>
      );
    }
    if (status === POST_STATUS.REPORTED) {
      return (
        <div className="flex flex-col items-end gap-1">
          <span className="px-2 py-1 text-xs font-bold text-red-700 bg-red-100 rounded-md">
            Bị báo cáo
          </span>
          <span
            className="text-[10px] text-red-500 text-right w-32 truncate"
            title={reportReason}
          >
            {reportReason}
          </span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 h-full bg-[#f8f9fa] overflow-y-auto">
      {/* Tiêu đề & Công cụ */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">
          Kiểm duyệt bài viết
        </h1>

        <div className="flex gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
          <input
            type="text"
            placeholder="Tìm theo tên sản phẩm hoặc người đăng..."
            className="flex-1 h-10 px-3 text-sm border border-gray-300 rounded focus:outline-none focus:border-teal-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="h-10 px-3 text-sm border border-gray-300 rounded focus:outline-none focus:border-teal-500"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="ALL">Tất cả loại tin</option>
            <option value="SELL">Tin đăng bán</option>
            <option value="BUY">Tin thu mua</option>
          </select>
        </div>
      </div>

      {/* Danh sách Bài viết (List View) */}
      <div className="space-y-3">
        {mockPostsToModerate.map((post) => (
          <div
            key={post.id}
            className="flex gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            {/* Cột 1: Ảnh */}
            <img
              src={post.image}
              alt={post.name}
              className="w-24 h-24 object-cover rounded-md flex-shrink-0 border border-gray-200"
            />

            {/* Cột 2: Thông tin chính */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${post.postType === "SELL" ? "text-blue-600" : "text-teal-600"}`}
                >
                  {post.postType === "SELL" ? "Tin Bán" : "Tin Mua"}
                </span>
                <h3 className="font-semibold text-slate-900 text-lg leading-tight mt-1">
                  {post.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Đăng bởi:{" "}
                  <span className="font-medium text-slate-700">
                    {post.owner}
                  </span>
                </p>
              </div>
              <p className="text-xs text-gray-400">Khu vực: {post.area}</p>
            </div>

            {/* Cột 3: Giá & Ngày */}
            <div className="w-32 flex flex-col justify-center text-sm border-l border-gray-100 pl-4">
              <p className="text-teal-700 font-bold">
                {post.price === 0
                  ? "Thương lượng"
                  : `${post.price.toLocaleString("vi-VN")} đ`}
              </p>
              <p className="text-gray-500 text-xs mt-1">{post.postDate}</p>
            </div>

            {/* Cột 4: Trạng thái & Thao tác */}
            <div className="w-32 flex flex-col justify-between items-end border-l border-gray-100 pl-4">
              {renderStatusBadge(post.status, post.reportReason)}
              <button className="px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-300 rounded hover:bg-slate-50 transition-colors">
                Xem chi tiết
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PostModerationPage;
