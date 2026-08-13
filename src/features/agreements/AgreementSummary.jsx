import {
  getAgreementStatusMeta,
  getAgreementTypeLabel,
  getDeliveryMethodLabel,
  getPaymentTypeLabel,
} from "../../constants/agreements";

const formatCurrency = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? `${amount.toLocaleString("vi-VN")} đ` : "—";
};

const formatDate = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const Detail = ({ label, value, wide }) => (
  <div className={wide ? "md:col-span-2" : ""}>
    <dt className="text-xs font-bold uppercase tracking-wide text-[#789092]">{label}</dt>
    <dd className="mt-1 whitespace-pre-line text-sm font-semibold leading-6 text-[#183F41]">{value || "—"}</dd>
  </div>
);

const AgreementSummary = ({ agreement }) => {
  const details = agreement.agreementDetails || {};
  const statusMeta = getAgreementStatusMeta(agreement.agreementStatus);
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#DCE8E5] bg-white p-5 shadow-[0_10px_30px_rgba(24,63,65,0.05)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4F8588]">Thỏa thuận giao dịch</p>
            <h2 className="mt-2 text-xl font-black text-[#183F41]">{getAgreementTypeLabel(agreement.agreementType)}</h2>
          </div>
          <span className={`rounded-full border px-3 py-1.5 text-xs font-black ${statusMeta.className}`}>{statusMeta.label}</span>
        </div>
        <dl className="mt-6 grid gap-5 md:grid-cols-2">
          <Detail label="Giá ban đầu" value={formatCurrency(agreement.initialPrice)} />
          <Detail label="Giá đã thống nhất" value={formatCurrency(agreement.finalPrice)} />
          <Detail label="Số lượng" value={agreement.quantity} />
          <Detail label="Thanh toán" value={getPaymentTypeLabel(agreement.paymentType)} />
          <Detail label="Tổng giá trị" value={formatCurrency(agreement.totalAmount)} />
          <Detail label="Phiên bản nội dung" value={`Lần ${details.revision || 1}`} />
        </dl>
      </section>

      <section className="rounded-2xl border border-[#DCE8E5] bg-white p-5 shadow-[0_10px_30px_rgba(24,63,65,0.05)] sm:p-6">
        <h3 className="font-black text-[#183F41]">Lịch hẹn và giao nhận</h3>
        <dl className="mt-5 grid gap-5 md:grid-cols-2">
          {agreement.agreementType === "Inspection" && <>
            <Detail label="Thời gian kiểm định" value={formatDate(details.inspectionDate)} />
            <Detail label="Địa chỉ kiểm định" value={details.inspectionAddress} />
          </>}
          <Detail label="Thời gian nhận hàng" value={formatDate(details.collectionDate)} />
          <Detail label="Phương thức giao nhận" value={getDeliveryMethodLabel(details.deliveryMethod)} />
          <Detail label="Địa chỉ lấy hàng" value={details.pickupAddress} />
          <Detail label="Địa chỉ nhận hàng" value={details.deliveryAddress} />
          <Detail label="Phí vận chuyển dự kiến" value={formatCurrency(agreement.estimatedShippingFee ?? details.estimatedShippingFee)} />
          <Detail label="Điều khoản" value={details.notes} wide />
        </dl>
      </section>

      <section className="rounded-2xl border border-[#DCE8E5] bg-white p-5 shadow-[0_10px_30px_rgba(24,63,65,0.05)] sm:p-6">
        <h3 className="font-black text-[#183F41]">Xác nhận của hai bên</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className={`rounded-xl border p-4 ${agreement.sellerConfirmedAt ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
            <p className="font-bold text-[#183F41]">Người bán</p>
            <p className="mt-1 text-sm text-[#68807F]">{agreement.sellerConfirmedAt ? `Đã xác nhận lúc ${formatDate(agreement.sellerConfirmedAt)}` : "Chưa xác nhận"}</p>
          </div>
          <div className={`rounded-xl border p-4 ${agreement.buyerConfirmedAt ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
            <p className="font-bold text-[#183F41]">Người mua</p>
            <p className="mt-1 text-sm text-[#68807F]">{agreement.buyerConfirmedAt ? `Đã xác nhận lúc ${formatDate(agreement.buyerConfirmedAt)}` : "Chưa xác nhận"}</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AgreementSummary;