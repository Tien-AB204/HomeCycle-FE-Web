import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import AvatarUploader from "../../features/profile/AvatarUploader";
import BankAccountSection from "../../features/profile/BankAccountSection";
import BusinessIdentitySection from "../../features/business-profile/BusinessIdentitySection";
import BusinessOnboardingForm from "../../features/business-profile/BusinessOnboardingForm";
import BusinessRegistrationSection from "../../features/business-profile/BusinessRegistrationSection";
import BusinessServiceAreasSection from "../../features/business-profile/BusinessServiceAreasSection";
import BusinessSurveySection from "../../features/business-profile/BusinessSurveySection";
import {
  getBusinessApiErrorMessage,
  normalizeBusinessProfile,
  pickValue,
} from "../../features/business-profile/businessProfileUtils";
import { useAuth } from "../../hooks/useAuth";
import businessProfileApi from "../../services/apis/businessProfileApi";

const TABS = [
  {
    id: "account",
    icon: "manage_accounts",
    label: "Tài khoản",
  },
  {
    id: "business",
    icon: "corporate_fare",
    label: "Doanh nghiệp",
  },
  {
    id: "identity",
    icon: "badge",
    label: "Người đại diện",
  },
  {
    id: "bank",
    icon: "account_balance",
    label: "Ngân hàng",
  },
  {
    id: "areas",
    icon: "distance",
    label: "Khu vực hoạt động",
  },
  {
    id: "survey",
    icon: "query_stats",
    label: "Khảo sát thu mua",
  },
];

const STATUS_META = {
  notsubmitted: {
    label: "Chưa gửi hồ sơ",
    className:
      "bg-slate-100 text-slate-700",
    icon: "edit_document",
  },
  unverified: {
    label: "Chưa xác minh",
    className:
      "bg-slate-100 text-slate-700",
    icon: "edit_document",
  },
  pending: {
    label: "Đang chờ xét duyệt",
    className:
      "bg-amber-50 text-amber-700",
    icon: "hourglass_top",
  },
  verified: {
    label: "Đã xác minh",
    className:
      "bg-emerald-50 text-emerald-700",
    icon: "verified",
  },
  approved: {
    label: "Đã xác minh",
    className:
      "bg-emerald-50 text-emerald-700",
    icon: "verified",
  },
  rejected: {
    label: "Cần bổ sung hồ sơ",
    className: "bg-red-50 text-red-700",
    icon: "error",
  },
};

const STATUS_BY_NUMBER = {
  0: "unverified",
  1: "pending",
  2: "verified",
  3: "rejected",
};

const STATUS_ALIASES = {
  pendingapproval: "pending",
};

const getStatusMeta = (status) => {
  const value = String(status ?? "")
    .replace(/[\s_-]+/g, "")
    .toLowerCase();
  const key =
    STATUS_BY_NUMBER[value] ||
    STATUS_ALIASES[value] ||
    value ||
    "notsubmitted";

  return (
    STATUS_META[key] ||
    STATUS_META.notsubmitted
  );
};

const getOnboardingStatusValue = (
  statusData,
  fallback = "",
) => {
  if (
    typeof statusData === "string" ||
    typeof statusData === "number"
  ) {
    return statusData;
  }

  return pickValue(
    statusData,
    [
      "businessProfileStatus",
      "verificationStatus",
      "onboardingStatus",
      "profileStatus",
      "status",
    ],
    fallback,
  );
};

const hasMeaningfulProfile = (profile) =>
  Boolean(
    profile?.id ||
      profile?.businessName ||
      profile?.taxCode ||
      profile?.identityNumber,
  );

const inferNeedsOnboarding = (
  statusData,
  profile,
) => {
  const explicitFlag = pickValue(
    statusData,
    [
      "isProfileSubmitted",
      "isSubmitted",
      "hasBusinessProfile",
      "profileExists",
    ],
    undefined,
  );

  if (typeof explicitFlag === "boolean") {
    return !explicitFlag;
  }

  const status = String(
    getOnboardingStatusValue(statusData),
  )
    .replace(/[\s_-]+/g, "")
    .toLowerCase();

  if (
    [
      "notsubmitted",
      "notstarted",
      "incomplete",
      "draft",
    ].includes(status)
  ) {
    return true;
  }

  if (status === "unverified") {
    return !hasMeaningfulProfile(profile);
  }

  if (
    [
      "pending",
      "pendingapproval",
      "verified",
      "approved",
      "rejected",
    ].includes(status)
  ) {
    return false;
  }

  return !hasMeaningfulProfile(profile);
};

