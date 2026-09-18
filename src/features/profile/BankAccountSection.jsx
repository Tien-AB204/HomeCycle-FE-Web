import { useState } from "react";
import { userService } from "../../services/userService";
import BankPickerField from "../../components/shared/BankPickerField";
import SensitiveField from "../../components/shared/SensitiveField";
import { maskMiddleValue } from "../../utils/maskMiddleValue";
import {
  getSafeValidationMessage,
  isVietnameseMessage,
} from "../../utils/safeErrorMessage";

const createBankForm = (
  bankAccount,
) => ({
  bankCode:
    bankAccount?.bankCode || "",
  bankName:
    bankAccount?.bankName || "",
  accountNumber:
    bankAccount?.accountNumber || "",
  accountName:
    bankAccount?.accountName || "",
});

const getApiErrorMessage = (
  error,
  fallbackMessage,
) => {
  const responseData =
    error?.response?.data;

  const responseMessage =
    responseData?.message ||
    responseData?.error?.message ||
    "";

  return (
    getSafeValidationMessage(
      responseData?.errors,
    ) ||
    (isVietnameseMessage(
      responseMessage,
    )
      ? responseMessage
      : "") ||
    fallbackMessage
  );
};

const BankField = ({
  id,
  label,
  name,
  value,
  onChange = () => {},
  placeholder,
  autoComplete,
  readOnly = false,
}) => {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-black text-textLight"
      >
        {label}
        <span className="text-error">
          {" "}*
        </span>
      </label>

      <input
        id={id}
        name={name}
        type="text"
        value={value}
        onChange={onChange}
        required
        readOnly={readOnly}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full rounded-xl border px-3 py-3 text-sm outline-none transition ${
          readOnly
            ? "cursor-default border-border bg-background text-textLight"
            : "border-border bg-white text-text focus:border-primary focus:ring-4 focus:ring-primary/10"
        }`}
      />
    </div>
  );
};

const MaskedAccountNumber = ({ value }) => {
  const [revealed, setRevealed] = useState(false);
  const stringValue = String(value || "");

  return (
    <p className="mb-6 flex items-center gap-2 font-mono text-xl font-bold tracking-widest">
      {revealed ? stringValue : maskMiddleValue(stringValue)}
      <button
        type="button"
        onClick={() => setRevealed((current) => !current)}
        aria-label={revealed ? "Ẩn số tài khoản" : "Hiện số tài khoản đầy đủ"}
        className="text-white/70 transition hover:text-white"
      >
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
          {revealed ? "visibility_off" : "visibility"}
        </span>
      </button>
    </p>
  );
};

const BankAccountSection = ({
  bankAccount:
    initialBankAccount,
  onUpdated,
  updateBank = userService.updateBank,
}) => {
  const [
    bankAccount,
    setBankAccount,
  ] = useState(
    initialBankAccount || null,
  );

  const [form, setForm] =
    useState(
      createBankForm(
        initialBankAccount,
      ),
    );

  const [
    isEditing,
    setIsEditing,
  ] = useState(false);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const handleChange = (
    event,
  ) => {
    const { name, value } =
      event.target;

    const nextValue =
      name === "accountNumber"
        ? value.replace(
            /[^0-9]/g,
            "",
          )
        : name === "accountName"
          ? value.toUpperCase()
          : value;

    setForm(
      (currentForm) => ({
        ...currentForm,
        [name]: nextValue,
      }),
    );

    setError("");
    setSuccessMessage("");
  };

  const handleBankChange = (
    bank,
  ) => {
    setForm(
      (currentForm) => ({
        ...currentForm,
        bankCode: String(
          bank.bin || "",
        ),
        bankName: String(
          bank.shortName ||
            bank.name ||
            "",
        ).trim(),
      }),
    );

    setError("");
    setSuccessMessage("");
  };

  const handleBankClear = () => {
    setForm(
      (currentForm) => ({
        ...currentForm,
        bankCode: "",
        bankName: "",
      }),
    );

    setError("");
    setSuccessMessage("");
  };
  const handleStartEditing = () => {
    setError("");
    setSuccessMessage("");
    setForm(
      createBankForm(
        bankAccount,
      ),
    );
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setError("");
    setForm(
      createBankForm(
        bankAccount,
      ),
    );
    setIsEditing(false);
  };
  const validateForm = () => {
    if (
      !form.bankCode.trim() ||
      !form.bankName.trim()
    ) {
      return "Vui lòng chọn ngân hàng thụ hưởng.";
    }

    const accountNumber =
      form.accountNumber.trim();

    const accountName =
      form.accountName.trim();

    if (!accountNumber) {
      return "Vui lòng nhập số tài khoản.";
    }

    if (
      !/^[0-9]+$/.test(
        accountNumber,
      )
    ) {
      return "Số tài khoản chỉ được chứa chữ số.";
    }

    if (
      accountNumber.length > 50
    ) {
      return "Số tài khoản không được vượt quá 50 ký tự.";
    }

    if (!accountName) {
      return "Vui lòng nhập tên chủ tài khoản.";
    }

    if (
      accountName.length > 255
    ) {
      return "Tên chủ tài khoản không được vượt quá 255 ký tự.";
    }

    return "";
  };

  const handleSubmit = async (
    event,
  ) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      bankCode:
        form.bankCode.trim(),

      bankName:
        form.bankName.trim(),

      accountNumber:
        form.accountNumber.trim(),

      accountName:
        form.accountName
          .trim()
          .toUpperCase(),
    };

    setIsSaving(true);

    try {
      const response =
        await updateBank(payload);

      if (response?.isSuccess === false) {
        throw new Error(
          response?.error?.message ||
            "Cập nhật ngân hàng thất bại.",
        );
      }

      let updatedBankAccount = {
        ...bankAccount,
        ...payload,
      };

      if (
        typeof onUpdated ===
        "function"
      ) {
        try {
          const refreshedBankAccount =
            await onUpdated();

          if (
            refreshedBankAccount
          ) {
            updatedBankAccount =
              refreshedBankAccount;
          }
        } catch (reloadError) {
          console.error(
            "Không thể tải lại tài khoản ngân hàng:",
            reloadError,
          );
        }
      }

      setBankAccount(
        updatedBankAccount,
      );

      setForm(
        createBankForm(
          updatedBankAccount,
        ),
      );

      setIsEditing(false);

      setSuccessMessage(
        "Thông tin ngân hàng đã được cập nhật thành công.",
      );
    } catch (updateError) {
      setError(
        getApiErrorMessage(
          updateError,
          "Cập nhật ngân hàng thất bại. Vui lòng thử lại.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-text">
            Tài khoản ngân hàng
          </h2>

          <p className="mt-1 max-w-xl text-xs leading-5 text-textLight">
            Tài khoản ngân hàng được
            sử dụng để nhận và thực
            hiện thanh toán.
          </p>
        </div>

        {!isEditing &&
          bankAccount && (
            <button
              type="button"
              onClick={
                handleStartEditing
              }
              className="rounded-xl border border-primary bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/10"
            >
              Cập nhật
            </button>
          )}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-md border border-error/20 bg-error/10 px-4 py-3 text-sm text-error"
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          aria-live="polite"
          className="mb-5 rounded-md border border-success/20 bg-success/10 px-4 py-3 text-sm text-success"
        >
          {successMessage}
        </div>
      )}

      {!bankAccount &&
        !isEditing && (
          <div className="rounded-2xl border border-dashed border-border bg-background px-6 py-12 text-center">
            <span className="material-symbols-outlined text-5xl text-border">
              account_balance_wallet
            </span>

            <h3 className="mt-3 font-black text-text">
              Chưa có tài khoản ngân
              hàng
            </h3>

            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-textLight">
              Thêm tài khoản ngân hàng
              để sử dụng cho các giao
              dịch trên HomeCycle.
            </p>

            <button
              type="button"
              onClick={
                handleStartEditing
              }
              className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-white transition hover:bg-primary/90"
            >
              THÊM TÀI KHOẢN
            </button>
          </div>
        )}

      {bankAccount &&
        !isEditing && (
          <div className="relative max-w-lg overflow-hidden rounded-2xl bg-primary p-6 text-white shadow-[0_16px_36px_rgba(23,40,48,0.16)]">
            <div className="absolute -right-10 -top-10 opacity-10">
              <span className="material-symbols-outlined text-[150px]">
                account_balance
              </span>
            </div>

            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-white/60">
              Ngân hàng
            </p>

            <p className="mb-6 text-xl font-black">
              {bankAccount.bankName}
            </p>


            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-white/60">
              Số tài khoản
            </p>

            <MaskedAccountNumber
              value={bankAccount.accountNumber}
            />

            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-white/60">
              Chủ tài khoản
            </p>

            <p className="font-bold uppercase tracking-wide">
              {
                bankAccount.accountName
              }
            </p>
          </div>
        )}

      {isEditing && (
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-black text-textLight">
                NGÂN HÀNG THỤ HƯỞNG
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
                  isSaving
                }
                hasError={
                  Boolean(error) &&
                  (
                    !form.bankCode ||
                    !form.bankName
                  )
                }
                placeholder="Chọn ngân hàng thụ hưởng"
              />
            </div>

            <SensitiveField
              id="bank-account-number"
              label="SỐ TÀI KHOẢN"
              name="accountNumber"
              value={
                form.accountNumber
              }
              onChange={handleChange}
              required
              placeholder="Nhập số tài khoản ngân hàng"
              autoComplete="off"
            />

            <div className="sm:col-span-2">
              <BankField
                id="bank-account-name"
                label="TÊN CHỦ TÀI KHOẢN"
                name="accountName"
                value={
                  form.accountName
                }
                onChange={
                  handleChange
                }
                placeholder="Nhập tên chủ tài khoản"
                autoComplete="name"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-5">
            <button
              type="button"
              onClick={
                handleCancelEditing
              }
              disabled={isSaving}
              className="rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-bold text-textLight transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? "ĐANG LƯU..."
                : "LƯU TÀI KHOẢN"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default BankAccountSection;
