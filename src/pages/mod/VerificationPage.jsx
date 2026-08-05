import React, { useState, useEffect } from 'react';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  InfoCircleOutlined, 
  EyeOutlined,
  BankOutlined,
  IdcardOutlined,
  FileProtectOutlined,
  SearchOutlined,
  WarningOutlined,
  HistoryOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { modApi } from '../../services/apis/modApi';
import useDebounce from '../../hooks/useDebounce';

const VerificationPage = () => {
  // --- STATES ---
  const [activeTab, setActiveTab] = useState('PERSONAL'); 
  const [requests, setRequests] = useState([]); 
  const [selectedReqDetail, setSelectedReqDetail] = useState(null); 
  
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500); 
  
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // --- API: LẤY DANH SÁCH ---
  useEffect(() => {
    fetchList();
  }, [activeTab, debouncedSearchQuery]);

  const fetchList = async () => {
    setIsLoadingList(true);
    setSelectedReqDetail(null); 
    try {
      let response;
      if (activeTab === 'PERSONAL') {
        response = await modApi.getPendingPersonalProfiles(debouncedSearchQuery);
      } else {
        response = await modApi.getPendingBusinessProfiles(debouncedSearchQuery);
      }
      
      if (response && response.success) {
        setRequests(response.data || []);
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách:", error);
      setRequests([]);
    } finally {
      setIsLoadingList(false);
    }
  };

  // --- API: LẤY CHI TIẾT HỒ SƠ ---
  const handleSelectProfile = async (id) => {
    if (!id) return;
    setIsLoadingDetail(true);
    try {
      let response;
      if (activeTab === 'PERSONAL') {
        response = await modApi.getPersonalProfileDetail(id);
      } else {
        response = await modApi.getBusinessProfileDetail(id);
      }
      
      if (response && (response.success || response.personalProfileId)) {
        // Có thể API backend trả thẳng object data hoặc bọc trong response.data
        const data = response.data || response; 
        setSelectedReqDetail(data); 
      } else {
        setSelectedReqDetail({ personalProfileId: id, representativeName: "Lỗi tải dữ liệu" });
      }
    } catch (error) {
      console.error("Lỗi khi tải chi tiết:", error);
      setSelectedReqDetail({ personalProfileId: id, representativeName: "Lỗi tải dữ liệu" });
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // --- API: DUYỆT / TỪ CHỐI ---
  const handleApprove = async () => {
    if(!window.confirm("Bạn có chắc chắn muốn PHÊ DUYỆT hồ sơ này?")) return;
    
    setIsProcessing(true);
    try {
      const currentId = activeTab === 'PERSONAL' ? selectedReqDetail.personalProfileId : selectedReqDetail.businessProfileId; 
      
      if (activeTab === 'PERSONAL') {
        await modApi.reviewPersonalProfile(currentId, "Verified");
      } else {
        await modApi.reviewBusinessProfile({ id: currentId, decision: "Verified" });
      }
      
      alert(`Đã DUYỆT thành công hồ sơ!`);
      fetchList(); 
    } catch (error) {
      console.error("Lỗi khi duyệt:", error);
      alert("Có lỗi xảy ra khi phê duyệt từ server!");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return alert('Vui lòng nhập lý do từ chối!');
    
    setIsProcessing(true);
    try {
      const currentId = activeTab === 'PERSONAL' ? selectedReqDetail.personalProfileId : selectedReqDetail.businessProfileId;
      
      if (activeTab === 'PERSONAL') {
        await modApi.reviewPersonalProfile(currentId, "Unverified", rejectReason);
      } else {
        await modApi.reviewBusinessProfile({ id: currentId, decision: "Unverified", rejectReason });
      }
      
      alert(`Đã TỪ CHỐI hồ sơ thành công!`);
      setShowRejectModal(false);
      setRejectReason('');
      fetchList(); 
    } catch (error) {
      console.error("Lỗi khi từ chối:", error);
      alert("Có lỗi xảy ra khi từ chối từ server!");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- HELPERS RENDER UI ---
  const isBankHolderValid = (req) => {
    if (!req) return false;
    const holder = (req.bankAccountHolder || 'NGUYEN VAN MOCK').toUpperCase();
    const name = (req.companyName || 'NGUYEN VAN MOCK').toUpperCase();
    return holder === name;
  };

  const renderDocumentBox = (imageUrl, placeholderText) => (
    <div className="border border-gray-300 rounded-lg p-2 bg-gray-100 flex flex-col items-center justify-center aspect-[1.6/1] relative group overflow-hidden cursor-pointer hover:border-[#0aa679] transition-colors">
      {imageUrl ? (
        <img src={imageUrl} alt="Document" className="w-full h-full object-cover rounded" />
      ) : (
        <>
          <FileProtectOutlined className="text-3xl text-gray-400 mb-2 group-hover:text-[#0aa679]" />
          <span className="text-sm text-gray-500 font-medium text-center px-4">{placeholderText}</span>
        </>
      )}
      {imageUrl && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => window.open(imageUrl, '_blank')}>
          <EyeOutlined className="text-2xl text-white mb-1" />
          <span className="text-white text-sm font-semibold">Xem ảnh gốc</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full bg-white animate-fade-in">
      {/* --- CỘT TRÁI: DANH SÁCH --- */}
      <div className="w-[380px] border-r border-gray-200 flex flex-col bg-white shrink-0">
        <div className="p-4 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            Hồ sơ chờ duyệt
            {!isLoadingList && (
              <span className="bg-red-100 text-red-600 text-xs py-0.5 px-2 rounded-full font-bold">
                {requests.length}
              </span>
            )}
          </h2>
          <button className="text-gray-500 hover:text-[#0aa679] text-sm flex items-center gap-1 font-medium transition-colors">
            <HistoryOutlined /> Lịch sử
          </button>
        </div>

        <div className="flex border-b border-gray-200 px-2">
          <button 
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'PERSONAL' ? 'border-[#0aa679] text-[#0aa679]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => { setActiveTab('PERSONAL'); setSearchQuery(''); }}
          >
            Cá nhân
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'BUSINESS' ? 'border-[#0aa679] text-[#0aa679]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => { setActiveTab('BUSINESS'); setSearchQuery(''); }}
          >
            Doanh nghiệp
          </button>
        </div>
        
        <div className="p-4 pb-2 border-b border-gray-100 bg-gray-50/50">
          <div className="relative mb-2">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nhập từ khóa tìm kiếm..." 
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#0aa679] outline-none transition-shadow"
            />
            <SearchOutlined className="absolute left-3 top-2.5 text-gray-400" />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-gray-50/30">
          {isLoadingList ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <LoadingOutlined className="text-3xl mb-2 text-[#0aa679]" />
              <p className="text-sm">Đang tải dữ liệu...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Không có hồ sơ nào chờ duyệt.</div>
          ) : (
            requests.map(req => {
              const reqId = activeTab === 'PERSONAL' ? req.personalProfileId : req.id; 
              const reqName = req.representativeName || "Chưa cập nhật tên"; 
              const isSelected = selectedReqDetail && (
                (activeTab === 'PERSONAL' && selectedReqDetail.personalProfileId === reqId) ||
                (activeTab === 'BUSINESS' && selectedReqDetail.id === reqId)
              );

              return (
                <div 
                  key={reqId} 
                  onClick={() => handleSelectProfile(reqId)}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition-all ${isSelected ? 'bg-[#0aa679]/5 border-l-4 border-l-[#0aa679]' : 'hover:bg-gray-100 border-l-4 border-l-transparent'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={`font-semibold text-sm truncate ${isSelected ? 'text-[#0aa679]' : 'text-gray-800'}`}>
                      {reqName}
                    </h3>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500 mt-1.5">
                    <span className="truncate w-32">Mã: {reqId?.substring(0, 8)}...</span>
                    <span>{req.createdAt ? new Date(req.createdAt).toLocaleDateString('vi-VN') : 'N/A'}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* --- CỘT PHẢI: CHI TIẾT --- */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden border-l border-gray-200">
        {isLoadingDetail ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-slate-50">
            <LoadingOutlined className="text-5xl text-[#0aa679] mb-4" />
            <p className="text-lg">Đang truy xuất dữ liệu chi tiết...</p>
          </div>
        ) : selectedReqDetail ? (
          <>
            <div className="px-8 py-5 border-b border-gray-200 bg-white shadow-sm z-10 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1 uppercase">
                  {activeTab === 'BUSINESS' 
                    ? selectedReqDetail.companyName || "CÔNG TY MOCK DATA" 
                    : selectedReqDetail.representativeName || "CHƯA CẬP NHẬT TÊN"}
                </h1>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <IdcardOutlined /> Mã đối tượng: <strong className="text-gray-700">{selectedReqDetail.personalProfileId || selectedReqDetail.id || "N/A"}</strong>
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
              <div className="max-w-4xl mx-auto space-y-6">
                
                {/* 1. THÔNG TIN CHI TIẾT (Tách riêng biệt từng field) */}
                <section className="bg-white p-7 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-base font-bold text-gray-900 mb-5 pb-3 border-b flex items-center gap-2">
                    <InfoCircleOutlined className="text-[#0aa679]" />
                    {activeTab === 'PERSONAL' ? 'Dữ liệu Hồ sơ Cá nhân' : 'Thông tin khai báo (Mock)'}
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-sm">
                    {activeTab === 'BUSINESS' ? (
                      // KHUNG MOCK CỦA BUSINESS (Giữ nguyên chờ API)
                      <>
                        <div className="col-span-2"><span className="block text-gray-500 mb-1">Tên doanh nghiệp / Hộ KD</span><span className="font-semibold text-gray-900 text-base uppercase">{selectedReqDetail.companyName || "CÔNG TY TNHH MOCK DATA"}</span></div>
                        <div><span className="block text-gray-500 mb-1">Mã số thuế</span><span className="font-medium text-gray-900">{selectedReqDetail.taxId || "0312345678 (Mock)"}</span></div>
                        <div className="col-span-2"><span className="block text-gray-500 mb-1">Địa chỉ đăng ký</span><span className="font-medium text-gray-900">{selectedReqDetail.address || "123 Đường Mock, Quận 1, TP.HCM"}</span></div>
                        <div className="col-span-2 my-1 border-t border-dashed border-gray-200"></div>
                        <div><span className="block text-gray-500 mb-1">Người đại diện pháp luật</span><span className="font-medium text-gray-900">{selectedReqDetail.repName || "TRẦN VĂN ĐẠI DIỆN"}</span></div>
                        <div><span className="block text-gray-500 mb-1">Chức vụ</span><span className="font-medium text-gray-900">{selectedReqDetail.repRole || "Giám đốc"}</span></div>
                        <div><span className="block text-gray-500 mb-1">Số CCCD NĐD</span><span className="font-bold text-[#0aa679] bg-[#0aa679]/10 px-2 py-0.5 rounded">{selectedReqDetail.repCccdNumber || "079190654321"}</span></div>
                      </>
                    ) : (
                      // DATA THẬT CỦA PERSONAL (Map 1-1 với JSON, không gộp)
                      <>
                        <div className="col-span-2">
                          <span className="block text-gray-500 mb-1">Mã hồ sơ cá nhân (personalProfileId)</span>
                          <span className="font-medium text-gray-900">{selectedReqDetail.personalProfileId || 'N/A'}</span>
                        </div>
                        
                        <div className="col-span-2">
                          <span className="block text-gray-500 mb-1">Mã định danh hệ thống (userId)</span>
                          <span className="font-medium text-gray-900">{selectedReqDetail.userId || 'N/A'}</span>
                        </div>
                        
                        <div className="col-span-2 my-1 border-t border-dashed border-gray-200"></div>

                        <div>
                          <span className="block text-gray-500 mb-1">Họ và tên (representativeName)</span>
                          <span className="font-semibold text-gray-900 text-base uppercase">{selectedReqDetail.representativeName || 'N/A'}</span>
                        </div>
                        
                        <div>
                          <span className="block text-gray-500 mb-1">Mã định danh / CCCD (representativeCode)</span>
                          <span className="font-bold text-[#0aa679] bg-[#0aa679]/10 px-2 py-0.5 rounded tracking-wide">{selectedReqDetail.representativeCode || 'N/A'}</span>
                        </div>

                        <div>
                          <span className="block text-gray-500 mb-1">Ngày sinh (representativeDob)</span>
                          <span className="font-medium text-gray-900">
                            {selectedReqDetail.representativeDob ? new Date(selectedReqDetail.representativeDob).toLocaleDateString('vi-VN') : 'N/A'}
                          </span>
                        </div>
                        
                        <div className="col-span-2">
                          <span className="block text-gray-500 mb-1">Địa chỉ (representativeAddress)</span>
                          <span className="font-medium text-gray-900">{selectedReqDetail.representativeAddress || 'N/A'}</span>
                        </div>

                        <div className="col-span-2 my-1 border-t border-dashed border-gray-200"></div>

                        <div>
                          <span className="block text-gray-500 mb-1">Trạng thái xác thực (verificationStatus)</span>
                          <span className="font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{selectedReqDetail.verificationStatus || 'N/A'}</span>
                        </div>

                        <div>
                          <span className="block text-gray-500 mb-1">Ngày tạo (createdAt)</span>
                          <span className="font-medium text-gray-900">
                            {selectedReqDetail.createdAt ? new Date(selectedReqDetail.createdAt).toLocaleString('vi-VN') : 'N/A'}
                          </span>
                        </div>

                        <div>
                          <span className="block text-gray-500 mb-1">Ngày duyệt (verifiedAt)</span>
                          <span className="font-medium text-gray-900">
                            {selectedReqDetail.verifiedAt ? new Date(selectedReqDetail.verifiedAt).toLocaleString('vi-VN') : 'Chưa cập nhật'}
                          </span>
                        </div>

                        <div>
                          <span className="block text-gray-500 mb-1">Mã người duyệt (verifiedBy)</span>
                          <span className="font-medium text-gray-900">{selectedReqDetail.verifiedBy || 'N/A'}</span>
                        </div>

                        <div className="col-span-2">
                          <span className="block text-gray-500 mb-1">Lý do từ chối (verificationRejectReason)</span>
                          <span className="font-medium text-red-600">{selectedReqDetail.verificationRejectReason || 'Không có'}</span>
                        </div>
                      </>
                    )}
                  </div>
                </section>

                {/* 2. ẢNH CHỨNG TỪ */}
                <section className="bg-white p-7 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-base font-bold text-gray-900 mb-5 pb-3 border-b flex items-center gap-2">
                    <FileProtectOutlined className="text-[#0aa679]" />
                    Hình ảnh định danh
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    {activeTab === 'BUSINESS' ? (
                      <>
                        <div className="col-span-2 md:col-span-1">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Giấy phép Kinh doanh</p>
                          {renderDocumentBox(selectedReqDetail.businessLicenseUrl, 'Nhấn để xem ảnh GPKD')}
                        </div>
                        <div className="grid grid-cols-1 gap-4 col-span-2 md:col-span-1">
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-2">CCCD Đại diện (Mặt trước)</p>
                            {renderDocumentBox(selectedReqDetail.repCccdFrontUrl, 'Nhấn để xem ảnh Mặt trước')}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-2">CCCD Đại diện (Mặt sau)</p>
                            {renderDocumentBox(selectedReqDetail.repCccdBackUrl, 'Nhấn để xem ảnh Mặt sau')}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="col-span-2 md:col-span-1">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Mặt trước (frontIDCardImage)</p>
                          {renderDocumentBox(selectedReqDetail.frontIDCardImage, 'Chưa có ảnh mặt trước')}
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Mặt sau (backIDCardImage)</p>
                          {renderDocumentBox(selectedReqDetail.backIDCardImage, 'Chưa có ảnh mặt sau')}
                        </div>
                      </>
                    )}
                  </div>
                </section>

                {/* 3. NGÂN HÀNG (CHỈ HIỆN CHO DOANH NGHIỆP VÌ JSON PERSONAL KHÔNG CÓ TRƯỜNG NÀY) */}
                {activeTab === 'BUSINESS' && (
                  <section className={`p-7 rounded-xl border ${isBankHolderValid(selectedReqDetail) ? 'bg-emerald-50/30 border-emerald-200' : 'bg-red-50 border-red-200 shadow-sm'}`}>
                    <h3 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200/50 flex items-center gap-2">
                      <BankOutlined className={isBankHolderValid(selectedReqDetail) ? "text-emerald-600" : "text-red-600"} />
                      Xác minh Tài khoản ngân hàng
                    </h3>
                    
                    <div className="grid grid-cols-3 gap-4 mb-5 text-sm">
                      <div><span className="block text-gray-500 mb-1">Ngân hàng</span><span className="font-semibold text-gray-900">{selectedReqDetail.bankName || "Vietcombank (Mock)"}</span></div>
                      <div><span className="block text-gray-500 mb-1">Số tài khoản</span><span className="font-semibold text-gray-900">{selectedReqDetail.bankAccountNumber || "1012345678 (Mock)"}</span></div>
                      <div><span className="block text-gray-500 mb-1">Chủ tài khoản</span><span className="font-bold text-gray-900 uppercase">{selectedReqDetail.bankAccountHolder || "NGUYỄN VĂN MOCK"}</span></div>
                    </div>
                  </section>
                )}
                
              </div>
            </div>

            {/* --- ACTION FOOTER --- */}
            <div className="px-8 py-5 border-t border-gray-200 bg-white flex justify-end gap-3 z-10 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)]">
              <button 
                onClick={() => setShowRejectModal(true)}
                disabled={isProcessing}
                className="px-8 py-2.5 text-sm font-semibold text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Từ chối
              </button>
              <button 
                onClick={handleApprove}
                disabled={isProcessing}
                className="px-8 py-2.5 text-sm font-semibold text-white bg-[#0aa679] rounded-lg hover:bg-[#088c66] shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing && <LoadingOutlined />}
                Phê duyệt hồ sơ
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-slate-50">
            <IdcardOutlined className="text-6xl text-gray-300 mb-4" />
            <p className="text-lg">Chọn một hồ sơ bên danh sách để bắt đầu đối chiếu dữ liệu</p>
          </div>
        )}
      </div>

      {/* MODAL TỪ CHỐI */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Từ chối duyệt hồ sơ</h3>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-1 focus:ring-red-500 outline-none resize-none"
              rows="4"
              placeholder="Nhập lý do từ chối (VD: Hình ảnh bị mờ, thông tin không khớp)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            ></textarea>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowRejectModal(false)} disabled={isProcessing} className="px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50">Hủy</button>
              <button onClick={handleReject} disabled={isProcessing} className="px-5 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2 disabled:opacity-50">
                {isProcessing && <LoadingOutlined />} Gửi từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationPage;