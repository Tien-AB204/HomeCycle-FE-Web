import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { bankDirectoryService } from "../../services/bankDirectoryService";

const normalizeValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const BankLogo = ({
  src,
  className = "h-10 w-10",
}) => {
  if (!src) {
    return (
      <div
        className={`${className} flex shrink-0 items-center justify-center rounded-lg bg-background`}
      >
        <span className="material-symbols-outlined text-textLight">
          account_balance
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className={`${className} shrink-0 rounded-lg object-contain`}
    />
  );
};

export default function BankPickerField({
  bankBin = "",
  bankName = "",
  onChange,
  onClear,
  disabled = false,
  hasError = false,
  placeholder = "Chọn ngân hàng",
  className = "",
}) {
  const [banks, setBanks] =
    useState([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const [isOpen, setIsOpen] =
    useState(false);

  const [searchQuery, setSearchQuery] =
    useState("");

  const loadBanks = async (
    forceRefresh = false,
  ) => {
    setIsLoading(true);
    setLoadError("");

    try {
      const items =
        await bankDirectoryService.getBanks({
          forceRefresh,
        });

      setBanks(items);
    } catch {
      setBanks([]);
      setLoadError(
        "Không thể tải danh sách ngân hàng.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    bankDirectoryService
      .getBanks()
      .then((items) => {
        if (active) {
          setBanks(items);
        }
      })
      .catch(() => {
        if (active) {
          setBanks([]);
          setLoadError(
            "Không thể tải danh sách ngân hàng.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedBank =
    useMemo(() => {
      const normalizedBin =
        normalizeValue(bankBin);

      const normalizedName =
        normalizeValue(bankName);

      return (
        banks.find((bank) => {
          return (
            normalizeValue(
              bank.bin,
            ) === normalizedBin ||
            normalizeValue(
              bank.code,
            ) === normalizedBin ||
            normalizeValue(
              bank.shortName,
            ) === normalizedName ||
            normalizeValue(
              bank.name,
            ) === normalizedName
          );
        }) || null
      );
    }, [
      bankBin,
      bankName,
      banks,
    ]);

  useEffect(() => {
    if (!selectedBank) {
      return;
    }

    const selectedBin =
      String(selectedBank.bin);

    if (
      String(bankBin) ===
      selectedBin
    ) {
      return;
    }

    onChange(selectedBank);
  }, [
    bankBin,
    onChange,
    selectedBank,
  ]);

  const filteredBanks =
    useMemo(() => {
      const keyword =
        normalizeValue(
          searchQuery,
        );

      if (!keyword) {
        return banks;
      }

      return banks.filter(
        (bank) =>
          [
            bank.shortName,
            bank.name,
            bank.code,
            bank.bin,
          ]
            .map(normalizeValue)
            .some((value) =>
              value.includes(
                keyword,
              ),
            ),
      );
    }, [
      banks,
      searchQuery,
    ]);

  const displayName =
    selectedBank?.shortName ||
    selectedBank?.name ||
    bankName ||
    "";

  const displayCode =
    selectedBank?.code || "";

  const openPicker = () => {
    if (disabled) {
      return;
    }

    setSearchQuery("");
    setIsOpen(true);
  };

  const clearBank = () => {
    if (
      disabled ||
      typeof onClear !==
        "function"
    ) {
      return;
    }

    setSearchQuery("");
    onClear();
  };

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (
      event,
    ) => {
      if (
        event.key === "Escape"
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [isOpen]);

  return (
    <>
      <div
        className={[
          "flex min-h-[52px] w-full items-center rounded-xl border bg-white transition",
          hasError
            ? "border-error"
            : "border-border",
          disabled
            ? "cursor-not-allowed bg-background opacity-70"
            : "focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left disabled:cursor-not-allowed"
          aria-label="Chọn ngân hàng"
        >
          {displayName ? (
            <>
              <BankLogo
                src={
                  selectedBank?.logo
                }
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-text">
                  {displayName}
                  {displayCode
                    ? ` (${displayCode})`
                    : ""}
                </p>

                {selectedBank?.name &&
                  selectedBank.name !==
                    displayName && (
                    <p className="truncate text-xs text-textLight">
                      {
                        selectedBank.name
                      }
                    </p>
                  )}
              </div>
            </>
          ) : (
            <span className="text-sm text-textLight">
              {placeholder}
            </span>
          )}
        </button>

        <div className="flex shrink-0 items-center pr-2">
          {displayName &&
            typeof onClear ===
              "function" && (
              <button
                type="button"
                onClick={
                  clearBank
                }
                disabled={
                  disabled
                }
                className="flex h-9 w-9 items-center justify-center rounded-full text-textLight transition hover:bg-background hover:text-error disabled:cursor-not-allowed"
                aria-label="Xóa ngân hàng đã chọn"
              >
                <span className="material-symbols-outlined text-[20px]">
                  cancel
                </span>
              </button>
            )}

          <button
            type="button"
            onClick={openPicker}
            disabled={disabled}
            className="flex h-9 w-9 items-center justify-center rounded-full text-textLight transition hover:bg-background hover:text-primary disabled:cursor-not-allowed"
            aria-label="Mở danh sách ngân hàng"
          >
            <span className="material-symbols-outlined text-[20px]">
              keyboard_arrow_down
            </span>
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onMouseDown={() =>
            setIsOpen(false)
          }
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Chọn ngân hàng"
            className="flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            onMouseDown={(
              event,
            ) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="text-lg font-black text-text">
                  Chọn ngân hàng
                </h3>

                <p className="mt-1 text-xs text-textLight">
                  Tìm theo tên hoặc mã ngân hàng.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsOpen(false)
                }
                className="flex h-10 w-10 items-center justify-center rounded-full text-textLight transition hover:bg-background hover:text-text"
                aria-label="Đóng"
              >
                <span className="material-symbols-outlined">
                  close
                </span>
              </button>
            </div>

            <div className="border-b border-border p-4">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-textLight">
                  search
                </span>

                <input
                  type="text"
                  value={
                    searchQuery
                  }
                  onChange={(
                    event,
                  ) =>
                    setSearchQuery(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Tìm tên hoặc mã ngân hàng..."
                  autoFocus
                  autoComplete="off"
                  className="w-full rounded-xl border border-border bg-white py-3 pl-10 pr-3 text-sm text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {isLoading ? (
                <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-sm text-textLight">
                  <span className="material-symbols-outlined animate-spin text-primary">
                    refresh
                  </span>

                  Đang tải danh sách ngân hàng...
                </div>
              ) : loadError ? (
                <div className="flex min-h-40 flex-col items-center justify-center gap-3 px-6 text-center">
                  <p className="text-sm text-error">
                    {loadError}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      void loadBanks(
                        true,
                      )
                    }
                    className="rounded-xl border border-primary px-4 py-2 text-sm font-bold text-primary"
                  >
                    Thử lại
                  </button>
                </div>
              ) : filteredBanks.length ===
                0 ? (
                <div className="flex min-h-40 items-center justify-center px-6 text-center text-sm text-textLight">
                  Không tìm thấy ngân hàng phù hợp.
                </div>
              ) : (
                filteredBanks.map(
                  (bank) => (
                    <button
                      key={
                        bank.id ||
                        bank.bin
                      }
                      type="button"
                      onClick={() => {
                        onChange(
                          bank,
                        );
                        setSearchQuery(
                          "",
                        );
                        setIsOpen(
                          false,
                        );
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-primary/10"
                    >
                      <BankLogo
                        src={
                          bank.logo
                        }
                        className="h-11 w-11"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-text">
                          {
                            bank.shortName
                          }
                        </p>

                        <p className="truncate text-xs text-textLight">
                          {
                            bank.name
                          }
                        </p>
                      </div>

                      <span className="shrink-0 text-xs font-bold text-primary">
                        {
                          bank.code
                        }
                      </span>
                    </button>
                  ),
                )
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}