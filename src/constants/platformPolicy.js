/*
 * Quy định & chính sách nền tảng, nội dung tĩnh dùng chung với Mobile
 * (app/policy.tsx). Mỗi mục: { label?, text }.
 */
export const POLICY_UPDATED_AT = "Tháng 08/2026";

export const POLICY_INTRO =
  "Chào mừng bạn đến với HomeCycle - Nền tảng kết nối giao dịch và thu mua đồ gia dụng cũ uy tín. Để đảm bảo môi trường giao dịch an toàn, minh bạch và công bằng cho tất cả người dùng, vui lòng đọc kỹ và tuân thủ các quy định dưới đây.";

export const POLICY_SECTIONS = Object.freeze([
  {
    key: "account",
    title: "1. Quy định về Tài khoản và Xác thực danh tính",
    items: [
      {
        label: "Thông tin chính chủ",
        text: "Người dùng (Cá nhân/Doanh nghiệp) phải cung cấp thông tin chính xác. Tên chủ tài khoản ngân hàng bắt buộc phải trùng khớp với họ tên trên Căn cước công dân (CCCD) hoặc Giấy phép kinh doanh (đối với Doanh nghiệp) để phòng chống gian lận và rửa tiền.",
      },
      {
        label: "Bảo mật thông tin",
        text: "Hệ thống không bắt buộc hiển thị địa chỉ chi tiết (số nhà, tên đường) công khai để bảo vệ quyền riêng tư cá nhân. Số CCCD/CMND và Số tài khoản ngân hàng sẽ được mã hóa và ẩn bớt các ký tự (ví dụ: 001202******).",
      },
      {
        label: "Tài khoản Doanh nghiệp",
        text: "Yêu cầu cung cấp đầy đủ và chính xác Giấy phép kinh doanh, CCCD người đại diện pháp luật. Mọi thay đổi về thông tin pháp lý đều phải thông qua sự xét duyệt của Ban quản trị.",
      },
    ],
  },
  {
    key: "posts",
    title: "2. Quy định Đăng tin và Hàng hóa",
    items: [
      {
        label: "Tính trung thực",
        text: "Hình ảnh sản phẩm (từ 2-5 ảnh) phải là ảnh tự chụp thực tế. Tình trạng hàng hóa, mức độ hư hại và thời gian sử dụng phải được khai báo trung thực đúng với thực tế.",
      },
      {
        label: "Kiểm duyệt nội dung",
        text: "Bài đăng vi phạm tiêu chuẩn cộng đồng, chứa nội dung phản cảm, sai sự thật hoặc hàng hóa cấm giao dịch sẽ bị gỡ bỏ mà không cần báo trước.",
      },
      {
        label: "Đóng bài tự động",
        text: "Hệ thống sẽ tự động đóng bài đăng nếu số lượng hàng tồn kho bằng 0 sau khi hoàn tất giao dịch.",
      },
    ],
  },
  {
    key: "appointments",
    title: "3. Quy định Thương lượng và Lịch hẹn",
    items: [
      {
        label: "Tạo lịch hẹn",
        text: "Khi giao dịch được xác nhận, hệ thống sẽ tạo Lịch kiểm định hoặc Lịch thu gom. Hai bên có trách nhiệm tuân thủ thời gian và địa điểm đã chốt.",
      },
      {
        label: "Thay đổi lịch hẹn",
        text: "Việc thay đổi thời gian/địa điểm phải được thực hiện trước ít nhất 24 giờ và phải được sự đồng ý của đối tác. Nếu một bên từ chối, lịch cũ được giữ nguyên.",
      },
      {
        label: "Hủy lịch hẹn",
        text: "Cho phép hủy lịch trước ít nhất 12 giờ. Hủy lịch sát giờ có thể bị ghi nhận vi phạm và trừ Điểm uy tín.",
      },
      {
        label: "Quá hạn lịch hẹn (\"Bùng\" hẹn)",
        text: "Nếu quá thời gian hẹn 2 tiếng mà không có bên nào tương tác xác nhận trên hệ thống, lịch hẹn sẽ tự động chuyển sang trạng thái \"Quá hạn\" (Expired) và đóng băng giao dịch để chờ xử lý.",
      },
    ],
  },
  {
    key: "shipping",
    title: "4. Chính sách Vận chuyển (Giao Hàng Nhanh - GHN)",
    items: [
      {
        label: "Khóa địa chỉ",
        text: "Đối với các giao dịch chọn đơn vị vận chuyển GHN, hệ thống sẽ khóa hoàn toàn địa chỉ lấy hàng và địa chỉ giao hàng sau khi chốt đơn. Không hỗ trợ đổi địa chỉ để đảm bảo tính phí ship và tạo mã vận đơn chính xác.",
      },
      {
        text: "Nếu bắt buộc phải đổi địa chỉ, hai bên vui lòng tiến hành Hủy giao dịch hiện tại và thiết lập một giao dịch mới.",
      },
    ],
  },
  {
    key: "payment",
    title: "5. Chính sách Thanh toán và Rút tiền",
    items: [
      {
        label: "Giữ tiền đảm bảo (Escrow)",
        text: "Số tiền giao dịch sẽ được hệ thống HomeCycle tạm giữ để bảo vệ cả hai bên.",
      },
      {
        label: "Thời gian giải ngân",
        text: "Tiền sẽ được cộng vào Số dư khả dụng của Người bán sau 3 ngày (72 giờ) kể từ khi đơn hàng chuyển sang trạng thái \"Thành công\", với điều kiện không có khiếu nại/tranh chấp phát sinh.",
      },
      {
        label: "Hạn mức rút tiền",
        text: "Tối thiểu 100.000 VNĐ/lần. Tối đa 50.000.000 VNĐ/lần. Số lần rút tối đa: 3 lần/ngày.",
      },
    ],
  },
  {
    key: "reputation",
    title: "6. Hệ thống Điểm uy tín và Đánh giá",
    intro:
      "Mỗi tài khoản khởi đầu với 100 Điểm uy tín. Điểm số sẽ thay đổi dựa trên các đánh giá sau giao dịch:",
    items: [
      { label: "Đánh giá Tốt (4-5★)", text: "Khách hàng hài lòng, cộng thêm +2 điểm." },
      { label: "Đánh giá Trung bình (3★)", text: "Có thiếu sót nhỏ, không cộng/trừ điểm." },
      { label: "Đánh giá Kém (1-2★)", text: "Vi phạm cam kết, trừ từ -1 đến -5 điểm." },
    ],
    subheading: "Hình phạt dựa trên Điểm uy tín:",
    subItems: [
      {
        label: "Dưới 60 điểm",
        text: "Tài khoản bị Cảnh cáo. Giới hạn số lượng bài đăng bán / số lượng gửi báo giá. Thời gian giữ tiền giải ngân tăng từ 72 giờ lên 120 giờ.",
      },
      {
        label: "Dưới 20 điểm",
        text: "Vi phạm nghiêm trọng. Tài khoản bị Khóa tự động, tước quyền đăng bài, gửi báo giá và đóng băng lệnh rút tiền. Cần quản trị viên xét duyệt thủ công.",
      },
    ],
  },
  {
    key: "disputes",
    title: "7. Chính sách Khiếu nại và Tranh chấp",
    items: [
      {
        label: "Phát sinh tranh chấp",
        text: "Người dùng có quyền gửi khiếu nại (kèm 3-5 ảnh bằng chứng rõ ràng) khi đối tác: Không đến điểm hẹn, không bàn giao hàng, hàng hóa khác xa mô tả, hoặc có hành vi gian lận.",
      },
      {
        label: "Khiếu nại đánh giá",
        text: "Nếu nhận thấy đánh giá có nội dung công kích cá nhân, sai sự thật hoặc quấy rối, bạn có thể gửi yêu cầu khiếu nại đánh giá để Kiểm duyệt viên xem xét ẩn/xóa.",
      },
      {
        label: "Quyết định cuối cùng",
        text: "Ban quản trị HomeCycle sẽ dựa trên bằng chứng, lịch sử trò chuyện và form kiểm định để đưa ra quyết định xử lý: Giữ nguyên, Hủy giao dịch, Hoàn tiền cho Người mua hoặc Giải ngân cho Người bán. Quyết định của HomeCycle là quyết định cuối cùng.",
      },
    ],
  },
]);
