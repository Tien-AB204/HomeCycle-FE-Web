// src/constants/filterOptions.js

export const MAIN_CATEGORIES = {
  APPLIANCE: "APPLIANCE",
  ELECTRONIC: "ELECTRONIC",
  HOUSEHOLD: "HOUSEHOLD",
};

export const CATEGORY_BACKEND_IDS = {
  [MAIN_CATEGORIES.APPLIANCE]: "939add58-d5f5-483d-b390-6328a20fbd9b",
  [MAIN_CATEGORIES.ELECTRONIC]: "b8086ea1-9805-41a9-9a0c-d1d46c803dd0",
  [MAIN_CATEGORIES.HOUSEHOLD]: "3d2ce14c-8d3a-489c-9fd1-4816ede12cbb",
};

// 1. BỘ LỌC CHUNG (Cả 3 bên đều cực kỳ quan tâm về vận chuyển và tổng quan ngoại quan)
export const COMMON_FILTERS = {
  // Logistics quyết định chi phí thu mua của thợ
  logistics: [
    { value: "motor_friendly", label: "Chở được bằng xe máy (Nhỏ gọn)" },
    { value: "truck_required", label: "Cần xe tải chở (Cồng kềnh)" },
    {
      value: "need_disassemble",
      label: "Cần thợ tự tháo dỡ tại chỗ (Tủ âm tường, Máy lạnh...)",
    },
  ],
  // Tình trạng sử dụng thực tế
  conditions: [
    { value: "good_working", label: "Đang dùng tốt (Mua về bán lại ngay)" },
    { value: "minor_fault", label: "Lỗi nhẹ / Ngoại hình xấu (Cần tân trang)" },
    { value: "dead_scrap", label: "Hỏng hoàn toàn / Rã xác lấy linh kiện" },
  ],
};

// 2. BỘ LỌC ĐẶC THÙ CHO ĐỒ GIA DỤNG (Thiên về cốt chất liệu & Phân loại phòng)
export const APPLIANCE_DEEP_FILTERS = {
  // Chất liệu cốt (Cực kỳ quyết định giá trị đồ gia dụng)
  materials: [
    { value: "natural_wood", label: "Gỗ tự nhiên (Sồi, Xoan, Trắc...)" },
    { value: "industrial_wood", label: "Gỗ công nghiệp (MDF, MFC, Gỗ ép)" },
    { value: "metal_iron", label: "Kim loại / Sắt / Nhôm" },
    { value: "leather_fabric", label: "Da thật / Simili / Vải nỉ" },
    { value: "plastic", label: "Nhựa cứng / Nhựa giả mây" },
    { value: "glass_ceramic", label: "Kính / Thủy tinh / Gốm sứ" },
  ],
  // Nhóm phòng (Để gom đơn hàng đi mua một thể)
  spaces: [
    { value: "living_room", label: "Phòng khách (Sofa, bàn trà, kệ TV)" },
    { value: "bedroom", label: "Phòng ngủ (Giường, tủ áo, bàn trang điểm)" },
    { value: "kitchen", label: "Nhà bếp (Bàn ăn, tủ bếp, kệ chén)" },
    { value: "office", label: "Văn phòng / Cửa hàng thanh lý" },
  ],
  // Thương hiệu
  brands: [
    { value: "ikea", label: "IKEA" },
    { value: "minh_long", label: "Minh Long" },
    { value: "bat_trang", label: "Bát Tràng" },
    { value: "furniture_brand", label: "Thương hiệu nội thất khác" },
  ],
};

// 3. BỘ LỌC ĐẶC THÙ CHO ĐỒ ĐIỆN TỬ (Thiên về kỹ thuật chuyên môn)
export const ELECTRONIC_DEEP_FILTERS = {
  // Phân nhóm thiết bị (Vì thợ điện lạnh khác thợ sửa điện thoại/laptop)
  subCategories: [
    { value: "cooling", label: "Điện lạnh (Tủ lạnh, Máy giặt, Máy lạnh)" },
    {
      value: "digital",
      label: "Thiết bị số (Laptop, PC, Điện thoại, Máy tính bảng)",
    },
    {
      value: "household_elec",
      label: "Điện gia dụng nhỏ (Lò vi sóng, Nồi cơm, Quạt)",
    },
    { value: "entertainment", label: "Âm thanh & Hình ảnh (Tivi, Loa, Amply)" },
  ],
  // Các lỗi phần cứng đặc thù (Thợ mua xác máy cực kỳ cần cái này)
  technicalIssues: [
    {
      value: "inverter_tech",
      label: "Hỗ trợ công nghệ Inverter (Tiết kiệm điện)",
    },
    {
      value: "broken_board",
      label: "Lỗi bo mạch / Chết nguồn (Còn màn hình/vỏ)",
    },
    {
      value: "broken_screen",
      label: "Bể màn hình / Sọc màn (Mainboard vẫn chạy)",
    },
    {
      value: "broken_compressor",
      label: "Hỏng Block máy / Rò ga (Dành cho tủ lạnh/máy lạnh)",
    },
  ],
  // Thương hiệu
  brands: [
    { value: "samsung", label: "Samsung" },
    { value: "apple", label: "Apple" },
    { value: "asus", label: "ASUS" },
    { value: "other_electronic_brand", label: "Thương hiệu khác" },
  ],
};

// 4. BỘ LỌC ĐẶC THÙ CHO ĐỒ SINH HOẠT (MỚI)
export const HOUSEHOLD_DEEP_FILTERS = {
  // Loại vật liệu / Phân nhóm đồ dùng
  materialTypes: [
    {
      value: "plastic_items",
      label: "Đồ nhựa gia dụng (Thau, rổ, hộp đựng...)",
    },
    { value: "metal_items", label: "Đồ kim loại / Inox (Xoong, nồi, chảo...)" },
    { value: "glass_items", label: "Đồ thủy tinh / Gốm sứ (Chén, bát, ly...)" },
    { value: "fabric_bamboo_items", label: "Đồ vải / Sợi tổng hợp / Mây tre" },
  ],
  // Chất liệu an toàn/cấu thành
  coreMaterials: [
    { value: "premium_plastic", label: "Nhựa cao cấp (PP, PET, ABS)" },
    {
      value: "stainless_steel",
      label: "Inox chống gỉ (304, 316) / Thép không gỉ",
    },
    {
      value: "heat_glass_ceramic",
      label: "Thủy tinh chịu nhiệt / Gốm sứ tráng men",
    },
    {
      value: "wood_silicon_cotton",
      label: "Gỗ tự nhiên / Vải Cotton / Silicon",
    },
  ],
  // Thương hiệu
  brands: [
    { value: "lock_inochi", label: "Lock&Lock / Inochi" },
    { value: "sunhouse_kangaroo", label: "Sunhouse / Kangaroo" },
    { value: "duytan_songlong", label: "Duy Tân / Đại Đồng Tiến / Song Long" },
    { value: "ikea_minhlong", label: "IKEA / Minh Long / Bát Tràng" },
    { value: "oem_other", label: "OEM / Hàng gia công (Không rõ thương hiệu)" },
  ],
};
