import {
  useEffect,
  useState,
} from "react";
import ghnApi from "../../services/apis/ghnApi";
import {
  GHN_REQUIRED_NOTES,
  createEmptyGhnAddress,
} from "./ghnCollectionUtils";

const ContactEditor = ({
  title,
  value,
  provinces,
  onChange,
  disabled,
}) => {
  const [districts, setDistricts] =
    useState([]);

  const [wards, setWards] =
    useState([]);

  const [loadingDistricts, setLoadingDistricts] =
    useState(
      Boolean(
        Number(value?.address?.provinceId),
      ),
    );

  const [loadingWards, setLoadingWards] =
    useState(
      Boolean(
        Number(value?.address?.districtId),
      ),
    );

  const [loadError, setLoadError] =
    useState("");

  const address =
    value.address || createEmptyGhnAddress();

  useEffect(() => {
    if (!Number(address.provinceId)) {
      return undefined;
    }

    const controller =
      new AbortController();

    ghnApi
      .getDistricts(
        address.provinceId,
        {
          signal:
            controller.signal,
        },
      )
      .then(setDistricts)
      .catch((error) => {
        if (
          error?.name !==
            "CanceledError" &&
          error?.code !==
            "ERR_CANCELED"
        ) {
          setLoadError(
              "Không thể tải quận/huyện GHN.",
          );
        }
      })
      .finally(() => {
        if (
          !controller.signal.aborted
        ) {
          setLoadingDistricts(false);
        }
      });

    return () =>
      controller.abort();
  }, [address.provinceId]);

  useEffect(() => {
    if (!Number(address.districtId)) {
      return undefined;
    }

    const controller =
      new AbortController();

    ghnApi
      .getWards(
        address.districtId,
        {
          signal:
            controller.signal,
        },
      )
      .then(setWards)
      .catch((error) => {
        if (
          error?.name !==
            "CanceledError" &&
          error?.code !==
            "ERR_CANCELED"
        ) {
          setLoadError(
              "Không thể tải phường/xã GHN.",
          );
        }
      })
      .finally(() => {
        if (
          !controller.signal.aborted
        ) {
          setLoadingWards(false);
        }
      });

    return () =>
      controller.abort();
  }, [address.districtId]);

  const updateContact = (
    field,
    nextValue,
  ) => {
    onChange({
      ...value,
      [field]: nextValue,
    });
  };

  const updateAddress = (
    patch,
  ) => {
    onChange({
      ...value,
      address: {
        ...address,
        ...patch,
      },
    });
  };

  return (
    <fieldset className="rounded-xl border border-border bg-background/70 p-4">
      <legend className="px-1 text-sm font-black text-text">
        {title}
      </legend>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-textLight">
          Họ tên
          <input
            value={value.fullName}
            onChange={(event) =>
              updateContact(
                "fullName",
                event.target.value,
              )
            }
            disabled={disabled}
            className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text outline-none focus:border-primary"
          />
        </label>

        <label className="text-xs font-bold text-textLight">
          Số điện thoại
          <input
            value={value.phone}
            onChange={(event) =>
              updateContact(
                "phone",
                event.target.value,
              )
            }
            disabled={disabled}
            className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text outline-none focus:border-primary"
          />
        </label>

        <label className="text-xs font-bold text-textLight">
          Tỉnh/Thành phố
          <select
            value={address.provinceId || ""}
            onChange={(event) => {
              const province =
                provinces.find(
                  (item) =>
                    String(
                      item.provinceId,
                    ) ===
                    event.target.value,
                );

              setLoadingDistricts(
                Boolean(
                  province?.provinceId,
                ),
              );

              setLoadingWards(false);

              updateAddress({
                provinceId:
                  province?.provinceId || 0,
                provinceName:
                  province?.provinceName || "",
                districtId: 0,
                districtName: "",
                wardCode: "",
                wardName: "",
              });

              setDistricts([]);
              setWards([]);
              setLoadError("");
            }}
            disabled={disabled}
            className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text outline-none focus:border-primary"
          >
            <option value="">
              Chọn Tỉnh/Thành phố
            </option>

            {provinces.map(
              (province) => (
                <option
                  key={province.provinceId}
                  value={province.provinceId}
                >
                  {province.provinceName}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="text-xs font-bold text-textLight">
          Quận/Huyện
          <select
            value={address.districtId || ""}
            onChange={(event) => {
              const district =
                districts.find(
                  (item) =>
                    String(
                      item.districtId,
                    ) ===
                    event.target.value,
                );

              setLoadingWards(
                Boolean(
                  district?.districtId,
                ),
              );

              updateAddress({
                districtId:
                  district?.districtId || 0,
                districtName:
                  district?.districtName || "",
                wardCode: "",
                wardName: "",
              });

              setWards([]);
              setLoadError("");
            }}
            disabled={
              disabled ||
              !address.provinceId ||
              loadingDistricts
            }
            className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text outline-none focus:border-primary"
          >
            <option value="">
              {loadingDistricts
                ? "Đang tải..."
                : "Chọn Quận/Huyện"}
            </option>

            {districts.map(
              (district) => (
                <option
                  key={district.districtId}
                  value={district.districtId}
                >
                  {district.districtName}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="text-xs font-bold text-textLight">
          Phường/Xã
          <select
            value={address.wardCode || ""}
            onChange={(event) => {
              const ward =
                wards.find(
                  (item) =>
                    String(
                      item.wardCode,
                    ) ===
                    event.target.value,
                );

              updateAddress({
                wardCode:
                  ward?.wardCode || "",
                wardName:
                  ward?.wardName || "",
              });
            }}
            disabled={
              disabled ||
              !address.districtId ||
              loadingWards
            }
            className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text outline-none focus:border-primary"
          >
            <option value="">
              {loadingWards
                ? "Đang tải..."
                : "Chọn Phường/Xã"}
            </option>

            {wards.map((ward) => (
              <option
                key={ward.wardCode}
                value={ward.wardCode}
              >
                {ward.wardName}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-bold text-textLight sm:col-span-2">
          Địa chỉ chi tiết
          <input
            value={address.addressDetail || ""}
            onChange={(event) =>
              updateAddress({
                addressDetail:
                  event.target.value,
              })
            }
            placeholder="Số nhà, đường, tòa nhà..."
            disabled={disabled}
            className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text outline-none focus:border-primary"
          />
        </label>
      </div>

      {loadError && (
        <p
          role="alert"
          className="mt-2 text-xs font-semibold text-error"
        >
          {loadError}
        </p>
      )}
    </fieldset>
  );
};

const GhnCollectionFields = ({
  value,
  onChange,
  disabled,
}) => {
  const [provinces, setProvinces] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const controller =
      new AbortController();

    ghnApi
      .getProvinces({
        signal: controller.signal,
      })
      .then(setProvinces)
      .catch((requestError) => {
        if (
          requestError?.name !==
            "CanceledError" &&
          requestError?.code !==
            "ERR_CANCELED"
        ) {
          setError(
            requestError?.message ||
              "Không thể tải địa chỉ GHN.",
          );
        }
      })
      .finally(() => {
        if (
          !controller.signal.aborted
        ) {
          setLoading(false);
        }
      });

    return () =>
      controller.abort();
  }, []);

  const update = (patch) => {
    onChange({
      ...value,
      ...patch,
    });
  };

  const updateItem = (
    index,
    field,
    nextValue,
  ) => {
    const items =
      value.items.map(
        (item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                [field]: nextValue,
              }
            : item,
      );

    update({ items });
  };

  const addItem = () => {
    update({
      items: [
        ...value.items,
        {
          name: "",
          code: "",
          quantity: 1,
          weightGram: "",
          lengthCm: "",
          widthCm: "",
          heightCm: "",
        },
      ],
    });
  };

  const removeItem = (index) => {
    if (value.items.length <= 1) {
      return;
    }

    update({
      items:
        value.items.filter(
          (_, itemIndex) =>
            itemIndex !== index,
        ),
    });
  };

  return (
    <section className="mt-4 space-y-4 rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
      <div>
        <p className="text-sm font-black text-text">
          Thông tin giao hàng GHN
        </p>

        <p className="mt-1 text-xs leading-5 text-textLight">
          HomeCycle gửi dữ liệu địa chỉ và kiện hàng cho máy chủ.
          Phí GHN được máy chủ tự tính.
        </p>
      </div>

      {loading && (
        <p
          role="status"
          className="text-xs font-semibold text-textLight"
        >
          Đang tải danh sách địa chỉ GHN...
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-error/20 bg-error/10 px-3 py-2 text-xs font-semibold text-error"
        >
          {error}
        </p>
      )}

      <ContactEditor
        title="Người gửi"
        value={value.sender}
        provinces={provinces}
        onChange={(sender) =>
          update({ sender })
        }
        disabled={disabled || loading}
      />

      <ContactEditor
        title="Người nhận"
        value={value.receiver}
        provinces={provinces}
        onChange={(receiver) =>
          update({ receiver })
        }
        disabled={disabled || loading}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-textLight">
          Loại hàng
          <select
            value={value.serviceTypeId}
            onChange={(event) => {
              const serviceTypeId =
                Number(event.target.value);

              update({
                serviceTypeId,
                lightParcel: null,
              });
            }}
            disabled={disabled}
            className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text outline-none focus:border-primary"
          >
            <option value={2}>
              Hàng nhẹ
            </option>

            <option value={5}>
              Hàng nặng
            </option>
          </select>
        </label>

        <label className="text-xs font-bold text-textLight">
          Quy định kiểm tra hàng
          <select
            value={value.requiredNote}
            onChange={(event) =>
              update({
                requiredNote:
                  event.target.value,
              })
            }
            disabled={disabled}
            className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text outline-none focus:border-primary"
          >
            {GHN_REQUIRED_NOTES.map(
              (item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              ),
            )}
          </select>
        </label>
      </div>

      {Number(value.serviceTypeId) === 2 && (
        <div className="rounded-lg border border-primary/15 bg-white px-3 py-2.5 text-xs leading-5 text-textLight">
          Với hàng nhẹ, cân nặng và kích thước được máy chủ lấy
          từ thông tin sản phẩm hiện tại. Nếu sản phẩm thiếu dữ liệu,
          máy chủ sẽ từ chối tạo lịch GHN.
        </div>
      )}

      {Number(value.serviceTypeId) === 5 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-textLight">
              Kiện hàng nặng
            </p>

            <button
              type="button"
              onClick={addItem}
              disabled={disabled}
              className="rounded-lg border border-primary px-3 py-1.5 text-xs font-black text-primary hover:bg-primary/10 disabled:opacity-50"
            >
              Thêm kiện
            </button>
          </div>

          {value.items.map(
            (item, index) => (
              <div
                key={index}
                className="rounded-xl border border-border bg-white p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-black text-text">
                    Kiện {index + 1}
                  </p>

                  {value.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        removeItem(index)
                      }
                      disabled={disabled}
                      className="text-xs font-black text-error"
                    >
                      Xóa
                    </button>
                  )}
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="text-xs font-bold text-textLight sm:col-span-2">
                    Tên kiện
                    <input
                      value={item.name}
                      onChange={(event) =>
                        updateItem(
                          index,
                          "name",
                          event.target.value,
                        )
                      }
                      disabled={disabled}
                      className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </label>

                  <label className="text-xs font-bold text-textLight">
                    Số lượng
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(event) =>
                        updateItem(
                          index,
                          "quantity",
                          event.target.value,
                        )
                      }
                      disabled={disabled}
                      className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </label>

                  {[
                    ["weightGram", "Khối lượng (g)", 1600000],
                    ["lengthCm", "Dài (cm)", 200],
                    ["widthCm", "Rộng (cm)", 200],
                    ["heightCm", "Cao (cm)", 200],
                  ].map(
                    ([field, label, max]) => (
                      <label
                        key={field}
                        className="text-xs font-bold text-textLight"
                      >
                        {label}

                        <input
                          type="number"
                          min="1"
                          max={max}
                          step="1"
                          value={item[field]}
                          onChange={(event) =>
                            updateItem(
                              index,
                              field,
                              event.target.value,
                            )
                          }
                          disabled={disabled}
                          className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                      </label>
                    ),
                  )}
                </div>
              </div>
            ),
          )}
        </section>
      )}
    </section>
  );
};

export default GhnCollectionFields;