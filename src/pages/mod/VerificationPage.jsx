import React, { useState } from 'react';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  InfoCircleOutlined, 
  EyeOutlined,
  BankOutlined,
  IdcardOutlined,
  FileProtectOutlined,
  SearchOutlined,
  WarningOutlined
} from '@ant-design/icons';

// MOCK DATA: Dữ liệu người dùng tự nhập và ảnh tải lên (Không có eKYC)
const MOCK_REQUESTS = [
  {
    id: 'REQ-001',
    type: 'PERSONAL',
    status: 'PENDING',
    submittedAt: '2026-07-18T08:30:00Z',
    userInfo: {
      fullName: 'NGUYEN VAN A', // Dữ liệu user tự gõ
      username: 'nguyenvana_99',
      phone: '0901234567',
      email: 'nva@gmail.com',
      dob: '15/05/1990',
      cccdNumber: '001202123456', // Dữ liệu user tự gõ
    },
    documents: {
      cccdFront: 'url_to_cccd_front', // Ảnh user tải lên
      cccdBack: 'url_to_cccd_back',
    },
    paymentInfo: {
      bankName: 'Vietcombank',
      accountNumber: '1012345678',
      accountHolder: 'NGUYEN VAN A', // Khớp tên -> Hợp lệ
    }
  },
  {
    id: 'REQ-002',
    type: 'BUSINESS',
    status: 'PENDING',
    submittedAt: '2026-07-17T14:15:00Z',
    businessInfo: {
      companyName: 'CÔNG TY TNHH THƯƠNG MẠI ĐỒ CŨ ABC',
      taxId: '0312345678',
      address: '123 Nguyễn Văn Linh, Quận 7, TP.HCM',
      repName: 'TRẦN THỊ B',
      repRole: 'Giám đốc',
      repCccdNumber: '079190654321',
    },
    documents: {
      businessLicense: 'url_to_gpkd',
      repCccdFront: 'url_to_rep_cccd_front',
      repCccdBack: 'url_to_rep_cccd_back',
    },
    paymentInfo: {
      bankName: 'Techcombank',
      accountNumber: '190333444555',
      accountHolder: 'NGUYEN VAN C', // Sai tên -> Không hợp lệ
    }
  }
];

