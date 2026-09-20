import { App } from "antd";
import { useCallback, useMemo } from "react";

export default function useActionToast() {
  const { notification } = App.useApp();

  const success = useCallback(
    (message, description) => {
      notification.success({
        placement: "topRight",
        message,
        description,
        duration: 3.5,
      });
    },
    [notification],
  );

  const error = useCallback(
    (message, description) => {
      notification.error({
        placement: "topRight",
        message,
        description,
        duration: 4.5,
      });
    },
    [notification],
  );

  return useMemo(() => ({ success, error }), [error, success]);
}
