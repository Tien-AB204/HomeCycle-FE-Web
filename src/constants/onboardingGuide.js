/*
 * Nội dung màn giới thiệu (hiện một lần cho tài khoản mới) và trang Hướng
 * dẫn sử dụng. Bám theo luồng nghiệp vụ của Mobile, lời chỉ dẫn theo menu Web.
 * icon là tên Material Symbols.
 */
export const GUIDE_SLIDES = Object.freeze({
  personal: [
    {
      key: "post",
      icon: "photo_camera",
      title: "Đăng tin bán đồ cũ",
      description: "Chụp ảnh, nhập giá và cách giao hàng là tin của bạn sẵn sàng.",
      points: [
        "Vào Quản lý của tôi → Tin của tôi để tạo tin mới",
        "Quản lý, đóng hoặc mở lại tin bất cứ lúc nào",
      ],
    },
    {
      key: "buy",
      icon: "search",
      title: "Tìm và mua đồ dễ dàng",
      description: "Khám phá theo loại sản phẩm, thêm vào giỏ hoặc trao đổi giá với người bán.",
      points: [
        "Tìm kiếm và lọc theo loại, thương hiệu, khu vực",
        "Nhắn tin trực tiếp với người bán trước khi mua",
      ],
    },
    {
      key: "sell-to-business",
      icon: "domain",
      title: "Bán cho doanh nghiệp thu mua",
      description: "Xem tin thu mua từ doanh nghiệp và gửi chào bán món đồ phù hợp.",
      points: [
        "Doanh nghiệp hẹn lịch kiểm định và thu gom tận nơi",
        "Theo dõi lịch hẹn ở mục Lịch hẹn",
      ],
    },
    {
      key: "safe-payment",
      icon: "verified_user",
      title: "Giao dịch an toàn",
      description: "Tiền được HomeCycle giữ tạm và chỉ chuyển cho người bán khi đơn hoàn tất.",
      points: [
        "Có vấn đề với đơn hàng thì mở tranh chấp để được hỗ trợ",
        "Nhận hàng xong nhớ đánh giá để cộng đồng tin cậy hơn",
      ],
    },
  ],
  business: [
    {
      key: "profile",
      icon: "description",
      title: "Hoàn tất hồ sơ doanh nghiệp",
      description: "Cung cấp thông tin doanh nghiệp và chờ HomeCycle duyệt.",
      points: [
        "Theo dõi trạng thái duyệt ở mục Hồ sơ",
        "Làm khảo sát thu mua để nhận gợi ý tin phù hợp",
      ],
    },
    {
      key: "buy-post",
      icon: "campaign",
      title: "Đăng tin thu mua",
      description: "Nêu món đồ, khoảng giá và số lượng cần mua để người bán tìm đến bạn.",
      points: [
        "Người bán gửi chào bán trực tiếp vào tin của bạn",
        "Trang chủ gợi ý tin bán khớp với nhu cầu đã khảo sát",
      ],
    },
    {
      key: "offers",
      icon: "swap_horiz",
      title: "Duyệt chào bán và hẹn lịch",
      description: "Chấp nhận chào bán phù hợp, lập hợp đồng rồi hẹn lịch kiểm định và thu gom.",
      points: [
        "Xem chào bán ở mục Đề nghị",
        "Kiểm định xác nhận tình trạng món đồ trước khi thu gom",
      ],
    },
    {
      key: "payment",
      icon: "account_balance_wallet",
      title: "Thanh toán và đối soát",
      description: "Thanh toán qua ví HomeCycle, theo dõi đơn và lịch sử giao dịch rõ ràng.",
      points: [
        "Theo dõi đơn hàng, lịch hẹn và số dư ở các mục Đơn hàng, Lịch hẹn, Ví",
        "Có vấn đề thì mở tranh chấp để được hỗ trợ",
      ],
    },
  ],
});

