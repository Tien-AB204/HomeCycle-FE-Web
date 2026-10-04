import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "antd";
import disputeApi from "../../services/apis/disputeApi";
import publicPlatformPolicyApi from "../../services/apis/publicPlatformPolicyApi";
import { getApiErrorCode, getApiErrorMessage } from "../../utils/apiError";
import {
  FILE_UPLOAD_CONTEXT,
  getFileUploadAccept,
  getFileUploadDescription,
  getFileUploadRule,
  validateFileAgainstRule,
} from "../../utils/fileUploadPolicy";

const DISPUTE_RESPONSE_MODE = Object.freeze({
  ACCEPT: "accept",
  REBUT: "rebut",
  STATEMENT: "statement",
});

// Backend DisputeResponseType: Accept = 1, Rebut = 2, Statement = 3.
const RESPONSE_TYPE_VALUE = {
  accept: 1,
  rebut: 2,
  statement: 3,
};

const MAX_IMAGES = 5;
const MIN_CONTENT = 10;
const MAX_CONTENT = 2000;

const COPY = {
  accept: {
    title: "Đồng ý với khiếu nại?",
    description:
      "Tranh chấp sẽ được giải quyết theo phương án bên khiếu nại đề xuất và không cần kiểm duyệt viên. Khi hai bên tự thống nhất, không bên nào bị trừ điểm uy tín.",
    placeholder: "Ghi chú thêm (không bắt buộc)",
    submit: "Đồng ý",
  },
  rebut: {
    title: "Phản biện khiếu nại",
    description:
      "Nêu lý do bạn không đồng ý. Sau khi gửi, tranh chấp được chuyển cho kiểm duyệt viên xem xét.",
    placeholder: "Nội dung phản biện (10–2000 ký tự)",
    submit: "Gửi phản biện",
  },
  statement: {
    title: "Gửi tường trình",
    description:
      "Giải thích những gì đã xảy ra với lịch hẹn. Kiểm duyệt viên sẽ dùng tường trình này cùng dữ liệu hệ thống khi xem xét.",
    placeholder: "Nội dung tường trình (10–2000 ký tự)",
    submit: "Gửi tường trình",
  },
};

const isTimeoutError = (error) =>
  error?.code === "ECONNABORTED" || (!error?.response && Boolean(error?.request));

const isAwaitingResponse = (detail) =>
  ["6", "awaitingresponse"].includes(
    String(detail?.status ?? "").replace(/[\s_-]/g, "").toLowerCase(),
  );

