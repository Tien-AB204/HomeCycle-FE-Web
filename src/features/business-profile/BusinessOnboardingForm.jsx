import { useState } from "react";
import AddressPickerField from "../../components/shared/AddressPickerField";
import BankPickerField from "../../components/shared/BankPickerField";
import SensitiveField from "../../components/shared/SensitiveField";
import businessProfileApi from "../../services/apis/businessProfileApi";
import {
  FULL_NAME_MAX_LENGTH,
  validateFullName,
} from "../../utils/formValidation";
import {
  capitalizeWordInitials,
  toTitleCaseText,
  toUppercaseText,
} from "../../utils/textFormat";
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

const OPERATING_SCOPE_OPTIONS = [
  "Toàn quốc",
  "Khu vực miền Bắc",
  "Khu vực miền Trung",
  "Khu vực miền Nam",
];

const normalizeIdentityName = (
  value,
) =>
  toUppercaseText(value)
    .trim()
    .replace(/\s+/gu, " ");
const createForm = (draft) => {
  const profile =
    normalizeBusinessProfile(draft);

  const serviceArea =
    profile.serviceAreas?.[0] || {};

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
    serviceAreaCity:
      serviceArea.city ||
      serviceArea.City ||
      "",
    serviceAreaWard:
      serviceArea.ward ||
      serviceArea.Ward ||
      "",
    serviceAreaStreet:
      serviceArea.street ||
      serviceArea.Street ||
      "",
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
  <section className="rounded-3xl border border-border bg-white p-5 shadow-[0_12px_34px_rgba(23,40,48,0.06)] sm:p-7">
    <div className="mb-6 flex items-start gap-4 border-b border-border pb-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-sm font-black text-white">
        {number}
      </span>
      <div>
        <h2 className="text-lg font-black text-text">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-textLight">
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

  const [
    isAccountNameManuallyEdited,
    setIsAccountNameManuallyEdited,
  ] = useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [error, setError] =
    useState("");

  const updateField = (name, value) => {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
    setError("");
  };

  const handleBankChange = (
    bank,
  ) => {
    setForm((current) => ({
      ...current,
      bankCode: String(
        bank.bin || "",
      ),
      bankName: String(
        bank.shortName ||
          bank.name ||
          "",
      ).trim(),
    }));

    setError("");
  };

  const handleBankClear = () => {
    setForm((current) => ({
      ...current,
      bankCode: "",
      bankName: "",
    }));

    setError("");
  };

  const handleFullNameChange = (
    rawValue,
  ) => {
    const nextFullName =
      capitalizeWordInitials(
        rawValue,
      );

    const nextIdentityName =
      toUppercaseText(
        nextFullName,
      );

    setForm((current) => ({
      ...current,
      fullName:
        nextFullName,
      identityName:
        nextIdentityName,
      accountName:
        isAccountNameManuallyEdited
          ? current.accountName
          : nextIdentityName,
    }));

    setError("");
  };

  const handleIdentityNameChange = (
    rawValue,
  ) => {
    const nextIdentityName =
      toUppercaseText(
        rawValue,
      );

    const nextFullName =
      toTitleCaseText(
        nextIdentityName,
      );

    setForm((current) => ({
      ...current,
      identityName:
        nextIdentityName,
      fullName:
        nextFullName,
      accountName:
        isAccountNameManuallyEdited
          ? current.accountName
          : nextIdentityName,
    }));

    setError("");
  };

  const handleAccountNameChange = (
    rawValue,
  ) => {
    setIsAccountNameManuallyEdited(
      true,
    );

    updateField(
      "accountName",
      toUppercaseText(
        rawValue,
      ),
    );
  };

  const validate = () => {
    const requiredValues = [
      [
        form.fullName,
        "họ tên người đại diện",
      ],
      [
        form.businessName,
        "tên doanh nghiệp",
      ],
      [form.taxCode, "mã số thuế"],
      [
        form.identityNumber,
        "số CCCD",
      ],
      [
        form.identityName,
        "họ tên trên CCCD",
      ],
      [
        form.identityDob,
        "ngày sinh",
      ],
      [
        form.identityAddress,
        "địa chỉ trên CCCD",
      ],
      [
        form.city,
        "tỉnh thành trụ sở",
      ],
      [
        form.ward,
        "phường xã trụ sở",
      ],
      [
        form.businessAddress,
        "địa chỉ trụ sở",
      ],
      [
        form.bankCode,
        "ngân hàng",
      ],
      [
        form.bankName,
        "tên ngân hàng",
      ],
      [
        form.accountNumber,
        "số tài khoản",
      ],
      [
        form.accountName,
        "chủ tài khoản",
      ],
    ];

    if (
      Number(
        form.businessModel,
      ) === 1
    ) {
      requiredValues.push(
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
      );
    }

    const missingField =
      requiredValues.find(
        ([value]) =>
          !String(
            value || "",
          ).trim(),
      );

    if (missingField) {
      return `Vui lòng nhập ${missingField[1]}.`;
    }



    const fullNameError =
      validateFullName(
        form.fullName,
      );

    if (fullNameError) {
      return fullNameError;
    }

    if (
      form.businessDescription.trim()
        .length > 1000
    ) {
      return "Giới thiệu doanh nghiệp không được vượt quá 1000 ký tự.";
    }

    if (
      form.businessName.trim()
        .length > 255
    ) {
      return "Tên doanh nghiệp không được vượt quá 255 ký tự.";
    }

    if (
      form.taxCode.trim()
        .length > 50
    ) {
      return "Mã số thuế không được vượt quá 50 ký tự.";
    }

    if (
      !/^\d{12}$/.test(
        form.identityNumber.trim(),
      )
    ) {
      return "Số CCCD phải gồm đúng 12 chữ số.";
    }

    if (
      form.identityName.trim()
        .length > 255
    ) {
      return "Họ tên trên CCCD không được vượt quá 255 ký tự.";
    }

    if (
      form.accountName.trim()
        .length > 255
    ) {
      return "Tên chủ tài khoản không được vượt quá 255 ký tự.";
    }

    if (
      form.identityAddress.trim()
        .length > 500
    ) {
      return "Địa chỉ trên CCCD không được vượt quá 500 ký tự.";
    }

    if (
      normalizeIdentityName(
        form.fullName,
      ) !==
      normalizeIdentityName(
        form.identityName,
      )
    ) {
      return "Họ tên người đại diện phải khớp với họ tên trên CCCD.";
    }

    const identityDob =
      new Date(
        `${form.identityDob}T00:00:00`,
      );

    const today = new Date();
    today.setHours(
      23,
      59,
      59,
      999,
    );

    if (
      Number.isNaN(
        identityDob.getTime(),
      ) ||
      identityDob > today
    ) {
      return "Ngày sinh không hợp lệ hoặc lớn hơn ngày hiện tại.";
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
      <div className="overflow-hidden rounded-3xl bg-primary p-6 text-white shadow-[0_18px_50px_rgba(23,40,48,0.18)] sm:p-8">
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
            inputMode="numeric"
            maxLength={50}
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
            as="select"
            value={form.operatingScope}
            onChange={(event) =>
              updateField(
                "operatingScope",
                event.target.value,
              )
            }
          >
            <option value="">
              Không chọn / không gửi
            </option>

            {form.operatingScope &&
              !OPERATING_SCOPE_OPTIONS.includes(
                form.operatingScope,
              ) && (
                <option
                  value={
                    form.operatingScope
                  }
                >
                  {
                    form.operatingScope
                  }
                </option>
              )}

            {OPERATING_SCOPE_OPTIONS.map(
              (scope) => (
                <option
                  key={scope}
                  value={scope}
                >
                  {scope}
                </option>
              ),
            )}
          </BusinessField>
          <BusinessField
            id="onboarding-description"
            label="Giới thiệu doanh nghiệp"
            as="textarea"
            rows={4}
            maxLength={1000}
            value={
              form.businessDescription
            }
            onChange={(event) =>
              updateField(
                "businessDescription",
                event.target.value,
              )
            }
            className="sm:col-span-2"
          />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-5 rounded-2xl bg-background p-4 sm:grid-cols-2 sm:p-5">
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
              handleFullNameChange(
                event.target.value,
              )
            }
            maxLength={FULL_NAME_MAX_LENGTH}
            required
          />
          <SensitiveField
            id="onboarding-identity-number"
            label="Số CCCD"
            name="identityNumber"
            value={form.identityNumber}
            onChange={(event) =>
              updateField(
                "identityNumber",
                event.target.value
                  .replace(
                    /\D/g,
                    "",
                  )
                  .slice(
                    0,
                    12,
                  ),
              )
            }
            inputMode="numeric"
            maxLength={12}
            required
            placeholder="Nhập 12 chữ số CCCD"
          />
          <BusinessField
            id="onboarding-identity-name"
            label="Họ tên trên CCCD"
            value={form.identityName}
            onChange={(event) =>
              handleIdentityNameChange(
                event.target.value,
              )
            }
            maxLength={255}
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
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-textLight">
              Địa chỉ thường trú
              <span className="text-error">
                {" "}*
              </span>
            </label>

            <AddressPickerField
              value={
                form.identityAddress
              }
              onChange={(
                nextAddress,
              ) =>
                updateField(
                  "identityAddress",
                  nextAddress,
                )
              }
              onClear={() =>
                updateField(
                  "identityAddress",
                  "",
                )
              }
              disabled={
                isSubmitting
              }
              placeholder="Chọn địa chỉ thường trú trên CCCD"
            />
          </div>
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
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-textLight">
              Ngân hàng thụ hưởng
              <span className="text-error">
                {" "}*
              </span>
            </label>

            <BankPickerField
              bankBin={
                form.bankCode
              }
              bankName={
                form.bankName
              }
              onChange={
                handleBankChange
              }
              onClear={
                handleBankClear
              }
              disabled={
                isSubmitting
              }
              hasError={
                Boolean(error) &&
                (
                  !form.bankCode ||
                  !form.bankName
                )
              }
              placeholder="Chọn ngân hàng của bạn..."
            />
          </div>
          <SensitiveField
            id="onboarding-account-number"
            label="Số tài khoản"
            name="accountNumber"
            value={form.accountNumber}
            onChange={(event) =>
              updateField(
                "accountNumber",
                event.target.value,
              )
            }
            inputMode="numeric"
            required
            placeholder="Nhập số tài khoản ngân hàng"
          />
          <BusinessField
            id="onboarding-account-name"
            label="Tên chủ tài khoản"
            value={form.accountName}
            onChange={(event) =>
              handleAccountNameChange(
                event.target.value,
              )
            }
            maxLength={255}
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

      {Number(form.businessModel) ===
        1 && (
        <OnboardingSection
          number="04"
          title="Khu vực hoạt động đầu tiên"
          description="Doanh nghiệp cần đăng ký ít nhất một kho bãi hoặc khu vực hoạt động."
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
      )}

      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl border border-border bg-white/95 p-4 shadow-[0_14px_38px_rgba(23,40,48,0.16)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-textLight">
          Kiểm tra kỹ thông tin trước khi gửi xét duyệt.
        </p>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-primary px-6 py-3 text-sm font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? "ĐANG GỬI HỒ SƠ..."
            : "GỬI HỒ SƠ XÉT DUYỆT"}
        </button>
      </div>
    </form>
  );
}
