import React, { useState, useEffect } from "react";
import {
  SearchOutlined,
  LoadingOutlined,
  WarningOutlined,
  FileTextOutlined,
  StopOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  AppstoreOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { Alert, Button, Input } from "antd";
import { postApi } from "../../services/apis/postApi";
import axiosClient from "../../services/apis/axiosClient";
import useDebounce from "../../hooks/useDebounce";

const PostModerationPage = () => {
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);

  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // --- STATE RESIZABLE CỘT TRÁI ---
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = e.clientX - 250; // Trừ sidebar menu chính
      if (newWidth >= 300 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Inline Actions
  const [actionState, setActionState] = useState("idle");
  const [suspendReason, setSuspendReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [globalFeedback, setGlobalFeedback] = useState(null);

  // =========================================================================
  // API EFFECTS
  // =========================================================================
  useEffect(() => {
    fetchPosts();
  }, []); // Chỉ gọi API 1 lần lúc đầu để lấy full list về client

  const fetchPosts = async () => {
    setIsLoadingList(true);
    try {
      const response = await postApi.getAll({ pageNumber: 1, pageSize: 50 });
      const postList = response?.items || [];
      setPosts(postList);
    } catch (error) {
      setPosts([]);
    } finally {
      setIsLoadingList(false);
    }
  };

  // --- LỌC CLIENT-SIDE (Hỗ trợ tìm theo tên, mô tả VÀ ID bài đăng) ---
  const filteredPosts = debouncedSearchQuery
    ? posts.filter((p) => {
        const query = debouncedSearchQuery.toLowerCase();
        const productName = p.productName?.toLowerCase() || "";
        const description = p.description?.toLowerCase() || "";
        const postId = (p.postId || p.id || "").toLowerCase();

        // Format ngày tạo sang chuỗi tiếng Việt (ví dụ: "12/8/2026") để khớp với từ khóa gõ vào
        const dateString = p.createdAt
          ? new Date(p.createdAt).toLocaleDateString("vi-VN").toLowerCase()
          : "";

        return (
          productName.includes(query) ||
          description.includes(query) ||
          postId.includes(query) ||
          dateString.includes(query)
        );
      })
    : posts;

  const handleSelectPost = async (id) => {
    if (!id) return;
    setIsLoadingDetail(true);
    setDetailError(null);
    setActionState("idle");
    setActionFeedback(null);
    setGlobalFeedback(null);

    try {
      const data = await postApi.getById(id);
      setSelectedPost(data);
    } catch (error) {
      setSelectedPost(null);
      if (error.response?.status >= 500) {
        setDetailError("Lỗi máy chủ. Vui lòng thử lại sau.");
      } else {
        setDetailError("Dữ liệu bài đăng bị lỗi hoặc không tồn tại.");
      }
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // =========================================================================
  // ACTIONS HANDLERS
  // =========================================================================
  const handleSuspendPost = async () => {
    if (!suspendReason.trim()) {
      setActionFeedback({
        type: "error",
        text: "Vui lòng nhập lý do đình chỉ bài đăng!",
      });
      return;
    }

    setIsProcessing(true);
    setActionFeedback(null);
    try {
      const currentId = selectedPost.postId || selectedPost.id;
      await axiosClient.patch(`/moderator/posts/${currentId}/suspend`, {
        reason: suspendReason.trim(),
      });

      setSelectedPost(null);
      setGlobalFeedback({
        type: "success",
        text: "Đã đình chỉ bài đăng thành công!",
      });
      fetchPosts();
    } catch (error) {
      const msg =
        error.response?.status >= 500
          ? "Lỗi máy chủ. Vui lòng thử lại sau."
          : error.response?.data?.message ||
            "Có lỗi xảy ra khi gọi API Đình chỉ!";
      setActionFeedback({ type: "error", text: msg });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMockRestore = async () => {
    setIsProcessing(true);
    setActionFeedback(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSelectedPost(null);
      setGlobalFeedback({
        type: "success",
        text: "Đã mở lại bài đăng thành công (Mock)!",
      });
      fetchPosts();
    } catch (error) {
      setActionFeedback({
        type: "error",
        text: "Lỗi máy chủ. Vui lòng thử lại sau.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // =========================================================================
  // UI HELPERS
  // =========================================================================
  const renderStatus = (status) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return (
          <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-semibold border border-emerald-200">
            Hoạt động
          </span>
        );
      case "SUSPENDED":
        return (
          <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs font-semibold border border-red-200">
            Bị đình chỉ
          </span>
        );
      case "CLOSED":
        return (
          <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded text-xs font-semibold border border-gray-300">
            Đã đóng
          </span>
        );
      case "DELETED":
        return (
          <span className="text-stone-600 bg-stone-100 px-2 py-0.5 rounded text-xs font-semibold border border-stone-300">
            Đã xóa
          </span>
        );
      default:
        return (
          <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs font-semibold">
            {status || "N/A"}
          </span>
        );
    }
  };

  const getPostTitle = (post) => {
    if (post.productName) return post.productName;
    if (post.description) return post.description.substring(0, 50) + "...";
    return "Bài đăng chưa cập nhật tên";
  };

  return (
    <div className="flex h-full bg-white animate-fade-in overflow-hidden">
      {/* CỘT TRÁI (CÓ RESIZE & SEARCH ID) */}
      <div
        style={{ width: `${sidebarWidth}px` }}
        className="border-r border-gray-200 flex flex-col bg-white shrink-0 relative select-none"
      >
        <div className="p-4 flex justify-between items-center border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            Quản lý Bài đăng
            {!isLoadingList && (
              <span className="bg-blue-100 text-blue-600 text-xs py-0.5 px-2 rounded-full font-bold">
                {filteredPosts.length}
              </span>
            )}
          </h2>
        </div>

        <div className="p-4 pb-2 border-b border-gray-100 bg-gray-50/50">
          <div className="relative mb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên sản phẩm hoặc ID..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
            />
            <SearchOutlined className="absolute left-3 top-2.5 text-gray-400" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50/30">
          {isLoadingList ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <LoadingOutlined className="text-3xl mb-2 text-blue-500" />
              <p className="text-sm">Đang tải danh sách...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              Không tìm thấy bài đăng nào.
            </div>
          ) : (
            filteredPosts.map((post) => {
              const currentId = post.postId || post.id;
              const isSelected =
                selectedPost &&
                (selectedPost.postId === currentId ||
                  selectedPost.id === currentId);
              return (
                <div
                  key={currentId}
                  onClick={() => handleSelectPost(currentId)}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition-all ${isSelected ? "bg-blue-50/50 border-l-4 border-l-blue-500" : "hover:bg-gray-100 border-l-4 border-l-transparent"}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3
                      className={`font-semibold text-sm line-clamp-2 ${isSelected ? "text-blue-600" : "text-gray-800"}`}
                    >
                      {post.postType === "Buy" ? (
                        <span className="text-rose-600 mr-1">[Thu mua]</span>
                      ) : (
                        <span className="text-[#0aa679] mr-1">[Bán]</span>
                      )}
                      {getPostTitle(post)}
                    </h3>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500 mt-1.5">
                    {renderStatus(post.status)}
                    <span>
                      {post.createdAt
                        ? new Date(post.createdAt).toLocaleDateString("vi-VN")
                        : ""}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Thanh kéo chuột resize */}
        <div
          onMouseDown={startResizing}
          className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize transition-colors z-20 hover:bg-[#0aa679] ${isResizing ? "bg-[#0aa679]" : "bg-transparent"}`}
          title="Kéo để thay đổi kích thước"
        />
      </div>

      {/* CỘT PHẢI */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden border-l border-gray-200">
        {!selectedPost && !isLoadingDetail ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-slate-50 p-8 text-center">
            {globalFeedback && (
              <Alert
                message={globalFeedback.text}
                type={globalFeedback.type}
                showIcon
                className="mb-6 w-full max-w-md"
              />
            )}
            <FileTextOutlined className="text-6xl text-gray-300 mb-4" />
            <p className="text-lg">
              Chọn một bài đăng bên danh sách để xem chi tiết
            </p>
          </div>
        ) : isLoadingDetail ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-slate-50">
            <LoadingOutlined className="text-5xl text-blue-500 mb-4" />
            <p className="text-lg">Đang truy xuất dữ liệu chi tiết...</p>
          </div>
        ) : detailError ? (
          <div className="flex-1 flex flex-col items-center justify-center text-red-500 bg-slate-50">
            <WarningOutlined className="text-5xl mb-3" />
            <span className="text-lg font-medium">{detailError}</span>
          </div>
        ) : selectedPost ? (
          <>
            {/* Header */}
            <div className="px-8 py-5 border-b border-gray-200 bg-white shadow-sm z-10 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold text-white ${selectedPost.postType === "Buy" ? "bg-rose-500" : "bg-[#0aa679]"}`}
                  >
                    {selectedPost.postType === "Buy" ? "THU MUA" : "ĐĂNG BÁN"}
                  </span>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {getPostTitle(selectedPost)}
                  </h1>
                </div>
                <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                  <FileTextOutlined /> Mã bài đăng:{" "}
                  <strong className="text-gray-700">
                    {selectedPost.postId || selectedPost.id || "N/A"}
                  </strong>
                </p>
              </div>
              <div>{renderStatus(selectedPost.status)}</div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Thông tin cơ bản */}
                <section className="bg-white p-7 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-base font-bold text-gray-900 mb-5 pb-3 border-b flex items-center gap-2">
                    <InfoCircleOutlined className="text-blue-500" /> Thông tin
                    cơ bản
                  </h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-sm">
                    <div>
                      <span className="block text-gray-500 mb-1">Giá trị</span>
                      <span className="font-bold text-lg text-rose-600">
                        {selectedPost.basePrice
                          ? selectedPost.basePrice.toLocaleString("vi-VN") +
                            " đ"
                          : "Thỏa thuận"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-gray-500 mb-1">
                        Ngày đăng
                      </span>
                      <span className="font-medium text-gray-900">
                        {selectedPost.createdAt
                          ? new Date(selectedPost.createdAt).toLocaleString(
                              "vi-VN",
                            )
                          : "N/A"}
                      </span>
                    </div>
                    <div className="col-span-2 my-1 border-t border-dashed border-gray-200"></div>
                    <div className="col-span-2">
                      <span className="block text-gray-500 mb-1">
                        Mô tả bài đăng
                      </span>
                      <p className="font-medium text-gray-900 whitespace-pre-wrap leading-relaxed">
                        {selectedPost.description || "Không có mô tả"}
                      </p>
                    </div>
                    {selectedPost.product?.detailDescription && (
                      <div className="col-span-2">
                        <span className="block text-gray-500 mb-1">
                          Mô tả chi tiết sản phẩm
                        </span>
                        <p className="font-medium text-gray-900 whitespace-pre-wrap leading-relaxed">
                          {selectedPost.product.detailDescription}
                        </p>
                      </div>
                    )}
                    {selectedPost.medias && selectedPost.medias.length > 0 && (
                      <div className="col-span-2 mt-2">
                        <span className="block text-gray-500 mb-2">
                          Hình ảnh đính kèm ({selectedPost.medias.length})
                        </span>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                          {selectedPost.medias.map((img, idx) => (
                            <img
                              key={idx}
                              src={img.url || img.mediaUrl || img}
                              alt="post_image"
                              className="h-32 w-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() =>
                                window.open(
                                  img.url || img.mediaUrl || img,
                                  "_blank",
                                )
                              }
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Phân loại */}
                <section className="bg-white p-7 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-base font-bold text-gray-900 mb-5 pb-3 border-b flex items-center gap-2">
                    <AppstoreOutlined className="text-blue-500" /> Phân loại &
                    Tình trạng
                  </h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-sm">
                    <div className="col-span-2 md:col-span-1">
                      <span className="block text-gray-500 mb-1">
                        Danh mục - Ngành hàng
                      </span>
                      <span className="font-medium text-gray-900">
                        {selectedPost.categoryName || "N/A"}{" "}
                        {selectedPost.productTypeName
                          ? `> ${selectedPost.productTypeName}`
                          : ""}
                      </span>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <span className="block text-gray-500 mb-1">
                        Thương hiệu
                      </span>
                      <span className="font-medium text-gray-900">
                        {selectedPost.brandName || "Chưa cập nhật"}
                      </span>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <span className="block text-gray-500 mb-1">
                        Tình trạng hoạt động
                      </span>
                      <span className="font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {selectedPost.product?.functionalityStatus ||
                          "Chưa cập nhật"}
                      </span>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <span className="block text-gray-500 mb-1">
                        Mức độ hư hỏng (Ngoại hình)
                      </span>
                      <span className="font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                        {selectedPost.product?.damageLevel || "Chưa cập nhật"}
                      </span>
                    </div>
                    <div className="col-span-2 my-1 border-t border-dashed border-gray-200"></div>
                    <div className="col-span-2">
                      <span className="block text-gray-500 mb-1 flex items-center gap-1">
                        <EnvironmentOutlined /> Khu vực giao dịch
                      </span>
                      <span className="font-medium text-gray-900">
                        {[
                          selectedPost.streetAddress,
                          selectedPost.ward,
                          selectedPost.city,
                        ]
                          .filter(Boolean)
                          .join(", ") || "Chưa cập nhật địa chỉ"}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Thuộc tính */}
                {selectedPost.product?.attributeValues &&
                  selectedPost.product.attributeValues.length > 0 && (
                    <section className="bg-white p-7 rounded-xl shadow-sm border border-gray-200">
                      <h3 className="text-base font-bold text-gray-900 mb-5 pb-3 border-b flex items-center gap-2">
                        <AppstoreOutlined className="text-blue-500" /> Thông số
                        kỹ thuật
                      </h3>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                        {selectedPost.product.attributeValues.map(
                          (attr, idx) => {
                            // Lọc bỏ chữ "string" hoặc null/undefined/rỗng
                            const rawUnit = attr.unit;
                            const isValidUnit =
                              rawUnit && rawUnit.toLowerCase() !== "string";
                            const unitText = isValidUnit ? ` ${rawUnit}` : "";

                            return (
                              <div
                                key={idx}
                                className="bg-gray-50 p-3 rounded-lg border border-gray-100"
                              >
                                <span className="block text-gray-500 mb-1 text-xs">
                                  {attr.attributeName}
                                </span>
                                <span className="font-semibold text-gray-900">
                                  {attr.valueText ||
                                    attr.valueNumber ||
                                    attr.optionValue ||
                                    "N/A"}
                                  {unitText}
                                </span>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </section>
                  )}
              </div>
            </div>

            {/* INLINE ACTIONS FOOTER */}
            <div className="px-8 py-5 border-t border-gray-200 bg-white flex flex-col gap-3 z-10 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)]">
              {actionFeedback && (
                <Alert
                  message={actionFeedback.text}
                  type={actionFeedback.type}
                  showIcon
                />
              )}

              {actionState === "idle" && (
                <div className="flex justify-end gap-3">
                  {selectedPost.status?.toUpperCase() === "ACTIVE" && (
                    <Button
                      onClick={() => setActionState("suspending")}
                      danger
                      className="font-semibold flex items-center gap-2"
                    >
                      <StopOutlined /> Đình chỉ bài đăng
                    </Button>
                  )}
                  {selectedPost.status?.toUpperCase() === "SUSPENDED" && (
                    <Button
                      onClick={() => setActionState("restoring")}
                      className="font-semibold flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <ReloadOutlined /> Mở lại bài đăng (Mock)
                    </Button>
                  )}
                </div>
              )}

              {actionState === "suspending" && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                    <WarningOutlined /> Lý do đình chỉ:
                  </p>
                  <Input.TextArea
                    rows={3}
                    placeholder="Nhập lý do (Ví dụ: Chứa nội dung phản cảm, lừa đảo...)"
                    value={suspendReason}
                    onChange={(e) => {
                      setSuspendReason(e.target.value);
                      if (actionFeedback) setActionFeedback(null);
                    }}
                    className="mb-3"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={() => {
                        setActionState("idle");
                        setSuspendReason("");
                      }}
                      disabled={isProcessing}
                    >
                      Hủy
                    </Button>
                    <Button
                      danger
                      type="primary"
                      onClick={handleSuspendPost}
                      loading={isProcessing}
                    >
                      Xác nhận đình chỉ
                    </Button>
                  </div>
                </div>
              )}

              {actionState === "restoring" && (
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                  <p className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                    <WarningOutlined /> Bạn có chắc muốn MỞ LẠI bài đăng này?
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={() => setActionState("idle")}
                      disabled={isProcessing}
                    >
                      Hủy
                    </Button>
                    <Button
                      type="primary"
                      onClick={handleMockRestore}
                      loading={isProcessing}
                      className="bg-emerald-600 hover:bg-emerald-700 border-none"
                    >
                      Xác nhận mở lại
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default PostModerationPage;