const ImagePreview = ({ file, onRemove, disabled }) => {
  const url = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  return (
    <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-border">
      <img src={url} alt={file.name} className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Bỏ ảnh ${file.name}`}
        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-text/70 text-xs font-black text-white"
      >
        ×
      </button>
    </div>
  );
};

/*
 * mode: "accept" | "rebut" | "statement"; null thì modal đóng.
 * onSubmitted(detail, mode) nhận chi tiết tranh chấp mới nhất.
 */
export default function DisputeResponseModal({
  disputeId,
  mode,
  onClose,
  onSubmitted,
}) {
  const [content, setContent] = useState("");
  const [images, setImages] = useState([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadRule, setUploadRule] = useState(null);
  const submitLockRef = useRef(false);
  const fileInputRef = useRef(null);

  const copy = COPY[mode] || COPY.rebut;
  const allowImages = mode !== DISPUTE_RESPONSE_MODE.ACCEPT;
  const requiresContent = mode !== DISPUTE_RESPONSE_MODE.ACCEPT;

  useEffect(() => {
    if (!mode || !allowImages) {
      return undefined;
    }

    const controller = new AbortController();

    publicPlatformPolicyApi
      .getFileUpload({ signal: controller.signal })
      .then((policy) =>
        setUploadRule(
          getFileUploadRule(policy, FILE_UPLOAD_CONTEXT.DISPUTE_EVIDENCE),
        ),
      )
      .catch(() => {
        if (!controller.signal.aborted) {
          setUploadRule(null);
        }
      });

    return () => controller.abort();
  }, [allowImages, mode]);

  const reset = () => {
    setContent("");
    setImages([]);
    setError("");
  };

  const close = () => {
    if (isSubmitting) {
      return;
    }

    reset();
    onClose();
  };

  const handleFilesSelected = (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    setError("");

    if (!selected.length) {
      return;
    }

    if (images.length + selected.length > MAX_IMAGES) {
      setError(`Tối đa ${MAX_IMAGES} ảnh minh chứng.`);
      return;
    }

    for (const file of selected) {
      const validationError = validateFileAgainstRule(
        file,
        uploadRule,
        `Ảnh ${file.name}`,
      );

      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setImages((current) => [...current, ...selected].slice(0, MAX_IMAGES));
  };

  const submit = async () => {
    if (submitLockRef.current) {
      return;
    }

    const trimmed = content.trim();

    if (requiresContent && trimmed.length < MIN_CONTENT) {
      setError(`Nội dung phải có ít nhất ${MIN_CONTENT} ký tự.`);
      return;
    }

    if (trimmed.length > MAX_CONTENT) {
      setError(`Nội dung không được vượt quá ${MAX_CONTENT} ký tự.`);
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setError("");

    const finish = (detail) => {
      reset();
      onSubmitted(detail, mode);
    };

    try {
      finish(
        await disputeApi.respond(disputeId, {
          responseType: RESPONSE_TYPE_VALUE[mode],
          content: trimmed,
          evidenceImages: allowImages ? images : [],
        }),
      );
    } catch (submitError) {
      /*
       * Hết thời gian chờ hoặc Backend báo không còn chờ phản hồi: lần gửi
       * trước có thể đã thành công. Đọc lại tranh chấp để xác nhận.
       */
      if (
        isTimeoutError(submitError) ||
        getApiErrorCode(submitError) === "DISPUTE_RESPONSE_NOT_ALLOWED"
      ) {
        try {
          const latest = await disputeApi.getById(disputeId);

          if (!isAwaitingResponse(latest)) {
            finish(latest);
            return;
          }
        } catch {
          // Không đọc lại được: giữ thông báo lỗi bên dưới.
        }
      }

      setError(
        getApiErrorMessage(submitError, "Không thể gửi phản hồi lúc này."),
      );
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={Boolean(mode)}
      title={copy.title}
      onCancel={close}
      mask={{ closable: !isSubmitting }}
      closable={!isSubmitting}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={close}
            disabled={isSubmitting}
            className="rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/10 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={isSubmitting}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? "Đang gửi..." : copy.submit}
          </button>
        </div>
      }
    >
      <p className="text-sm leading-6 text-textLight">{copy.description}</p>

      <textarea
        rows={5}
        value={content}
        onChange={(event) => {
          setContent(event.target.value);
          setError("");
        }}
        maxLength={MAX_CONTENT}
        disabled={isSubmitting}
        placeholder={copy.placeholder}
        className="mt-4 w-full resize-y rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-text outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
      />
      {requiresContent && (
        <p className="mt-1 text-right text-xs text-textLight">
          {content.trim().length}/{MAX_CONTENT}
        </p>
      )}

      {allowImages && (
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-text">Ảnh minh chứng</p>
            <p className="text-xs text-textLight">
              {images.length}/{MAX_IMAGES} · không bắt buộc
            </p>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {images.map((file, index) => (
              <ImagePreview
                key={`${file.name}-${file.lastModified}-${index}`}
                file={file}
                disabled={isSubmitting}
                onRemove={() =>
                  setImages((current) => current.filter((_, i) => i !== index))
                }
              />
            ))}
            {images.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || !uploadRule}
                className="flex h-20 w-20 flex-col items-center justify-center rounded-xl border border-dashed border-primary/50 text-xs font-bold text-primary transition hover:bg-primary/5 disabled:opacity-50"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 22 }}
                  aria-hidden="true"
                >
                  add_photo_alternate
                </span>
                Thêm ảnh
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-textLight">
            {getFileUploadDescription(uploadRule)}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={getFileUploadAccept(uploadRule)}
            onChange={handleFilesSelected}
            className="hidden"
          />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-error">
          {error}
        </p>
      )}
    </Modal>
  );
}