const VerificationPage = () => {
  const [requests, setRequests] = useState(MOCK_REQUESTS);
  const [selectedReq, setSelectedReq] = useState(MOCK_REQUESTS[0]);
  
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // --- HANDLERS ---
  const handleApprove = (id) => {
    alert(`Đã DUYỆT hồ sơ: ${id}. Tài khoản đã được cấp tick xác thực.`);
    setRequests(requests.filter(req => req.id !== id));
    setSelectedReq(requests.find(req => req.id !== id) || null);
  };

  const handleRequestMoreInfo = (id) => {
    alert(`Đã gửi YÊU CẦU BỔ SUNG cho hồ sơ: ${id}`);
  };

  const handleReject = () => {
    if (!rejectReason.trim()) return alert('Vui lòng nhập lý do từ chối!');
    alert(`Đã TỪ CHỐI hồ sơ ${selectedReq.id} với lý do: ${rejectReason}`);
    setRequests(requests.filter(req => req.id !== selectedReq.id));
    setSelectedReq(requests.find(req => req.id !== selectedReq.id) || null);
    setShowRejectModal(false);
    setRejectReason('');
  };

  // --- HELPERS ---
  const isBankHolderValid = (req) => {
    const holder = req.paymentInfo.accountHolder.toUpperCase();
    if (req.type === 'PERSONAL') {
      return holder === req.userInfo.fullName.toUpperCase();
    } else {
      return holder === req.businessInfo.companyName.toUpperCase() || 
             holder === req.businessInfo.repName.toUpperCase();
    }
  };

  const renderDocumentBox = (placeholderText) => (
    <div className="border border-gray-300 rounded-lg p-2 bg-gray-100 flex flex-col items-center justify-center aspect-[1.6/1] relative group overflow-hidden cursor-pointer hover:border-blue-500 transition-colors">
      <FileProtectOutlined className="text-3xl text-gray-400 mb-2 group-hover:text-blue-500" />
      <span className="text-sm text-gray-500 font-medium text-center px-4">{placeholderText}</span>
      
      {/* Overlay Xem ảnh */}
      <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <EyeOutlined className="text-2xl text-white mb-1" />
        <span className="text-white text-sm font-semibold">Xem ảnh gốc</span>
      </div>
    </div>
  );

  return (
    <div className="flex h-full bg-white">
      
      {/* --- CỘT TRÁI: DANH SÁCH YÊU CẦU --- */}
      <div className="w-[360px] border-r border-gray-200 flex flex-col bg-gray-50">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-800 flex items-center justify-between">
            Hồ sơ chờ duyệt
            <span className="bg-blue-100 text-blue-700 text-sm py-0.5 px-2.5 rounded-full">{requests.length}</span>
          </h2>
          <div className="mt-4 relative">
            <input 
              type="text" 
              placeholder="Tìm theo Mã YC, Tên, Số CCCD..." 
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <SearchOutlined className="absolute left-3 top-2.5 text-gray-400" />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {requests.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">Không còn hồ sơ nào chờ duyệt.</div>
          ) : (
            requests.map(req => (
              <div 
                key={req.id} 
                onClick={() => setSelectedReq(req)}
                className={`p-4 border-b border-gray-100 cursor-pointer transition-all ${
                  selectedReq?.id === req.id 
                    ? 'bg-blue-50/50 border-l-4 border-l-blue-600' 
                    : 'hover:bg-gray-100 border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    req.type === 'BUSINESS' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {req.type === 'BUSINESS' ? 'Doanh nghiệp' : 'Cá nhân'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(req.submittedAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-800 text-sm truncate">
                  {req.type === 'BUSINESS' ? req.businessInfo.companyName : req.userInfo.fullName}
                </h3>
                <p className="text-xs text-gray-500 mt-1">Mã YC: {req.id}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- CỘT PHẢI: CHI TIẾT HỒ SƠ (ĐỐI CHIẾU THỦ CÔNG) --- */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {selectedReq ? (
          <>
            <div className="px-8 py-5 border-b border-gray-200 bg-white shadow-sm z-10 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  {selectedReq.type === 'BUSINESS' ? selectedReq.businessInfo.companyName : selectedReq.userInfo.fullName}
                </h1>
                <p className="text-sm text-gray-500">
                  <IdcardOutlined className="mr-1" /> Mã hồ sơ: <strong>{selectedReq.id}</strong>
                </p>
              </div>
              <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-lg text-sm border border-amber-200 flex items-center gap-2 max-w-sm">
                <WarningOutlined className="text-lg" />
                <span>Vui lòng kiểm tra kỹ thông tin người dùng nhập vào so với hình ảnh chứng từ tải lên.</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
              <div className="max-w-4xl mx-auto space-y-6">
                
                {/* 1. THÔNG TIN DO NGƯỜI DÙNG NHẬP */}
                <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b flex items-center gap-2">
                    <InfoCircleOutlined className="text-blue-600" />
                    Thông tin khai báo (Cần đối chiếu)
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                    {selectedReq.type === 'BUSINESS' ? (
                      <>
                        <div className="col-span-2"><span className="block text-gray-500 mb-1">Tên doanh nghiệp / Hộ KD</span><span className="font-semibold text-gray-900 text-base">{selectedReq.businessInfo.companyName}</span></div>
                        <div><span className="block text-gray-500 mb-1">Mã số thuế</span><span className="font-medium text-gray-900">{selectedReq.businessInfo.taxId}</span></div>
                        <div className="col-span-2"><span className="block text-gray-500 mb-1">Địa chỉ đăng ký</span><span className="font-medium text-gray-900">{selectedReq.businessInfo.address}</span></div>
                        <div className="col-span-2 my-1 border-t border-dashed border-gray-200"></div>
                        <div><span className="block text-gray-500 mb-1">Người đại diện pháp luật</span><span className="font-medium text-gray-900">{selectedReq.businessInfo.repName}</span></div>
                        <div><span className="block text-gray-500 mb-1">Chức vụ</span><span className="font-medium text-gray-900">{selectedReq.businessInfo.repRole}</span></div>
                        <div><span className="block text-gray-500 mb-1">Số CCCD NĐD</span><span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{selectedReq.businessInfo.repCccdNumber}</span></div>
                      </>
                    ) : (
                      <>
                        <div><span className="block text-gray-500 mb-1">Họ và tên</span><span className="font-semibold text-gray-900 text-base">{selectedReq.userInfo.fullName}</span></div>
                        <div><span className="block text-gray-500 mb-1">Số CCCD/CMND</span><span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{selectedReq.userInfo.cccdNumber}</span></div>
                        <div><span className="block text-gray-500 mb-1">Ngày sinh</span><span className="font-medium text-gray-900">{selectedReq.userInfo.dob}</span></div>
                        <div><span className="block text-gray-500 mb-1">Số điện thoại</span><span className="font-medium text-gray-900">{selectedReq.userInfo.phone}</span></div>
                        <div><span className="block text-gray-500 mb-1">Email liên hệ</span><span className="font-medium text-gray-900">{selectedReq.userInfo.email}</span></div>
                      </>
                    )}
                  </div>
                </section>

                {/* 2. HÌNH ẢNH GIẤY TỜ TẢI LÊN */}
                <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b flex items-center gap-2">
                    <FileProtectOutlined className="text-blue-600" />
                    Ảnh chứng từ (Dùng để kiểm tra)
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    {selectedReq.type === 'BUSINESS' ? (
                      <>
                        <div className="col-span-2 md:col-span-1">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Giấy phép Kinh doanh (Bản cứng/Scan)</p>
                          {renderDocumentBox('Nhấn để xem ảnh Giấy phép KD')}
                        </div>
                        <div className="grid grid-cols-1 gap-4 col-span-2 md:col-span-1">
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-2">CCCD Đại diện (Mặt trước)</p>
                            {renderDocumentBox('Nhấn để xem ảnh CCCD Mặt trước')}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-2">CCCD Đại diện (Mặt sau)</p>
                            {renderDocumentBox('Nhấn để xem ảnh CCCD Mặt sau')}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-2">CCCD/CMND Mặt trước</p>
                          {renderDocumentBox('Nhấn để xem ảnh CCCD Mặt trước')}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-2">CCCD/CMND Mặt sau</p>
                          {renderDocumentBox('Nhấn để xem ảnh CCCD Mặt sau')}
                        </div>
                      </>
                    )}
                  </div>
                </section>

                {/* 3. THÔNG TIN NGÂN HÀNG */}
                <section className={`p-6 rounded-xl border ${isBankHolderValid(selectedReq) ? 'bg-emerald-50/30 border-emerald-200' : 'bg-red-50/50 border-red-200'}`}>
                  <h3 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200/50 flex items-center gap-2">
                    <BankOutlined className={isBankHolderValid(selectedReq) ? "text-emerald-600" : "text-red-600"} />
                    Tài khoản ngân hàng
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                    <div><span className="block text-gray-500 mb-1">Ngân hàng</span><span className="font-semibold text-gray-900">{selectedReq.paymentInfo.bankName}</span></div>
                    <div><span className="block text-gray-500 mb-1">Số tài khoản</span><span className="font-semibold text-gray-900">{selectedReq.paymentInfo.accountNumber}</span></div>
                    <div><span className="block text-gray-500 mb-1">Chủ tài khoản</span><span className="font-bold text-gray-900">{selectedReq.paymentInfo.accountHolder}</span></div>
                  </div>
                  
                  {isBankHolderValid(selectedReq) ? (
                    <div className="text-sm text-emerald-700 bg-emerald-100/50 px-4 py-2.5 rounded flex items-center font-medium border border-emerald-200">
                      <CheckCircleOutlined className="mr-2" /> Hệ thống kiểm tra: Tên chủ tài khoản khớp với thông tin định danh.
                    </div>
                  ) : (
                    <div className="text-sm text-red-700 bg-red-100 px-4 py-2.5 rounded flex items-center font-bold border border-red-200">
                      <CloseCircleOutlined className="mr-2 text-lg" /> CẢNH BÁO: Tên chủ tài khoản KHÔNG KHỚP với thông tin khai báo!
                    </div>
                  )}
                </section>
                
              </div>
            </div>

            {/* --- ACTION FOOTER --- */}
            <div className="px-8 py-4 border-t border-gray-200 bg-white flex justify-end gap-3 z-10 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)]">
              <button 
                onClick={() => handleRequestMoreInfo(selectedReq.id)}
                className="px-6 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Yêu cầu bổ sung
              </button>
              <button 
                onClick={() => setShowRejectModal(true)}
                className="px-6 py-2 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                Từ chối
              </button>
              <button 
                onClick={() => handleApprove(selectedReq.id)}
                className="px-8 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
              >
                Phê duyệt hồ sơ
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-slate-50">
            <IdcardOutlined className="text-5xl text-gray-300 mb-4" />
            <p>Chọn một hồ sơ bên danh sách để bắt đầu đối chiếu dữ liệu</p>
          </div>
        )}
      </div>

      {/* MODAL TỪ CHỐI */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Từ chối duyệt hồ sơ</h3>
            <p className="text-sm text-gray-500 mb-4">
              Lý do từ chối sẽ được gửi qua thông báo/email cho người dùng <strong className="text-gray-700">{selectedReq?.id}</strong>.
            </p>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-1 focus:ring-red-500 outline-none resize-none"
              rows="4"
              placeholder="VD: Hình ảnh CCCD bị chói sáng, không đọc được số..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              autoFocus
            ></textarea>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">
                Hủy
              </button>
              <button onClick={handleReject} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg">
                Gửi từ chối
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default VerificationPage;