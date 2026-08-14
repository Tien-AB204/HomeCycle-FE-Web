import {
  useEffect,
  useMemo,
  useState,
} from "react";
import provinceApi from "../../services/apis/provinceApi";

const normalizeText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^(tinh|thanh pho)\s+/, "")
    .trim();

const selectClass =
  "w-full rounded-xl border border-[#CDDED9] bg-white px-3 py-3 text-sm text-[#183436] outline-none transition focus:border-[#4F8588] focus:ring-4 focus:ring-[#5F9291]/10 disabled:cursor-wait disabled:bg-[#F5F8F7]";

const FieldLabel = ({
  htmlFor,
  children,
  required,
}) => (
  <label
    htmlFor={htmlFor}
    className="mb-1.5 block text-xs font-black uppercase tracking-wide text-[#607B7A]"
  >
    {children}
    {required && (
      <span className="text-red-500">
        {" "}*
      </span>
    )}
  </label>
);

export default function BusinessAddressFields({
  idPrefix,
  city,
  ward,
  street,
  streetLabel = "Địa chỉ chi tiết",
  onChange,
  required = true,
}) {
  const [provinces, setProvinces] =
    useState([]);
  const [wards, setWards] =
    useState([]);
  const [provinceCode, setProvinceCode] =
    useState("");
  const [isLoading, setIsLoading] =
    useState(true);
  const [error, setError] =
    useState("");

  useEffect(() => {
    let isActive = true;

    provinceApi
      .getProvinces()
      .then((items) => {
        if (!isActive) return;

        const nextItems = Array.isArray(
          items,
        )
          ? items
          : [];

        setProvinces(nextItems);

        const matchingProvince =
          nextItems.find(
            (item) =>
              normalizeText(item.name) ===
              normalizeText(city),
          );

        if (matchingProvince) {
          setProvinceCode(
            String(matchingProvince.code),
          );
        }
      })
      .catch((loadError) => {
        if (!isActive) return;
        setError(
          loadError?.message ||
            "Không thể tải tỉnh thành.",
        );
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [city]);

  useEffect(() => {
    if (!provinceCode) {
      return undefined;
    }

    let isActive = true;

    provinceApi
      .getProvinceWithWards(provinceCode)
      .then((province) => {
        if (!isActive) return;
        setWards(
          Array.isArray(province?.wards)
            ? province.wards
            : [],
        );
      })
      .catch((loadError) => {
        if (!isActive) return;
        setWards([]);
        setError(
          loadError?.message ||
            "Không thể tải phường xã.",
        );
      });

    return () => {
      isActive = false;
    };
  }, [provinceCode]);

  const selectedProvince = useMemo(
    () =>
      provinces.find(
        (item) =>
          String(item.code) ===
          provinceCode,
      ) || null,
    [provinceCode, provinces],
  );

  const handleProvinceChange = (event) => {
    const nextCode = event.target.value;
    const province = provinces.find(
      (item) =>
        String(item.code) === nextCode,
    );

    setProvinceCode(nextCode);
    setWards([]);
    setError("");
    onChange({
      city: province?.name || "",
      ward: "",
      street,
    });
  };

  return (
    <>
      <div>
        <FieldLabel
          htmlFor={`${idPrefix}-city`}
          required={required}
        >
          Tỉnh / thành phố
        </FieldLabel>

        <select
          id={`${idPrefix}-city`}
          value={provinceCode}
          onChange={handleProvinceChange}
          required={required}
          disabled={isLoading}
          className={selectClass}
        >
          <option value="">
            {isLoading
              ? "Đang tải tỉnh thành..."
              : city || "Chọn tỉnh / thành phố"}
          </option>

          {provinces.map((province) => (
            <option
              key={province.code}
              value={province.code}
            >
              {province.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <FieldLabel
          htmlFor={`${idPrefix}-ward`}
          required={required}
        >
          Phường / xã
        </FieldLabel>

        <select
          id={`${idPrefix}-ward`}
          value={ward}
          onChange={(event) =>
            onChange({
              city:
                selectedProvince?.name ||
                city,
              ward: event.target.value,
              street,
            })
          }
          required={required}
          disabled={!provinceCode}
          className={selectClass}
        >
          <option value="">
            {provinceCode
              ? "Chọn phường / xã"
              : "Chọn tỉnh thành trước"}
          </option>

          {ward &&
            !wards.some(
              (item) => item.name === ward,
            ) && (
              <option value={ward}>
                {ward}
              </option>
            )}

          {wards.map((wardItem) => (
            <option
              key={wardItem.code}
              value={wardItem.name}
            >
              {wardItem.name}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <FieldLabel
          htmlFor={`${idPrefix}-street`}
          required={required}
        >
          {streetLabel}
        </FieldLabel>

        <input
          id={`${idPrefix}-street`}
          type="text"
          value={street}
          onChange={(event) =>
            onChange({
              city:
                selectedProvince?.name ||
                city,
              ward,
              street: event.target.value,
            })
          }
          required={required}
          placeholder="Số nhà, tên đường..."
          className={selectClass}
        />

        {error && (
          <p
            role="alert"
            className="mt-1.5 text-xs text-red-600"
          >
            {error}
          </p>
        )}
      </div>
    </>
  );
}
