import { useEffect, useMemo, useState } from "react";
import provinceApi from "../../services/apis/provinceApi";

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("vi-VN");

const findLocation = (items, currentName) => {
  const normalizedName = normalizeText(currentName);

  if (!normalizedName) {
    return null;
  }

  return (
    items.find(
      (item) =>
        normalizeText(item?.name) === normalizedName ||
        normalizeText(item?.codename) === normalizedName,
    ) || null
  );
};

const PostAddressFields = ({
  city,
  ward,
  streetAddress,
  errors = {},
  disabled = false,
  inputClassName = "",
  onChange,
}) => {
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);
  const [provinceCode, setProvinceCode] = useState("");
  const [wardCode, setWardCode] = useState("");
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingWards, setLoadingWards] = useState(false);
  const [loadError, setLoadError] = useState("");

  const selectedProvince = useMemo(
    () =>
      provinces.find(
        (province) => String(province.code) === String(provinceCode),
      ) || null,
    [provinceCode, provinces],
  );

  useEffect(() => {
    const controller = new AbortController();

    provinceApi
      .getProvinces({ signal: controller.signal })
      .then((items) => {
        const nextProvinces = Array.isArray(items) ? items : [];
        setProvinces(nextProvinces);

        const matchedProvince = findLocation(nextProvinces, city);
        setLoadingWards(Boolean(matchedProvince));
        setProvinceCode(matchedProvince ? String(matchedProvince.code) : "");
        setLoadError("");
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          setLoadError(
            error?.message || "Không thể tải danh sách tỉnh, thành phố.",
          );
        }
      })
      .finally(() => setLoadingProvinces(false));

    return () => controller.abort();
  }, [city]);

  useEffect(() => {
    if (!provinceCode) {
      return undefined;
    }

    const controller = new AbortController();
    provinceApi
      .getProvinceWithWards(provinceCode, { signal: controller.signal })
      .then((province) => {
        const nextWards = Array.isArray(province?.wards)
          ? province.wards
          : [];
        setWards(nextWards);

        const matchedWard = findLocation(nextWards, ward);
        setWardCode(matchedWard ? String(matchedWard.code) : "");
        setLoadError("");
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          setWards([]);
          setWardCode("");
          setLoadError(
            error?.message || "Không thể tải danh sách phường, xã.",
          );
        }
      })
      .finally(() => setLoadingWards(false));

    return () => controller.abort();
  }, [provinceCode, ward]);

  const handleProvinceChange = (event) => {
    const nextCode = event.target.value;
    const province = provinces.find(
      (item) => String(item.code) === String(nextCode),
    );

    setProvinceCode(nextCode);
    setWardCode("");
    setWards([]);
    setLoadError("");
    onChange("city", province?.name || "");
    onChange("ward", "");
  };

  const handleWardChange = (event) => {
    const nextCode = event.target.value;
    const selectedWard = wards.find(
      (item) => String(item.code) === String(nextCode),
    );

    setWardCode(nextCode);
    onChange("ward", selectedWard?.name || "");
  };

  return (
    <>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-[#183F41]">
          Tỉnh/Thành phố <span className="text-red-600">*</span>
        </span>
        <select
          value={provinceCode}
          onChange={handleProvinceChange}
          disabled={disabled || loadingProvinces}
          className={inputClassName}
          required
        >
          <option value="">
            {loadingProvinces
              ? "Đang tải tỉnh, thành phố..."
              : "Chọn Tỉnh/Thành phố"}
          </option>
          {provinces.map((province) => (
            <option key={province.code} value={province.code}>
              {province.name}
            </option>
          ))}
        </select>
        {errors.city && (
          <p className="mt-1.5 text-xs font-semibold text-red-600">
            {errors.city}
          </p>
        )}
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-[#183F41]">
          Phường/Xã <span className="text-red-600">*</span>
        </span>
        <select
          value={wardCode}
          onChange={handleWardChange}
          disabled={disabled || !selectedProvince || loadingWards}
          className={inputClassName}
          required
        >
          <option value="">
            {loadingWards
              ? "Đang tải phường, xã..."
              : selectedProvince
                ? "Chọn Phường/Xã"
                : "Chọn Tỉnh/Thành phố trước"}
          </option>
          {wards.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
        {errors.ward && (
          <p className="mt-1.5 text-xs font-semibold text-red-600">
            {errors.ward}
          </p>
        )}
      </label>

      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-sm font-semibold text-[#183F41]">
          Địa chỉ chi tiết <span className="text-red-600">*</span>
        </span>
        <input
          type="text"
          value={streetAddress}
          onChange={(event) => onChange("streetAddress", event.target.value)}
          disabled={disabled}
          placeholder="Số nhà, tên đường, tòa nhà..."
          className={inputClassName}
          required
        />
        {errors.streetAddress && (
          <p className="mt-1.5 text-xs font-semibold text-red-600">
            {errors.streetAddress}
          </p>
        )}
      </label>

      {loadError && (
        <p
          role="alert"
          className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
        >
          {loadError}
        </p>
      )}
    </>
  );
};

export default PostAddressFields;