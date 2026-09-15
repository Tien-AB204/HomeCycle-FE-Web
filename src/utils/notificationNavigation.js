import { ROLES } from "../constants/roles";
import offerApi from "../services/apis/offerApi";
import {
  normalizeNotificationTargetType,
} from "../services/apis/notificationApi";
import reviewApi from "../services/apis/reviewApi";
import { normalizeRole } from "./authUtils";

const EMPTY_GUID =
  "00000000-0000-0000-0000-000000000000";

export const NOTIFICATION_TARGET_META =
  Object.freeze({
    offer: { icon: "sell", label: "Đề nghị" },
    negotiation: { icon: "forum", label: "Thương lượng" },
    agreement: { icon: "description", label: "Thỏa thuận" },
    order: { icon: "receipt_long", label: "Đơn hàng" },
    dispute: { icon: "gavel", label: "Tranh chấp" },
    post: { icon: "article", label: "Bài đăng" },
    appointment: { icon: "calendar_month", label: "Lịch hẹn" },
    withdrawal: { icon: "account_balance_wallet", label: "Rút tiền" },
    businessProfile: { icon: "domain", label: "Hồ sơ doanh nghiệp" },
    personalProfile: { icon: "badge", label: "Hồ sơ cá nhân" },
    review: { icon: "reviews", label: "Đánh giá" },
  });

export const formatNotificationTime = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 1000),
  );
  if (seconds < 60) return "Vừa xong";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;

  return date.toLocaleDateString("vi-VN");
};

const getTarget = (item) => {
  const targetType = normalizeNotificationTargetType(item?.targetType);
  const targetId = String(item?.targetId || "").trim();

  if (
    !targetType ||
    !targetId ||
    targetId.toLowerCase() === EMPTY_GUID
  ) {
    throw new Error(
      "Thông báo này không có nội dung chi tiết để mở.",
    );
  }

  return { targetType, targetId };
};

const openModeratorTarget = ({ targetType, targetId, navigate }) => {
  if (targetType === "dispute") {
    navigate("/mod/disputes", {
      state: { notificationDisputeId: targetId },
    });
    return;
  }

  if (
    targetType === "businessProfile" ||
    targetType === "personalProfile"
  ) {
    navigate("/mod/verification", {
      state: {
        notificationProfileId: targetId,
        notificationProfileType: targetType,
      },
    });
    return;
  }

  throw new Error(
    "Thông báo này không có màn hình phù hợp với Kiểm duyệt viên.",
  );
};

const openClientTarget = async ({ targetType, targetId, navigate }) => {
  switch (targetType) {
    case "offer": {
      const offer = await offerApi.getById(targetId, {
        skipGlobalErrorPage: true,
      });
      const negotiationId = String(offer?.negotiationId || "").trim();
      navigate(
        negotiationId
          ? `/thuong-luong/${encodeURIComponent(negotiationId)}`
          : "/thuong-luong",
      );
      return;
    }

    case "negotiation":
      navigate(`/thuong-luong/${encodeURIComponent(targetId)}`);
      return;

    case "agreement":
      navigate(`/thoa-thuan/${encodeURIComponent(targetId)}`);
      return;

    case "order":
      navigate(`/don-hang/${encodeURIComponent(targetId)}`);
      return;

    case "dispute":
      navigate(`/tranh-chap/${encodeURIComponent(targetId)}`);
      return;

    case "post":
      navigate(`/posts/${encodeURIComponent(targetId)}`);
      return;

    case "appointment":
      navigate("/lich-hen", {
        state: { notificationAppointmentId: targetId },
      });
      return;

    case "withdrawal":
      navigate("/vi", {
        state: { notificationWithdrawalId: targetId },
      });
      return;

    case "businessProfile":
    case "personalProfile":
      navigate("/ho-so");
      return;

    case "review": {
      const review = await reviewApi.getById(targetId, {
        skipGlobalErrorPage: true,
      });
      const orderId = String(review?.orderId || "").trim();

      if (!orderId) {
        throw new Error("Không tìm thấy giao dịch của đánh giá này.");
      }

      navigate(`/don-hang/${encodeURIComponent(orderId)}`, {
        state: { notificationReviewId: targetId },
      });
      return;
    }

    default:
      throw new Error("Loại nội dung của thông báo chưa được hỗ trợ.");
  }
};

export const openNotificationTarget = async ({ item, userRole, navigate }) => {
  const { targetType, targetId } = getTarget(item);
  const role = normalizeRole(userRole);

  if (role === ROLES.MODERATOR) {
    openModeratorTarget({ targetType, targetId, navigate });
    return;
  }

  if (role === ROLES.ADMIN) {
    throw new Error(
      "Thông báo này không có màn hình phù hợp với Quản trị viên.",
    );
  }

  if (role !== ROLES.PERSONAL && role !== ROLES.BUSINESS) {
    throw new Error(
      "Bạn không có quyền mở nội dung của thông báo này.",
    );
  }

  await openClientTarget({ targetType, targetId, navigate });
};