const getSettledValue = (result) =>
  result.status === "fulfilled"
    ? result.value
    : null;

const LoadingState = () => (
  <div className="mx-auto flex min-h-[420px] max-w-7xl flex-col items-center justify-center px-4 text-[#4F8588]">
    <span className="material-symbols-outlined animate-spin text-5xl">
      progress_activity
    </span>
    <p className="mt-3 font-bold">
      Đang đồng bộ hồ sơ doanh nghiệp...
    </p>
  </div>
);

export default function BusinessProfilePage() {
  const { user, updateUser } = useAuth();
  const [searchParams, setSearchParams] =
    useSearchParams();
  const [profile, setProfile] =
    useState(null);
  const [onboardingStatus, setOnboardingStatus] =
    useState(null);
  const [registrationDetail, setRegistrationDetail] =
    useState(null);
  const [survey, setSurvey] =
    useState(null);
  const [isLoading, setIsLoading] =
    useState(true);
  const [needsOnboarding, setNeedsOnboarding] =
    useState(false);
  const [error, setError] =
    useState("");
  const [success, setSuccess] =
    useState("");

  const requestedTab =
    searchParams.get("tab");
  const activeTab = TABS.some(
    (tab) => tab.id === requestedTab,
  )
    ? requestedTab
    : "account";

  const loadProfile = useCallback(
    async () => {
      const results =
        await Promise.allSettled([
          businessProfileApi.getOnboardingStatus(),
          businessProfileApi.getRegistrationDetail(),
          businessProfileApi.getProfile(),
          businessProfileApi.getSurveyDetail(),
        ]);

      const statusData = getSettledValue(
        results[0],
      );
      const detailData = getSettledValue(
        results[1],
      );
      const profileData = getSettledValue(
        results[2],
      );
      const surveyData = getSettledValue(
        results[3],
      );
      const normalizedProfile =
        normalizeBusinessProfile(
          profileData || detailData,
        );

      setOnboardingStatus(statusData);
      setRegistrationDetail(detailData);
      setSurvey(surveyData);
      setProfile(normalizedProfile);
      setNeedsOnboarding(
        inferNeedsOnboarding(
          statusData,
          normalizedProfile,
        ),
      );

      if (
        results.every(
          (result) =>
            result.status === "rejected",
        )
      ) {
        const firstError = results.find(
          (result) =>
            result.status === "rejected",
        )?.reason;

        setError(
          getBusinessApiErrorMessage(
            firstError,
            "Không thể tải hồ sơ doanh nghiệp.",
          ),
        );
      }

      return normalizedProfile;
    },
    [],
  );

  useEffect(() => {
    let isActive = true;

    Promise.resolve()
      .then(() => loadProfile())
      .catch((loadError) => {
        if (!isActive) return;
        setError(
          getBusinessApiErrorMessage(
            loadError,
            "Không thể tải hồ sơ doanh nghiệp.",
          ),
        );
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [loadProfile]);

  const statusValue =
    getOnboardingStatusValue(
      onboardingStatus,
      profile?.status ||
        (needsOnboarding
          ? "NotSubmitted"
          : "Pending"),
    );
  const statusMeta =
    getStatusMeta(statusValue);

  const progress = useMemo(() => {
    const values = [
      profile?.businessName,
      profile?.taxCode,
      profile?.identityNumber,
      profile?.bankAccount?.accountNumber,
      profile?.serviceAreas?.length,
      survey,
    ];
    const completed = values.filter(
      Boolean,
    ).length;
    return Math.round(
      (completed / values.length) * 100,
    );
  }, [profile, survey]);

  const handleRefresh = async (
    message = "Dữ liệu hồ sơ đã được đồng bộ.",
  ) => {
    setError("");
    const updatedProfile =
      await loadProfile();
    setSuccess(message);
    return updatedProfile;
  };

  const handleAvatarUpdated = (
    avatarUrl,
  ) => {
    setProfile((current) => ({
      ...current,
      avatarUrl,
    }));
    updateUser?.({ avatarUrl });
    setSuccess(
      "Ảnh đại diện doanh nghiệp đã được cập nhật.",
    );
  };

  const handleBankUpdated = async () => {
    const updatedProfile =
      await loadProfile();
    return updatedProfile.bankAccount;
  };

  const handleAccountSubmit = async (
    event,
  ) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const data = new FormData(
      event.currentTarget,
    );
    const username = String(
      data.get("username") || "",
    ).trim();
    const phoneNumber = String(
      data.get("phoneNumber") || "",
    ).trim();

    if (username.length < 3) {
      setError(
        "Tên đăng nhập phải có ít nhất 3 ký tự.",
      );
      return;
    }
    if (!/^\d{9,11}$/.test(phoneNumber)) {
      setError(
        "Số điện thoại phải gồm từ 9 đến 11 chữ số.",
      );
      return;
    }

    try {
      const requests = [];
      if (username !== profile.username) {
        requests.push(
          businessProfileApi.updateUsername(
            username,
          ),
        );
      }
      if (
        phoneNumber !== profile.phoneNumber
      ) {
        requests.push(
          businessProfileApi.updatePhoneNumber(
            phoneNumber,
          ),
        );
      }

      await Promise.all(requests);
      const updatedProfile =
        await loadProfile();
      updateUser?.({
        username:
          updatedProfile.username ||
          username,
        phoneNumber:
          updatedProfile.phoneNumber ||
          phoneNumber,
      });
      setSuccess(
        requests.length
          ? "Thông tin tài khoản đã được cập nhật."
          : "Thông tin tài khoản không có thay đổi.",
      );
    } catch (updateError) {
      setError(
        getBusinessApiErrorMessage(
          updateError,
          "Không thể cập nhật thông tin tài khoản.",
        ),
      );
    }
  };

  if (isLoading) return <LoadingState />;

  if (needsOnboarding) {
    return (
      <div className="mx-auto w-full max-w-6xl animate-fade-in px-4 pb-16 pt-7 sm:px-6">
        <BusinessOnboardingForm
          registrationDetail={
            registrationDetail
          }
          onSubmitted={async () => {
            await loadProfile();
            setNeedsOnboarding(false);
            setSuccess(
              "Hồ sơ đã được gửi và đang chờ xét duyệt.",
            );
          }}
        />
      </div>
    );
  }

  const displayName =
    profile.businessName ||
    profile.fullName ||
    profile.username ||
    "Doanh nghiệp";
  const displayInitial = displayName
    .charAt(0)
    .toUpperCase();

  return (
    <div className="mx-auto w-full max-w-7xl animate-fade-in px-4 pb-16 pt-7 sm:px-6">
      <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[#183F41] via-[#285E62] to-[#2F6F9F] p-6 text-white shadow-[0_18px_50px_rgba(24,63,65,0.16)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/65">
              HomeCycle Business
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Trung tâm hồ sơ doanh nghiệp
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
              Quản lý pháp lý, khu vực hoạt động và nhu cầu thu mua trong một nơi.
            </p>
          </div>

          <div className="min-w-[230px] rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-bold text-white/70">
                Mức hoàn thiện
              </span>
              <span className="font-black">
                {progress}%
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-[#BFE7D8] transition-all"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          aria-live="polite"
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {success}
        </div>
      )}
      {profile.rejectReason && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <strong>Yêu cầu bổ sung:</strong>{" "}
          {profile.rejectReason}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="flex flex-col items-center rounded-3xl border border-[#DCE8E5] bg-white p-6 text-center shadow-[0_10px_30px_rgba(24,63,65,0.06)]">
            <AvatarUploader
              avatarUrl={profile.avatarUrl}
              displayName={displayName}
              fallbackInitial={
                displayInitial
              }
              onUpdated={
                handleAvatarUpdated
              }
              updateAvatar={
                businessProfileApi.updateAvatar
              }
            />
            <h2 className="mt-4 text-xl font-black text-[#183F41]">
              {displayName}
            </h2>
            <p className="mt-1 text-sm text-[#68807F]">
              @{profile.username || user?.username}
            </p>
            <span
              className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${statusMeta.className}`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {statusMeta.icon}
              </span>
              {statusMeta.label}
            </span>
          </div>

          <nav className="overflow-hidden rounded-3xl border border-[#DCE8E5] bg-white shadow-[0_10px_30px_rgba(24,63,65,0.06)]">
            {TABS.map((tab, index) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSearchParams(
                    { tab: tab.id },
                    { replace: true },
                  );
                  setError("");
                  setSuccess("");
                }}
                className={`flex w-full items-center gap-3 border-l-4 px-5 py-3.5 text-left text-sm font-bold transition ${
                  index
                    ? "border-t border-t-[#EEF3F2]"
                    : ""
                } ${
                  activeTab === tab.id
                    ? "border-l-[#4F8588] bg-[#F1F7F5] text-[#183F41]"
                    : "border-l-transparent text-[#607B7A] hover:bg-[#F7FAF9]"
                }`}
              >
                <span className="material-symbols-outlined text-[21px]">
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-h-[520px] rounded-3xl border border-[#DCE8E5] bg-white p-5 shadow-[0_10px_30px_rgba(24,63,65,0.06)] sm:p-7">
          {activeTab === "account" && (
            <div>
              <div className="mb-6 border-b border-[#DCE8E5] pb-5">
                <h2 className="text-lg font-black text-[#183F41]">
                  Thông tin tài khoản
                </h2>
                <p className="mt-1 text-sm leading-6 text-[#68807F]">
                  Email được cố định theo tài khoản đăng ký. Tên đăng nhập và số điện thoại có API cập nhật riêng.
                </p>
              </div>
              <form
                onSubmit={handleAccountSubmit}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <label className="text-xs font-black uppercase tracking-wide text-[#607B7A]">
                    Tên đăng nhập
                    <input
                      name="username"
                      defaultValue={
                        profile.username
                      }
                      required
                      className="mt-1.5 w-full rounded-xl border border-[#CDDED9] px-3 py-3 text-sm font-normal normal-case tracking-normal text-[#183436] outline-none focus:border-[#4F8588] focus:ring-4 focus:ring-[#5F9291]/10"
                    />
                  </label>
                  <label className="text-xs font-black uppercase tracking-wide text-[#607B7A]">
                    Số điện thoại
                    <input
                      name="phoneNumber"
                      type="tel"
                      defaultValue={
                        profile.phoneNumber
                      }
                      required
                      className="mt-1.5 w-full rounded-xl border border-[#CDDED9] px-3 py-3 text-sm font-normal normal-case tracking-normal text-[#183436] outline-none focus:border-[#4F8588] focus:ring-4 focus:ring-[#5F9291]/10"
                    />
                  </label>
                  <label className="text-xs font-black uppercase tracking-wide text-[#607B7A] sm:col-span-2">
                    Email đăng ký
                    <input
                      type="email"
                      value={
                        profile.email ||
                        user?.email ||
                        ""
                      }
                      readOnly
                      className="mt-1.5 w-full cursor-default rounded-xl border border-[#E1EAE8] bg-[#F5F8F7] px-3 py-3 text-sm font-normal normal-case tracking-normal text-[#607B7A]"
                    />
                  </label>
                </div>
                <div className="flex justify-end border-t border-[#E4ECEA] pt-5">
                  <button
                    type="submit"
                    className="rounded-xl bg-[#4F8588] px-5 py-2.5 text-sm font-black text-white hover:bg-[#356A70]"
                  >
                    LƯU THÔNG TIN TÀI KHOẢN
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "business" && (
            <BusinessRegistrationSection
              key={`${profile.id}-business`}
              profile={profile}
              onUpdated={() =>
                handleRefresh(
                  "Thông tin doanh nghiệp đã được đồng bộ.",
                )
              }
            />
          )}

          {activeTab === "identity" && (
            <BusinessIdentitySection
              key={`${profile.id}-identity`}
              profile={profile}
              onUpdated={() =>
                handleRefresh(
                  "Thông tin người đại diện đã được đồng bộ.",
                )
              }
            />
          )}

          {activeTab === "bank" && (
            <BankAccountSection
              bankAccount={
                profile.bankAccount
              }
              updateBank={
                businessProfileApi.updateBankAccount
              }
              onUpdated={
                handleBankUpdated
              }
            />
          )}

          {activeTab === "areas" && (
            <BusinessServiceAreasSection
              serviceAreas={
                profile.serviceAreas
              }
              onUpdated={() =>
                loadProfile()
              }
            />
          )}

          {activeTab === "survey" && (
            <BusinessSurveySection
              key={JSON.stringify(
                survey || {},
              )}
              survey={survey}
              onUpdated={async () => {
                await loadProfile();
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
