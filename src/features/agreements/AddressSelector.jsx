import { useEffect, useMemo, useRef, useState } from "react";
import provinceApi from "../../services/apis/provinceApi";

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("vi-VN");

const removeAddressSuffix = (address, wardName, provinceName) => {
  const suffix = [wardName, provinceName].filter(Boolean).join(", ");
  if (!suffix) return address;

  const normalizedAddress = normalizeText(address);
  const normalizedSuffix = normalizeText(suffix);
  if (!normalizedAddress.endsWith(normalizedSuffix)) return "";

  return address.slice(0, address.length - suffix.length).replace(/,\s*$/, "").trim();
};

const AddressSelector = ({ id, label, value, onChange, error, required, inputClass }) => {
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);
  const [provinceCode, setProvinceCode] = useState("");
  const [wardCode, setWardCode] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingWards, setLoadingWards] = useState(false);
  const [loadError, setLoadError] = useState("");
  const initializedRef = useRef(false);
  const touchedRef = useRef(false);

  const selectedProvince = useMemo(
    () => provinces.find((item) => String(item.code) === String(provinceCode)),
    [provinceCode, provinces],
  );
  const selectedWard = useMemo(
    () => wards.find((item) => String(item.code) === String(wardCode)),
    [wardCode, wards],
  );

  useEffect(() => {
    const controller = new AbortController();

    provinceApi
      .getProvinces({ signal: controller.signal })
      .then((items) => {
        const nextProvinces = Array.isArray(items) ? items : [];
        setProvinces(nextProvinces);

        if (value && !initializedRef.current) {
          const normalizedAddress = normalizeText(value);
          const matchedProvince = nextProvinces.find((item) =>
            normalizedAddress.endsWith(normalizeText(item.name)),
          );
          if (matchedProvince) {
            setLoadingWards(true);
            setProvinceCode(String(matchedProvince.code));
          }
        }
      })
      .catch((requestError) => {
        if (requestError?.name !== "AbortError") {
          setLoadError(requestError?.message || "Không thể tải danh sách tỉnh thành.");
        }
      })
      .finally(() => setLoadingProvinces(false));

    return () => controller.abort();
  }, [value]);

  useEffect(() => {
    if (!provinceCode) return undefined;

    const controller = new AbortController();

    provinceApi
      .getProvinceWithWards(provinceCode, { signal: controller.signal })
      .then((province) => {
        const nextWards = Array.isArray(province?.wards) ? province.wards : [];
        setWards(nextWards);

        if (value && !initializedRef.current) {
          const provinceName = province?.name || selectedProvince?.name || "";
          const addressWithoutProvince = value
            .slice(0, value.length - provinceName.length)
            .replace(/,\s*$/, "")
            .trim();
          const normalizedAddress = normalizeText(addressWithoutProvince);
          const matchedWard = nextWards.find((item) =>
            normalizedAddress.endsWith(normalizeText(item.name)),
          );

          if (matchedWard) {
            setWardCode(String(matchedWard.code));
            setAddressDetail(removeAddressSuffix(value, matchedWard.name, provinceName));
          }
        }

        initializedRef.current = true;
      })
      .catch((requestError) => {
        if (requestError?.name !== "AbortError") {
          setLoadError(requestError?.message || "Không thể tải danh sách phường xã.");
        }
      })
      .finally(() => setLoadingWards(false));

    return () => controller.abort();
  }, [provinceCode, selectedProvince?.name, value]);

  useEffect(() => {
    if (!touchedRef.current) return;

    const detail = addressDetail.trim();
    const formattedAddress =
      detail && selectedWard?.name && selectedProvince?.name
        ? `${detail}, ${selectedWard.name}, ${selectedProvince.name}`
        : "";
    if (formattedAddress !== value) onChange(formattedAddress);
  }, [addressDetail, onChange, selectedProvince?.name, selectedWard?.name, value]);

  const handleProvinceChange = (event) => {
    touchedRef.current = true;
    setLoadingWards(Boolean(event.target.value));
    setLoadError("");
    setProvinceCode(event.target.value);
    setWardCode("");
    setAddressDetail("");
    setWards([]);
    onChange("");
  };

  const handleWardChange = (event) => {
    touchedRef.current = true;
    setWardCode(event.target.value);
    onChange("");
  };

  const handleDetailChange = (event) => {
    touchedRef.current = true;
    setAddressDetail(event.target.value);
  };

  return (
    <fieldset className="rounded-xl border border-[#DCE8E5] bg-[#FBFDFC] p-4">
      <legend className="px-1 text-sm font-bold text-[#183F41]">
        {label} {required && <span className="text-red-600">*</span>}
      </legend>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-[#526F6E]">
          Tỉnh/Thành phố
          <select
            id={`${id}-province`}
            value={provinceCode}
            onChange={handleProvinceChange}
            disabled={loadingProvinces}
            required={required}
            className={inputClass}
          >
            <option value="">{loadingProvinces ? "Đang tải..." : "Chọn Tỉnh/Thành phố"}</option>
            {provinces.map((province) => (
              <option key={province.code} value={province.code}>
                {province.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-bold text-[#526F6E]">
          Phường/Xã
          <select
            id={`${id}-ward`}
            value={wardCode}
            onChange={handleWardChange}
            disabled={!provinceCode || loadingWards}
            required={required}
            className={inputClass}
          >
            <option value="">
              {loadingWards ? "Đang tải..." : provinceCode ? "Chọn Phường/Xã" : "Chọn Tỉnh/Thành phố trước"}
            </option>
            {wards.map((ward) => (
              <option key={ward.code} value={ward.code}>
                {ward.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-3 block text-xs font-bold text-[#526F6E]">
        Địa chỉ chi tiết
        <input
          id={`${id}-detail`}
          value={addressDetail}
          onChange={handleDetailChange}
          required={required}
          placeholder="Số nhà, tên đường, tòa nhà..."
          className={inputClass}
        />
      </label>

      {value && !provinceCode && (
        <p className="mt-2 text-xs text-[#68807F]">
          Địa chỉ hiện tại: <span className="font-semibold text-[#183F41]">{value}</span>
        </p>
      )}
      {loadError && <p className="mt-2 text-xs font-semibold text-red-600">{loadError}</p>}
      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </fieldset>
  );
};

export default AddressSelector;