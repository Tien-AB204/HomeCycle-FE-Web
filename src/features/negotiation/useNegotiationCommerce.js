import { useEffect, useState } from "react";
import agreementApi from "../../services/apis/agreementApi";
import orderApi from "../../services/apis/orderApi";
import { isCanceledRequest } from "../../utils/apiError";
import { pickCurrentAppointment } from "./negotiationSession";

const EMPTY = Object.freeze({
  preview: null,
  agreement: null,
  orderId: "",
  appointmentId: "",
});

const isConfirmedAgreement = (agreement) =>
  ["confirmed", "2"].includes(
    String(agreement?.agreementStatus ?? "").trim().toLowerCase(),
  );

/*
 * Hợp đồng, đơn hàng và lịch hẹn gắn với phiên để hiện thẻ ngay trong chat.
 * Có hợp đồng hay không do API preview quyết định (hasAgreement), không dựa
 * vào trạng thái phiên. Đơn và lịch hẹn chỉ có sau khi hợp đồng đã thanh toán.
 */
export const useNegotiationCommerce = (negotiationId, negotiationStatus, version) => {
  const enabled = Boolean(negotiationId && negotiationStatus) &&
    negotiationStatus !== "Open";
  const requestKey = enabled ? `${negotiationId}:${negotiationStatus}:${version}` : "";
  const [state, setState] = useState({ key: "", data: EMPTY });

  useEffect(() => {
    if (!requestKey) {
      return undefined;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const load = async () => {
      const preview = await agreementApi.getPreview(negotiationId, { signal });

      if (!preview?.hasAgreement || !preview?.agreementId) {
        return { ...EMPTY, preview };
      }

      const agreement = await agreementApi
        .getById(preview.agreementId, { signal })
        .catch((error) => {
          if (isCanceledRequest(error)) throw error;
          return null;
        });

      if (!isConfirmedAgreement(agreement)) {
        return { ...EMPTY, preview, agreement };
      }

      try {
        const orderRef = await orderApi.getByAgreementId(preview.agreementId, { signal });
        const detail = await orderApi.getById(orderRef.orderId, { signal });

        return {
          preview,
          agreement,
          orderId: String(orderRef.orderId),
          appointmentId: String(
            pickCurrentAppointment(detail?.appointments)?.appointmentId || "",
          ),
        };
      } catch (error) {
        if (isCanceledRequest(error)) throw error;
        return { ...EMPTY, preview, agreement };
      }
    };

    load()
      .then((data) => setState({ key: requestKey, data }))
      .catch((error) => {
        if (!isCanceledRequest(error)) setState({ key: requestKey, data: EMPTY });
      });

    return () => controller.abort();
  }, [negotiationId, requestKey]);

  // Giữ dữ liệu cũ của cùng phiên trong lúc tải lại để thẻ không nhấp nháy.
  return enabled && state.key.startsWith(`${negotiationId}:`) ? state.data : EMPTY;
};

export default useNegotiationCommerce;
