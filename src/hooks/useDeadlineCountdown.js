import { useEffect, useRef, useState } from "react";
import { parseServerDate, serverNow } from "../utils/serverClock";

/*
 * Đếm ngược tới hạn do Backend trả (responseDeadlineAt, paymentDeadlineAt...).
 * onExpire chạy đúng một lần cho mỗi hạn, kể cả khi mở màn lúc hạn đã qua,
 * để màn hình tải lại trạng thái mới.
 */
export const useDeadlineCountdown = (deadline, onExpire) => {
  const deadlineMs = parseServerDate(deadline);
  const [now, setNow] = useState(() => serverNow());
  const onExpireRef = useRef(onExpire);
  const expiredForRef = useRef(null);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (deadlineMs === null) {
      return undefined;
    }

    const tick = () => {
      const current = serverNow();
      setNow(current);
      return current;
    };

    if (tick() >= deadlineMs) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      if (tick() >= deadlineMs) {
        window.clearInterval(timer);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [deadlineMs]);

  const remainingMs =
    deadlineMs === null ? null : Math.max(0, deadlineMs - now);
  const isExpired = remainingMs === 0;

  useEffect(() => {
    if (!isExpired || deadlineMs === null) {
      return;
    }

    if (expiredForRef.current === deadlineMs) {
      return;
    }

    expiredForRef.current = deadlineMs;
    onExpireRef.current?.();
  }, [deadlineMs, isExpired]);

  return {
    hasDeadline: deadlineMs !== null,
    remainingMs,
    isExpired,
  };
};

/*
 * Một bộ đếm theo giờ server dùng chung cho cả danh sách, thay vì mỗi thẻ
 * một setInterval.
 */
export const useServerNowTicker = (active = true) => {
  const [now, setNow] = useState(() => serverNow());

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const timer = window.setInterval(() => setNow(serverNow()), 1000);

    return () => window.clearInterval(timer);
  }, [active]);

  return now;
};

export const remainingUntil = (deadline, now) => {
  const deadlineMs = parseServerDate(deadline);
  return deadlineMs === null ? null : Math.max(0, deadlineMs - now);
};
