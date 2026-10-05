import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import useRealtimeRefresh from "../../hooks/useRealtimeRefresh";
import axiosClient from "../../services/apis/axiosClient";
import moderatorDisputeApi from "../../services/apis/moderatorDisputeApi";
import moderatorListingApi from "../../services/apis/moderatorListingApi";
import moderatorWithdrawalApi from "../../services/apis/moderatorWithdrawalApi";

const totalOf = (response) => {
  const source = response?.data ?? response;
  const total = Number(source?.totalCount);
  return Number.isFinite(total) ? total : null;
};

const lengthOf = (response) => {
  const source = response?.data ?? response;
  const items = Array.isArray(source) ? source : source?.items ?? source?.data;
  return Array.isArray(items) ? items.length : null;
};

const settle = (promise, read) => promise.then(read).catch(() => null);

/*
 * Số việc đang chờ trên menu Kiểm duyệt viên. Tải lại khi đổi trang (thường
 * là sau khi vừa xử lý một mục) và khi có sự kiện SignalR liên quan.
 * Mục nào lỗi thì không hiện số thay vì hiện 0.
 */
export default function useModQueueCounts() {
  const { pathname } = useLocation();
  const [counts, setCounts] = useState({});

  const load = useCallback(async () => {
    const page = { PageNumber: 1, PageSize: 1 };
    const [disputes, reviews, verificationPersonal, verificationBusiness, withdrawals, posts] = await Promise.all([
      settle(moderatorDisputeApi.getAll({ ...page, Status: "Pending" }), totalOf),
      settle(moderatorDisputeApi.getAll({ ...page, Status: "Pending", TargetType: 3 }), totalOf),
      settle(axiosClient.get("/moderator/personal-profiles/pending", { skipGlobalErrorPage: true }), lengthOf),
      settle(axiosClient.get("/moderator/business-profiles/pending", { skipGlobalErrorPage: true }), lengthOf),
      settle(moderatorWithdrawalApi.getWithdrawals({ status: "Pending", pageSize: 1 }), totalOf),
      settle(moderatorListingApi.getReportedPosts({ openOnly: true, pageSize: 1 }), totalOf),
    ]);
    const verification =
      verificationPersonal === null && verificationBusiness === null
        ? null
        : (verificationPersonal || 0) + (verificationBusiness || 0);
    setCounts({
      "/mod/disputes": disputes,
      "/mod/reviews": reviews,
      "/mod/verification": verification,
      "/mod/withdrawals": withdrawals,
      "/mod/posts": posts,
    });
  }, []);

  useEffect(() => {
    // Gọi sau một nhịp để không setState đồng bộ trong effect.
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, pathname]);

  useRealtimeRefresh(load, {
    notificationTargets: ["dispute", "personalProfile", "businessProfile", "withdrawal", "post", "review"],
    finance: (payload) => Boolean(payload.withdrawal),
    delay: 1200,
  });

  return counts;
}
