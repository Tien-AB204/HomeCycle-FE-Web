import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { bankDirectoryService } from "../../services/bankDirectoryService";
import businessProfileApi from "../../services/apis/businessProfileApi";
import BusinessAddressFields from "./BusinessAddressFields";
import {
  BusinessField,
  BusinessFileField,
  FormMessage,
} from "./BusinessFormControls";
import {
  getBusinessApiErrorMessage,
  normalizeBusinessProfile,
  validateBusinessFile,
} from "./businessProfileUtils";

const BUSINESS_MODELS = [
  {
    value: 0,
    label: "Hộ kinh doanh",
  },
  {
    value: 1,
    label: "Doanh nghiệp",
  },
];

const normalizeSearch = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const createForm = (draft) => {
  const profile =
    normalizeBusinessProfile(draft);

  return {
    fullName: profile.fullName || "",
    businessName:
      profile.businessName || "",
    businessDescription:
      profile.businessDescription || "",
    taxCode: profile.taxCode || "",
    identityNumber:
      profile.identityNumber || "",
    identityName:
      profile.identityName || "",
    identityDob:
      profile.identityDob || "",
    identityAddress:
      profile.identityAddress || "",
    businessAddress:
      profile.businessAddress || "",
    ward: profile.ward || "",
    city: profile.city || "",
    operatingScope:
      profile.operatingScope || "",
    businessModel: String(
      profile.businessModel ?? 0,
    ),
    bankCode:
      profile.bankAccount?.bankCode || "",
    bankName:
      profile.bankAccount?.bankName || "",
    accountNumber:
      profile.bankAccount?.accountNumber ||
      "",
    accountName:
      profile.bankAccount?.accountName || "",
    serviceAreaCity: "",
    serviceAreaWard: "",
    serviceAreaStreet: "",
    cccdFront: null,
    cccdBack: null,
    registrationCertificate: null,
    authorizationLetter: null,
  };
};

