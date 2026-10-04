import { useState } from "react";
import { Modal } from "antd";
import identityScanApi, {
  getIdentityScanErrorMessage,
  IDENTITY_SCAN_FIELD_LABELS,
} from "../../services/apis/identityScanApi";

const EMPTY_DRAFT = {
  identityNumber: "",
  fullName: "",
  dateOfBirth: "",
  address: "",
};

const INPUT_CLASS =
  "w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

const today = () => new Date().toISOString().slice(0, 10);

const isValidPastDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);

  return !Number.isNaN(date.getTime()) && value <= today();
};

const ActionButton = ({ primary, ...props }) => (
  <button
    type="button"
    className={
      primary
        ? "rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90"
        : "rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/10"
    }
    {...props}
  />
);

/*
 * Nút "Quét thông tin từ ảnh CCCD": hỏi đồng ý gửi ảnh cho dịch vụ AI, gọi
 * API quét, rồi cho người dùng đối chiếu và sửa trước khi điền vào form.
 *
 * target: "register" | "personal" | "business" (IDENTITY_SCAN_TARGETS).
 * onResult nhận các trường đã xác nhận; trường để trống là null.
 */
export default function IdentityScanPanel({
  target,
  registrationToken,
  frontFile,
  backFile,
  disabled = false,
  onResult,
}) {
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [state, setState] = useState({ kind: "idle" });
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [reviewError, setReviewError] = useState("");

  const hasBothImages = Boolean(frontFile && backFile);
  const canScan = Boolean(target) && hasBothImages && !disabled && !isScanning;

  const runScan = async () => {
    setIsConsentOpen(false);
    setIsScanning(true);
    setState({ kind: "idle" });

    try {
      const result = await identityScanApi.scan({
        target,
        registrationToken,
        frontFile,
        backFile,
      });

      setDraft({
        identityNumber: result.identityNumber ?? "",
        fullName: result.fullName ?? "",
        dateOfBirth: isValidPastDate(result.dateOfBirth ?? "")
          ? result.dateOfBirth
          : "",
        address: result.address ?? "",
      });
      setReviewError("");
      setState({ kind: "review", result });
    } catch (error) {
      setState({ kind: "error", text: getIdentityScanErrorMessage(error) });
    } finally {
      setIsScanning(false);
    }
  };

  const updateDraft = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setReviewError("");
  };

  const dismissReview = () => {
    setState({ kind: "idle" });
    setReviewError("");
  };

  const confirmReview = () => {
    const identityNumber = draft.identityNumber.trim();

    if (identityNumber && !/^\d{12}$/.test(identityNumber)) {
      setReviewError("Số CCCD phải gồm đúng 12 chữ số.");
      return;
    }

    if (draft.dateOfBirth && !isValidPastDate(draft.dateOfBirth)) {
      setReviewError("Ngày sinh chưa hợp lệ.");
      return;
    }

    const confirmed = {
      ...state.result,
      identityNumber: identityNumber || null,
      fullName: draft.fullName.trim() || null,
      dateOfBirth: draft.dateOfBirth || null,
      address: draft.address.trim() || null,
    };

    onResult(confirmed);
    setState({ kind: "done", result: confirmed });
  };

  const unreadable =
    state.kind === "review" ? new Set(state.result.unreadableFields) : new Set();

  const renderField = (field, label, input) => {
    const needsInput = unreadable.has(field) || !String(draft[field]).trim();

    return (
      <label className="block">
        <span className="mb-1 block text-xs font-bold text-textLight">
          {label}
        </span>
        {input(
          `${INPUT_CLASS} ${needsInput ? "border-warning bg-warning/5" : "border-border"}`,
        )}
        {needsInput && (
          <span className="mt-1 block text-xs font-semibold text-warning">
            Chưa đọc rõ, vui lòng nhập theo CCCD.
          </span>
        )}
      </label>
    );
  };

  const missingLabels =
    state.kind === "done"
      ? Object.keys(IDENTITY_SCAN_FIELD_LABELS)
          .filter((field) => !state.result[field])
          .map((field) => IDENTITY_SCAN_FIELD_LABELS[field])
      : [];

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsConsentOpen(true)}
        disabled={!canScan}
        className="inline-flex items-center gap-2 rounded-xl border border-primary bg-white px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 18 }}
          aria-hidden="true"
        >
          document_scanner
        </span>
        {isScanning ? "Đang đọc ảnh CCCD..." : "Quét thông tin từ ảnh CCCD"}
      </button>

      {!hasBothImages && (
        <p className="text-xs text-textLight">
          Chọn đủ ảnh mặt trước và mặt sau để quét tự động, hoặc tự nhập thông
          tin.
        </p>
      )}

      {state.kind === "error" && (
        <p
          role="alert"
          className="rounded-xl border border-error/20 bg-error/5 px-3 py-2 text-sm font-semibold text-error"
        >
          {state.text}
        </p>
      )}

      {state.kind === "done" && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm">
          <p className="font-bold text-text">
            Đã điền thông tin CCCD bạn vừa xác nhận
          </p>
          <p className="text-textLight">
            Bạn vẫn có thể sửa từng trường trước khi gửi.
          </p>
          {missingLabels.length > 0 && (
            <p className="mt-1 font-semibold text-warning">
              Còn thiếu: {missingLabels.join(", ")}. Vui lòng tự nhập hoặc tải
              ảnh rõ hơn.
            </p>
          )}
          {state.result.warnings.map((warning) => (
            <p key={warning} className="mt-1 font-semibold text-warning">
              {warning}
            </p>
          ))}
        </div>
      )}

      <Modal
        open={isConsentOpen}
        title="Đồng ý quét CCCD tự động?"
        onCancel={() => setIsConsentOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <ActionButton onClick={() => setIsConsentOpen(false)}>
              Tự nhập
            </ActionButton>
            <ActionButton primary onClick={() => void runScan()}>
              Đồng ý và quét
            </ActionButton>
          </div>
        }
      >
        <div className="space-y-3 text-sm leading-6 text-text">
          <p>
            Để điền nhanh số CCCD, họ tên, ngày sinh và địa chỉ, HomeCycle sẽ
            gửi hai ảnh CCCD của bạn tới dịch vụ AI bên ngoài (Google Gemini)
            để đọc chữ trên ảnh.
          </p>
          <p>
            Kết quả chỉ là gợi ý, không dùng để xác minh danh tính. Bạn vẫn
            phải tự kiểm tra và chịu trách nhiệm với thông tin gửi đi. Nếu
            không đồng ý, bạn có thể tự nhập.
          </p>
        </div>
      </Modal>

      <Modal
        open={state.kind === "review"}
        title="Kiểm tra thông tin trên CCCD"
        onCancel={dismissReview}
        footer={
          <div className="flex justify-end gap-2">
            <ActionButton onClick={dismissReview}>Bỏ qua, tự nhập</ActionButton>
            <ActionButton primary onClick={confirmReview}>
              Xác nhận
            </ActionButton>
          </div>
        }
      >
        <p className="mb-4 text-sm leading-6 text-textLight">
          Đối chiếu với CCCD của bạn. Thông tin đúng thì bấm Xác nhận, sai thì
          sửa trực tiếp rồi xác nhận.
        </p>
        <div className="space-y-3">
          {renderField("identityNumber", "Số CCCD", (className) => (
            <input
              value={draft.identityNumber}
              onChange={(event) =>
                updateDraft(
                  "identityNumber",
                  event.target.value.replace(/\D/g, "").slice(0, 12),
                )
              }
              inputMode="numeric"
              maxLength={12}
              placeholder="12 chữ số"
              className={className}
            />
          ))}
          {renderField("fullName", "Họ và tên", (className) => (
            <input
              value={draft.fullName}
              onChange={(event) =>
                updateDraft(
                  "fullName",
                  event.target.value.toLocaleUpperCase("vi-VN"),
                )
              }
              placeholder="Họ tên như trên CCCD"
              className={className}
            />
          ))}
          {renderField("dateOfBirth", "Ngày sinh", (className) => (
            <input
              type="date"
              value={draft.dateOfBirth}
              max={today()}
              onChange={(event) =>
                updateDraft("dateOfBirth", event.target.value)
              }
              className={className}
            />
          ))}
          {renderField("address", "Địa chỉ thường trú", (className) => (
            <textarea
              rows={2}
              value={draft.address}
              onChange={(event) => updateDraft("address", event.target.value)}
              placeholder="Địa chỉ như trên CCCD"
              className={`${className} resize-y`}
            />
          ))}
          {state.kind === "review" &&
            state.result.warnings.map((warning) => (
              <p key={warning} className="text-sm font-semibold text-warning">
                {warning}
              </p>
            ))}
          {reviewError && (
            <p role="alert" className="text-sm font-semibold text-error">
              {reviewError}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
