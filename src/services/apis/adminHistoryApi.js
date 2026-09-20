import { createAppointmentReadApi } from "./moderatorAppointmentApi";
import { createDisputeReadApi } from "./moderatorDisputeApi";
import { createOrderReadApi } from "./moderatorOrderApi";

const ADMIN_DASHBOARD = "/admin/dashboard";

export const adminOrderHistoryApi = createOrderReadApi({
  listPath: `${ADMIN_DASHBOARD}/orders/history`,
  detailPath: `${ADMIN_DASHBOARD}/orders`,
});

const appointmentReadApi = createAppointmentReadApi({
  listPath: `${ADMIN_DASHBOARD}/appointments/history`,
  detailPath: `${ADMIN_DASHBOARD}/appointments`,
});

// Admin chỉ có lịch sử/chi tiết lịch hẹn, không có endpoint biên bản kiểm định.
export const adminAppointmentHistoryApi = {
  getAppointments: appointmentReadApi.getAppointments,
  getAppointmentById: appointmentReadApi.getAppointmentById,
};

export const adminDisputeHistoryApi = createDisputeReadApi({
  listPath: `${ADMIN_DASHBOARD}/disputes/history`,
  detailPath: `${ADMIN_DASHBOARD}/disputes`,
});
