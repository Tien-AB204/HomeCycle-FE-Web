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

  requestReschedule: async (appointmentId, proposedAt) => {
    const id = String(appointmentId || "").trim();
    if (!id) throw new Error("Không tìm thấy mã lịch hẹn.");

    const date = new Date(proposedAt);
    if (Number.isNaN(date.getTime())) {
      throw new Error("Thời gian đề xuất không hợp lệ.");
    }

    return axiosClient.post(
      `/appointments/${encodeURIComponent(id)}/reschedule`,
      { proposedAt: date.toISOString() },
    );
  },

  acceptReschedule: async (proposalAppointmentId) => {
    const id = String(proposalAppointmentId || "").trim();
    if (!id) throw new Error("Không tìm thấy đề xuất đổi lịch.");

    return axiosClient.post(
      `/appointments/${encodeURIComponent(id)}/reschedule/accept`,
    );
  },

  rejectReschedule: async (proposalAppointmentId, reason = "") => {
    const id = String(proposalAppointmentId || "").trim();
    if (!id) throw new Error("Không tìm thấy đề xuất đổi lịch.");

    return axiosClient.post(
      `/appointments/${encodeURIComponent(id)}/reschedule/reject`,
      { reason: String(reason || "").trim() || null },
    );
  },

  cancel: async (appointmentId, reason) => {
    const id = String(appointmentId || "").trim();
    if (!id) throw new Error("Không tìm thấy mã lịch hẹn.");

    const normalizedReason = String(reason || "").trim();
    if (!normalizedReason) {
      throw new Error("Vui lòng nhập lý do hủy lịch hẹn.");
    }

    return axiosClient.post(
      `/appointments/${encodeURIComponent(id)}/cancel`,
      { reason: normalizedReason },
    );
  },
};

export default appointmentApi;
