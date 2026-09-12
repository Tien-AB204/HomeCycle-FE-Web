import {
  useContext,
} from "react";
import ChatRealtimeContext from "../contexts/chat-realtime-context";

export const useChatRealtime = () => {
  const context =
    useContext(
      ChatRealtimeContext,
    );

  if (!context) {
    throw new Error(
      "useChatRealtime phải được dùng bên trong ChatRealtimeProvider.",
    );
  }

  return context;
};

export default useChatRealtime;