export const GUIDE_FAQ = Object.freeze([
  {
    key: "selling",
    icon: "sell",
    title: "Đăng tin & bán hàng",
    items: [
      {
        question: "Làm sao để đăng tin?",
        answer:
          "Vào Quản lý của tôi → Tin của tôi và chọn tạo tin mới. Điền tên món đồ, ảnh, giá, số lượng và cách giao hàng rồi đăng tin.",
      },
      {
        question: "Muốn ngừng bán thì làm gì?",
        answer:
          "Ở Tin của tôi, mở tin và chọn đóng tin. Tin đã đóng nhưng còn số lượng có thể mở lại bất cứ lúc nào.",
      },
      {
        question: "Xem đề nghị và chào bán ở đâu?",
        answer:
          "Mục Đề nghị trong Quản lý của tôi. Tại đây bạn xem, chấp nhận hoặc từ chối các đề nghị đã nhận và đã gửi.",
      },
    ],
  },
  {
    key: "buying",
    icon: "shopping_cart",
    title: "Mua hàng",
    items: [
      {
        question: "Mua một món đồ như thế nào?",
        answer:
          "Mở tin bán, thêm vào giỏ hoặc gửi đề nghị giá cho người bán. Sau khi thanh toán, đơn hàng hiện ở mục Đơn hàng.",
      },
      {
        question: "Có những cách giao hàng nào?",
        answer:
          "Giao qua đơn vị vận chuyển GHN, người bán tự giao hoặc người mua tự đến lấy. Cách giao do người bán chọn khi đăng tin.",
      },
    ],
  },
  {
    key: "appointments",
    icon: "event",
    title: "Lịch hẹn & kiểm định",
    items: [
      {
        question: "Lịch hẹn dùng để làm gì?",
        answer:
          "Với giao dịch thu mua, hai bên hẹn lịch kiểm định để xác nhận tình trạng món đồ và lịch thu gom để bàn giao. Tất cả nằm ở mục Lịch hẹn.",
      },
      {
        question: "Nếu không đồng ý kết quả kiểm định?",
        answer:
          "Mở tranh chấp từ phiếu kiểm định, kèm mô tả và ảnh bằng chứng để HomeCycle xem xét.",
      },
    ],
  },
  {
    key: "payment",
    icon: "account_balance_wallet",
    title: "Thanh toán & ví",
    items: [
      {
        question: "Tiền của tôi được giữ thế nào?",
        answer:
          "Khi mua, tiền được HomeCycle giữ tạm và chỉ chuyển cho người bán khi đơn hoàn tất, giúp cả hai bên an tâm.",
      },
      {
        question: "Rút tiền về ngân hàng ở đâu?",
        answer:
          "Vào mục Ví để xem số dư, lịch sử và tạo yêu cầu rút tiền về tài khoản ngân hàng đã liên kết.",
      },
    ],
  },
  {
    key: "disputes",
    icon: "report",
    title: "Tranh chấp & đánh giá",
    items: [
      {
        question: "Khi nào nên mở tranh chấp?",
        answer:
          "Khi món đồ không đúng mô tả, bị hư hỏng hoặc giao dịch gặp vấn đề. Mở từ chi tiết đơn hàng trong thời hạn cho phép, kèm mô tả và ảnh.",
      },
      {
        question: "Đánh giá đơn hàng có ảnh hưởng gì không?",
        answer:
          "Đánh giá giúp người khác chọn người bán uy tín. Lưu ý: đã đánh giá đơn hàng thì không thể mở tranh chấp cho đơn đó nữa.",
      },
    ],
  },
  {
    key: "priority",
    icon: "star",
    title: "Gói VIP & tin ưu tiên",
    items: [
      {
        question: "Tin ưu tiên là gì?",
        answer:
          "Khi bạn dùng gói trả phí còn hạn, tin đăng được gắn nhãn Ưu tiên và có cơ hội xuất hiện ở mục Tin nổi bật trên Trang chủ.",
      },
    ],
  },
]);
