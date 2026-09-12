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

/*
 * ModelState validation dictionary của ASP.NET ({ field: [message, ...] })
 * có thể chứa các thông báo binding mặc định bằng tiếng Anh (vd "The field
 * X is required.") bên cạnh các thông báo nghiệp vụ tiếng Việt do Backend
 * tự soạn (FluentValidation). Không được render nguyên cả dictionary -
 * chỉ giữ lại các message thực sự là tiếng Việt, ghép lại để hiển thị;
 * nếu không còn message nào an toàn, trả về rỗng để màn hình rơi xuống
 * thông báo tiếng Việt tự soạn của chính nó. Không bao giờ lộ tên field/
 * khóa của dictionary.
 */
export const getSafeValidationMessage = (errors) => {
  if (!errors) {
    return "";
  }

  return Object.values(errors)
    .flat()
    .filter(isVietnameseMessage)
    .join("\n");
};
