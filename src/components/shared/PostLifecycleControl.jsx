import { useId, useState } from "react";
import postApi from "../../services/apis/postApi";

const ACTIONS = {
  close: {
    buttonLabel: "Đóng bài",
    title: "Đóng bài đăng?",
    description:
      "Bài đăng sẽ không còn xuất hiện trên thị trường. Bạn vẫn có thể kích hoạt lại bài đăng sau này.",
    confirmLabel: "Đóng bài đăng",
    pendingLabel: "Đang đóng...",
    successMessage: "Đã đóng bài đăng thành công.",
    buttonClassName:
      "border border-error text-error hover:bg-error hover:text-white",
    confirmClassName:
      "bg-error text-white hover:bg-error",
  },
  reactivate: {
    buttonLabel: "Kích hoạt lại",
    title: "Kích hoạt lại bài đăng?",
    description:
      "Bài đăng sẽ hoạt động trở lại và có thể xuất hiện trên thị trường theo quy định của hệ thống.",
    confirmLabel: "Kích hoạt lại",
    pendingLabel: "Đang kích hoạt...",
    successMessage: "Đã kích hoạt lại bài đăng thành công.",
    buttonClassName:
      "border border-success text-success hover:bg-success hover:text-white",
    confirmClassName:
      "bg-success text-white hover:bg-success",
  },
  delete: {
    buttonLabel: "Xóa tin thu mua",
    title: "Xóa tin thu mua?",
    description:
      "Tin thu mua sẽ bị xóa khỏi hệ thống và không thể khôi phục. Tin có giao dịch chưa hoàn tất sẽ không thể xóa.",
    confirmLabel: "Xóa tin thu mua",
    pendingLabel: "Đang xóa...",
    successMessage: "Đã xóa tin thu mua.",
    buttonClassName:
      "border border-error text-error hover:bg-error hover:text-white",
    confirmClassName:
      "bg-error text-white hover:bg-error",
  },
};

const getErrorMessage = (error) => {
  const responseData = error?.response?.data;

  return (
    responseData?.error?.message ||
    responseData?.message ||
    error?.message ||
    "Không thể thay đổi trạng thái bài đăng."
  );
};

const getLifecycleActionName = (status) => {
  const normalizedStatus = String(status || "")
    .trim()
    .toLowerCase();

  if (normalizedStatus === "active") {
    return "close";
  }

  if (normalizedStatus === "closed") {
    return "reactivate";
  }

  return "";
};

const canDeleteBuyPost = (postType, status) => {
  if (String(postType || "").trim().toLowerCase() !== "buy") {
    return false;
  }

  const normalizedStatus = String(status || "").trim().toLowerCase();

  return normalizedStatus !== "deleted" && normalizedStatus !== "suspended";
};

const PostLifecycleControl = ({
  postId,
  postName,
  postType,
  status,
  onCompleted,
  fullWidth = false,
}) => {
  const titleId = useId();
  const [pendingAction, setPendingAction] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const lifecycleActionName = getLifecycleActionName(status);
  const showDelete = canDeleteBuyPost(postType, status);

  if (!postId || (!lifecycleActionName && !showDelete)) {
    return null;
  }

  const action = ACTIONS[pendingAction];

  const closeDialog = () => {
    if (isSubmitting) {
      return;
    }

    setError("");
    setPendingAction("");
  };

  const handleConfirm = async () => {
    if (isSubmitting || !pendingAction) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (pendingAction === "close") {
        await postApi.close(postId);
      } else if (pendingAction === "reactivate") {
        await postApi.reactivate(postId);
      } else {
        await postApi.deleteBuy(postId);
      }

      const message = ACTIONS[pendingAction].successMessage;
      setPendingAction("");
      onCompleted?.(message);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className={`flex flex-wrap gap-2 ${fullWidth ? "w-full" : ""}`}>
        {lifecycleActionName && (
          <button
            type="button"
            onClick={() => {
              setError("");
              setPendingAction(lifecycleActionName);
            }}
            className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-xs font-bold transition ${ACTIONS[lifecycleActionName].buttonClassName} ${
              fullWidth ? "w-full" : ""
            }`}
          >
            {ACTIONS[lifecycleActionName].buttonLabel}
          </button>
        )}

        {showDelete && (
          <button
            type="button"
            onClick={() => {
              setError("");
              setPendingAction("delete");
            }}
            className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-xs font-bold transition ${ACTIONS.delete.buttonClassName} ${
              fullWidth ? "w-full" : ""
            }`}
          >
            {ACTIONS.delete.buttonLabel}
          </button>
        )}
      </div>

      {Boolean(pendingAction) && action && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDialog();
            }
          }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-md rounded-xl bg-white p-6 text-left shadow-2xl"
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                  pendingAction === "reactivate"
                    ? "bg-success/10 text-success"
                    : "bg-error/10 text-error"
                }`}
              >
                <span className="material-symbols-outlined">
                  {pendingAction === "reactivate"
                    ? "play_circle"
                    : pendingAction === "delete"
                      ? "delete"
                      : "pause_circle"}
                </span>
              </div>

              <div className="min-w-0">
                <h2
                  id={titleId}
                  className="text-lg font-bold text-text"
                >
                  {action.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-textLight">
                  {action.description}
                </p>
                <p className="mt-2 line-clamp-2 text-sm font-semibold text-text">
                  {postName || "Bài đăng của bạn"}
                </p>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-error/20 bg-error/10 p-3 text-sm text-error"
              >
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDialog}
                disabled={isSubmitting}
                className="rounded-md border border-border px-4 py-2.5 text-sm font-bold text-text transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className={`inline-flex min-w-32 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${action.confirmClassName}`}
              >
                {isSubmitting && (
                  <span className="material-symbols-outlined animate-spin text-[18px]">
                    refresh
                  </span>
                )}
                {isSubmitting
                  ? action.pendingLabel
                  : action.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PostLifecycleControl;
