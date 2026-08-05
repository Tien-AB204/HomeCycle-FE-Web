import axiosClient from "./axiosClient";

export const modApi = {
  // ==========================================
  // 1. CÁ NHÂN (PERSONAL PROFILES)
  // ==========================================
  
  // Lấy danh sách chờ duyệt (có search keyword)
  getPendingPersonalProfiles: (keyword = "") => {
    return axiosClient.get("/moderator/personal-profiles/pending", {
      params: keyword ? { keyword } : {}
    });
  },

  // Lấy chi tiết 1 hồ sơ
  getPersonalProfileDetail: (personalProfileId) => {
    return axiosClient.get(`/moderator/personal-profiles/${personalProfileId}`);
  },

  // Phê duyệt hoặc Từ chối hồ sơ
  reviewPersonalProfile: (personalProfileId, decision, rejectReason = "") => {
    const payload = { decision };
    if (decision === "Unverified") {
      payload.rejectReason = rejectReason;
    }
    return axiosClient.post(`/moderator/personal-profiles/${personalProfileId}/review`, payload);
  },

  // ==========================================
  // 2. DOANH NGHIỆP (BUSINESS PROFILES)
  // ==========================================
  
  // Lấy danh sách chờ duyệt
  getPendingBusinessProfiles: (keyword = "") => {
    return axiosClient.get("/moderator/business-profiles/pending", {
      params: keyword ? { keyword } : {}
    });
  },

  // Lấy chi tiết 1 hồ sơ
  getBusinessProfileDetail: (id) => {
    return axiosClient.get(`/moderator/business-profiles/${id}`);
  },

  // Phê duyệt hoặc Từ chối hồ sơ 
  // (Lưu ý: Viết đúng 100% theo url trên hình Swagger, nếu backend yêu cầu truyền ID vào body thì bạn truyền ở biến payload này)
  reviewBusinessProfile: (payload) => {
    return axiosClient.post("/moderator/business-profiles/review", payload);
  }
};