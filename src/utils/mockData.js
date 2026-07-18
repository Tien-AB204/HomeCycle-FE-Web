// src/data/mockData.js (Bạn nhớ check lại đường dẫn file nhé)
import { MAIN_CATEGORIES } from "../constants/filterOptions";
import { POST_STATUS, ROLES } from "../constants/roles"; // Import các constant để dữ liệu đồng nhất

export const mockBusinessPosts = [
  {
    id: "b1",
    postType: "BUY", // Thêm trường này để phân biệt
    category: MAIN_CATEGORIES.ELECTRONIC, // Phục vụ bộ lọc
    subCat: "cooling",
    condition: "minor_fault",
    logistics: "truck_required",

    // Giữ nguyên dữ liệu gốc của bạn
    type: "Điện máy",
    businessName: "Điện Máy Thành Phát",
    name: "Cần thu mua Tủ lạnh Samsung Inverter cũ", // Đổi title thành name cho khớp UI
    desc: "Độ mới > 85%, Thu mua tận nơi", // Chuyển condition/shippingTag vào mô tả chung
    price: 7500000,
    image:
      "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?q=80&w=600&auto=format&fit=crop",
    owner: "Điện Máy Thành Phát", // Gắn vào owner cho giao diện hiển thị
  },
  {
    id: "b2",
    postType: "BUY",
    category: MAIN_CATEGORIES.ELECTRONIC,
    subCat: "washing",
    condition: "good_working",
    logistics: "need_disassemble",

    type: "Điện máy",
    businessName: "Cửa Hàng Đồ Cũ Gia Định",
    name: "Thu mua Máy giặt LG TurboWash số lượng lớn",
    desc: "Mới > 80%, Tự tháo dỡ",
    price: 6200000,
    image:
      "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?q=80&w=600&auto=format&fit=crop",
    owner: "Cửa Hàng Đồ Cũ Gia Định",
  },
  {
    id: "b3",
    postType: "BUY",
    category: MAIN_CATEGORIES.APPLIANCE, // Thuộc nhóm Gia dụng
    space: "kitchen",
    condition: "dead_scrap",
    logistics: "motor_friendly",

    type: "Gia dụng",
    businessName: "Môi Trường Xanh Group",
    name: "Thu mua Lò vi sóng Sharp 25L lỗi nhẹ hoặc cũ",
    desc: "Mọi tình trạng. Hỗ trợ vận chuyển",
    price: 1200000,
    image:
      "https://images.unsplash.com/photo-1585659722983-3a6750f223d0?q=80&w=600&auto=format&fit=crop",
    owner: "Môi Trường Xanh Group",
  },
  {
    id: "b4",
    postType: "BUY",
    category: MAIN_CATEGORIES.ELECTRONIC,
    subCat: "entertainment",
    condition: "good_working",
    logistics: "truck_required",

    type: "Điện máy",
    businessName: "Điện Máy Hoàng Quân",
    name: "Gom mua Smart TV Sony 4K 65 inch màn đẹp",
    desc: "Chưa qua sửa chữa. Thu mua tại chỗ",
    price: 12500000,
    image:
      "https://images.unsplash.com/photo-1593305841991-05c297ba4575?q=80&w=600&auto=format&fit=crop",
    owner: "Điện Máy Hoàng Quân",
  },
];

export const mockPersonalPosts = [
  {
    id: "p1",
    postType: "SELL", // Tin dân đăng bán
    category: MAIN_CATEGORIES.APPLIANCE,
    space: "living_room",
    material: "fabric",
    condition: "minor_fault",
    logistics: "truck_required",

    type: "Nội thất",
    name: "Sofa nỉ xám 3 chỗ",
    desc: "Sử dụng 2 năm, có trầy nhẹ ở chân gỗ, nỉ còn mới không sờn.",
    aiSuggested: true,
    price: 2500000, // Đã thêm giá bán
    image:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=600&auto=format&fit=crop",
    owner: "Hộ dân sinh sống tại Quận 7",
  },
  {
    id: "p2",
    postType: "SELL",
    category: MAIN_CATEGORIES.APPLIANCE,
    space: "bedroom",
    material: "natural_wood",
    condition: "good_working",
    logistics: "need_disassemble",

    type: "Nội thất",
    name: "Bàn làm việc gỗ sồi",
    desc: "Dọn nhà cần pass gấp bàn làm việc, gỗ thật rất chắc chắn.",
    aiSuggested: false,
    price: 1800000,
    image:
      "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=600&auto=format&fit=crop",
    owner: "Bạn sinh viên làng đại học",
  },
  {
    id: "p3",
    postType: "SELL",
    category: MAIN_CATEGORIES.ELECTRONIC,
    subCat: "cooling",
    condition: "good_working",
    logistics: "motor_friendly",

    type: "Điện gia dụng",
    name: "Quạt đứng công nghiệp",
    desc: "Quạt chạy cực mạnh, ít dùng nên còn rất mới, full box.",
    aiSuggested: false,
    price: 800000,
    image:
      "https://images.unsplash.com/photo-1622737133809-d95047b9e673?q=80&w=600&auto=format&fit=crop",
    owner: "Khu nhà trọ Gò Vấp",
  },
];

