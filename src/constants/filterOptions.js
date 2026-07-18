// src/constants/filterOptions.js

export const MAIN_CATEGORIES = {
  APPLIANCE: 'APPLIANCE',
  ELECTRONIC: 'ELECTRONIC'
};

// 1. BỘ LỌC CHUNG (Cả 2 bên đều cực kỳ quan tâm về vận chuyển và tổng quan ngoại quan)
export const COMMON_FILTERS = {
  // Logistics quyết định chi phí thu mua của thợ
  logistics: [
    { value: 'motor_friendly', label: 'Chở được bằng xe máy (Nhỏ gọn)' },
    { value: 'truck_required', label: 'Cần xe tải chở (Cồng kềnh)' },
    { value: 'need_disassemble', label: 'Cần thợ tự tháo dỡ tại chỗ (Tủ âm tường, Máy lạnh...)' }
  ],
  // Tình trạng sử dụng thực tế
  conditions: [
    { value: 'good_working', label: 'Đang dùng tốt (Mua về bán lại ngay)' },
    { value: 'minor_fault', label: 'Lỗi nhẹ / Ngoại hình xấu (Cần tân trang)' },
    { value: 'dead_scrap', label: 'Hỏng hoàn toàn / Rã xác lấy linh kiện' }
  ]
};

// 2. BỘ LỌC ĐẶC THÙ CHO ĐỒ GIA DỤNG (Thiên về cốt chất liệu & Phân loại phòng)
export const APPLIANCE_DEEP_FILTERS = {
  // Chất liệu cốt (Cực kỳ quyết định giá trị đồ gia dụng)
  materials: [
    { value: 'natural_wood', label: 'Gỗ tự nhiên (Sồi, Xoan, Trắc...)' },
    { value: 'industrial_wood', label: 'Gỗ công nghiệp (MDF, MFC, Gỗ ép)' },
    { value: 'metal_iron', label: 'Kim loại / Sắt / Nhôm' },
    { value: 'leather_fabric', label: 'Da thật / Simili / Vải nỉ' },
    { value: 'plastic', label: 'Nhựa cứng / Nhựa giả mây' },
    { value: 'glass_ceramic', label: 'Kính / Thủy tinh / Gốm sứ' }
  ],
  // Nhóm phòng (Để gom đơn hàng đi mua một thể)
  spaces: [
    { value: 'living_room', label: 'Phòng khách (Sofa, bàn trà, kệ TV)' },
    { value: 'bedroom', label: 'Phòng ngủ (Giường, tủ áo, bàn trang điểm)' },
    { value: 'kitchen', label: 'Nhà bếp (Bàn ăn, tủ bếp, kệ chén)' },
    { value: 'office', label: 'Văn phòng / Cửa hàng thanh lý' }
  ]
};

// 3. BỘ LỌC ĐẶC THÙ CHO ĐỒ ĐIỆN TỬ (Thiên về kỹ thuật chuyên môn)
export const ELECTRONIC_DEEP_FILTERS = {
  // Phân nhóm thiết bị (Vì thợ điện lạnh khác thợ sửa điện thoại/laptop)
  subCategories: [
    { value: 'cooling', label: 'Điện lạnh (Tủ lạnh, Máy giặt, Máy lạnh)' },
    { value: 'digital', label: 'Thiết bị số (Laptop, PC, Điện thoại, Máy tính bảng)' },
    { value: 'household_elec', label: 'Điện gia dụng nhỏ (Lò vi sóng, Nồi cơm, Quạt)' },
    { value: 'entertainment', label: 'Âm thanh & Hình ảnh (Tivi, Loa, Amply)' }
  ],
  // Các lỗi phần cứng đặc thù (Thợ mua xác máy cực kỳ cần cái này)
  technicalIssues: [
    { value: 'inverter_tech', label: 'Hỗ trợ công nghệ Inverter (Tiết kiệm điện)' },
    { value: 'broken_board', label: 'Lỗi bo mạch / Chết nguồn (Còn màn hình/vỏ)' },
    { value: 'broken_screen', label: 'Bể màn hình / Sọc màn (Mainboard vẫn chạy)' },
    { value: 'broken_compressor', label: 'Hỏng Block máy / Rò ga (Dành cho tủ lạnh/máy lạnh)' }
  ]
};