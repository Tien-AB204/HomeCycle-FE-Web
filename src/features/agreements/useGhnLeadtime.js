import { useEffect, useMemo, useState } from "react";
import agreementApi from "../../services/apis/agreementApi";
import { getGhnTotalWeightGram } from "../appointments/ghnCollectionUtils";
import { getApiErrorMessage, isCanceledRequest } from "../../utils/apiError";

const MAX_WEIGHT_GRAM = 50000;
const REQUEST_DELAY_MS = 400;

const toPositiveInteger = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : 0;
};

/*
 * Payload cho ghn-leadtime từ thông tin giao nhận hiện tại; null khi chưa
 * chọn quận/phường người nhận.
 */
const buildLeadtimePayload = ({ agreementType, deliveryMethod, ghnInfo }) => {
  const receiver = ghnInfo?.receiver?.address;
  const toDistrictId = toPositiveInteger(receiver?.districtId);
  const toWardCode = String(receiver?.wardCode || "").trim();

  if (!toDistrictId || !toWardCode) {
    return null;
  }

  const payload = {
    agreementType,
    deliveryMethod,
    toDistrictId,
    toWardCode,
  };

  const serviceTypeId = Number(ghnInfo?.serviceTypeId);
  if (serviceTypeId === 2 || serviceTypeId === 5) {
    payload.serviceTypeId = serviceTypeId;
  }

  const sender = ghnInfo?.sender?.address;
  const fromDistrictId = toPositiveInteger(sender?.districtId);
  const fromWardCode = String(sender?.wardCode || "").trim();
  if (fromDistrictId && fromWardCode) {
    payload.fromDistrictId = fromDistrictId;
    payload.fromWardCode = fromWardCode;
  }

  const items = Array.isArray(ghnInfo?.items) ? ghnInfo.items : [];
  const weightGram = getGhnTotalWeightGram(items);
  if (weightGram > 0 && weightGram <= MAX_WEIGHT_GRAM) {
    payload.weightGram = weightGram;
  }

  const parcel = items[0];
  const lengthCm = toPositiveInteger(parcel?.lengthCm);
  const widthCm = toPositiveInteger(parcel?.widthCm);
  const heightCm = toPositiveInteger(parcel?.heightCm);
  if (lengthCm && widthCm && heightCm) {
    Object.assign(payload, { lengthCm, widthCm, heightCm });
  }

  return payload;
};

/*
 * Ngày dự kiến giao của GHN, cập nhật sau mỗi lần đổi địa chỉ hoặc kiện
 * hàng (chờ người dùng ngừng sửa một chút rồi mới gọi API).
 */
export const useGhnLeadtime = ({
  enabled,
  negotiationId,
  agreementType,
  deliveryMethod,
  ghnInfo,
}) => {
  const payload = useMemo(
    () =>
      enabled && negotiationId
        ? buildLeadtimePayload({ agreementType, deliveryMethod, ghnInfo })
        : null,
    [agreementType, deliveryMethod, enabled, ghnInfo, negotiationId],
  );
  const requestKey = payload ? JSON.stringify(payload) : "";
  const [state, setState] = useState({ key: "", data: null, error: "" });

  useEffect(() => {
    if (!requestKey) {
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      agreementApi
        .getGhnLeadtime(negotiationId, JSON.parse(requestKey), {
          signal: controller.signal,
        })
        .then((response) => {
          const data = response?.data ?? response;

          if (!Number.isFinite(Date.parse(data?.expectedDeliveryAt))) {
            throw new Error("Chưa lấy được thời gian dự kiến từ GHN.");
          }

          setState({ key: requestKey, data, error: "" });
        })
        .catch((error) => {
          if (controller.signal.aborted || isCanceledRequest(error)) {
            return;
          }

          setState({
            key: requestKey,
            data: null,
            error: getApiErrorMessage(
              error,
              "Chưa lấy được thời gian dự kiến từ GHN.",
            ),
          });
        });
    }, REQUEST_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [negotiationId, requestKey]);

  const isCurrent = Boolean(requestKey) && state.key === requestKey;

  return {
    hasReceiverArea: Boolean(payload),
    isLoading: Boolean(requestKey) && !isCurrent,
    data: isCurrent ? state.data : null,
    error: isCurrent ? state.error : "",
  };
};