export const mockUsers = [
  {
    id: "u_mod_001",
    email: "mod@homecycle.vn",
    password: "123", // Dùng để test form đăng nhập
    fullName: "Trần Kiểm Duyệt",
    role: ROLES.MODERATOR,
    avatar: "https://ui-avatars.com/api/?name=Mod&background=0D8ABC&color=fff",
    isActive: true,
  },

  {
    id: "u_user_002",
    email: "minzy@gmail.com",
    password: "1", // Mật khẩu test cho User
    fullName: "Minzy",
    role: ROLES.PERSONAL, // Quyền người dùng cá nhân bình thường
    avatar: "https://ui-avatars.com/api/?name=User&background=244f4d&color=fff",
    isActive: true,
  }
];

// ==========================================
// 2. MOCK DATA: BÀI VIẾT CHỜ KIỂM DUYỆT (Dành cho trang Mod Dashboard)
// ==========================================
// Dữ liệu này mix giữa TIN BÁN (SELL) và TIN MUA (BUY), bổ sung thêm trường status và postDate
export const mockPostsToModerate = [
  {
    id: "mod_1",
    postType: "SELL",
    category: MAIN_CATEGORIES.APPLIANCE,
    type: "Nội thất",
    name: "Giường ngủ gỗ công nghiệp MDF",
    desc: "Giường mới mua 6 tháng, do chuyển nhà nên pass lại. Kích thước 1m8x2m.",
    price: 1500000,
    image:
      "https://images.unsplash.com/photo-1505693314120-0d443867891c?q=80&w=600&auto=format&fit=crop",
    owner: "Nguyễn Văn A", // Tên người đăng
    authorRole: ROLES.PERSONAL,
    postDate: "12/07/2026",
    status: POST_STATUS.PENDING, // Đang chờ Mod duyệt
    area: "Quận 7, TP.HCM",
  },
  {
    id: "mod_2",
    postType: "BUY",
    category: MAIN_CATEGORIES.ELECTRONIC,
    type: "Điện máy",
    businessName: "Điện Máy Thuận Phát",
    name: "Thu mua Điều hòa Panasonic cũ hỏng",
    desc: "Thu mua mọi tình trạng, có xe tải đến tận nơi tháo dỡ trong ngày.",
    price: 0, // 0 có thể format hiển thị thành "Thương lượng"
    image:
      "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?q=80&w=600&auto=format&fit=crop",
    owner: "Điện Máy Thuận Phát",
    authorRole: ROLES.BUSINESS,
    postDate: "13/07/2026",
    status: POST_STATUS.PENDING,
    area: "Thủ Đức, TP.HCM",
  },
  {
    id: "mod_3",
    postType: "SELL",
    category: MAIN_CATEGORIES.ELECTRONIC,
    type: "Điện gia dụng",
    name: "Nồi chiên không dầu Philips 5L",
    desc: "Sản phẩm như mới, xài rất tốt, không trầy xước.",
    price: 800000,
    image:
      "https://images.unsplash.com/photo-1622737133809-d95047b9e673?q=80&w=600&auto=format&fit=crop",
    owner: "Trần Thị B",
    authorRole: ROLES.PERSONAL,
    postDate: "14/07/2026",
    status: POST_STATUS.REPORTED, // Bài bị báo cáo
    reportReason:
      "Hình ảnh lấy trên mạng, không phải ảnh thật của sản phẩm (5 lượt báo cáo)",
    area: "Cầu Giấy, Hà Nội",
  },
];
