const PROVINCE_API_BASE_URL = "https://provinces.open-api.vn/api/v2";

let provincesPromise;
const provinceDetails = new Map();

const request = async (path, { signal } = {}) => {
  const response = await fetch(`${PROVINCE_API_BASE_URL}${path}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error("Không thể tải dữ liệu tỉnh thành. Vui lòng thử lại.");
  }

  return response.json();
};

export const provinceApi = {
  getProvinces: ({ signal } = {}) => {
    if (!provincesPromise) {
      provincesPromise = request("/p/").catch((error) => {
        provincesPromise = undefined;
        throw error;
      });
    }

    if (!signal) return provincesPromise;

    return Promise.race([
      provincesPromise,
      new Promise((_, reject) => {
        signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), {
          once: true,
        });
      }),
    ]);
  },

  getProvinceWithWards: (provinceCode, { signal } = {}) => {
    const code = String(provinceCode || "").trim();
    if (!code) throw new Error("Vui lòng chọn tỉnh hoặc thành phố.");

    if (!provinceDetails.has(code)) {
      const detailPromise = request(`/p/${encodeURIComponent(code)}?depth=2`).catch((error) => {
        provinceDetails.delete(code);
        throw error;
      });
      provinceDetails.set(code, detailPromise);
    }

    const detailPromise = provinceDetails.get(code);
    if (!signal) return detailPromise;

    return Promise.race([
      detailPromise,
      new Promise((_, reject) => {
        signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), {
          once: true,
        });
      }),
    ]);
  },
};

export default provinceApi;