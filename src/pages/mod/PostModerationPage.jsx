import React, { useState, useEffect } from 'react';
import { 
  SearchOutlined, 
  LoadingOutlined, 
  WarningOutlined, 
  FileTextOutlined,
  StopOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  AppstoreOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import { postApi } from '../../services/apis/postApi';
import axiosClient from '../../services/apis/axiosClient'; // Import trực tiếp axiosClient
import useDebounce from '../../hooks/useDebounce';

const PostModerationPage = () => {
  // --- STATES ---
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  // --- API: LẤY DANH SÁCH BÀI ĐĂNG ---
  useEffect(() => {
    fetchPosts();
  }, [debouncedSearchQuery]);

  const fetchPosts = async () => {
    setIsLoadingList(true);
    try {
      const response = await postApi.getAll({ pageNumber: 1, pageSize: 50 });
      const postList = response?.items || [];
      
      // Tìm theo productName hoặc description
      const filteredPosts = debouncedSearchQuery
        ? postList.filter(p => 
            p.productName?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || 
            p.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
          )
        : postList;

      setPosts(filteredPosts);
    } catch (error) {
      console.error("Lỗi tải danh sách bài đăng:", error);
      setPosts([]);
    } finally {
      setIsLoadingList(false);
    }
  };

  // --- API: LẤY CHI TIẾT BÀI ĐĂNG ---
  const handleSelectPost = async (id) => {
    if (!id) return;
    setIsLoadingDetail(true);
    try {
      const data = await postApi.getById(id);
      setSelectedPost(data);
    } catch (error) {
      console.error("Lỗi tải chi tiết bài đăng:", error);
      setSelectedPost({ postId: id, productName: "Lỗi không tải được dữ liệu" });
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // --- API: ĐÌNH CHỈ BÀI ĐĂNG (INLINE API) ---
  const handleSuspendPost = async () => {
    if (!suspendReason.trim()) {
      alert("Vui lòng nhập lý do đình chỉ bài đăng!");
      return;
    }
    
    setIsProcessing(true);
    try {
      const currentId = selectedPost.postId || selectedPost.id;
      
      // Gọi API trực tiếp bằng axiosClient thay vì thông qua modApi
      await axiosClient.patch(`/moderator/posts/${currentId}/suspend`, { reason: suspendReason });
      
      alert("Đã đình chỉ bài đăng thành công!");
      setShowSuspendModal(false);
      setSuspendReason('');
      
      handleSelectPost(currentId);
      fetchPosts();
    } catch (error) {
      console.error("Lỗi khi đình chỉ:", error);
      alert("Có lỗi xảy ra khi gọi API Đình chỉ!");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- API MOCK: MỞ LẠI BÀI ĐĂNG ---
  const handleMockRestore = async () => {
    if (!window.confirm("Bạn có chắc muốn MỞ LẠI bài đăng này? (Hành động này hiện đang Mock)")) return;
    
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSelectedPost(prev => ({ ...prev, status: 'Active' }));
      alert("Đã mở lại bài đăng thành công (Mock)!");
      fetchPosts();
    } finally {
      setIsProcessing(false);
    }
  };

  // --- HELPERS RENDER UI ---
  const renderStatus = (status) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-semibold border border-emerald-200">Hoạt động</span>;
      case 'SUSPENDED': return <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs font-semibold border border-red-200">Bị đình chỉ</span>;
      case 'CLOSED': return <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded text-xs font-semibold border border-gray-300">Đã đóng</span>;
      case 'DELETED': return <span className="text-stone-600 bg-stone-100 px-2 py-0.5 rounded text-xs font-semibold border border-stone-300">Đã xóa</span>;
      default: return <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs font-semibold">{status || 'N/A'}</span>;
    }
  };

  const getPostTitle = (post) => {
    if (post.productName) return post.productName;
    if (post.description) return post.description.substring(0, 50) + "...";
    return "Bài đăng chưa cập nhật tên";
  };

  return (
    <div className="flex h-full bg-white animate-fade-in">
      {/* CỘT TRÁI: DANH SÁCH BÀI ĐĂNG */}
      <div className="w-[380px] border-r border-gray-200 flex flex-col bg-white shrink-0">
        <div className="p-4 flex justify-between items-center border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            Quản lý Bài đăng
            {!isLoadingList && (
              <span className="bg-blue-100 text-blue-600 text-xs py-0.5 px-2 rounded-full font-bold">
                {posts.length}
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
              placeholder="Tìm kiếm theo tên sản phẩm..." 
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
          ) : posts.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Không tìm thấy bài đăng nào.</div>
          ) : (
            posts.map(post => {
              const currentId = post.postId || post.id;
              const isSelected = selectedPost && (selectedPost.postId === currentId || selectedPost.id === currentId);
              const displayTitle = getPostTitle(post);

              return (
                <div 
                  key={currentId}
                  onClick={() => handleSelectPost(currentId)}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition-all ${isSelected ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : 'hover:bg-gray-100 border-l-4 border-l-transparent'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className={`font-semibold text-sm line-clamp-2 ${isSelected ? 'text-blue-600' : 'text-gray-800'}`}>
                      {post.postType === 'Buy' ? <span className="text-rose-600 mr-1">[Thu mua]</span> : <span className="text-[#0aa679] mr-1">[Bán]</span>}
                      {displayTitle}
                    </h3>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500 mt-1.5">
                    {renderStatus(post.status)}
                    <span>{post.createdAt ? new Date(post.createdAt).toLocaleDateString('vi-VN') : ''}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CỘT PHẢI: CHI TIẾT BÀI ĐĂNG */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden border-l border-gray-200">
        {isLoadingDetail ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-slate-50">
            <LoadingOutlined className="text-5xl text-blue-500 mb-4" />
            <p className="text-lg">Đang truy xuất dữ liệu chi tiết...</p>
          </div>
        ) : selectedPost ? (
          <>
            {/* Header */}
            <div className="px-8 py-5 border-b border-gray-200 bg-white shadow-sm z-10 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${selectedPost.postType === 'Buy' ? 'bg-rose-500' : 'bg-[#0aa679]'}`}>
                    {selectedPost.postType === 'Buy' ? 'THU MUA' : 'ĐĂNG BÁN'}
                  </span>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {getPostTitle(selectedPost)}
                  </h1>
                </div>
                <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                  <FileTextOutlined /> Mã bài đăng: <strong className="text-gray-700">{selectedPost.postId || selectedPost.id || "N/A"}</strong>
                </p>
              </div>
              <div>{renderStatus(selectedPost.status)}</div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
              <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Section 1: Thông tin cơ bản */}
                <section className="bg-white p-7 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-base font-bold text-gray-900 mb-5 pb-3 border-b flex items-center gap-2">
                    <InfoCircleOutlined className="text-blue-500" /> Thông tin cơ bản
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-sm">
                    <div>
                      <span className="block text-gray-500 mb-1">Giá trị</span>
                      <span className="font-bold text-lg text-rose-600">
                        {selectedPost.basePrice ? selectedPost.basePrice.toLocaleString('vi-VN') + ' đ' : 'Thỏa thuận'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-gray-500 mb-1">Ngày đăng</span>
                      <span className="font-medium text-gray-900">
                        {selectedPost.createdAt ? new Date(selectedPost.createdAt).toLocaleString('vi-VN') : 'N/A'}
                      </span>
                    </div>

                    <div className="col-span-2 my-1 border-t border-dashed border-gray-200"></div>

                    <div className="col-span-2">
                      <span className="block text-gray-500 mb-1">Mô tả bài đăng</span>
                      <p className="font-medium text-gray-900 whitespace-pre-wrap leading-relaxed">
                        {selectedPost.description || 'Không có mô tả'}
                      </p>
                    </div>

                    {selectedPost.product?.detailDescription && (
                      <div className="col-span-2">
                        <span className="block text-gray-500 mb-1">Mô tả chi tiết sản phẩm</span>
                        <p className="font-medium text-gray-900 whitespace-pre-wrap leading-relaxed">
                          {selectedPost.product.detailDescription}
                        </p>
                      </div>
                    )}

                    {selectedPost.medias && selectedPost.medias.length > 0 && (
                      <div className="col-span-2 mt-2">
                        <span className="block text-gray-500 mb-2">Hình ảnh đính kèm ({selectedPost.medias.length})</span>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                          {selectedPost.medias.map((img, idx) => (
                            <img key={idx} src={img.url || img.mediaUrl || img} alt="post_image" className="h-32 w-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.open(img.url || img.mediaUrl || img, '_blank')} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Section 2: Phân loại & Tình trạng */}
                <section className="bg-white p-7 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-base font-bold text-gray-900 mb-5 pb-3 border-b flex items-center gap-2">
                    <AppstoreOutlined className="text-blue-500" /> Phân loại & Tình trạng
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-sm">
                    <div className="col-span-2 md:col-span-1">
                      <span className="block text-gray-500 mb-1">Danh mục - Ngành hàng</span>
                      <span className="font-medium text-gray-900">
                        {selectedPost.categoryName || 'N/A'} {selectedPost.productTypeName ? `> ${selectedPost.productTypeName}` : ''}
                      </span>
                    </div>
                    
                    <div className="col-span-2 md:col-span-1">
                      <span className="block text-gray-500 mb-1">Thương hiệu</span>
                      <span className="font-medium text-gray-900">{selectedPost.brandName || 'Chưa cập nhật'}</span>
                    </div>

                    <div className="col-span-2 md:col-span-1">
                      <span className="block text-gray-500 mb-1">Tình trạng hoạt động</span>
                      <span className="font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {selectedPost.product?.functionalityStatus || 'Chưa cập nhật'}
                      </span>
                    </div>

                    <div className="col-span-2 md:col-span-1">
                      <span className="block text-gray-500 mb-1">Mức độ hư hỏng (Ngoại hình)</span>
                      <span className="font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                        {selectedPost.product?.damageLevel || 'Chưa cập nhật'}
                      </span>
                    </div>

                    <div className="col-span-2 my-1 border-t border-dashed border-gray-200"></div>

                    <div className="col-span-2">
                      <span className="block text-gray-500 mb-1 flex items-center gap-1">
                        <EnvironmentOutlined /> Khu vực giao dịch
                      </span>
                      <span className="font-medium text-gray-900">
                        {[selectedPost.streetAddress, selectedPost.ward, selectedPost.city].filter(Boolean).join(', ') || 'Chưa cập nhật địa chỉ'}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Section 3: Thông số kỹ thuật (Nếu có) */}
                {selectedPost.product?.attributeValues && selectedPost.product.attributeValues.length > 0 && (
                  <section className="bg-white p-7 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-base font-bold text-gray-900 mb-5 pb-3 border-b flex items-center gap-2">
                      <AppstoreOutlined className="text-blue-500" /> Thông số kỹ thuật
                    </h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                      {selectedPost.product.attributeValues.map((attr, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <span className="block text-gray-500 mb-1 text-xs">{attr.attributeName}</span>
                          <span className="font-semibold text-gray-900">
                            {attr.valueText || attr.valueNumber || attr.optionValue || 'N/A'} {attr.unit ? ` ${attr.unit}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                
              </div>
            </div>

            {/* Action Footer */}
            <div className="px-8 py-5 border-t border-gray-200 bg-white flex justify-end gap-3 z-10 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)]">
              {selectedPost.status?.toUpperCase() === 'ACTIVE' && (
                <button 
                  onClick={() => setShowSuspendModal(true)}
                  disabled={isProcessing}
                  className="px-6 py-2.5 text-sm font-semibold text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 flex items-center gap-2"
                >
                  <StopOutlined /> Đình chỉ bài đăng
                </button>
              )}

              {selectedPost.status?.toUpperCase() === 'SUSPENDED' && (
                <button 
                  onClick={handleMockRestore}
                  disabled={isProcessing}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-sm"
                >
                  {isProcessing ? <LoadingOutlined /> : <ReloadOutlined />} Mở lại bài đăng (Mock)
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-slate-50">
            <FileTextOutlined className="text-6xl text-gray-300 mb-4" />
            <p className="text-lg">Chọn một bài đăng bên danh sách để xem chi tiết</p>
          </div>
        )}
      </div>

      {/* MODAL ĐÌNH CHỈ */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <WarningOutlined className="text-red-500" /> Đình chỉ bài đăng
            </h3>
            <p className="text-sm text-gray-500 mb-4">Bài đăng này sẽ bị ẩn khỏi hệ thống. Vui lòng cung cấp lý do đình chỉ.</p>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-1 focus:ring-red-500 outline-none resize-none"
              rows="4"
              placeholder="Nhập lý do đình chỉ (Ví dụ: Chứa nội dung phản cảm, lừa đảo...)"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
            ></textarea>
            <div className="flex justify-end gap-3 mt-5">
              <button 
                onClick={() => setShowSuspendModal(false)} 
                disabled={isProcessing} 
                className="px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Hủy
              </button>
              <button 
                onClick={handleSuspendPost} 
                disabled={isProcessing} 
                className="px-5 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2"
              >
                {isProcessing && <LoadingOutlined />} Xác nhận đình chỉ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostModerationPage;