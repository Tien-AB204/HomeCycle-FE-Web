/*
 * `.detail`/`.title` trong lỗi trả về là các trường ProblemDetails chuẩn
 * của ASP.NET - khác với Result<T>.Error.Message (quy ước riêng của
 * Backend, luôn là tiếng Việt). ProblemDetails chỉ xuất hiện khi lỗi
 * KHÔNG đi qua Result<T> (validation model mặc định, lỗi hệ thống chưa
 * xử lý...) và thường mang văn bản tiếng Anh/kỹ thuật ("One or more
 * validation errors occurred."...). Chỉ được hiển thị cho người dùng khi
 * thực sự là tiếng Việt; nếu không, coi như không an toàn và bỏ qua để
 * rơi xuống thông báo tiếng Việt tự soạn của màn hình.
 */
export const isVietnameseMessage = (message) =>
  /[À-ỹĐđ]/u.test(String(message || ""));

export const getSafeProblemDetail = (value) =>
  isVietnameseMessage(value) ? value : "";
