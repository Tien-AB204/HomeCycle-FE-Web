import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const RegisterBusinessPage = () => {
  const navigate = useNavigate();
  // step 1: Email | step 2: Chọn loại hình | step 3: Khai báo pháp lý | step 4: Chờ duyệt
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [businessType, setBusinessType] = useState('household'); // 'household' hoặc 'enterprise'

  const handleNext = (e) => {
    if (e) e.preventDefault();
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const submitApplication = (e) => {
    e.preventDefault();
    // Gọi API upload giấy tờ và nộp hồ sơ ở đây
    setStep(4);
  };

  // Component phụ: Thanh tiến trình
  const ProgressBar = ({ currentStep, stepName }) => (
    <div className="w-full mb-8">
      <div className="flex justify-between items-end mb-2">
        <span className="text-xs font-bold text-[#244f4d] uppercase tracking-wider">
          Bước {currentStep}/3
        </span>
        <span className="text-xs font-semibold text-slate-500">{stepName}</span>
      </div>
      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden flex">
        <div className={`h-full bg-[#244f4d] transition-all duration-500 ${currentStep === 1 ? 'w-1/3' : currentStep === 2 ? 'w-2/3' : 'w-full'}`}></div>
      </div>
    </div>
  );

  return (
    <div className="w-full animate-fade-in">
      {/* LOGO CHUNG (Ẩn ở bước 3, 4) */}
      {step < 3 && (
        <div className="flex flex-col items-center mb-6">
          <h2 className="text-2xl font-bold text-[#244f4d] flex items-center gap-2">
            <span className="material-symbols-outlined">eco</span> HomeCycle
          </h2>
        </div>
      )}

      {/* --- BƯỚC 1: NHẬP EMAIL --- */}
      {step === 1 && (
        <div className="text-center">
          <h3 className="text-xl font-bold text-slate-800 mb-2">Đăng ký Doanh nghiệp</h3>
          <p className="text-sm text-slate-500 mb-6">Bắt đầu hành trình kinh doanh bền vững cùng HomeCycle.</p>
          
          <form onSubmit={handleNext} className="space-y-5 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Email Doanh nghiệp</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">mail</span>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Nhập email doanh nghiệp của bạn..." className="w-full border border-slate-300 rounded-md py-2.5 pl-10 pr-3 focus:outline-none focus:border-[#244f4d] text-sm" />
              </div>
            </div>
            <button type="submit" className="w-full bg-[#244f4d] text-white py-3 rounded-md font-medium flex items-center justify-center gap-2 hover:bg-[#1a3a38] transition">
              TIẾP TỤC <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
            
            <div className="relative flex items-center justify-center py-2">
              <hr className="w-full border-slate-200" />
              <span className="absolute bg-white px-3 text-xs text-slate-400 font-medium">HOẶC</span>
            </div>
            <div className="text-center text-sm text-slate-600 mt-2">
              Bạn đã có tài khoản? <Link to="/auth/login" className="font-bold text-[#244f4d] hover:underline">Đăng nhập ngay</Link>
            </div>
          </form>
        </div>
      )}

      {/* --- BƯỚC 2: CHỌN MÔ HÌNH --- */}
      {step === 2 && (
        <div>
          <ProgressBar currentStep={1} stepName="Chọn loại hình" />
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Chọn mô hình kinh doanh</h3>
            <p className="text-sm text-slate-500">Vui lòng chọn mô hình phù hợp để chúng tôi cung cấp biểu mẫu khai báo chính xác.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Thẻ Hộ kinh doanh */}
            <div onClick={() => setBusinessType('household')} className={`cursor-pointer rounded-lg p-5 text-center relative border-2 transition duration-200 ${businessType === 'household' ? 'border-[#244f4d] bg-white' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
              <div className="w-12 h-12 mx-auto rounded-md bg-slate-100 flex items-center justify-center mb-3 text-slate-700">
                <span className="material-symbols-outlined text-[24px]">storefront</span>
              </div>
              <h4 className="font-bold text-slate-800 mb-1">Hộ kinh doanh</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">Dành cho cá nhân hoặc hộ gia đình đăng ký kinh doanh nhỏ lẻ.</p>
              {businessType === 'household' && (
                <div className="absolute top-3 right-3 text-[#244f4d]">
                  <span className="material-symbols-outlined filled text-[20px]">check_circle</span>
                </div>
              )}
            </div>

            {/* Thẻ Doanh nghiệp */}
            <div onClick={() => setBusinessType('enterprise')} className={`cursor-pointer rounded-lg p-5 text-center relative border-2 transition duration-200 ${businessType === 'enterprise' ? 'border-[#244f4d] bg-white' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
              <div className="w-12 h-12 mx-auto rounded-md bg-slate-100 flex items-center justify-center mb-3 text-slate-700">
                <span className="material-symbols-outlined text-[24px]">domain</span>
              </div>
              <h4 className="font-bold text-slate-800 mb-1">Doanh nghiệp</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">Dành cho các công ty, tổ chức có pháp nhân và quy mô lớn.</p>
              {businessType === 'enterprise' && (
                <div className="absolute top-3 right-3 text-[#244f4d]">
                  <span className="material-symbols-outlined filled text-[20px]">check_circle</span>
                </div>
              )}
            </div>
          </div>

          <button onClick={handleNext} className="w-full bg-[#244f4d] text-white py-3 rounded-md font-medium flex items-center justify-center gap-2 hover:bg-[#1a3a38] transition">
            Tiếp tục <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      )}

      {/* --- BƯỚC 3: THÔNG TIN PHÁP LÝ (TỰ ĐỘNG CHIA NHÁNH) --- */}
      {step === 3 && (
        <div className="animate-fade-in text-left">
          <ProgressBar currentStep={2} stepName="Thông tin pháp lý" />

          {/* NHÁNH 1: HỘ KINH DOANH */}
          {businessType === 'household' ? (
            <>
              <div className="text-center mb-8">
                <h3 className="text-3xl font-bold text-slate-800 mb-2">Thông tin Hộ kinh doanh</h3>
                <p className="text-sm text-slate-500">Vui lòng cung cấp thông tin pháp lý để bắt đầu hoạt động kinh doanh.</p>
              </div>

              <form onSubmit={submitApplication} className="space-y-8">
                {/* Thông tin cơ bản - Hộ Kinh Doanh */}
                <div>
                  <h4 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">Thông tin cơ bản</h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">Tên hộ kinh doanh *</label>
                      <input type="text" required placeholder="Nhập tên đăng ký kinh doanh" className="w-full border border-slate-300 rounded-md py-2.5 px-3 focus:outline-none focus:border-[#244f4d] text-sm bg-slate-50" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">Mã số thuế <span className="text-slate-400 font-normal">(Optional)</span></label>
                      <input type="text" placeholder="Nhập mã số thuế" className="w-full border border-slate-300 rounded-md py-2.5 px-3 focus:outline-none focus:border-[#244f4d] text-sm bg-slate-50" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Địa chỉ kinh doanh *</label>
                    <input type="text" required placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố" className="w-full border border-slate-300 rounded-md py-2.5 px-3 focus:outline-none focus:border-[#244f4d] text-sm bg-slate-50" />
                  </div>
                </div>

                {/* Hồ sơ đính kèm - Hộ Kinh Doanh (1 hàng 3 ô) */}
                <div>
                  <h4 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-2">Hồ sơ đính kèm</h4>
                  <p className="text-sm text-slate-500 mb-4">Tải lên các tài liệu dưới định dạng JPG, PNG hoặc PDF (Tối đa 5MB/file).</p>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition">
                      <div className="w-10 h-10 bg-slate-100 rounded-md flex items-center justify-center mb-2"><span className="material-symbols-outlined text-slate-500">upload_file</span></div>
                      <p className="text-xs font-bold text-slate-800">Giấy chứng nhận ĐKKD</p>
                      <p className="text-[10px] text-slate-500 mt-1">Kéo thả hoặc nhấn để chọn file</p>
                    </div>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition">
                      <div className="w-10 h-10 bg-slate-100 rounded-md flex items-center justify-center mb-2"><span className="material-symbols-outlined text-slate-500">badge</span></div>
                      <p className="text-xs font-bold text-slate-800">Ảnh CCCD chủ hộ</p>
                      <p className="text-[10px] text-slate-500 mt-1">(Mặt trước & sau)</p>
                    </div>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition">
                      <div className="w-10 h-10 bg-slate-100 rounded-md flex items-center justify-center mb-2"><span className="material-symbols-outlined text-slate-500">account_balance</span></div>
                      <p className="text-xs font-bold text-slate-800">Thông tin tài khoản NH</p>
                      <p className="text-[10px] text-slate-500 mt-1">(Chính chủ)</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-slate-200">
                  <button type="button" onClick={handleBack} className="text-sm font-bold text-[#244f4d] hover:text-[#1a3a38] uppercase tracking-wider">
                    QUAY LẠI
                  </button>
                  <button type="submit" className="bg-[#244f4d] text-white py-3 px-6 rounded-md text-sm font-medium hover:bg-[#1a3a38] transition">
                    HOÀN TẤT GỬI HỒ SƠ
                  </button>
                </div>
              </form>
            </>
          ) : (
            
          /* NHÁNH 2: DOANH NGHIỆP */
            <>
              <div className="mb-8">
                <h3 className="text-3xl font-bold text-slate-800 mb-2">Thông tin Doanh nghiệp</h3>
                <p className="text-sm text-slate-500">Hoàn thiện hồ sơ pháp lý doanh nghiệp để tham gia cộng đồng HomeCycle.</p>
              </div>

              <form onSubmit={submitApplication} className="space-y-8">
                {/* Thông tin cơ bản - Doanh Nghiệp */}
                <div>
                  <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-[#244f4d]">domain</span> Thông tin cơ bản
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">Tên doanh nghiệp đầy đủ <span className="text-red-500">*</span></label>
                      <input type="text" required placeholder="Nhập tên doanh nghiệp theo GPKD" className="w-full border border-slate-300 rounded-md py-2.5 px-3 focus:outline-none focus:border-[#244f4d] text-sm bg-white" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">Mã số thuế/Mã số DN <span className="text-red-500">*</span></label>
                        <input type="text" required placeholder="VD: 0101234567" className="w-full border border-slate-300 rounded-md py-2.5 px-3 focus:outline-none focus:border-[#244f4d] text-sm bg-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">Người đại diện pháp luật <span className="text-red-500">*</span></label>
                        <input type="text" required placeholder="Họ và tên" className="w-full border border-slate-300 rounded-md py-2.5 px-3 focus:outline-none focus:border-[#244f4d] text-sm bg-white" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">Tỉnh/Thành phố <span className="text-red-500">*</span></label>
                        <select className="w-full border border-slate-300 rounded-md py-2.5 px-3 focus:outline-none focus:border-[#244f4d] text-sm bg-white text-slate-600">
                          <option value="">Chọn Tỉnh/Thành phố</option>
                          <option value="sg">Hồ Chí Minh</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">Quận/Huyện <span className="text-red-500">*</span></label>
                        <select className="w-full border border-slate-300 rounded-md py-2.5 px-3 focus:outline-none focus:border-[#244f4d] text-sm bg-white text-slate-600">
                          <option value="">Chọn Quận/Huyện</option>
                          <option value="q1">Quận 1</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">Địa chỉ trụ sở chính <span className="text-red-500">*</span></label>
                      <input type="text" required placeholder="Số nhà, tên đường, phường/xã" className="w-full border border-slate-300 rounded-md py-2.5 px-3 focus:outline-none focus:border-[#244f4d] text-sm bg-white" />
                    </div>
                  </div>
                </div>

                {/* Hồ sơ đính kèm - Doanh Nghiệp (Lưới 2x2) */}
                <div>
                  <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-[#244f4d]">upload_file</span> Hồ sơ đính kèm
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition">
                      <div className="w-10 h-10 bg-slate-100 rounded-md flex items-center justify-center mb-2"><span className="material-symbols-outlined text-slate-500">description</span></div>
                      <p className="text-xs font-bold text-slate-800">Giấy chứng nhận đăng ký doanh nghiệp</p>
                      <p className="text-[11px] text-slate-500 mt-1">Kéo thả file hoặc Click để tải lên</p>
                    </div>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition">
                      <div className="w-10 h-10 bg-slate-100 rounded-md flex items-center justify-center mb-2"><span className="material-symbols-outlined text-slate-500">badge</span></div>
                      <p className="text-xs font-bold text-slate-800">Ảnh CCCD người đại diện pháp luật</p>
                      <p className="text-[11px] text-slate-500 mt-1">Mặt trước và mặt sau (PDF/JPG)</p>
                    </div>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition">
                      <div className="w-10 h-10 bg-slate-100 rounded-md flex items-center justify-center mb-2"><span className="material-symbols-outlined text-slate-500">assignment_ind</span></div>
                      <p className="text-xs font-bold text-slate-800">Giấy ủy quyền <span className="font-normal text-slate-500">(Nếu có)</span></p>
                      <p className="text-[11px] text-slate-500 mt-1">Kéo thả file hoặc Click để tải lên</p>
                    </div>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition">
                      <div className="w-10 h-10 bg-slate-100 rounded-md flex items-center justify-center mb-2"><span className="material-symbols-outlined text-slate-500">account_balance</span></div>
                      <p className="text-xs font-bold text-slate-800">Thông tin tài khoản ngân hàng doanh nghiệp</p>
                      <p className="text-[11px] text-slate-500 mt-1">Xác nhận STK để nhận thanh toán</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-slate-200">
                  <button type="button" onClick={handleBack} className="text-sm font-bold text-[#244f4d] hover:text-[#1a3a38] uppercase tracking-wider">
                    QUAY LẠI
                  </button>
                  <button type="submit" className="bg-[#244f4d] text-white py-3 px-8 rounded-md text-sm font-medium hover:bg-[#1a3a38] transition">
                    HOÀN TẤT GỬI HỒ SƠ
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}

      {/* --- BƯỚC 4: CHỜ DUYỆT --- */}
      {step === 4 && (
        <div className="text-center py-4">
          <ProgressBar currentStep={3} stepName="Hoàn tất" />
          
          <div className="w-20 h-20 bg-[#e6f2f1] rounded-xl flex items-center justify-center mx-auto mb-6 text-[#244f4d]">
            <span className="material-symbols-outlined text-[40px]">hourglass_top</span>
          </div>
          
          <h3 className="text-xl font-bold text-slate-800 mb-2">Hồ sơ đang chờ kiểm duyệt</h3>
          <p className="text-sm text-slate-500 mb-8 max-w-[300px] mx-auto leading-relaxed">
            Hồ sơ của bạn đã được tiếp nhận và đang chờ đội ngũ Moderator kiểm duyệt. Kết quả sẽ được gửi về email trong vòng 24-48h.
          </p>

          <button onClick={() => navigate('/')} className="w-full bg-[#244f4d] text-white py-3 rounded-md font-medium flex items-center justify-center gap-2 hover:bg-[#1a3a38] transition">
            <span className="material-symbols-outlined text-[18px]">home</span> VỀ TRANG CHỦ
          </button>
        </div>
      )}
    </div>
  );
};

export default RegisterBusinessPage;