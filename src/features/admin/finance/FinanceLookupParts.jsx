import { useEffect, useRef } from "react";

/*
 * Khối dùng chung cho các tab tra cứu (thanh toán, giao dịch, tiền đơn giữ,
 * tạm giữ): nhãn trạng thái, phân trang và hộp thoại chi tiết chỉ xem.
 */
export function StatusTag({ children, warning = false }) {
  return <span className={`status-tag${warning ? " warning" : ""}`}>{children}</span>;
}

export function Pager({ summary, pageNumber, totalPages, loading = false, onChange }) {
  return (
    <div className="row pagination">
      <span aria-live="polite">{summary}</span>
      {totalPages > 1 && (
        <div>
          <button type="button" disabled={pageNumber <= 1 || loading} onClick={() => onChange(pageNumber - 1)}>Trước</button>{" "}
          <span>{pageNumber} / {totalPages}</span>{" "}
          <button type="button" disabled={pageNumber >= totalPages || loading} onClick={() => onChange(pageNumber + 1)}>Sau</button>
        </div>
      )}
    </div>
  );
}

// record: { title, rows: [[label, value]] } hoặc null để đóng.
export function RecordDialog({ record, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (record && !dialog.open) dialog.showModal();
    if (!record && dialog.open) dialog.close();
  }, [record]);

  return (
    <dialog
      ref={dialogRef}
      className="record-dialog"
      onClose={onClose}
      onClick={(event) => event.target === dialogRef.current && onClose()}
    >
      {record && (
        <>
          <div className="modalhead row">
            <h2>{record.title}</h2>
            <button type="button" onClick={onClose}>Đóng</button>
          </div>
          <div className="modalbody">
            {record.rows.map(([label, value]) => (
              <div className="summaryrow" key={label}>
                <span>{label}</span>
                <strong>{value ?? "—"}</strong>
              </div>
            ))}
            <p className="footnote">Chỉ xem thông tin, không thay đổi dữ liệu.</p>
          </div>
        </>
      )}
    </dialog>
  );
}
