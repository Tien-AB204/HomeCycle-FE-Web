import {
  APPOINTMENT_PERSPECTIVE,
  APPOINTMENT_TYPE,
} from "../../constants/appointments";
import axiosClient from "./axiosClient";

const ensureEnumValue = (value, allowedValues, message) => {
  if (!allowedValues.includes(value)) throw new Error(message);
  return value;
};

export const appointmentApi = {
  getAll: async ({
    perspective = APPOINTMENT_PERSPECTIVE.BUYER,
    type = APPOINTMENT_TYPE.INSPECTION,
    keyword = "",
    status = "",
    pageNumber = 1,
    pageSize = 10,
    signal,
  } = {}) => {
    const rolePath = ensureEnumValue(
      perspective,
      Object.values(APPOINTMENT_PERSPECTIVE),
      "Vai trò lịch hẹn không hợp lệ.",
    );
    const typePath = ensureEnumValue(
      type,
      Object.values(APPOINTMENT_TYPE),
      "Loại lịch hẹn không hợp lệ.",
    );
    const params = { PageNumber: pageNumber, PageSize: pageSize };
    if (String(keyword || "").trim()) params.Keyword = String(keyword).trim();
    if (status !== "" && status !== null && status !== undefined) params.Status = status;

    const response = await axiosClient.get(`/appointments/${rolePath}/${typePath}`, {
      params,
      signal,
    });
    return {
      items: Array.isArray(response?.items) ? response.items : [],
      pageNumber: response?.pageNumber ?? pageNumber,
      pageSize: response?.pageSize ?? pageSize,
      totalCount: response?.totalCount ?? 0,
      totalPages: response?.totalPages ?? 0,
      hasPreviousPage: Boolean(response?.hasPreviousPage),
      hasNextPage: Boolean(response?.hasNextPage),
    };
  },

  getById: async (appointmentId, { signal } = {}) => {
    const id = String(appointmentId || "").trim();
    if (!id) throw new Error("Không tìm thấy mã lịch hẹn.");
    return axiosClient.get(`/appointments/${encodeURIComponent(id)}`, { signal });
  },

  checkIn: async (appointmentId) => {
    const id = String(appointmentId || "").trim();
    if (!id) throw new Error("Không tìm thấy mã lịch hẹn.");
    return axiosClient.post(`/appointments/${encodeURIComponent(id)}/check-in`);
  },
};

export default appointmentApi;
