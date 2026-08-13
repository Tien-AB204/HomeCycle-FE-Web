import { useEffect, useState } from "react";
import BankAccountSection from "../../features/profile/BankAccountSection";
import { useAuth } from "../../hooks/useAuth";
import { userService } from "../../services/userService";
import AvatarUploader from "../../features/profile/AvatarUploader";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const VERIFICATION_STATUS_META = {
  unverified: {
    label: "Chưa xác minh giấy tờ",
    badgeClass: "bg-slate-100 text-slate-700",
    panelClass: "border-slate-200 bg-slate-50 text-slate-800",
  },
  pending: {
    label: "Đang chờ kiểm duyệt giấy tờ",
    badgeClass: "bg-orange-50 text-orange-700",
    panelClass: "border-orange-200 bg-orange-50 text-orange-800",
  },
  verified: {
    label: "Đã xác minh giấy tờ",
    badgeClass: "bg-green-50 text-green-700",
    panelClass: "border-green-200 bg-green-50 text-green-800",
  },
  rejected: {
    label: "Giấy tờ bị từ chối",
    badgeClass: "bg-red-50 text-red-700",
    panelClass: "border-red-200 bg-red-50 text-red-800",
  },
  unknown: {
    label: "Chưa xác định trạng thái",
    badgeClass: "bg-slate-100 text-slate-700",
    panelClass: "border-slate-200 bg-slate-50 text-slate-800",
  },
};

const VERIFICATION_STATUS_BY_NUMBER = {
  0: "unverified",
  1: "pending",
  2: "verified",
  3: "rejected",
};

const getVerificationStatusMeta = (status) => {
  const normalizedStatus = String(status ?? "").trim().toLowerCase();
  const key =
    VERIFICATION_STATUS_BY_NUMBER[normalizedStatus] ||
    normalizedStatus ||
    "unverified";

  return {
    ...(VERIFICATION_STATUS_META[key] || VERIFICATION_STATUS_META.unknown),
  };
};

const createProfileForm = (profile) => ({
  username: profile?.username || "",
  fullName: profile?.fullName || "",
  phoneNumber: profile?.phoneNumber || "",
});

const createIdentityForm = (profile) => ({
  representativeCode: profile?.representativeCode || "",
  representativeName: profile?.representativeName || "",
  representativeDob: profile?.representativeDob || "",
  representativeAddress: profile?.representativeAddress || "",
  frontIdCardFile: null,
  backIdCardFile: null,
});

const getApiErrorMessage = (error, fallbackMessage) => {
  const responseData = error?.response?.data;

  const validationMessage = responseData?.errors
    ? Object.values(responseData.errors).flat().find(Boolean)
    : "";

  return (
    validationMessage ||
    responseData?.message ||
    responseData?.error?.message ||
    error?.message ||
    fallbackMessage
  );
};

const validateImage = (file, label) => {
  if (!file) {
    return "";
  }

  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return `${label} chỉ hỗ trợ định dạng JPG, PNG hoặc WEBP.`;
  }

  if (file.size > MAX_FILE_SIZE) {
    return `${label} không được vượt quá 5MB.`;
  }

  return "";
};

const fetchProfileData = async () => {
  const response = await userService.getProfile();

  if (!response?.isSuccess || !response?.data) {
    throw new Error(
      response?.error?.message || "Không thể tải thông tin hồ sơ.",
    );
  }

  return response.data;
};

const ProfileField = ({
  id,
  label,
  name,
  value,
  onChange = () => {},
  readOnly = false,
  required = false,
  type = "text",
  autoComplete,
  placeholder = "",
}) => {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-black text-[#607B7A]"
      >
        {label}

        {required && <span className="text-red-500"> *</span>}
      </label>

      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`w-full rounded-xl border px-3 py-3 text-sm outline-none transition ${
          readOnly
            ? "cursor-default border-[#E1EAE8] bg-[#F5F8F7] text-[#526E6D]"
            : "border-[#CDDED9] bg-white text-[#183436] focus:border-[#4F8588] focus:ring-4 focus:ring-[#5F9291]/10"
        }`}
      />
    </div>
  );
};

