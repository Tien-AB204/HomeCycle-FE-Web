import { useState } from "react";
import businessProfileApi from "../../services/apis/businessProfileApi";
import BusinessAddressFields from "./BusinessAddressFields";
import {
  BusinessField,
  BusinessFileField,
  BusinessSectionIntro,
  FormMessage,
  SaveButton,
} from "./BusinessFormControls";
import {
  getBusinessApiErrorMessage,
  validateBusinessFile,
} from "./businessProfileUtils";

const createForm = (profile) => ({
  businessName:
    profile?.businessName || "",
  businessDescription:
    profile?.businessDescription || "",
  taxCode: profile?.taxCode || "",
  businessAddress:
    profile?.businessAddress || "",
  ward: profile?.ward || "",
  city: profile?.city || "",
  operatingScope:
    profile?.operatingScope || "",
  businessRegistrationCertificate:
    null,
});

const BusinessInfo = ({
  label,
  value,
  className = "",
}) => (
  <div
    className={`rounded-2xl border border-[#DCE8E5] bg-[#F8FBFA] px-4 py-3.5 ${className}`}
  >
    <p className="text-xs font-black uppercase tracking-wide text-[#708987]">
      {label}
    </p>
    <p className="mt-1.5 whitespace-pre-line break-words text-sm font-bold leading-6 text-[#183F41]">
      {value || "Chưa cập nhật"}
    </p>
  </div>
);

