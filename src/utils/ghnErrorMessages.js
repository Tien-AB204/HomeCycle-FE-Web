/*
 * Ánh xạ các mã lỗi nghiệp vụ GHN (Result<T>.Error.Code) sang thông báo
 * tiếng Việt tự nhiên - không để lộ ProblemDetails/kỹ thuật của GHN cho
 * người dùng. Chỉ nhận diện theo mã (code), không dựa vào nội dung message
 * tiếng Anh vì message có thể đổi mà không phá hợp đồng.
 */
const GHN_ERROR_MESSAGES = Object.freeze({
  "Ghn.InvalidParcel":
    "Thông tin kiện hàng chưa hợp lệ. Vui lòng kiểm tra lại tên, khối lượng và kích thước.",
  "Ghn.ParcelCountMismatch":
    "Số lượng kiện hàng không khớp với dữ liệu đã gửi. Vui lòng kiểm tra lại danh sách kiện.",
  "Ghn.TotalWeightMismatch":
    "Tổng khối lượng kiện hàng không khớp với dữ liệu đã gửi. Vui lòng kiểm tra lại.",
  "Ghn.WeightLimitExceeded":
    "Tổng khối lượng vượt quá giới hạn cho phép của GHN.",
  "Ghn.InvalidServiceType":
    "Loại dịch vụ GHN không hợp lệ với thông tin kiện hàng hiện tại.",
  "Ghn.ParcelDimensionsMismatch":
    "Kích thước kiện hàng không khớp với dữ liệu đã gửi. Vui lòng kiểm tra lại.",
  "Ghn.MultiParcelDimensionsUnverified":
    "Hệ thống hiện chưa xác nhận được đơn hàng có từ 2 kiện trở lên qua GHN. Vui lòng gộp về 1 kiện hoặc đổi hình thức giao nhận.",
  "Ghn.ServiceUnavailable":
    "Dịch vụ GHN hiện chưa khả dụng. Vui lòng thử lại sau.",
  "Ghn.InvalidPreview":
    "Thông tin xem trước phí GHN đã hết hạn hoặc không còn hợp lệ. Vui lòng tính lại phí.",
  "Ghn.OrderAlreadyExists":
    "Đơn vận chuyển GHN cho giao dịch này đã được tạo trước đó.",
  "Ghn.InvalidDeliveryContext":
    "Hình thức giao nhận hiện tại không phù hợp với trạng thái giao dịch.",
  "Ghn.TrackingChanged":
    "Thông tin vận đơn GHN vừa được cập nhật. Vui lòng tải lại trước khi tiếp tục.",
  "Ghn.CancellationPending":
    "Yêu cầu hủy vận đơn GHN đang được xử lý. Vui lòng đợi kết quả từ GHN.",
  "Ghn.CancellationRefused":
    "GHN từ chối yêu cầu hủy vận đơn cho đơn hàng này.",
});

export const getApiErrorCode = (error) =>
  String(
    error?.response?.data?.error?.code ||
      error?.response?.data?.code ||
      "",
  ).trim();

export const getGhnErrorMessage = (error, fallbackMessage) => {
  const code = getApiErrorCode(error);

  return GHN_ERROR_MESSAGES[code] || fallbackMessage;
};
