import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ROLES } from "../../constants/roles";
import { useAuth } from "../../hooks/useAuth";
import publicProfileApi from "../../services/apis/publicProfileApi";
import { getUserId } from "../../utils/authUtils";
import { hasSeenGuide, isNewAccount, markGuideSeen } from "../../utils/onboardingGuide";
import OnboardingGuideModal from "./OnboardingGuideModal";

/*
 * Hiện màn giới thiệu một lần sau lần đăng nhập đầu của tài khoản cá nhân /
 * doanh nghiệp mới. Ngày tham gia lấy từ hồ sơ công khai của chính mình.
 */
export default function OnboardingGuideHost() {
  const { pathname } = useLocation();
  const { user, isAuthenticated } = useAuth();
  const userId = getUserId(user);
  const role = user?.role;
  const isClient = role === ROLES.PERSONAL || role === ROLES.BUSINESS;
  const shouldCheck =
    isAuthenticated && isClient && Boolean(userId) && !pathname.startsWith("/auth");
  const [shownFor, setShownFor] = useState("");

  useEffect(() => {
    if (!shouldCheck || hasSeenGuide(userId)) {
      return undefined;
    }

    const controller = new AbortController();

    publicProfileApi
      .getProfile(userId, { signal: controller.signal })
      .then((profile) => profile.joinedAt)
      .catch(() => null)
      .then((joinedAt) => {
        if (controller.signal.aborted) return;

        if (isNewAccount(joinedAt)) {
          setShownFor(userId);
        } else {
          // Tài khoản cũ: không tải lại hồ sơ ở mỗi lần mở trang.
          markGuideSeen(userId);
        }
      });

    return () => controller.abort();
  }, [shouldCheck, userId]);

  const close = () => {
    markGuideSeen(userId);
    setShownFor("");
  };

  return (
    <OnboardingGuideModal
      open={shouldCheck && shownFor === userId}
      role={role === ROLES.BUSINESS ? "business" : "personal"}
      onClose={close}
    />
  );
}
