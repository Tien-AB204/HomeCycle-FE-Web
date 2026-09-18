import {
  useEffect,
  useState,
} from "react";
import provinceApi from "../../services/apis/provinceApi";
import { capitalizeWordInitials } from "../../utils/textFormat";

const selectClass =
  "w-full rounded-xl border border-border bg-white px-3 py-3 text-sm text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-background";

export default function AddressPickerField({
  value = "",
  onChange,
  onClear,
  placeholder = "Chọn địa chỉ",
  disabled = false,
  hasError = false,
}) {
  const [isOpen, setIsOpen] =
    useState(false);

  const [provinces, setProvinces] =
    useState([]);

  const [wards, setWards] =
    useState([]);

  const [
    provinceCode,
    setProvinceCode,
  ] = useState("");

  const [wardName, setWardName] =
    useState("");

  const [
    streetAddress,
    setStreetAddress,
  ] = useState("");

  const [
    isLoadingProvinces,
    setIsLoadingProvinces,
  ] = useState(false);

  const [
    isLoadingWards,
    setIsLoadingWards,
  ] = useState(false);

  const [loadError, setLoadError] =
    useState("");

  const [formError, setFormError] =
    useState("");

  const selectedProvince =
    provinces.find(
      (province) =>
        String(province.code) ===
        provinceCode,
    ) || null;

  const loadProvinces = async () => {
    setIsLoadingProvinces(true);
    setLoadError("");

    try {
      const items =
        await provinceApi.getProvinces();

      setProvinces(
        Array.isArray(items)
          ? items
          : [],
      );
    } catch {
      setProvinces([]);
      setLoadError(
        "Không thể tải danh sách tỉnh thành.",
      );
    } finally {
      setIsLoadingProvinces(false);
    }
  };

  const openPicker = () => {
    if (disabled) {
      return;
    }

    setIsOpen(true);
    setFormError("");

    if (
      provinces.length === 0 &&
      !isLoadingProvinces
    ) {
      void loadProvinces();
    }
  };

  const closePicker = () => {
    setIsOpen(false);
    setFormError("");
  };

  const handleProvinceChange = async (
    event,
  ) => {
    const nextCode =
      event.target.value;

    setProvinceCode(nextCode);
    setWardName("");
    setWards([]);
    setFormError("");
    setLoadError("");

    if (!nextCode) {
      return;
    }

    setIsLoadingWards(true);

    try {
      const province =
        await provinceApi
          .getProvinceWithWards(
            nextCode,
          );

      setWards(
        Array.isArray(
          province?.wards,
        )
          ? province.wards
          : [],
      );
    } catch {
      setWards([]);
      setLoadError(
        "Không thể tải danh sách phường xã.",
      );
    } finally {
      setIsLoadingWards(false);
    }
  };

  const handleConfirm = () => {
    const cleanStreet =
      streetAddress.trim();

    if (!selectedProvince) {
      setFormError(
        "Vui lòng chọn tỉnh hoặc thành phố.",
      );
      return;
    }

    if (!wardName) {
      setFormError(
        "Vui lòng chọn phường hoặc xã.",
      );
      return;
    }

    if (!cleanStreet) {
      setFormError(
        "Vui lòng nhập số nhà, tên đường.",
      );
      return;
    }

    const formattedAddress = [
      cleanStreet,
      wardName,
      selectedProvince.name,
    ]
      .filter(Boolean)
      .join(", ");

    onChange(
      formattedAddress,
      {
        provinceCode,
        provinceName:
          selectedProvince.name,
        wardName,
        streetAddress:
          cleanStreet,
        formattedAddress,
      },
    );

    setIsOpen(false);
    setFormError("");
  };

  const handleClear = () => {
    if (
      disabled ||
      typeof onClear !==
        "function"
    ) {
      return;
    }

    setProvinceCode("");
    setWardName("");
    setStreetAddress("");
    setWards([]);
    setFormError("");
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
        setFormError("");
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
        ].join(" ")}
      >
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined shrink-0 text-[20px] text-primary">
            location_on
          </span>

          <span
            className={
              value
                ? "min-w-0 flex-1 truncate text-sm font-medium text-text"
                : "min-w-0 flex-1 truncate text-sm text-textLight"
            }
          >
            {value || placeholder}
          </span>
        </button>

        <div className="flex shrink-0 items-center pr-2">
          {value &&
            typeof onClear ===
              "function" && (
              <button
                type="button"
                onClick={
                  handleClear
                }
                disabled={
                  disabled
                }
                aria-label="Xóa địa chỉ"
                className="flex h-9 w-9 items-center justify-center rounded-full text-textLight transition hover:bg-background hover:text-error disabled:cursor-not-allowed"
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
            aria-label="Chọn địa chỉ"
            className="flex h-9 w-9 items-center justify-center rounded-full text-textLight transition hover:bg-background hover:text-primary disabled:cursor-not-allowed"
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
          onMouseDown={
            closePicker
          }
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Chọn địa chỉ"
            onMouseDown={(
              event,
            ) =>
              event.stopPropagation()
            }
            className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="text-lg font-black text-text">
                  Chọn địa chỉ
                </h3>

                <p className="mt-1 text-xs text-textLight">
                  Chọn tỉnh/thành, phường/xã và nhập địa chỉ chi tiết.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closePicker
                }
                aria-label="Đóng"
                className="flex h-10 w-10 items-center justify-center rounded-full text-textLight transition hover:bg-background hover:text-text"
              >
                <span className="material-symbols-outlined">
                  close
                </span>
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-black text-textLight">
                  Tỉnh / thành phố
                </label>

                <select
                  value={
                    provinceCode
                  }
                  onChange={
                    handleProvinceChange
                  }
                  disabled={
                    isLoadingProvinces
                  }
                  className={
                    selectClass
                  }
                >
                  <option value="">
                    {isLoadingProvinces
                      ? "Đang tải tỉnh thành..."
                      : "Chọn tỉnh / thành phố"}
                  </option>

                  {provinces.map(
                    (province) => (
                      <option
                        key={
                          province.code
                        }
                        value={
                          province.code
                        }
                      >
                        {
                          province.name
                        }
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-black text-textLight">
                  Phường / xã
                </label>

                <select
                  value={
                    wardName
                  }
                  onChange={(
                    event,
                  ) => {
                    setWardName(
                      event.target
                        .value,
                    );
                    setFormError(
                      "",
                    );
                  }}
                  disabled={
                    !provinceCode ||
                    isLoadingWards
                  }
                  className={
                    selectClass
                  }
                >
                  <option value="">
                    {isLoadingWards
                      ? "Đang tải phường xã..."
                      : provinceCode
                        ? "Chọn phường / xã"
                        : "Chọn tỉnh thành trước"}
                  </option>

                  {wards.map(
                    (ward) => (
                      <option
                        key={
                          ward.code
                        }
                        value={
                          ward.name
                        }
                      >
                        {ward.name}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-black text-textLight">
                  Số nhà, tên đường
                </label>

                <input
                  type="text"
                  value={
                    streetAddress
                  }
                  onChange={(
                    event,
                  ) => {
                    setStreetAddress(
                      capitalizeWordInitials(
                        event.target
                          .value,
                      ),
                    );
                    setFormError(
                      "",
                    );
                  }}
                  maxLength={500}
                  placeholder="VD: 12 Nguyễn Văn A"
                  className={
                    selectClass
                  }
                />
              </div>

              {loadError && (
                <div
                  role="alert"
                  className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error"
                >
                  {loadError}
                </div>
              )}

              {formError && (
                <div
                  role="alert"
                  className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error"
                >
                  {formError}
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={
                  closePicker
                }
                className="flex-1 rounded-xl border border-border bg-white px-4 py-3 text-sm font-bold text-text transition hover:bg-background"
              >
                HỦY
              </button>

              <button
                type="button"
                onClick={
                  handleConfirm
                }
                className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-black text-white transition hover:bg-primary/90"
              >
                XÁC NHẬN
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}