const IdentityImage = ({ label, imageUrl, emptyMessage }) => {
  return (
    <div>
      <p className="mb-2 text-xs font-black text-[#607B7A]">{label}</p>

      <div className="flex h-44 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[#C9DBD7] bg-[#F5F8F7] p-2">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={label}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl">image</span>

            <p className="mt-1 text-sm">{emptyMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const IdentityFileInput = ({ id, label, name, onChange, previewUrl }) => {
  return (
    <div>
      <IdentityImage
        label={label}
        imageUrl={previewUrl}
        emptyMessage="Chưa chọn ảnh"
      />

      <input
        id={id}
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onChange}
        className="mt-3 block w-full rounded-xl border border-[#CDDED9] bg-white text-sm text-[#68807F] file:mr-4 file:border-0 file:bg-[#E2F0ED] file:px-4 file:py-3 file:font-bold file:text-[#285E62] hover:file:bg-[#D2E8E3]"
      />

      <p className="mt-1 text-xs text-slate-500">
        Hỗ trợ JPG, PNG hoặc WEBP; tối đa 5MB.
      </p>
    </div>
  );
};

export default function UserProfilePage() {
  const { updateUser } = useAuth();

  const [profile, setProfile] = useState(null);

  const [profileForm, setProfileForm] = useState(createProfileForm(null));

  const [identityForm, setIdentityForm] = useState(createIdentityForm(null));

  const [identityPreviews, setIdentityPreviews] = useState({
    front: "",
    back: "",
  });

  const [activeTab, setActiveTab] = useState("personal");

  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [isEditingIdentity, setIsEditingIdentity] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [isSavingIdentity, setIsSavingIdentity] = useState(false);

  const [error, setError] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadProfile = async () => {
      try {
        const profileData = await fetchProfileData();

        if (!isActive) {
          return;
        }

        setProfile(profileData);

        setProfileForm(createProfileForm(profileData));

        setIdentityForm(createIdentityForm(profileData));

        setIdentityPreviews({
          front: profileData.frontIDCardImage || "",
          back: profileData.backIDCardImage || "",
        });
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setError(
          getApiErrorMessage(loadError, "Không thể kết nối đến máy chủ."),
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isActive = false;
    };
  }, []);

  const clearMessages = () => {
    setError("");
    setSuccessMessage("");
  };

  const applyProfileData = (profileData) => {
    setProfile(profileData);

    setProfileForm(createProfileForm(profileData));

    setIdentityForm(createIdentityForm(profileData));

    setIdentityPreviews({
      front: profileData.frontIDCardImage || "",
      back: profileData.backIDCardImage || "",
    });
  };

  const handleTabChange = (tabName) => {
    clearMessages();
    setActiveTab(tabName);
  };

  const handleProfileFormChange = (event) => {
    const { name, value } = event.target;

    setProfileForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleStartEditingProfile = () => {
    clearMessages();

    setProfileForm(createProfileForm(profile));

    setIsEditingProfile(true);
  };

  const handleCancelEditingProfile = () => {
    clearMessages();

    setProfileForm(createProfileForm(profile));

    setIsEditingProfile(false);
  };

  const validateProfileForm = () => {
    if (profileForm.username.trim().length < 3) {
      return "Tên đăng nhập phải có ít nhất 3 ký tự.";
    }

    if (!profileForm.fullName.trim()) {
      return "Vui lòng nhập họ và tên.";
    }

    if (!/^[0-9]{9,11}$/.test(profileForm.phoneNumber.trim())) {
      return "Số điện thoại phải gồm từ 9 đến 11 chữ số.";
    }

    return "";
  };

  const handleUpdateProfile = async (event) => {
    event.preventDefault();
    clearMessages();

    const validationError = validateProfileForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      username: profileForm.username.trim(),

      fullName: profileForm.fullName.trim(),

      phoneNumber: profileForm.phoneNumber.trim(),

      /*
       * API hiện vẫn yêu cầu address nhưng frontend
       * chưa hỗ trợ cập nhật field này.
       */
      address: profile.address || profile.representativeAddress || "",
    };

    setIsSavingProfile(true);

    try {
      const updateResponse = await userService.updateProfile(payload);

      if (!updateResponse?.isSuccess) {
        throw new Error(
          updateResponse?.error?.message || "Cập nhật hồ sơ thất bại.",
        );
      }

      let updatedProfile = {
        ...profile,
        username: payload.username,
        fullName: payload.fullName,
        phoneNumber: payload.phoneNumber,
      };

      try {
        updatedProfile = await fetchProfileData();
      } catch (reloadError) {
        console.error("Không thể tải lại hồ sơ:", reloadError);
      }

      applyProfileData(updatedProfile);
      setIsEditingProfile(false);

      if (typeof updateUser === "function") {
        updateUser({
          username: updatedProfile.username,
          fullName: updatedProfile.fullName,
          phoneNumber: updatedProfile.phoneNumber,
        });
      }

      setSuccessMessage("Thông tin cá nhân đã được cập nhật thành công.");
    } catch (updateError) {
      setError(
        getApiErrorMessage(
          updateError,
          "Cập nhật hồ sơ thất bại. Vui lòng thử lại.",
        ),
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleIdentityFormChange = (event) => {
    const { name, value } = event.target;

    setIdentityForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleStartEditingIdentity = () => {
    clearMessages();

    setIdentityForm(createIdentityForm(profile));

    setIdentityPreviews({
      front: profile.frontIDCardImage || "",
      back: profile.backIDCardImage || "",
    });

    setIsEditingIdentity(true);
  };

  const handleCancelEditingIdentity = () => {
    clearMessages();

    setIdentityForm(createIdentityForm(profile));

    setIdentityPreviews({
      front: profile.frontIDCardImage || "",
      back: profile.backIDCardImage || "",
    });

    setIsEditingIdentity(false);
  };

  const handleIdentityFileChange = (event) => {
    const { name, files } = event.target;
    const file = files?.[0] || null;

    const isFront = name === "frontIdCardFile";

    const label = isFront ? "Ảnh CCCD mặt trước" : "Ảnh CCCD mặt sau";

    const validationError = validateImage(file, label);

    if (validationError) {
      setError(validationError);
      event.target.value = "";
      return;
    }

    setError("");

    setIdentityForm((currentForm) => ({
      ...currentForm,
      [name]: file,
    }));

    if (!file) {
      setIdentityPreviews((currentPreviews) => ({
        ...currentPreviews,
        [isFront ? "front" : "back"]: isFront
          ? profile.frontIDCardImage || ""
          : profile.backIDCardImage || "",
      }));

      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setIdentityPreviews((currentPreviews) => ({
        ...currentPreviews,
        [isFront ? "front" : "back"]: reader.result,
      }));
    };

    reader.readAsDataURL(file);
  };

  const validateIdentityForm = () => {
    if (!identityForm.representativeCode.trim()) {
      return "Vui lòng nhập số CCCD.";
    }

    if (!identityForm.representativeName.trim()) {
      return "Vui lòng nhập họ tên trên CCCD.";
    }

    if (!identityForm.representativeDob) {
      return "Vui lòng chọn ngày sinh.";
    }

    const selectedDate = new Date(identityForm.representativeDob);

    if (Number.isNaN(selectedDate.getTime()) || selectedDate > new Date()) {
      return "Ngày sinh không hợp lệ.";
    }

    if (!identityForm.representativeAddress.trim()) {
      return "Vui lòng nhập địa chỉ trên CCCD.";
    }

    if (!identityForm.frontIdCardFile && !profile.frontIDCardImage) {
      return "Vui lòng chọn ảnh CCCD mặt trước.";
    }

    if (!identityForm.backIdCardFile && !profile.backIDCardImage) {
      return "Vui lòng chọn ảnh CCCD mặt sau.";
    }

    const frontImageError = validateImage(
      identityForm.frontIdCardFile,
      "Ảnh CCCD mặt trước",
    );

    if (frontImageError) {
      return frontImageError;
    }

    const backImageError = validateImage(
      identityForm.backIdCardFile,
      "Ảnh CCCD mặt sau",
    );

    if (backImageError) {
      return backImageError;
    }

    return "";
  };

  const handleUpdateIdentity = async (event) => {
    event.preventDefault();
    clearMessages();

    const validationError = validateIdentityForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      representativeCode: identityForm.representativeCode.trim(),

      representativeName: identityForm.representativeName.trim(),

      representativeDob: identityForm.representativeDob,

      representativeAddress: identityForm.representativeAddress.trim(),

      frontIdCardFile: identityForm.frontIdCardFile,

      backIdCardFile: identityForm.backIdCardFile,
    };

    setIsSavingIdentity(true);

    try {
      const updateResponse = await userService.updateIdentity(payload);

      if (!updateResponse?.isSuccess) {
        throw new Error(
          updateResponse?.error?.message || "Cập nhật giấy tờ thất bại.",
        );
      }

      let updatedProfile = {
        ...profile,

        representativeCode: payload.representativeCode,

        representativeName: payload.representativeName,

        representativeDob: payload.representativeDob,

        representativeAddress: payload.representativeAddress,

        frontIDCardImage: identityPreviews.front,

        backIDCardImage: identityPreviews.back,

        verificationStatus: "Pending",
        rejectReason: null,
      };

      try {
        updatedProfile = await fetchProfileData();
      } catch (reloadError) {
        console.error("Không thể tải lại hồ sơ:", reloadError);
      }

      applyProfileData(updatedProfile);
      setIsEditingIdentity(false);

      setSuccessMessage(
        "Giấy tờ tùy thân đã được cập nhật và đang chờ kiểm duyệt.",
      );
    } catch (updateError) {
      setError(
        getApiErrorMessage(
          updateError,
          "Cập nhật giấy tờ thất bại. Vui lòng thử lại.",
        ),
      );
    } finally {
      setIsSavingIdentity(false);
    }
  };

  const handleAvatarUpdated = (newAvatarUrl) => {
    setProfile((currentProfile) => {
      if (!currentProfile) {
        return currentProfile;
      }

      return {
        ...currentProfile,
        avatarUrl: newAvatarUrl,
      };
    });

    if (typeof updateUser === "function") {
      updateUser({
        avatarUrl: newAvatarUrl,
      });
    }

    setError("");
    setSuccessMessage("Ảnh đại diện đã được cập nhật thành công.");
  };

  const handleBankUpdated = async () => {
    const updatedProfile = await fetchProfileData();

    applyProfileData(updatedProfile);

    return updatedProfile.bankAccount || null;
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-[#4F8588]">
        <span className="material-symbols-outlined animate-spin text-4xl">
          refresh
        </span>

        <span className="ml-3 font-medium">Đang tải hồ sơ...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        role="alert"
        className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700"
      >
        <p className="font-bold">Không thể tải hồ sơ</p>

        <p className="mt-1 text-sm">
          {error || "Không tìm thấy dữ liệu hồ sơ."}
        </p>
      </div>
    );
  }

  const displayInitial = (profile.fullName || profile.username || "U")
    .charAt(0)
    .toUpperCase();

  const verificationStatus = getVerificationStatusMeta(
    profile.verificationStatus,
  );

  return (
    <div className="mx-auto w-full max-w-7xl animate-fade-in px-4 pb-14 pt-7 sm:px-6">
      <div className="mb-6 border-b border-[#DCE8E5] pb-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6F9F]">Tài khoản</p>
        <h1 className="mt-2 text-3xl font-black text-[#183F41]">Quản lý hồ sơ</h1>

        <p className="mt-1 text-sm text-[#68807F]">
          Quản lý thông tin cá nhân và thông tin xác minh.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          aria-live="polite"
          className="mb-5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="flex flex-col items-center rounded-2xl border border-[#DCE8E5] bg-white p-5 text-center shadow-[0_10px_30px_rgba(24,63,65,0.05)]">
            <AvatarUploader
              avatarUrl={profile.avatarUrl}
              displayName={profile.fullName || profile.username}
              fallbackInitial={displayInitial}
              onUpdated={handleAvatarUpdated}
            />

            <h2 className="mt-3 text-lg font-black text-[#183F41]">
              {profile.fullName}
            </h2>

            <p className="mb-3 text-sm text-[#68807F]">@{profile.username}</p>

            <div className="mb-4 flex flex-wrap justify-center gap-2">
              <span className="rounded-full bg-[#E7F0F8] px-2.5 py-1 text-xs font-bold text-[#2F6F9F]">
                {profile.role}
              </span>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${verificationStatus.badgeClass}`}
              >
                {verificationStatus.label}
              </span>
            </div>

            <div className="w-full rounded-xl border border-[#DCE8E5] bg-[#F5F9F8] p-3">
              <p className="mb-1 text-xs font-medium text-slate-500">
                Điểm uy tín
              </p>

              <div className="flex items-center justify-center gap-1 text-xl font-black text-[#183F41]">
                <span className="material-symbols-outlined text-yellow-500">
                  star
                </span>

                {profile.reputationScore}
              </div>
            </div>
          </div>

          <nav className="overflow-hidden rounded-2xl border border-[#DCE8E5] bg-white shadow-[0_10px_30px_rgba(24,63,65,0.05)]">
            <button
              type="button"
              onClick={() => handleTabChange("personal")}
              className={`flex w-full items-center gap-3 border-l-4 px-5 py-3.5 text-sm font-medium ${
                activeTab === "personal"
                  ? "border-[#4F8588] bg-[#F1F7F5] text-[#183F41]"
                  : "border-transparent text-[#607B7A] hover:bg-[#F5F9F8]"
              }`}
            >
              <span className="material-symbols-outlined">person</span>
              Thông tin cá nhân
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("kyc")}
              className={`flex w-full items-center gap-3 border-l-4 border-t border-slate-100 px-5 py-3.5 text-sm font-medium ${
                activeTab === "kyc"
                  ? "border-l-[#4F8588] bg-[#F1F7F5] text-[#183F41]"
                  : "border-l-transparent text-[#607B7A] hover:bg-[#F5F9F8]"
              }`}
            >
              <span className="material-symbols-outlined">badge</span>
              Giấy tờ tùy thân
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("bank")}
              className={`flex w-full items-center gap-3 border-l-4 border-t border-slate-100 px-5 py-3.5 text-sm font-medium ${
                activeTab === "bank"
                  ? "border-l-[#4F8588] bg-[#F1F7F5] text-[#183F41]"
                  : "border-l-transparent text-[#607B7A] hover:bg-[#F5F9F8]"
              }`}
            >
              <span className="material-symbols-outlined">account_balance</span>
              Tài khoản ngân hàng
            </button>
          </nav>
        </aside>

        <section className="min-h-[400px] rounded-2xl border border-[#DCE8E5] bg-white p-5 shadow-[0_10px_30px_rgba(24,63,65,0.05)] sm:p-6">
          {activeTab === "personal" && (
            <div>
              <div className="mb-6 flex items-center justify-between border-b pb-3">
                <h2 className="text-lg font-black text-[#183F41]">
                  Thông tin cá nhân
                </h2>

                {!isEditingProfile && (
                  <button
                    type="button"
                    onClick={handleStartEditingProfile}
                    className="rounded-xl border border-[#4F8588] bg-white px-4 py-2 text-sm font-bold text-[#285E62] transition hover:bg-[#F1F7F5]"
                  >
                    Cập nhật
                  </button>
                )}
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <ProfileField
                    id="profile-username"
                    label="TÊN ĐĂNG NHẬP"
                    name="username"
                    value={
                      isEditingProfile ? profileForm.username : profile.username
                    }
                    onChange={handleProfileFormChange}
                    readOnly={!isEditingProfile}
                  />

                  <ProfileField
                    id="profile-full-name"
                    label="HỌ VÀ TÊN"
                    name="fullName"
                    value={
                      isEditingProfile ? profileForm.fullName : profile.fullName
                    }
                    onChange={handleProfileFormChange}
                    readOnly={!isEditingProfile}
                  />

                  <ProfileField
                    id="profile-phone-number"
                    label="SỐ ĐIỆN THOẠI"
                    name="phoneNumber"
                    value={
                      isEditingProfile
                        ? profileForm.phoneNumber
                        : profile.phoneNumber
                    }
                    onChange={handleProfileFormChange}
                    readOnly={!isEditingProfile}
                    type="tel"
                  />

                  <ProfileField
                    id="profile-email"
                    label="EMAIL"
                    name="email"
                    value={profile.email}
                    readOnly
                    type="email"
                  />

                </div>

                {isEditingProfile && (
                  <div className="flex justify-end gap-3 border-t pt-5">
                    <button
                      type="button"
                      onClick={handleCancelEditingProfile}
                      disabled={isSavingProfile}
                      className="rounded-xl border border-[#9FBFBA] px-5 py-2.5 text-sm font-bold text-[#526E6D] hover:bg-[#F5F9F8]"
                    >
                      Hủy
                    </button>

                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="rounded-xl bg-[#4F8588] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#356A70] disabled:opacity-60"
                    >
                      {isSavingProfile ? "ĐANG LƯU..." : "LƯU THAY ĐỔI"}
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {activeTab === "kyc" && (
            <div>
              <div className="mb-6 flex items-center justify-between border-b pb-3">
                <h2 className="text-lg font-black text-[#183F41]">
                  Giấy tờ tùy thân
                </h2>

                {!isEditingIdentity && (
                  <button
                    type="button"
                    onClick={handleStartEditingIdentity}
                    className="rounded-xl border border-[#4F8588] bg-white px-4 py-2 text-sm font-bold text-[#285E62] transition hover:bg-[#F1F7F5]"
                  >
                    Cập nhật giấy tờ
                  </button>
                )}
              </div>

              <div
                className={`mb-6 rounded-md border p-4 ${verificationStatus.panelClass}`}
              >
                <p className="text-sm font-bold">
                  Trạng thái: {verificationStatus.label}
                </p>

                {profile.rejectReason && (
                  <p className="mt-1 text-sm">
                    Lý do từ chối: {profile.rejectReason}
                  </p>
                )}
              </div>

              {!isEditingIdentity ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <ProfileField
                      id="identity-code-view"
                      label="SỐ CCCD"
                      name="representativeCode"
                      value={profile.representativeCode || ""}
                      readOnly
                    />

                    <ProfileField
                      id="identity-name-view"
                      label="HỌ TÊN TRÊN CCCD"
                      name="representativeName"
                      value={profile.representativeName || ""}
                      readOnly
                    />

                    <ProfileField
                      id="identity-dob-view"
                      label="NGÀY SINH"
                      name="representativeDob"
                      value={profile.representativeDob || ""}
                      readOnly
                      type="date"
                    />

                    <ProfileField
                      id="identity-address-view"
                      label="ĐỊA CHỈ TRÊN CCCD"
                      name="representativeAddress"
                      value={profile.representativeAddress || ""}
                      readOnly
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <IdentityImage
                      label="ẢNH CCCD MẶT TRƯỚC"
                      imageUrl={profile.frontIDCardImage}
                      emptyMessage="Chưa có ảnh"
                    />

                    <IdentityImage
                      label="ẢNH CCCD MẶT SAU"
                      imageUrl={profile.backIDCardImage}
                      emptyMessage="Chưa có ảnh"
                    />
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdateIdentity} className="space-y-6">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <ProfileField
                      id="identity-code"
                      label="SỐ CCCD"
                      name="representativeCode"
                      value={identityForm.representativeCode}
                      onChange={handleIdentityFormChange}
                      required
                      placeholder="Nhập số CCCD"
                    />

                    <ProfileField
                      id="identity-name"
                      label="HỌ TÊN TRÊN CCCD"
                      name="representativeName"
                      value={identityForm.representativeName}
                      onChange={handleIdentityFormChange}
                      required
                      placeholder="Nhập họ tên"
                    />

                    <ProfileField
                      id="identity-dob"
                      label="NGÀY SINH"
                      name="representativeDob"
                      value={identityForm.representativeDob}
                      onChange={handleIdentityFormChange}
                      required
                      type="date"
                    />

                    <ProfileField
                      id="identity-address"
                      label="ĐỊA CHỈ TRÊN CCCD"
                      name="representativeAddress"
                      value={identityForm.representativeAddress}
                      onChange={handleIdentityFormChange}
                      required
                      placeholder="Nhập địa chỉ"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <IdentityFileInput
                      id="identity-front-image"
                      label="ẢNH CCCD MẶT TRƯỚC"
                      name="frontIdCardFile"
                      onChange={handleIdentityFileChange}
                      previewUrl={identityPreviews.front}
                    />

                    <IdentityFileInput
                      id="identity-back-image"
                      label="ẢNH CCCD MẶT SAU"
                      name="backIdCardFile"
                      onChange={handleIdentityFileChange}
                      previewUrl={identityPreviews.back}
                    />
                  </div>

                  <div className="flex justify-end gap-3 border-t pt-5">
                    <button
                      type="button"
                      onClick={handleCancelEditingIdentity}
                      disabled={isSavingIdentity}
                      className="rounded-xl border border-[#9FBFBA] px-5 py-2.5 text-sm font-bold text-[#526E6D] hover:bg-[#F5F9F8]"
                    >
                      Hủy
                    </button>

                    <button
                      type="submit"
                      disabled={isSavingIdentity}
                      className="rounded-xl bg-[#4F8588] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#356A70] disabled:opacity-60"
                    >
                      {isSavingIdentity ? "ĐANG CẬP NHẬT..." : "LƯU GIẤY TỜ"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === "bank" && (
            <BankAccountSection
              bankAccount={profile.bankAccount}
              onUpdated={handleBankUpdated}
            />
          )}
        </section>
      </div>
    </div>
  );
}