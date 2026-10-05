import axiosClient from "./axiosClient";
import { normalizePublicProfile } from "../../features/profile/publicProfile";

export const publicProfileApi = {
  getProfile: async (userId, { signal } = {}) => {
    const id = String(userId || "").trim();

    if (!id) {
      throw new Error("Không tìm thấy người dùng cần xem hồ sơ.");
    }

    const response = await axiosClient.get(
      `/auth/users/${encodeURIComponent(id)}/profile`,
      { signal, skipGlobalErrorPage: true },
    );

    return normalizePublicProfile(response);
  },
};

export default publicProfileApi;
