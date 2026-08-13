import {
  useMemo,
  useState,
} from "react";
import { bankDirectoryService } from "../../services/bankDirectoryService";
import { userService } from "../../services/userService";

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

const normalizeSearchValue = (
  value,
) => {
  return String(value || "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "");
};

const findMatchingBank = (
  bankList,
  bankForm,
) => {
  const bankCode = String(
    bankForm?.bankCode || "",
  );

  const normalizedBankName =
    normalizeSearchValue(
      bankForm?.bankName,
    );

  return (
    bankList.find(
      (bank) =>
        bank.bin === bankCode,
    ) ||
    bankList.find(
      (bank) =>
        normalizeSearchValue(
          bank.name,
        ) === normalizedBankName,
    ) ||
    null
  );
};

const getApiErrorMessage = (
  error,
  fallbackMessage,
) => {
  const responseData =
    error?.response?.data;

  const validationMessage =
    responseData?.errors
      ? Object.values(
          responseData.errors,
        )
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
  onChange = () => {},
  placeholder,
  autoComplete,
  readOnly = false,
}) => {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-black text-[#607B7A]"
      >
        {label}
        <span className="text-red-500">
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
            ? "cursor-default border-[#E1EAE8] bg-[#F5F8F7] text-[#607B7A]"
            : "border-[#CDDED9] bg-white text-[#183436] focus:border-[#4F8588] focus:ring-4 focus:ring-[#5F9291]/10"
        }`}
      />
    </div>
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

  const [banks, setBanks] =
    useState([]);

  const [
    selectedBank,
    setSelectedBank,
  ] = useState(null);

  const [
    bankSearch,
    setBankSearch,
  ] = useState(
    initialBankAccount?.bankName ||
      "",
  );

  const [
    isBankListOpen,
    setIsBankListOpen,
  ] = useState(false);

  const [
    isLoadingBanks,
    setIsLoadingBanks,
  ] = useState(false);

  const [
    bankLoadError,
    setBankLoadError,
  ] = useState("");

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

  const filteredBanks =
    useMemo(() => {
      const normalizedQuery =
        normalizeSearchValue(
          bankSearch,
        );

      if (!normalizedQuery) {
        return banks.slice(0, 15);
      }

      return banks
        .filter((bank) => {
          const searchableValue =
            normalizeSearchValue(
              [
                bank.name,
                bank.shortName,
                bank.code,
                bank.bin,
              ].join(" "),
            );

          return searchableValue.includes(
            normalizedQuery,
          );
        })
        .slice(0, 15);
    }, [banks, bankSearch]);

  const loadBanks = async (
    forceRefresh = false,
    targetForm = form,
  ) => {
    setIsLoadingBanks(true);
    setBankLoadError("");

    try {
      const bankList =
        await bankDirectoryService.getBanks(
          {
            forceRefresh,
          },
        );

      setBanks(bankList);

      const matchingBank =
        findMatchingBank(
          bankList,
          targetForm,
        );

      if (matchingBank) {
        setSelectedBank(
          matchingBank,
        );

        setBankSearch(
          matchingBank.name,
        );

        setForm(
          (currentForm) => ({
            ...currentForm,
            bankCode:
              matchingBank.bin,
            bankName:
              matchingBank.name,
          }),
        );
      }
    } catch (loadError) {
      setBankLoadError(
        getApiErrorMessage(
          loadError,
          "Không thể tải danh sách ngân hàng.",
        ),
      );
    } finally {
      setIsLoadingBanks(false);
    }
  };

  const handleChange = (
    event,
  ) => {
    const { name, value } =
      event.target;

    setForm(
      (currentForm) => ({
        ...currentForm,
        [name]: value,
      }),
    );
  };

  const handleBankSearchChange = (
    event,
  ) => {
    const value =
      event.target.value;

    setBankSearch(value);
    setSelectedBank(null);
    setError("");
    setIsBankListOpen(true);

    setForm(
      (currentForm) => ({
        ...currentForm,
        bankName: "",
        bankCode: "",
      }),
    );
  };

  const handleSelectBank = (
    bank,
  ) => {
    setSelectedBank(bank);
    setBankSearch(bank.name);
    setIsBankListOpen(false);
    setError("");

    setForm(
      (currentForm) => ({
        ...currentForm,
        bankName: bank.name,
        bankCode: bank.bin,
      }),
    );
  };

  const handleStartEditing = () => {
    const nextForm =
      createBankForm(bankAccount);

    setError("");
    setSuccessMessage("");
    setBankLoadError("");
    setForm(nextForm);
    setBankSearch(
      nextForm.bankName,
    );
    setIsEditing(true);

    const matchingBank =
      findMatchingBank(
        banks,
        nextForm,
      );

    setSelectedBank(
      matchingBank,
    );

    if (banks.length === 0) {
      void loadBanks(
        false,
        nextForm,
      );
    }
  };

  const handleCancelEditing = () => {
    const previousForm =
      createBankForm(bankAccount);

    setError("");
    setBankLoadError("");
    setForm(previousForm);
    setBankSearch(
      previousForm.bankName,
    );
    setSelectedBank(
      findMatchingBank(
        banks,
        previousForm,
      ),
    );
    setIsBankListOpen(false);
    setIsEditing(false);
  };

  const validateForm = () => {
    if (isLoadingBanks) {
      return "Vui lòng chờ danh sách ngân hàng tải xong.";
    }

    if (
      !selectedBank ||
      selectedBank.bin !==
        form.bankCode ||
      selectedBank.name !==
        form.bankName
    ) {
      return "Vui lòng chọn một ngân hàng trong danh sách gợi ý.";
    }

    if (
      !/^[0-9]{3,30}$/.test(
        form.accountNumber.trim(),
      )
    ) {
      return "Số tài khoản chỉ được chứa từ 3 đến 30 chữ số.";
    }

    if (
      !form.accountName.trim()
    ) {
      return "Vui lòng nhập tên chủ tài khoản.";
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
        selectedBank.bin,

      bankName:
        selectedBank.name,

      accountNumber:
        form.accountNumber.trim(),

      accountName:
        form.accountName.trim(),
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

      setBankSearch(
        updatedBankAccount.bankName,
      );

      setSelectedBank(
        findMatchingBank(
          banks,
          updatedBankAccount,
        ) || selectedBank,
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
      <div className="mb-6 flex flex-col gap-4 border-b border-[#DCE8E5] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-[#183F41]">
            Tài khoản ngân hàng
          </h2>

          <p className="mt-1 max-w-xl text-xs leading-5 text-[#68807F]">
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
              className="rounded-xl border border-[#4F8588] bg-white px-4 py-2 text-sm font-bold text-[#285E62] transition hover:bg-[#F1F7F5]"
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

      {!bankAccount &&
        !isEditing && (
          <div className="rounded-2xl border border-dashed border-[#B8D0CC] bg-[#F5F9F8] px-6 py-12 text-center">
            <span className="material-symbols-outlined text-5xl text-[#7FA9A6]">
              account_balance_wallet
            </span>

            <h3 className="mt-3 font-black text-[#183F41]">
              Chưa có tài khoản ngân
              hàng
            </h3>

            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#68807F]">
              Thêm tài khoản ngân hàng
              để sử dụng cho các giao
              dịch trên HomeCycle.
            </p>

            <button
              type="button"
              onClick={
                handleStartEditing
              }
              className="mt-5 rounded-xl bg-[#4F8588] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#356A70]"
            >
              THÊM TÀI KHOẢN
            </button>
          </div>
        )}

      {bankAccount &&
        !isEditing && (
          <div className="relative max-w-lg overflow-hidden rounded-2xl bg-gradient-to-br from-[#183F41] via-[#285E62] to-[#2F6F9F] p-6 text-white shadow-[0_16px_36px_rgba(24,63,65,0.16)]">
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
              Mã ngân hàng
            </p>

            <p className="mb-6 font-medium">
              {bankAccount.bankCode}
            </p>

            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-white/60">
              Số tài khoản
            </p>

            <p className="mb-6 font-mono text-xl font-bold tracking-widest">
              {
                bankAccount.accountNumber
              }
            </p>

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
            <div className="relative sm:col-span-2">
              <label
                htmlFor="bank-search"
                className="mb-1.5 block text-xs font-black text-[#607B7A]"
              >
                TÊN NGÂN HÀNG
                <span className="text-red-500">
                  {" "}*
                </span>
              </label>

              <div className="relative">
                <input
                  id="bank-search"
                  type="text"
                  value={bankSearch}
                  onChange={
                    handleBankSearchChange
                  }
                  onFocus={() =>
                    setIsBankListOpen(
                      true,
                    )
                  }
                  onBlur={() =>
                    setIsBankListOpen(
                      false,
                    )
                  }
                  disabled={
                    isLoadingBanks
                  }
                  placeholder="Nhập MB Bank, Vietcombank, ACB..."
                  autoComplete="off"
                  className="w-full rounded-xl border border-[#CDDED9] bg-white py-3 pl-10 pr-10 text-sm text-[#183436] outline-none transition focus:border-[#4F8588] focus:ring-4 focus:ring-[#5F9291]/10 disabled:bg-[#F5F8F7]"
                />

                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[19px] text-slate-400">
                  search
                </span>

                {isLoadingBanks && (
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[19px] text-[#4F8588]">
                    refresh
                  </span>
                )}
              </div>

              {isBankListOpen &&
                !isLoadingBanks &&
                banks.length > 0 && (
                  <div className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-[#DCE8E5] bg-white py-1 shadow-xl">
                    {filteredBanks.length >
                    0 ? (
                      filteredBanks.map(
                        (bank) => (
                          <button
                            key={
                              bank.id
                            }
                            type="button"
                            onMouseDown={(
                              event,
                            ) => {
                              event.preventDefault();

                              handleSelectBank(
                                bank,
                              );
                            }}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[#F1F7F5]"
                          >
                            {bank.logo ? (
                              <img
                                src={
                                  bank.logo
                                }
                                alt=""
                                className="h-9 w-9 rounded object-contain"
                              />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded bg-slate-100">
                                <span className="material-symbols-outlined text-slate-400">
                                  account_balance
                                </span>
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-[#183F41]">
                                {
                                  bank.shortName
                                }
                              </p>

                              <p className="truncate text-xs text-slate-500">
                                {
                                  bank.name
                                }
                              </p>
                            </div>

                            <span className="text-xs font-medium text-slate-400">
                              {
                                bank.bin
                              }
                            </span>
                          </button>
                        ),
                      )
                    ) : (
                      <p className="px-4 py-5 text-center text-sm text-slate-500">
                        Không tìm thấy
                        ngân hàng phù
                        hợp.
                      </p>
                    )}
                  </div>
                )}

              {selectedBank && (
                <div className="mt-2 flex items-center gap-2 text-xs text-green-700">
                  <span className="material-symbols-outlined text-[17px]">
                    check_circle
                  </span>

                  Đã chọn{" "}
                  {
                    selectedBank.shortName
                  }
                  {" — BIN "}
                  {selectedBank.bin}
                </div>
              )}

              {bankLoadError && (
                <div className="mt-2 flex items-center gap-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                  <span className="flex-1">
                    {bankLoadError}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      void loadBanks(
                        true,
                        form,
                      )
                    }
                    className="font-bold underline"
                  >
                    Thử lại
                  </button>
                </div>
              )}
            </div>

            <BankField
              id="bank-code"
              label="BANK CODE (BIN)"
              name="bankCode"
              value={form.bankCode}
              readOnly
              placeholder="Tự động điền"
            />

            <BankField
              id="bank-account-number"
              label="SỐ TÀI KHOẢN"
              name="accountNumber"
              value={
                form.accountNumber
              }
              onChange={handleChange}
              placeholder="Nhập số tài khoản"
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

          <div className="flex justify-end gap-3 border-t border-[#DCE8E5] pt-5">
            <button
              type="button"
              onClick={
                handleCancelEditing
              }
              disabled={isSaving}
              className="rounded-xl border border-[#9FBFBA] bg-white px-5 py-2.5 text-sm font-bold text-[#526E6D] transition hover:bg-[#F5F9F8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={
                isSaving ||
                isLoadingBanks
              }
              className="rounded-xl bg-[#4F8588] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#356A70] disabled:cursor-not-allowed disabled:opacity-60"
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