const OnboardingSection = ({
  number,
  title,
  description,
  children,
}) => (
  <section className="rounded-3xl border border-[#DCE8E5] bg-white p-5 shadow-[0_12px_34px_rgba(24,63,65,0.06)] sm:p-7">
    <div className="mb-6 flex items-start gap-4 border-b border-[#E4ECEA] pb-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#4F8588] text-sm font-black text-white">
        {number}
      </span>
      <div>
        <h2 className="text-lg font-black text-[#183F41]">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-[#68807F]">
          {description}
        </p>
      </div>
    </div>
    {children}
  </section>
);

export default function BusinessOnboardingForm({
  registrationDetail,
  onSubmitted,
}) {
  const [form, setForm] = useState(() =>
    createForm(registrationDetail),
  );
  const [banks, setBanks] =
    useState([]);
  const [bankQuery, setBankQuery] =
    useState(form.bankName);
  const [isBankOpen, setIsBankOpen] =
    useState(false);
  const [isLoadingBanks, setIsLoadingBanks] =
    useState(true);
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [error, setError] =
    useState("");

  useEffect(() => {
    let isActive = true;

    bankDirectoryService
      .getBanks()
      .then((items) => {
        if (isActive) setBanks(items);
      })
      .catch(() => {
        if (isActive) {
          setError(
            "Không thể tải danh sách ngân hàng. Bạn có thể thử lại sau.",
          );
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingBanks(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const filteredBanks = useMemo(() => {
    const query = normalizeSearch(bankQuery);

    return banks
      .filter((bank) =>
        normalizeSearch(
          [
            bank.name,
            bank.shortName,
            bank.code,
            bank.bin,
          ].join(" "),
        ).includes(query),
      )
      .slice(0, 12);
  }, [bankQuery, banks]);

  const updateField = (name, value) => {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
    setError("");
  };

  const validate = () => {
    const requiredValues = [
      [form.fullName, "họ tên người đại diện"],
      [form.businessName, "tên doanh nghiệp"],
      [
        form.businessDescription,
        "giới thiệu doanh nghiệp",
      ],
      [form.taxCode, "mã số thuế"],
      [form.identityNumber, "số CCCD"],
      [
        form.identityName,
        "họ tên trên CCCD",
      ],
      [form.identityDob, "ngày sinh"],
      [
        form.identityAddress,
        "địa chỉ trên CCCD",
      ],
      [form.city, "tỉnh thành trụ sở"],
      [form.ward, "phường xã trụ sở"],
      [
        form.businessAddress,
        "địa chỉ trụ sở",
      ],
      [
        form.operatingScope,
        "phạm vi hoạt động",
      ],
      [form.bankCode, "ngân hàng"],
      [form.accountNumber, "số tài khoản"],
      [form.accountName, "chủ tài khoản"],
      [
        form.serviceAreaCity,
        "tỉnh thành hoạt động",
      ],
      [
        form.serviceAreaWard,
        "phường xã hoạt động",
      ],
      [
        form.serviceAreaStreet,
        "địa bàn hoạt động",
      ],
    ];

    const missingField = requiredValues.find(
      ([value]) => !String(value || "").trim(),
    );

    if (missingField) {
      return `Vui lòng nhập ${missingField[1]}.`;
    }
    if (
      !/^\d{9,12}$/.test(
        form.identityNumber,
      )
    ) {
      return "Số CCCD phải gồm từ 9 đến 12 chữ số.";
    }
    if (
      !/^\d{3,30}$/.test(
        form.accountNumber,
      )
    ) {
      return "Số tài khoản phải gồm từ 3 đến 30 chữ số.";
    }

    return (
      validateBusinessFile(
        form.cccdFront,
        "Ảnh CCCD mặt trước",
        { required: true },
      ) ||
      validateBusinessFile(
        form.cccdBack,
        "Ảnh CCCD mặt sau",
        { required: true },
      ) ||
      validateBusinessFile(
        form.registrationCertificate,
        "Giấy chứng nhận đăng ký kinh doanh",
        { required: true },
      ) ||
      validateBusinessFile(
        form.authorizationLetter,
        "Giấy ủy quyền",
      )
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await businessProfileApi.submit({
        ...form,
        documents: [
          {
            documentType: 0,
            file: form.cccdFront,
          },
          {
            documentType: 1,
            file: form.cccdBack,
          },
          {
            documentType: 2,
            file:
              form.registrationCertificate,
          },
          {
            documentType: 3,
            file: form.authorizationLetter,
          },
        ],
      });
      await onSubmitted?.();
    } catch (submitError) {
      setError(
        getBusinessApiErrorMessage(
          submitError,
          "Không thể gửi hồ sơ doanh nghiệp.",
        ),
      );
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#183F41] via-[#285E62] to-[#2F6F9F] p-6 text-white shadow-[0_18px_50px_rgba(24,63,65,0.18)] sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-white/70">
          Business onboarding
        </p>
        <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight sm:text-4xl">
          Hoàn thiện hồ sơ doanh nghiệp
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
          Cung cấp thông tin pháp lý và khu vực hoạt động để bắt đầu thu mua an toàn trên HomeCycle.
        </p>
      </div>

      <FormMessage error={error} />

      <OnboardingSection
        number="01"
        title="Thông tin doanh nghiệp"
        description="Thông tin nhận diện và mô hình hoạt động chính."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <BusinessField
            id="onboarding-business-name"
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
            id="onboarding-tax-code"
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
            id="onboarding-model"
            label="Mô hình hoạt động"
            as="select"
            value={form.businessModel}
            onChange={(event) =>
              updateField(
                "businessModel",
                event.target.value,
              )
            }
            required
          >
            {BUSINESS_MODELS.map((model) => (
              <option
                key={model.value}
                value={model.value}
              >
                {model.label}
              </option>
            ))}
          </BusinessField>
          <BusinessField
            id="onboarding-scope"
            label="Phạm vi hoạt động"
            value={form.operatingScope}
            onChange={(event) =>
              updateField(
                "operatingScope",
                event.target.value,
              )
            }
            required
          />
          <BusinessField
            id="onboarding-description"
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
        </div>
        <div className="mt-6 grid grid-cols-1 gap-5 rounded-2xl bg-[#F8FBFA] p-4 sm:grid-cols-2 sm:p-5">
          <BusinessAddressFields
            idPrefix="onboarding-office"
            city={form.city}
            ward={form.ward}
            street={form.businessAddress}
            streetLabel="Địa chỉ trụ sở"
            onChange={(address) =>
              setForm((current) => ({
                ...current,
                city: address.city,
                ward: address.ward,
                businessAddress:
                  address.street,
              }))
            }
          />
        </div>
      </OnboardingSection>

      <OnboardingSection
        number="02"
        title="Người đại diện"
        description="Thông tin phải trùng khớp với giấy tờ định danh tải lên."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <BusinessField
            id="onboarding-full-name"
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
            id="onboarding-identity-number"
            label="Số CCCD"
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
            required
          />
          <BusinessField
            id="onboarding-identity-name"
            label="Họ tên trên CCCD"
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
            id="onboarding-identity-dob"
            label="Ngày sinh"
            type="date"
            max={new Date()
              .toISOString()
              .slice(0, 10)}
            value={form.identityDob}
            onChange={(event) =>
              updateField(
                "identityDob",
                event.target.value,
              )
            }
            required
          />
          <BusinessField
            id="onboarding-identity-address"
            label="Địa chỉ trên CCCD"
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
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <BusinessFileField
            id="onboarding-cccd-front"
            label="CCCD mặt trước"
            required
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
            id="onboarding-cccd-back"
            label="CCCD mặt sau"
            required
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
      </OnboardingSection>

      <OnboardingSection
        number="03"
        title="Ngân hàng & giấy phép"
        description="Tài khoản phục vụ giao dịch và giấy tờ chứng minh tư cách pháp nhân."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="relative sm:col-span-2">
            <label
              htmlFor="onboarding-bank"
              className="mb-1.5 block text-xs font-black uppercase tracking-wide text-[#607B7A]"
            >
              Ngân hàng <span className="text-red-500">*</span>
            </label>
            <input
              id="onboarding-bank"
              type="text"
              value={bankQuery}
              onChange={(event) => {
                setBankQuery(
                  event.target.value,
                );
                updateField("bankCode", "");
                updateField("bankName", "");
                setIsBankOpen(true);
              }}
              onFocus={() =>
                setIsBankOpen(true)
              }
              onBlur={() =>
                window.setTimeout(
                  () =>
                    setIsBankOpen(false),
                  120,
                )
              }
              placeholder={
                isLoadingBanks
                  ? "Đang tải ngân hàng..."
                  : "Tìm MB Bank, Vietcombank..."
              }
              autoComplete="off"
              className="w-full rounded-xl border border-[#CDDED9] bg-white px-3 py-3 text-sm outline-none focus:border-[#4F8588] focus:ring-4 focus:ring-[#5F9291]/10"
            />
            {isBankOpen &&
              filteredBanks.length > 0 && (
                <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-[#DCE8E5] bg-white p-2 shadow-xl">
                  {filteredBanks.map((bank) => (
                    <button
                      key={bank.bin}
                      type="button"
                      onMouseDown={(event) =>
                        event.preventDefault()
                      }
                      onClick={() => {
                        setForm((current) => ({
                          ...current,
                          bankCode: bank.bin,
                          bankName: bank.name,
                        }));
                        setBankQuery(bank.name);
                        setIsBankOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-[#F1F7F5]"
                    >
                      <span className="text-sm font-bold text-[#183F41]">
                        {bank.name}
                      </span>
                      <span className="text-xs text-[#78908F]">
                        {bank.bin}
                      </span>
                    </button>
                  ))}
                </div>
              )}
          </div>
          <BusinessField
            id="onboarding-account-number"
            label="Số tài khoản"
            value={form.accountNumber}
            onChange={(event) =>
              updateField(
                "accountNumber",
                event.target.value.replace(
                  /\D/g,
                  "",
                ),
              )
            }
            required
          />
          <BusinessField
            id="onboarding-account-name"
            label="Tên chủ tài khoản"
            value={form.accountName}
            onChange={(event) =>
              updateField(
                "accountName",
                event.target.value.toUpperCase(),
              )
            }
            required
          />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <BusinessFileField
            id="onboarding-registration-certificate"
            label="Giấy chứng nhận đăng ký kinh doanh"
            required
            onChange={(event) =>
              updateField(
                "registrationCertificate",
                event.target.files?.[0] ||
                  null,
              )
            }
          />
          <BusinessFileField
            id="onboarding-authorization-letter"
            label="Giấy ủy quyền (nếu có)"
            onChange={(event) =>
              updateField(
                "authorizationLetter",
                event.target.files?.[0] ||
                  null,
              )
            }
          />
        </div>
      </OnboardingSection>

      <OnboardingSection
        number="04"
        title="Khu vực hoạt động đầu tiên"
        description="Bạn có thể thêm nhiều khu vực khác sau khi hồ sơ được tạo."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <BusinessAddressFields
            idPrefix="onboarding-service-area"
            city={form.serviceAreaCity}
            ward={form.serviceAreaWard}
            street={form.serviceAreaStreet}
            streetLabel="Địa bàn / tuyến đường"
            onChange={(address) =>
              setForm((current) => ({
                ...current,
                serviceAreaCity:
                  address.city,
                serviceAreaWard:
                  address.ward,
                serviceAreaStreet:
                  address.street,
              }))
            }
          />
        </div>
      </OnboardingSection>

      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl border border-[#C9DBD7] bg-white/95 p-4 shadow-[0_14px_38px_rgba(24,63,65,0.16)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-[#68807F]">
          Kiểm tra kỹ thông tin trước khi gửi xét duyệt.
        </p>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-[#4F8588] px-6 py-3 text-sm font-black text-white transition hover:bg-[#356A70] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? "ĐANG GỬI HỒ SƠ..."
            : "GỬI HỒ SƠ XÉT DUYỆT"}
        </button>
      </div>
    </form>
  );
}
