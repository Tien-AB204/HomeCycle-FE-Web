import axios from "axios";

const BANK_DIRECTORY_URL =
  "https://api.vietqr.io/v2/banks";

const CACHE_KEY =
  "homecycle:vietqr-banks";

const CACHE_DURATION =
  24 * 60 * 60 * 1000;

let bankRequestPromise = null;

const readCache = () => {
  try {
    const rawCache =
      localStorage.getItem(CACHE_KEY);

    if (!rawCache) {
      return null;
    }

    const cachedData =
      JSON.parse(rawCache);

    if (
      !Array.isArray(
        cachedData?.banks,
      ) ||
      Date.now() >
        cachedData.expiresAt
    ) {
      localStorage.removeItem(
        CACHE_KEY,
      );

      return null;
    }

    return cachedData.banks;
  } catch {
    localStorage.removeItem(
      CACHE_KEY,
    );

    return null;
  }
};

const writeCache = (banks) => {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        banks,
        expiresAt:
          Date.now() + CACHE_DURATION,
      }),
    );
  } catch {
    /*
     * Cache không ảnh hưởng tới chức năng chính.
     */
  }
};

const normalizeBanks = (banks) => {
  return banks
    .filter(
      (bank) =>
        bank?.name &&
        bank?.bin,
    )
    .map((bank) => ({
      id: String(
        bank.id || bank.bin,
      ),
      name: String(bank.name),
      code: String(
        bank.code || "",
      ),
      bin: String(bank.bin),
      shortName: String(
        bank.shortName || "",
      ),
      logo: String(
        bank.logo || "",
      ),
      transferSupported:
        Number(
          bank.transferSupported,
        ) === 1,
      lookupSupported:
        Number(
          bank.lookupSupported,
        ) === 1,
    }))
    .sort((firstBank, secondBank) =>
      firstBank.shortName.localeCompare(
        secondBank.shortName,
        "vi",
      ),
    );
};

export const bankDirectoryService = {
  getBanks: async ({
    forceRefresh = false,
  } = {}) => {
    if (!forceRefresh) {
      const cachedBanks =
        readCache();

      if (cachedBanks) {
        return cachedBanks;
      }
    }

    if (!bankRequestPromise) {
      bankRequestPromise = axios
        .get(BANK_DIRECTORY_URL, {
          timeout: 15000,
        })
        .then((response) => {
          const responseData =
            response?.data;

          if (
            responseData?.code !==
              "00" ||
            !Array.isArray(
              responseData?.data,
            )
          ) {
            throw new Error(
              responseData?.desc ||
                "Danh sách ngân hàng không hợp lệ.",
            );
          }

          const banks =
            normalizeBanks(
              responseData.data,
            );

          if (banks.length === 0) {
            throw new Error(
              "Không tìm thấy ngân hàng nào.",
            );
          }

          writeCache(banks);

          return banks;
        })
        .finally(() => {
          bankRequestPromise = null;
        });
    }

    return bankRequestPromise;
  },

  clearCache: () => {
    localStorage.removeItem(
      CACHE_KEY,
    );
  },
};