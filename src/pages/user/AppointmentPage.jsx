import { useCallback, useEffect, useState } from "react";
import {
  APPOINTMENT_PERSPECTIVE,
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_OPTIONS,
  APPOINTMENT_TYPE,
  getAppointmentStatusMeta,
} from "../../constants/appointments";
import { ROLES } from "../../constants/roles";
import { useAuth } from "../../hooks/useAuth";
import appointmentApi from "../../services/apis/appointmentApi";

const PAGE_SIZE = 10;
const getErrorMessage = (error, fallback = "Không thể xử lý lịch hẹn.") => error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || fallback;
const formatDate = (value) => {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date) : "Chưa xác định";
};

const AppointmentDetailModal = ({ appointmentId, perspective, onClose, onChanged }) => {
  const [state, setState] = useState({ loading: true, detail: null, error: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const loadDetail = useCallback(async () => {
    try {
      setState({ loading: false, detail: await appointmentApi.getById(appointmentId), error: "" });
    } catch (error) {
      setState({ loading: false, detail: null, error: getErrorMessage(error, "Không thể tải chi tiết lịch hẹn.") });
    }
  }, [appointmentId]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  const handleCheckIn = async () => {
    setBusy(true);
    setNotice("");
    try {
      const response = await appointmentApi.checkIn(appointmentId);
      setNotice(response?.isFullyCheckedIn ? "Cả hai bên đã check-in. Lịch hẹn đã hoàn tất." : "Bạn đã check-in. Đang chờ bên còn lại.");
      await loadDetail();
      onChanged();
    } catch (error) {
      setState((current) => ({ ...current, error: getErrorMessage(error, "Không thể check-in lịch hẹn.") }));
    } finally {
      setBusy(false);
    }
  };

  const detail = state.detail;
  const base = detail?.appointment || {};
  const specialized = detail?.inspectionAppointment || detail?.collectionAppointment || {};
  const isCurrentUserCheckedIn = perspective === APPOINTMENT_PERSPECTIVE.BUYER ? Boolean(base.buyerCheckAt) : Boolean(base.sellerCheckAt);
  const canCheckIn = !base.cancelledAt && Number(base.appointmentStatus) !== APPOINTMENT_STATUS.COMPLETED && !isCurrentUserCheckedIn;
  const statusMeta = getAppointmentStatusMeta(base.appointmentStatus);

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#172830]/70 p-4" role="dialog" aria-modal="true">
    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <div className="sticky top-0 flex items-center justify-between border-b border-[#BAC2C1]/40 bg-white px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-wider text-[#547B7D]">Chi tiết lịch hẹn</p><h2 className="mt-1 text-lg font-black text-[#172830]">{detail?.inspectionAppointment ? "Lịch kiểm định" : "Lịch thu gom"}</h2></div><button type="button" onClick={onClose} className="rounded-full bg-[#BAC2C1]/20 px-3 py-1.5 font-black text-[#547B7D]">✕</button></div>
      <div className="p-5 sm:p-6">
        {state.loading && <p className="py-12 text-center font-semibold text-[#547B7D]">Đang tải...</p>}
        {state.error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{state.error}</div>}
        {notice && <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700">{notice}</div>}
        {detail && <>
          <div className="flex flex-wrap items-center justify-between gap-3"><span className={`rounded-full border px-3 py-1.5 text-xs font-black ${statusMeta.className}`}>{statusMeta.label}</span><span className="text-xs text-[#789092]">Mã: {base.appointmentId}</span></div>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <div><dt className="text-xs font-bold uppercase text-[#789092]">Thời gian</dt><dd className="mt-1 font-bold text-[#172830]">{formatDate(specialized.inspectionDate || specialized.collectionDate)}</dd></div>
            <div><dt className="text-xs font-bold uppercase text-[#789092]">Địa điểm</dt><dd className="mt-1 font-bold text-[#172830]">{specialized.inspectionAddress || specialized.pickupAddress || "—"}</dd></div>
            {specialized.deliveryAddress && <div><dt className="text-xs font-bold uppercase text-[#789092]">Địa chỉ nhận</dt><dd className="mt-1 font-bold text-[#172830]">{specialized.deliveryAddress}</dd></div>}
            {specialized.deliveryMethod && <div><dt className="text-xs font-bold uppercase text-[#789092]">Phương thức giao nhận</dt><dd className="mt-1 font-bold text-[#172830]">{specialized.deliveryMethod}</dd></div>}
          </dl>
          <div className="mt-6 grid gap-3 sm:grid-cols-2"><div className={`rounded-xl border p-4 ${base.buyerCheckAt ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}><p className="font-black text-[#172830]">Người mua</p><p className="mt-1 text-xs text-[#547B7D]">{base.buyerCheckAt ? `Check-in lúc ${formatDate(base.buyerCheckAt)}` : "Chưa check-in"}</p></div><div className={`rounded-xl border p-4 ${base.sellerCheckAt ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}><p className="font-black text-[#172830]">Người bán</p><p className="mt-1 text-xs text-[#547B7D]">{base.sellerCheckAt ? `Check-in lúc ${formatDate(base.sellerCheckAt)}` : "Chưa check-in"}</p></div></div>
          {detail.inspectionAppointment && <p className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">Sau khi hai bên check-in, lịch hẹn được đánh dấu hoàn tất. Chức năng nhập kết quả kiểm định đạt/không đạt sẽ xuất hiện khi backend cung cấp API tương ứng.</p>}
          <div className="mt-6 flex justify-end">{canCheckIn ? <button type="button" onClick={handleCheckIn} disabled={busy} className="rounded-xl bg-[#2B5659] px-5 py-3 text-sm font-black text-white hover:bg-[#172830] disabled:opacity-50">{busy ? "Đang check-in..." : "Xác nhận check-in"}</button> : <span className="rounded-xl bg-[#BAC2C1]/20 px-4 py-3 text-sm font-bold text-[#547B7D]">{isCurrentUserCheckedIn ? "Bạn đã check-in" : "Không thể check-in"}</span>}</div>
        </>}
      </div>
    </div>
  </div>;
};

const AppointmentPage = () => {
  const { user } = useAuth();
  const defaultPerspective = user?.role === ROLES.PERSONAL ? APPOINTMENT_PERSPECTIVE.SELLER : APPOINTMENT_PERSPECTIVE.BUYER;
  const [perspective, setPerspective] = useState(defaultPerspective);
  const [type, setType] = useState(APPOINTMENT_TYPE.INSPECTION);
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [version, setVersion] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [state, setState] = useState({ loading: true, result: null, error: "" });

  useEffect(() => {
    const controller = new AbortController();
    appointmentApi.getAll({ perspective, type, keyword: appliedKeyword, status, pageNumber, pageSize: PAGE_SIZE, signal: controller.signal })
      .then((result) => setState({ loading: false, result, error: "" }))
      .catch((error) => {
        if (error?.name !== "CanceledError" && error?.code !== "ERR_CANCELED") setState({ loading: false, result: null, error: getErrorMessage(error, "Không thể tải danh sách lịch hẹn.") });
      });
    return () => controller.abort();
  }, [perspective, type, appliedKeyword, status, pageNumber, version]);

  const changeFilter = (setter, value) => { setState((current) => ({ ...current, loading: true, error: "" })); setter(value); setPageNumber(1); };
  const items = state.result?.items || [];

  return <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
    <div className="rounded-2xl bg-[#172830] px-6 py-6 text-white"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C1EAEC]">Lịch giao dịch</p><h1 className="mt-2 text-2xl font-black">Lịch hẹn của tôi</h1><p className="mt-2 text-sm text-[#B7C9D4]">Theo dõi lịch kiểm định, thu gom và trạng thái check-in của hai bên.</p></div>
    <div className="mt-5 rounded-2xl border border-[#BAC2C1]/40 bg-white p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[auto_auto_1fr_auto]">
        <div className="flex rounded-xl bg-[#BAC2C1]/20 p-1">{[[APPOINTMENT_TYPE.INSPECTION,"Kiểm định"],[APPOINTMENT_TYPE.COLLECTION,"Thu gom"]].map(([value,label]) => <button key={value} type="button" onClick={() => changeFilter(setType, value)} className={`rounded-lg px-4 py-2 text-sm font-black ${type === value ? "bg-white text-[#2B5659] shadow-sm" : "text-[#547B7D]"}`}>{label}</button>)}</div>
        <div className="flex rounded-xl bg-[#BAC2C1]/20 p-1">{[[APPOINTMENT_PERSPECTIVE.BUYER,"Tôi là người mua"],[APPOINTMENT_PERSPECTIVE.SELLER,"Tôi là người bán"]].map(([value,label]) => <button key={value} type="button" onClick={() => changeFilter(setPerspective, value)} className={`rounded-lg px-4 py-2 text-sm font-black ${perspective === value ? "bg-white text-[#2B5659] shadow-sm" : "text-[#547B7D]"}`}>{label}</button>)}</div>
        <form onSubmit={(event) => { event.preventDefault(); changeFilter(setAppliedKeyword, keyword.trim()); }} className="flex gap-2"><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm theo tên đối tác..." className="min-w-0 flex-1 rounded-xl border border-[#BAC2C1] px-3 py-2 text-sm outline-none focus:border-[#2B5659]"/><button className="rounded-xl bg-[#2B5659] px-4 py-2 text-sm font-bold text-white">Tìm</button></form>
        <select value={status} onChange={(event) => changeFilter(setStatus, event.target.value)} className="rounded-xl border border-[#BAC2C1] px-3 py-2 text-sm font-bold text-[#547B7D] outline-none">{APPOINTMENT_STATUS_OPTIONS.map((option) => <option key={String(option.value)} value={option.value}>{option.label}</option>)}</select>
      </div>
    </div>
    {state.loading && <div className="mt-5 rounded-2xl bg-white p-12 text-center font-semibold text-[#547B7D]">Đang tải lịch hẹn...</div>}
    {state.error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{state.error}</div>}
    {!state.loading && !state.error && items.length === 0 && <div className="mt-5 rounded-2xl border border-[#BAC2C1]/40 bg-white p-12 text-center"><div className="text-4xl">📅</div><h2 className="mt-3 font-black text-[#172830]">Chưa có lịch hẹn phù hợp</h2></div>}
    <div className="mt-5 space-y-3">{items.map((item) => { const meta = getAppointmentStatusMeta(item.appointmentStatus); const isChecked = perspective === APPOINTMENT_PERSPECTIVE.BUYER ? item.buyerCheckedIn : item.sellerCheckedIn; return <article key={item.appointmentId} className="rounded-2xl border border-[#BAC2C1]/40 bg-white p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-3 py-1 text-xs font-black ${meta.className}`}>{meta.label}</span>{isChecked && <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-black text-green-700">Bạn đã check-in</span>}</div><h2 className="mt-3 truncate text-lg font-black text-[#172830]">Hẹn với {item.counterpartyName || "người dùng HomeCycle"}</h2><p className="mt-1 text-sm font-semibold text-[#547B7D]">{formatDate(item.inspectionDate || item.collectionDate)}</p><p className="mt-1 truncate text-sm text-[#789092]">{item.inspectionAddress || item.pickupAddress || item.deliveryAddress || "Chưa có địa chỉ"}</p></div><button type="button" onClick={() => setSelectedId(item.appointmentId)} className="mt-4 shrink-0 rounded-xl bg-[#2B5659] px-5 py-2.5 text-sm font-black text-white hover:bg-[#172830] sm:mt-0">Xem chi tiết</button></article>; })}</div>
    {state.result?.totalPages > 1 && <div className="mt-6 flex items-center justify-center gap-3"><button disabled={!state.result.hasPreviousPage} onClick={() => { setState((current) => ({ ...current, loading: true })); setPageNumber((value) => value - 1); }} className="rounded-lg border bg-white px-4 py-2 text-sm font-bold disabled:opacity-40">Trước</button><span className="text-sm font-bold text-[#547B7D]">Trang {state.result.pageNumber}/{state.result.totalPages}</span><button disabled={!state.result.hasNextPage} onClick={() => { setState((current) => ({ ...current, loading: true })); setPageNumber((value) => value + 1); }} className="rounded-lg border bg-white px-4 py-2 text-sm font-bold disabled:opacity-40">Sau</button></div>}
    {selectedId && <AppointmentDetailModal appointmentId={selectedId} perspective={perspective} onClose={() => setSelectedId("")} onChanged={() => setVersion((value) => value + 1)} />}
  </section>;
};

export default AppointmentPage;
