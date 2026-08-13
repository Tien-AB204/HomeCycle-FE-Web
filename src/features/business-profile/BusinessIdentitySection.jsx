import { useState } from "react";
import businessProfileApi from "../../services/apis/businessProfileApi";
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
  fullName: profile?.fullName || "",
  identityNumber:
    profile?.identityNumber || "",
  identityName:
    profile?.identityName || "",
  identityDob:
    profile?.identityDob || "",
  identityAddress:
    profile?.identityAddress || "",
  cccdFront: null,
  cccdBack: null,
});

const IdentityInfo = ({ label, value }) => (
  <div className="rounded-2xl border border-[#DCE8E5] bg-[#F8FBFA] px-4 py-3.5">
    <p className="text-xs font-black uppercase tracking-wide text-[#708987]">
      {label}
    </p>
    <p className="mt-1.5 break-words text-sm font-bold text-[#183F41]">
      {value || "Chưa cập nhật"}
    </p>
  </div>
);

const formatDate = (value) => {
  if (!value) return "Chưa cập nhật";

  const [year, month, day] = String(value)
    .slice(0, 10)
    .split("-");

  return year && month && day
    ? `${day}/${month}/${year}`
    : value;
};

export default function BusinessIdentitySection({
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

  const validate = () => {
    if (!form.fullName.trim()) {
      return "Vui lòng nhập họ tên người đại diện.";
    }
    if (
      !/^\d{9,12}$/.test(
        form.identityNumber.trim(),
      )
    ) {
      return "Số giấy tờ phải gồm từ 9 đến 12 chữ số.";
    }
    if (!form.identityName.trim()) {
      return "Vui lòng nhập họ tên trên giấy tờ.";
    }
    if (!form.identityDob) {
      return "Vui lòng chọn ngày sinh.";
    }
    if (
      new Date(form.identityDob) >
      new Date()
    ) {
      return "Ngày sinh không hợp lệ.";
    }
    if (!form.identityAddress.trim()) {
      return "Vui lòng nhập địa chỉ trên giấy tờ.";
    }

    return (
      validateBusinessFile(
        form.cccdFront,
        "Ảnh CCCD mặt trước",
      ) ||
      validateBusinessFile(
        form.cccdBack,
        "Ảnh CCCD mặt sau",
      )
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
      await businessProfileApi.updateIdentity(
        form,
      );
      await onUpdated?.();
      setSuccess(
        "Thông tin người đại diện đã được cập nhật.",
      );
      setIsEditing(false);
    } catch (updateError) {
      setError(
        getBusinessApiErrorMessage(
          updateError,
          "Không thể cập nhật thông tin người đại diện.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <BusinessSectionIntro
        icon="badge"
        title="Người đại diện & định danh"
        description="Quản lý thông tin pháp lý của người đại diện. Chỉ chọn lại ảnh CCCD khi bạn thực sự muốn thay đổi giấy tờ đã lưu."
      />
      <FormMessage
        error={error}
        success={success}
      />

      {!isEditing ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <IdentityInfo
              label="Họ tên người đại diện"
              value={profile.fullName}
            />
            <IdentityInfo
              label="Số CCCD / giấy tờ"
              value={profile.identityNumber}
            />
            <IdentityInfo
              label="Họ tên trên giấy tờ"
              value={profile.identityName}
            />
            <IdentityInfo
              label="Ngày sinh"
              value={formatDate(
                profile.identityDob,
              )}
            />
            <div className="sm:col-span-2">
              <IdentityInfo
                label="Địa chỉ trên giấy tờ"
                value={profile.identityAddress}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              [
                "CCCD mặt trước",
                profile.cccdFrontUrl,
              ],
              [
                "CCCD mặt sau",
                profile.cccdBackUrl,
              ],
            ].map(([label, url]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#DCE8E5] bg-white px-4 py-3.5"
              >
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-[#708987]">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#183F41]">
                    {url
                      ? "Đã lưu giấy tờ"
                      : "Chưa có giấy tờ"}
                  </p>
                </div>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-sm font-black text-[#2F6F9F] hover:underline"
                  >
                    Xem tệp
                  </a>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end border-t border-[#E4ECEA] pt-5">
            <button
              type="button"
              onClick={handleStartEditing}
              className="rounded-xl bg-[#4F8588] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#356A70]"
            >
              CẬP NHẬT NGƯỜI ĐẠI DIỆN
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
            id="business-representative-name"
            label="Họ tên người đại diện"
            value={form.fullName}
            onChange={(event) =>
              updateField(
                "fullName",
                event.target.value,
              )
            }
            required
          />
          <BusinessField
            id="business-identity-number"
            label="Số CCCD / giấy tờ"
            value={form.identityNumber}
            onChange={(event) =>
              updateField(
                "identityNumber",
                event.target.value.replace(
                  /\D/g,
                  "",
                ),
              )
            }
            inputMode="numeric"
            required
          />
          <BusinessField
            id="business-identity-name"
            label="Họ tên trên giấy tờ"
            value={form.identityName}
            onChange={(event) =>
              updateField(
                "identityName",
                event.target.value,
              )
            }
            required
          />
          <BusinessField
            id="business-identity-dob"
            label="Ngày sinh"
            type="date"
            value={form.identityDob}
            max={new Date()
              .toISOString()
              .slice(0, 10)}
            onChange={(event) =>
              updateField(
                "identityDob",
                event.target.value,
              )
            }
            required
          />
          <BusinessField
            id="business-identity-address"
            label="Địa chỉ trên giấy tờ"
            value={form.identityAddress}
            onChange={(event) =>
              updateField(
                "identityAddress",
                event.target.value,
              )
            }
            required
            className="sm:col-span-2"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <BusinessFileField
            id="business-cccd-front"
            label="CCCD mặt trước"
            currentUrl={
              profile.cccdFrontUrl
            }
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) =>
              updateField(
                "cccdFront",
                event.target.files?.[0] ||
                  null,
              )
            }
          />
          <BusinessFileField
            id="business-cccd-back"
            label="CCCD mặt sau"
            currentUrl={
              profile.cccdBackUrl
            }
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) =>
              updateField(
                "cccdBack",
                event.target.files?.[0] ||
                  null,
              )
            }
          />
        </div>

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
            LƯU THÔNG TIN ĐẠI DIỆN
          </SaveButton>
        </div>
        </form>
      )}
    </div>
  );
}
