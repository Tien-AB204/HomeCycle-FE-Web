import {
  useContext,
} from "react";
import NotificationContext from "../contexts/notification-context";

export const useNotifications = () => {
  const context =
    useContext(
      NotificationContext,
    );

  if (!context) {
    throw new Error(
      "useNotifications phải được dùng bên trong NotificationProvider.",
    );
  }

  return context;
};

export default useNotifications;
