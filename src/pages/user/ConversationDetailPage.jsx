import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Modal } from "antd";
import { getNegotiationStatusMeta } from "../../constants/negotiations";
import { useChatRealtime } from "../../hooks/useChatRealtime";
import conversationApi from "../../services/apis/conversationApi";
import postApi from "../../services/apis/postApi";
import NegotiationRoomPage from "./NegotiationRoomPage";

const ConversationDetail = ({ conversationId }) => {
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState({ conversation: null, items: [], loading: true, error: "" });
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const [posts, setPosts] = useState({});
  const { subscribe, joinConversation, leaveConversation, reconnectVersion } = useChatRealtime();

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const conversation = await conversationApi.getConversationById(conversationId, { signal: controller.signal });
        const items = [];
        let pageNumber = 1;
        let page;
        do {
          page = await conversationApi.getNegotiations(conversationId, { pageNumber, pageSize: 50, signal: controller.signal });
          items.push(...page.items);
          pageNumber += 1;
        } while (page.hasNextPage && page.items.length > 0);
        if (!controller.signal.aborted) setState((previous) => ({ conversation, items, defaultId: previous.defaultId || conversation.latestNegotiationId || items[0]?.negotiationId, loading: false, error: "" }));
      } catch (error) {
        if (controller.signal.aborted || error?.code === "ERR_CANCELED") return;
        setState((previous) => ({ ...previous, loading: false, error: "Không thể tải hội thoại. Vui lòng thử lại." }));
      }
    };
    void load();
    return () => controller.abort();
  }, [conversationId, version, reconnectVersion]);

  useEffect(() => {
    let timer;
    void joinConversation(conversationId).catch(() => {});
    const update = (event) => {
      if (event?.conversationId && event.conversationId !== conversationId) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setVersion((value) => value + 1), 300);
    };
    const unsubscribe = subscribe("ConversationUpdated", update);
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
      void leaveConversation(conversationId);
    };
  }, [conversationId, subscribe, joinConversation, leaveConversation]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const ids = [...new Set(state.items.map((item) => item.postId).filter(Boolean))];
    ids.forEach((id) => {
      postApi.getById(id, { signal: controller.signal }).then((post) => {
        if (!controller.signal.aborted) setPosts((previous) => ({ ...previous, [id]: post }));
      }).catch(() => {});
    });
    return () => controller.abort();
  }, [open, state.items]);

  const selected = state.items.find((item) => item.negotiationId === params.get("negotiationId"))
    || state.items.find((item) => item.negotiationId === state.defaultId)
    || state.items[0];

  return (
    <section className="hc-conversation-page mx-auto w-full min-w-0 max-w-5xl pb-8">
      {!selected && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <Link to="/hop-thu" className="inline-flex items-center gap-2 font-bold text-primary">
          <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>Tin nhắn
        </Link>
      </div>}
      {state.loading && <p role="status" className="py-8 text-center">Đang tải hội thoại...</p>}
      {state.error && <div role="alert" className="mb-4 text-error">{state.error}<button type="button" className="ml-3 underline" onClick={() => setVersion((value) => value + 1)}>Thử lại</button></div>}
      {!state.loading && !state.error && !selected && <p className="py-8 text-center text-textLight">Chưa có phiên thương lượng nào.</p>}
      {selected && <NegotiationRoomPage key={selected.negotiationId} sessionId={selected.negotiationId} conversationId={conversationId} participant={state.conversation?.otherParticipant} embedded sessionCount={state.items.length} onOpenSessions={() => setOpen(true)} />}
      <Modal title="Phiên thương lượng" open={open} onCancel={() => setOpen(false)} footer={null}>
        <div className="max-h-[65vh] space-y-3 overflow-y-auto py-3">
          {state.items.map((item, index) => {
            const status = getNegotiationStatusMeta(item.negotiationStatus);
            const active = item.negotiationId === selected?.negotiationId;
            return (
              <button type="button" key={item.negotiationId} aria-pressed={active} onClick={() => {
                const next = new URLSearchParams(params);
                next.set("negotiationId", item.negotiationId);
                setParams(next);
                setOpen(false);
              }} className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left ${active ? "border-primary bg-primary/5" : "border-border"}`}>
                <span className="min-w-0 flex-1">
                  <span className="block break-words font-bold">{posts[item.postId]?.title || `Phiên ${index + 1}`}</span>
                  <span className="mt-1 block text-sm text-textLight">{status.label}{item.currentOfferPrice != null ? ` · ${Number(item.currentOfferPrice).toLocaleString("vi-VN")} đ` : ""}</span>
                  <span className="mt-1 block text-xs text-textLight">Số lượng: {item.currentOfferQuantity}</span>
                  {item.lastMessageAt && <span className="mt-1 block text-xs text-textLight">{new Date(item.lastMessageAt).toLocaleString("vi-VN")}</span>}
                  {item.unreadCount > 0 && <span className="text-xs font-bold text-primary">{item.unreadCount} chưa đọc</span>}
                </span>
                <span className="material-symbols-outlined shrink-0 text-primary" aria-hidden="true">{active ? "check_circle" : "chevron_right"}</span>
              </button>
            );
          })}
        </div>
      </Modal>
    </section>
  );
};

const ConversationDetailPage = () => {
  const { conversationId } = useParams();
  return <ConversationDetail key={conversationId} conversationId={conversationId} />;
};

export default ConversationDetailPage;
