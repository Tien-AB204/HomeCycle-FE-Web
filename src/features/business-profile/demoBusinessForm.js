/*
 * Điền hồ sơ doanh nghiệp mẫu vào form onboarding. Giống Mobile, thông tin
 * trên CCCD (họ tên, số, ngày sinh, địa chỉ, kéo theo tên chủ tài khoản) lấy
 * từ bước quét CCCD nên mẫu không điền và không ghi đè. Ảnh giấy tờ vẫn do
 * người dùng tải lên.
 */
export const buildDemoBusinessForm = (currentForm, sample) => {
  const warehouse = sample.model === "enterprise" ? sample.warehouseAddress : null;

  return {
    ...currentForm,
    businessModel: sample.model === "enterprise" ? "1" : "0",
    businessName: sample.businessName,
    businessDescription: sample.businessDescription,
    taxCode: sample.taxCode,
    businessAddress: sample.businessAddress.street,
    ward: sample.businessAddress.ward,
    city: sample.businessAddress.city,
    operatingScope: sample.operatingScope,
    serviceAreaCity: warehouse?.city || "",
    serviceAreaWard: warehouse?.ward || "",
    serviceAreaStreet: warehouse?.street || "",
    bankCode: sample.bankCode,
    bankName: sample.bankName,
    accountNumber: sample.accountNumber,
  };
};
