import { useEffect, useState } from "react";
import BankAccountSection from "../../features/profile/BankAccountSection";
import { useAuth } from "../../hooks/useAuth";
import { userService } from "../../services/userService";
import AvatarUploader from "../../features/profile/AvatarUploader";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

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
        className="mb-1 block text-xs font-bold text-slate-500"
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
        className={`w-full rounded-md border px-3 py-2.5 text-sm outline-none ${
          readOnly
            ? "cursor-default border-slate-200 bg-slate-50 text-slate-700"
            : "border-slate-300 bg-white text-slate-800 focus:border-[#244f4d] focus:ring-1 focus:ring-[#244f4d]"
        }`}
      />
    </div>
  );
};

const IdentityImage = ({ label, imageUrl, emptyMessage }) => {
  return (
    <div>
      <p className="mb-2 text-xs font-bold text-slate-500">{label}</p>

      <div className="flex h-44 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-2">
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
        className="mt-3 block w-full rounded-md border border-slate-300 bg-white text-sm text-slate-600 file:mr-4 file:border-0 file:bg-[#e6f2f1] file:px-4 file:py-2.5 file:font-medium file:text-[#244f4d] hover:file:bg-[#d7ebe9]"
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
      <div className="flex h-64 items-center justify-center text-[#244f4d]">
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

  const displayAddress = profile.address || profile.representativeAddress || "";

  const displayInitial = (profile.fullName || profile.username || "U")
    .charAt(0)
    .toUpperCase();

  const isVerified = profile.verificationStatus === "Verified";

  const isRejected = profile.verificationStatus === "Rejected";

  return (
    <div className="mx-auto max-w-5xl py-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Quản lý hồ sơ</h1>

        <p className="mt-1 text-sm text-slate-500">
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="space-y-4 md:col-span-1">
          <div className="flex flex-col items-center rounded-xl border border-slate-100 bg-white p-5 text-center shadow-sm">
            <AvatarUploader
              avatarUrl={profile.avatarUrl}
              displayName={profile.fullName || profile.username}
              fallbackInitial={displayInitial}
              onUpdated={handleAvatarUpdated}
            />

            <h2 className="mt-3 text-lg font-bold text-slate-800">
              {profile.fullName}
            </h2>

            <p className="mb-3 text-sm text-slate-500">@{profile.username}</p>

            <div className="mb-4 flex flex-wrap justify-center gap-2">
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                {profile.role}
              </span>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  isVerified
                    ? "bg-green-50 text-green-700"
                    : isRejected
                      ? "bg-red-50 text-red-700"
                      : "bg-orange-50 text-orange-700"
                }`}
              >
                {isVerified
                  ? "Đã xác minh"
                  : isRejected
                    ? "Bị từ chối"
                    : "Chờ xác minh"}
              </span>
            </div>

            <div className="w-full rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="mb-1 text-xs font-medium text-slate-500">
                Điểm uy tín
              </p>

              <div className="flex items-center justify-center gap-1 text-xl font-black text-[#244f4d]">
                <span className="material-symbols-outlined text-yellow-500">
                  star
                </span>

                {profile.reputationScore}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => handleTabChange("personal")}
              className={`flex w-full items-center gap-3 border-l-4 px-5 py-3.5 text-sm font-medium ${
                activeTab === "personal"
                  ? "border-[#244f4d] bg-slate-50 text-[#244f4d]"
                  : "border-transparent text-slate-600 hover:bg-slate-50"
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
                  ? "border-l-[#244f4d] bg-slate-50 text-[#244f4d]"
                  : "border-l-transparent text-slate-600 hover:bg-slate-50"
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
                  ? "border-l-[#244f4d] bg-slate-50 text-[#244f4d]"
                  : "border-l-transparent text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="material-symbols-outlined">account_balance</span>
              Tài khoản ngân hàng
            </button>
          </div>
        </div>

        <div className="min-h-[400px] rounded-xl border border-slate-100 bg-white p-6 shadow-sm md:col-span-3">
          {activeTab === "personal" && (
            <div>
              <div className="mb-6 flex items-center justify-between border-b pb-3">
                <h2 className="text-lg font-bold text-slate-800">
                  Thông tin cá nhân
                </h2>

                {!isEditingProfile && (
                  <button
                    type="button"
                    onClick={handleStartEditingProfile}
                    className="rounded-md bg-[#244f4d] px-4 py-2 text-sm font-medium text-white"
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

                  <div className="sm:col-span-2">
                    <ProfileField
                      id="profile-address"
                      label="ĐỊA CHỈ"
                      name="address"
                      value={displayAddress}
                      readOnly
                    />
                  </div>
                </div>

                {isEditingProfile && (
                  <div className="flex justify-end gap-3 border-t pt-5">
                    <button
                      type="button"
                      onClick={handleCancelEditingProfile}
                      disabled={isSavingProfile}
                      className="rounded-md border border-slate-300 px-5 py-2.5 text-sm"
                    >
                      Hủy
                    </button>

                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="rounded-md bg-[#244f4d] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
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
                <h2 className="text-lg font-bold text-slate-800">
                  Giấy tờ tùy thân
                </h2>

                {!isEditingIdentity && (
                  <button
                    type="button"
                    onClick={handleStartEditingIdentity}
                    className="rounded-md bg-[#244f4d] px-4 py-2 text-sm font-medium text-white"
                  >
                    Cập nhật giấy tờ
                  </button>
                )}
              </div>

              <div
                className={`mb-6 rounded-md border p-4 ${
                  isVerified
                    ? "border-green-200 bg-green-50 text-green-800"
                    : isRejected
                      ? "border-red-200 bg-red-50 text-red-800"
                      : "border-orange-200 bg-orange-50 text-orange-800"
                }`}
              >
                <p className="text-sm font-bold">
                  Trạng thái: {profile.verificationStatus}
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
                      className="rounded-md border border-slate-300 px-5 py-2.5 text-sm"
                    >
                      Hủy
                    </button>

                    <button
                      type="submit"
                      disabled={isSavingIdentity}
                      className="rounded-md bg-[#244f4d] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
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
        </div>
      </div>
    </div>
  );
}
