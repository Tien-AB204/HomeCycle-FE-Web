import { useState } from "react";
import { userService } from "../../services/userService";

const createBankForm = (bankAccount) => ({
  bankCode: bankAccount?.bankCode || "",
  bankName: bankAccount?.bankName || "",
  accountNumber:
    bankAccount?.accountNumber || "",
  accountName: bankAccount?.accountName || "",
});

const getApiErrorMessage = (
  error,
  fallbackMessage,
) => {
  const responseData = error?.response?.data;

  const validationMessage = responseData?.errors
    ? Object.values(responseData.errors)
        .flat()
        .find(Boolean)
    : "";

  return (
    validationMessage ||
    responseData?.message ||
    responseData?.error?.message ||
    error?.message ||
    fallbackMessage
  );
};

const BankField = ({
  id,
  label,
  name,
  value,
  onChange,
  placeholder,
  autoComplete,
}) => {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-bold text-slate-700"
      >
        {label}
        <span className="text-red-500"> *</span>
      </label>

      <input
        id={id}
        name={name}
        type="text"
        value={value}
        onChange={onChange}
        required
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#244f4d] focus:ring-1 focus:ring-[#244f4d]"
      />
    </div>
  );
};

const BankAccountSection = ({
  bankAccount: initialBankAccount,
  onUpdated,
}) => {
  const [bankAccount, setBankAccount] =
    useState(initialBankAccount || null);

  const [form, setForm] = useState(
    createBankForm(initialBankAccount),
  );

  const [isEditing, setIsEditing] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleStartEditing = () => {
    setError("");
    setSuccessMessage("");
    setForm(createBankForm(bankAccount));
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setError("");
    setForm(createBankForm(bankAccount));
    setIsEditing(false);
  };

  const validateForm = () => {
    if (!form.bankCode.trim()) {
      return "Vui lòng nhập mã ngân hàng.";
    }

    if (!form.bankName.trim()) {
      return "Vui lòng nhập tên ngân hàng.";
    }

    if (!form.accountNumber.trim()) {
      return "Vui lòng nhập số tài khoản.";
    }

    if (
      !/^[0-9]{3,30}$/.test(
        form.accountNumber.trim(),
      )
    ) {
      return "Số tài khoản chỉ được chứa từ 3 đến 30 chữ số.";
    }

    if (!form.accountName.trim()) {
      return "Vui lòng nhập tên chủ tài khoản.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      bankCode: form.bankCode.trim(),
      bankName: form.bankName.trim(),
      accountNumber:
        form.accountNumber.trim(),
      accountName: form.accountName.trim(),
    };

    setIsSaving(true);

    try {
      const response =
        await userService.updateBank(payload);

      if (!response?.isSuccess) {
        throw new Error(
          response?.error?.message ||
            "Cập nhật ngân hàng thất bại.",
        );
      }

      let updatedBankAccount = {
        ...bankAccount,
        ...payload,
      };

      /*
       * Parent sẽ gọi lại GET profile và trả về
       * bankAccount mới nhất.
       */
      if (typeof onUpdated === "function") {
        try {
          const refreshedBankAccount =
            await onUpdated();

          if (refreshedBankAccount) {
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

      setBankAccount(updatedBankAccount);
      setForm(
        createBankForm(updatedBankAccount),
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
      <div className="mb-6 flex items-center justify-between border-b pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            Tài khoản ngân hàng
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Tài khoản ngân hàng được sử dụng để
            nhận và thực hiện thanh toán.
          </p>
        </div>

        {!isEditing && bankAccount && (
          <button
            type="button"
            onClick={handleStartEditing}
            className="rounded-md bg-[#244f4d] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1a3a38]"
          >
            Cập nhật
          </button>
        )}
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

      {!bankAccount && !isEditing && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300">
            account_balance_wallet
          </span>

          <h3 className="mt-3 font-bold text-slate-700">
            Chưa có tài khoản ngân hàng
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Thêm tài khoản ngân hàng để sử dụng
            cho các giao dịch trên HomeCycle.
          </p>

          <button
            type="button"
            onClick={handleStartEditing}
            className="mt-5 rounded-md bg-[#244f4d] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#1a3a38]"
          >
            THÊM TÀI KHOẢN
          </button>
        </div>
      )}

      {bankAccount && !isEditing && (
        <div className="relative max-w-md overflow-hidden rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white shadow-md">
          <div className="absolute -right-10 -top-10 opacity-10">
            <span className="material-symbols-outlined text-[150px]">
              account_balance
            </span>
          </div>

          <p className="mb-1 text-sm text-slate-300">
            Ngân hàng
          </p>

          <p className="mb-6 text-lg font-bold">
            {bankAccount.bankName}
          </p>

          <p className="mb-1 text-sm text-slate-300">
            Mã ngân hàng
          </p>

          <p className="mb-6 font-medium">
            {bankAccount.bankCode}
          </p>

          <p className="mb-1 text-sm text-slate-300">
            Số tài khoản
          </p>

          <p className="mb-6 font-mono text-xl tracking-widest">
            {bankAccount.accountNumber}
          </p>

          <p className="mb-1 text-sm text-slate-300">
            Chủ tài khoản
          </p>

          <p className="font-bold uppercase tracking-wide">
            {bankAccount.accountName}
          </p>
        </div>
      )}

      {isEditing && (
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <BankField
              id="bank-code"
              label="MÃ NGÂN HÀNG"
              name="bankCode"
              value={form.bankCode}
              onChange={handleChange}
              placeholder="Ví dụ: VCB"
            />

            <BankField
              id="bank-name"
              label="TÊN NGÂN HÀNG"
              name="bankName"
              value={form.bankName}
              onChange={handleChange}
              placeholder="Ví dụ: Vietcombank"
            />

            <BankField
              id="bank-account-number"
              label="SỐ TÀI KHOẢN"
              name="accountNumber"
              value={form.accountNumber}
              onChange={handleChange}
              placeholder="Nhập số tài khoản"
              autoComplete="off"
            />

            <BankField
              id="bank-account-name"
              label="TÊN CHỦ TÀI KHOẢN"
              name="accountName"
              value={form.accountName}
              onChange={handleChange}
              placeholder="Nhập tên chủ tài khoản"
              autoComplete="name"
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-5">
            <button
              type="button"
              onClick={handleCancelEditing}
              disabled={isSaving}
              className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-[#244f4d] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#1a3a38] disabled:cursor-not-allowed disabled:opacity-60"
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