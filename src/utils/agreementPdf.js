import agreementApi from "../services/apis/agreementApi";

const PDF_ERROR_MESSAGES = {
  403: "Bạn không có quyền tải hợp đồng này.",
  404: "Không tìm thấy hợp đồng.",
  409: "Hợp đồng chưa được thanh toán nên chưa có bản PDF.",
  503: "Hệ thống chưa lấy được bản PDF của hợp đồng. Vui lòng thử lại sau.",
};

export const getAgreementPdfErrorMessage = (error) =>
  PDF_ERROR_MESSAGES[Number(error?.response?.status)] ||
  "Không thể tải hợp đồng PDF. Vui lòng kiểm tra kết nối và thử lại.";

/*
 * Tải PDF hợp đồng về máy như một tệp bình thường của trình duyệt.
 */
export const downloadAgreementPdf = async (agreementId) => {
  const data = await agreementApi.downloadPdf(agreementId);
  const blob =
    data instanceof Blob ? data : new Blob([data], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `HopDong-HomeCycle-${String(agreementId).slice(0, 8)}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