export default function BusinessRegistrationSection({
  profile,
  onUpdated,
}) {
  const [form, setForm] = useState(() =>
    createForm(profile),
  );
  const [isEditing, setIsEditing] =
    useState(false);
  const [isSaving, setIsSaving] =
    useState(false);
  const [error, setError] =
    useState("");
  const [success, setSuccess] =
    useState("");

  const updateField = (name, value) => {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
    setError("");
    setSuccess("");
  };

  const handleAddressChange = (
    address,
  ) => {
    setForm((current) => ({
      ...current,
      city: address.city,
      ward: address.ward,
      businessAddress: address.street,
    }));
    setError("");
    setSuccess("");
  };

  const validate = () => {
    if (!form.businessName.trim()) {
      return "Vui lòng nhập tên doanh nghiệp.";
    }
    if (!form.businessDescription.trim()) {
      return "Vui lòng giới thiệu ngắn về doanh nghiệp.";
    }
    if (
      !/^[A-Za-z0-9-]{8,20}$/.test(
        form.taxCode.trim(),
      )
    ) {
      return "Mã số thuế phải gồm từ 8 đến 20 ký tự chữ, số hoặc dấu gạch ngang.";
    }
    if (
      !form.city ||
      !form.ward ||
      !form.businessAddress.trim()
    ) {
      return "Vui lòng nhập đầy đủ địa chỉ doanh nghiệp.";
    }
    if (!form.operatingScope.trim()) {
      return "Vui lòng nhập phạm vi hoạt động.";
    }

    return validateBusinessFile(
      form.businessRegistrationCertificate,
      "Giấy chứng nhận đăng ký kinh doanh",
    );
  };

  const handleStartEditing = () => {
    setForm(createForm(profile));
    setError("");
    setSuccess("");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setForm(createForm(profile));
    setError("");
    setSuccess("");
    setIsEditing(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    try {
      await businessProfileApi.updateBusinessRegistration(
        form,
      );
      await onUpdated?.();
      setSuccess(
        "Thông tin đăng ký kinh doanh đã được cập nhật.",
      );
      setIsEditing(false);
    } catch (updateError) {
      setError(
        getBusinessApiErrorMessage(
          updateError,
          "Không thể cập nhật đăng ký kinh doanh.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <BusinessSectionIntro
        icon="corporate_fare"
        title="Thông tin doanh nghiệp"
        description="Quản lý thông tin pháp nhân và phạm vi hoạt động. Giấy đăng ký hiện tại được giữ nguyên nếu bạn không chọn tệp mới."
      />
      <FormMessage
        error={error}
        success={success}
      />

      {!isEditing ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <BusinessInfo
              label="Tên doanh nghiệp"
              value={profile.businessName}
            />
            <BusinessInfo
              label="Mã số thuế"
              value={profile.taxCode}
            />
            <BusinessInfo
              label="Giới thiệu doanh nghiệp"
              value={profile.businessDescription}
              className="sm:col-span-2"
            />
            <BusinessInfo
              label="Phạm vi hoạt động"
              value={profile.operatingScope}
              className="sm:col-span-2"
            />
            <BusinessInfo
              label="Địa chỉ trụ sở"
              value={[
                profile.businessAddress,
                profile.ward,
                profile.city,
              ]
                .filter(Boolean)
                .join(", ")}
              className="sm:col-span-2"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#DCE8E5] bg-white px-4 py-3.5">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#708987]">
                Giấy chứng nhận đăng ký kinh doanh
              </p>
              <p className="mt-1 text-sm font-bold text-[#183F41]">
                {profile.businessRegistrationCertificateUrl
                  ? "Đã lưu giấy chứng nhận"
                  : "Chưa có giấy chứng nhận"}
              </p>
            </div>
            {profile.businessRegistrationCertificateUrl && (
              <a
                href={
                  profile.businessRegistrationCertificateUrl
                }
                target="_blank"
                rel="noreferrer"
                className="text-sm font-black text-[#2F6F9F] hover:underline"
              >
                Xem tệp hiện tại
              </a>
            )}
          </div>

          <div className="flex justify-end border-t border-[#E4ECEA] pt-5">
            <button
              type="button"
              onClick={handleStartEditing}
              className="rounded-xl bg-[#4F8588] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#356A70]"
            >
              CẬP NHẬT DOANH NGHIỆP
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <BusinessField
            id="registration-business-name"
            label="Tên doanh nghiệp"
            value={form.businessName}
            onChange={(event) =>
              updateField(
                "businessName",
                event.target.value,
              )
            }
            required
          />
          <BusinessField
            id="registration-tax-code"
            label="Mã số thuế"
            value={form.taxCode}
            onChange={(event) =>
              updateField(
                "taxCode",
                event.target.value,
              )
            }
            required
          />
          <BusinessField
            id="registration-description"
            label="Giới thiệu doanh nghiệp"
            as="textarea"
            rows={4}
            value={
              form.businessDescription
            }
            onChange={(event) =>
              updateField(
                "businessDescription",
                event.target.value,
              )
            }
            required
            className="sm:col-span-2"
          />
          <BusinessField
            id="registration-operating-scope"
            label="Phạm vi hoạt động"
            as="textarea"
            rows={3}
            value={form.operatingScope}
            onChange={(event) =>
              updateField(
                "operatingScope",
                event.target.value,
              )
            }
            required
            className="sm:col-span-2"
          />
        </div>

        <div className="rounded-2xl border border-[#DCE8E5] bg-[#F8FBFA] p-4 sm:p-5">
          <h3 className="mb-4 text-sm font-black text-[#183F41]">
            Địa chỉ trụ sở
          </h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <BusinessAddressFields
              idPrefix="registration-address"
              city={form.city}
              ward={form.ward}
              street={form.businessAddress}
              onChange={
                handleAddressChange
              }
            />
          </div>
        </div>

        <BusinessFileField
          id="registration-certificate"
          label="Giấy chứng nhận đăng ký kinh doanh"
          currentUrl={
            profile.businessRegistrationCertificateUrl
          }
          onChange={(event) =>
            updateField(
              "businessRegistrationCertificate",
              event.target.files?.[0] ||
                null,
            )
          }
        />

        <div className="flex flex-wrap justify-end gap-3 border-t border-[#E4ECEA] pt-5">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="rounded-xl border border-[#79A3A2] bg-white px-5 py-2.5 text-sm font-black text-[#285E62] transition hover:bg-[#F1F7F5] disabled:cursor-not-allowed disabled:opacity-60"
          >
            HỦY
          </button>
          <SaveButton isSaving={isSaving}>
            LƯU THÔNG TIN DOANH NGHIỆP
          </SaveButton>
        </div>
        </form>
      )}
    </div>
  );
}
