import { useCallback, useEffect, useState } from "react";
import {
  APPOINTMENT_PERSPECTIVE,
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_OPTIONS,
  APPOINTMENT_TYPE,
  getAppointmentStatusMeta,
} from "../../constants/appointments";
import appointmentApi from "../../services/apis/appointmentApi";

const PAGE_SIZE = 10;
const API_PAGE_SIZE = 100;

const APPOINTMENT_SOURCES = Object.freeze([
  {
    type: APPOINTMENT_TYPE.INSPECTION,
    perspective: APPOINTMENT_PERSPECTIVE.BUYER,
    typeLabel: "Kiểm định",
    perspectiveLabel: "Người mua",
  },
  {
    type: APPOINTMENT_TYPE.INSPECTION,
    perspective: APPOINTMENT_PERSPECTIVE.SELLER,
    typeLabel: "Kiểm định",
    perspectiveLabel: "Người bán",
  },
  {
    type: APPOINTMENT_TYPE.COLLECTION,
    perspective: APPOINTMENT_PERSPECTIVE.BUYER,
    typeLabel: "Thu gom",
    perspectiveLabel: "Người mua",
  },
  {
    type: APPOINTMENT_TYPE.COLLECTION,
    perspective: APPOINTMENT_PERSPECTIVE.SELLER,
    typeLabel: "Thu gom",
    perspectiveLabel: "Người bán",
  },
]);

const getErrorMessage = (error, fallback = "Không thể xử lý lịch hẹn.") =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const formatDate = (value) => {
  const date = new Date(value);

  return value && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date)
    : "Chưa xác định";
};

const getAppointmentTypeLabel = (isInspection) =>
  isInspection ? "Lịch kiểm định" : "Lịch thu gom";

const getAppointmentDate = (item) =>
  item.inspectionDate || item.collectionDate || item.createdAt;

const loadAppointmentSource = async ({
  source,
  keyword,
  status,
  signal,
}) => {
  const requestPage = (pageNumber) =>
    appointmentApi.getAll({
      perspective: source.perspective,
      type: source.type,
      keyword,
      status,
      pageNumber,
      pageSize: API_PAGE_SIZE,
      signal,
    });

  const firstPage = await requestPage(1);
  const remainingPages = Array.from(
    { length: Math.max(0, firstPage.totalPages - 1) },
    (_, index) => index + 2,
  );
  const remainingResults = await Promise.all(
    remainingPages.map((pageNumber) => requestPage(pageNumber)),
  );

  return [firstPage, ...remainingResults].flatMap((result) =>
    result.items.map((item) => ({
      ...item,
      viewType: source.type,
      viewPerspective: source.perspective,
      viewTypeLabel: source.typeLabel,
      viewPerspectiveLabel: source.perspectiveLabel,
    })),
  );
};

const CheckInStatus = ({ label, checkedAt }) => (
  <div className="flex items-start gap-3 border-b border-[#E3ECE9] py-3 last:border-b-0">
    <span
      className={`material-symbols-outlined mt-0.5 text-xl ${
        checkedAt ? "text-green-600" : "text-[#9AAEAB]"
      }`}
      aria-hidden="true"
    >
      {checkedAt ? "check_circle" : "radio_button_unchecked"}
    </span>
    <div>
      <p className="text-sm font-black text-[#183F41]">{label}</p>
      <p className="mt-0.5 text-xs text-[#68807F]">
        {checkedAt ? `Đã check-in lúc ${formatDate(checkedAt)}` : "Chưa check-in"}
      </p>
    </div>
  </div>
);

const AppointmentDetailModal = ({
  appointmentId,
  perspective,
  onClose,
  onChanged,
}) => {
  const [state, setState] = useState({
    loading: true,
    detail: null,
    error: "",
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const loadDetail = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));

    try {
      const detail = await appointmentApi.getById(appointmentId);
      setState({ loading: false, detail, error: "" });
    } catch (error) {
      setState({
        loading: false,
        detail: null,
        error: getErrorMessage(error, "Không thể tải chi tiết lịch hẹn."),
      });
    }
  }, [appointmentId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const handleCheckIn = async () => {
    setBusy(true);
    setNotice("");

    try {
      const response = await appointmentApi.checkIn(appointmentId);
      setNotice(
        response?.isFullyCheckedIn
          ? "Cả hai bên đã check-in. Lịch hẹn đã hoàn tất."
          : "Bạn đã check-in. Đang chờ bên còn lại.",
      );
      await loadDetail();
      onChanged();
    } catch (error) {
      setState((current) => ({
        ...current,
        error: getErrorMessage(error, "Không thể check-in lịch hẹn."),
      }));
    } finally {
      setBusy(false);
    }
  };

  const detail = state.detail;
  const base = detail?.appointment || {};
  const isInspection = Boolean(detail?.inspectionAppointment);
  const specialized =
    detail?.inspectionAppointment || detail?.collectionAppointment || {};
  const isCurrentUserCheckedIn =
    perspective === APPOINTMENT_PERSPECTIVE.BUYER
      ? Boolean(base.buyerCheckAt)
      : Boolean(base.sellerCheckAt);
  const canCheckIn =
    !base.cancelledAt &&
    Number(base.appointmentStatus) !== APPOINTMENT_STATUS.COMPLETED &&
    !isCurrentUserCheckedIn;
  const statusMeta = getAppointmentStatusMeta(base.appointmentStatus);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#183F41]/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="appointment-detail-title"
    >
      <div className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#DCE8E5] bg-white shadow-[0_24px_70px_rgba(24,63,65,0.25)]">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#DCE8E5] bg-white px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#4F8588]">
              Chi tiết lịch hẹn
            </p>
            <h2
              id="appointment-detail-title"
              className="mt-1 text-lg font-black text-[#183F41]"
            >
              {getAppointmentTypeLabel(isInspection)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết lịch hẹn"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F1F7F5] text-[#4F8588] transition hover:bg-[#E3EFEC]"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </header>

        <div className="p-5 sm:p-6">
          {state.loading && (
            <div className="py-12 text-center text-[#68807F]" role="status">
              <span
                className="material-symbols-outlined animate-spin text-3xl"
                aria-hidden="true"
              >
                progress_activity
              </span>
              <p className="mt-2 text-sm font-semibold">Đang tải chi tiết...</p>
            </div>
          )}

          {state.error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
              {state.error}
            </div>
          )}

          {notice && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700">
              {notice}
            </div>
          )}

          {detail && !state.loading && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-black ${statusMeta.className}`}
                >
                  {statusMeta.label}
                </span>
                <span className="text-xs font-semibold text-[#68807F]">
                  {perspective === APPOINTMENT_PERSPECTIVE.BUYER
                    ? "Người mua"
                    : "Người bán"}
                </span>
              </div>

              <dl className="mt-5 divide-y divide-[#E3ECE9] rounded-xl border border-[#DCE8E5] bg-[#FBFDFC] px-4">
                <div className="grid gap-1 py-3 sm:grid-cols-[135px_1fr]">
                  <dt className="text-xs font-bold uppercase tracking-wide text-[#789092]">
                    Thời gian
                  </dt>
                  <dd className="font-bold text-[#183F41]">
                    {formatDate(
                      specialized.inspectionDate || specialized.collectionDate,
                    )}
                  </dd>
                </div>
                <div className="grid gap-1 py-3 sm:grid-cols-[135px_1fr]">
                  <dt className="text-xs font-bold uppercase tracking-wide text-[#789092]">
                    Địa điểm
                  </dt>
                  <dd className="font-bold text-[#183F41]">
                    {specialized.inspectionAddress ||
                      specialized.pickupAddress ||
                      "—"}
                  </dd>
                </div>
                {specialized.deliveryAddress && (
                  <div className="grid gap-1 py-3 sm:grid-cols-[135px_1fr]">
                    <dt className="text-xs font-bold uppercase tracking-wide text-[#789092]">
                      Địa chỉ nhận
                    </dt>
                    <dd className="font-bold text-[#183F41]">
                      {specialized.deliveryAddress}
                    </dd>
                  </div>
                )}
                {specialized.deliveryMethod && (
                  <div className="grid gap-1 py-3 sm:grid-cols-[135px_1fr]">
                    <dt className="text-xs font-bold uppercase tracking-wide text-[#789092]">
                      Giao nhận
                    </dt>
                    <dd className="font-bold text-[#183F41]">
                      {specialized.deliveryMethod}
                    </dd>
                  </div>
                )}
              </dl>

              <section className="mt-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6F9F]">
                  Tiến trình check-in
                </p>
                <div className="mt-2 rounded-xl border border-[#DCE8E5] px-4">
                  <CheckInStatus
                    label="Người mua"
                    checkedAt={base.buyerCheckAt}
                  />
                  <CheckInStatus
                    label="Người bán"
                    checkedAt={base.sellerCheckAt}
                  />
                </div>
              </section>

              {isInspection && (
                <p className="mt-4 rounded-xl border border-[#C9DDED] bg-[#F1F7FC] p-3.5 text-sm leading-6 text-[#285E7C]">
                  Lịch kiểm định được hoàn tất sau khi cả hai bên xác nhận
                  check-in.
                </p>
              )}

              <div className="mt-6 flex justify-end border-t border-[#E3ECE9] pt-5">
                {canCheckIn ? (
                  <button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={busy}
                    className="rounded-lg bg-[#4F8588] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#356A70] disabled:opacity-50"
                  >
                    {busy ? "Đang check-in..." : "Xác nhận check-in"}
                  </button>
                ) : (
                  <span className="rounded-lg bg-[#F1F7F5] px-4 py-2.5 text-sm font-bold text-[#68807F]">
                    {isCurrentUserCheckedIn
                      ? "Bạn đã check-in"
                      : "Không thể check-in"}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const AppointmentPage = () => {
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [version, setVersion] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [selectedPerspective, setSelectedPerspective] = useState("");
  const [state, setState] = useState({
    loading: true,
    items: [],
    error: "",
  });

  useEffect(() => {
    const controller = new AbortController();

    Promise.all(
      APPOINTMENT_SOURCES.map((source) =>
        loadAppointmentSource({
          source,
          keyword: appliedKeyword,
          status,
          signal: controller.signal,
        }),
      ),
    )
      .then((sourceItems) => {
        const uniqueItems = Array.from(
          new Map(
            sourceItems
              .flat()
              .map((item) => [
                `${item.appointmentId}-${item.viewPerspective}-${item.viewType}`,
                item,
              ]),
          ).values(),
        ).sort((first, second) => {
          const firstTime = new Date(getAppointmentDate(first)).getTime() || 0;
          const secondTime = new Date(getAppointmentDate(second)).getTime() || 0;
          return secondTime - firstTime;
        });

        setState({ loading: false, items: uniqueItems, error: "" });
      })
      .catch((error) => {
        if (
          error?.name !== "CanceledError" &&
          error?.code !== "ERR_CANCELED"
        ) {
          setState({
            loading: false,
            items: [],
            error: getErrorMessage(
              error,
              "Không thể tải danh sách lịch hẹn.",
            ),
          });
        }
      });

    return () => controller.abort();
  }, [appliedKeyword, status, version]);

  const changeFilter = (setter, value) => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    setter(value);
    setPageNumber(1);
  };

  const totalPages = Math.max(1, Math.ceil(state.items.length / PAGE_SIZE));
  const currentPage = Math.min(pageNumber, totalPages);
  const pageItems = state.items.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const inspectionCount = state.items.filter(
    (item) => item.viewType === APPOINTMENT_TYPE.INSPECTION,
  ).length;
  const collectionCount = state.items.length - inspectionCount;

  const openDetail = (item) => {
    setSelectedId(item.appointmentId);
    setSelectedPerspective(item.viewPerspective);
  };

  const closeDetail = () => {
    setSelectedId("");
    setSelectedPerspective("");
  };

  return (
    <section className="mx-auto min-h-[calc(100vh-220px)] w-full max-w-7xl px-4 pb-14 pt-7 sm:px-6">
      <header className="flex flex-col gap-4 border-b border-[#DCE8E5] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6F9F]">
            Lịch giao dịch
          </p>
          <h1 className="mt-1 text-2xl font-black text-[#183F41] sm:text-3xl">
            Lịch hẹn của tôi
          </h1>
          <p className="mt-1.5 text-sm text-[#68807F]">
            Tất cả lịch kiểm định và thu gom trong giao dịch mua, bán của bạn.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-black">
          <span className="rounded-full bg-[#EAF3F8] px-3 py-1.5 text-[#2F6F9F]">
            {inspectionCount} lịch kiểm định
          </span>
          <span className="rounded-full bg-[#EAF5F1] px-3 py-1.5 text-[#356A70]">
            {collectionCount} lịch thu gom
          </span>
        </div>
      </header>

      <div className="mt-4 rounded-xl border border-[#DCE8E5] bg-white p-3 shadow-[0_8px_24px_rgba(24,63,65,0.04)]">
        <div className="grid gap-2 md:grid-cols-[minmax(260px,1fr)_210px_auto]">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              changeFilter(setAppliedKeyword, keyword.trim());
            }}
            className="flex min-w-0 gap-2"
          >
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Tìm theo tên đối tác</span>
              <span
                className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-[#789092]"
                aria-hidden="true"
              >
                search
              </span>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo tên đối tác..."
                className="w-full rounded-lg border border-[#CDDED9] bg-[#FBFDFC] py-2.5 pl-10 pr-3 text-sm text-[#183F41] outline-none focus:border-[#4F8588] focus:bg-white"
            />
            </label>
            <button
              type="submit"
              className="rounded-lg border border-[#4F8588] bg-white px-4 py-2 text-sm font-bold text-[#285E62] transition hover:bg-[#F1F7F5]"
            >
              Tìm
            </button>
          </form>

          <select
            value={status}
            onChange={(event) => changeFilter(setStatus, event.target.value)}
            className="rounded-lg border border-[#CDDED9] bg-white px-3 py-2 text-sm font-bold text-[#68807F] outline-none focus:border-[#4F8588]"
          >
            {APPOINTMENT_STATUS_OPTIONS.map((option) => (
              <option key={String(option.value)} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {(appliedKeyword || status !== "") && (
            <button
              type="button"
              onClick={() => {
                setState((current) => ({ ...current, loading: true, error: "" }));
                setKeyword("");
                setAppliedKeyword("");
                setStatus("");
                setPageNumber(1);
              }}
              className="rounded-lg px-3 py-2 text-sm font-bold text-[#2F6F9F] transition hover:bg-[#F1F7F5]"
            >
              Đặt lại
            </button>
          )}
        </div>
      </div>

      {state.loading && (
        <div className="mt-5 rounded-2xl border border-[#DCE8E5] bg-white p-12 text-center font-semibold text-[#68807F]">
          Đang tải lịch hẹn...
        </div>
      )}

      {state.error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {state.error}
        </div>
      )}

      {!state.loading && !state.error && state.items.length === 0 && (
        <div className="mt-5 rounded-2xl border border-[#DCE8E5] bg-white p-12 text-center shadow-[0_10px_30px_rgba(24,63,65,0.05)]">
          <span
            className="material-symbols-outlined text-5xl text-[#4F8588]"
            aria-hidden="true"
          >
            event_busy
          </span>
          <h2 className="mt-3 font-black text-[#183F41]">
            Chưa có lịch hẹn phù hợp
          </h2>
        </div>
      )}

      {!state.loading && !state.error && state.items.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-[#DCE8E5] bg-white shadow-[0_8px_24px_rgba(24,63,65,0.04)]">
          <div className="hidden grid-cols-[minmax(190px,1.15fr)_90px_165px_minmax(180px,1fr)_120px_110px_104px] items-center gap-3 bg-[#F3F7F6] px-5 py-3 text-[11px] font-black uppercase tracking-[0.08em] text-[#68807F] lg:grid">
            <span>Lịch hẹn</span>
            <span>Vai trò</span>
            <span>Thời gian</span>
            <span>Địa điểm</span>
            <span>Check-in</span>
            <span>Trạng thái</span>
            <span className="sr-only">Thao tác</span>
          </div>
          <div className="divide-y divide-[#E3ECE9]">
            {pageItems.map((item) => {
              const meta = getAppointmentStatusMeta(item.appointmentStatus);
              const isChecked =
                item.viewPerspective === APPOINTMENT_PERSPECTIVE.BUYER
                  ? item.buyerCheckedIn
                  : item.sellerCheckedIn;
              const appointmentDate = getAppointmentDate(item);
              const appointmentAddress =
                item.inspectionAddress ||
                item.pickupAddress ||
                item.deliveryAddress ||
                "Chưa có địa chỉ";

              return (
                <article
                  key={`${item.appointmentId}-${item.viewPerspective}-${item.viewType}`}
                  className="grid gap-3 px-5 py-4 transition hover:bg-[#F8FBFA] lg:grid-cols-[minmax(190px,1.15fr)_90px_165px_minmax(180px,1fr)_120px_110px_104px] lg:items-center"
                >
                  <div className="min-w-0">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                        item.viewType === APPOINTMENT_TYPE.INSPECTION
                          ? "bg-[#EAF3F8] text-[#2F6F9F]"
                          : "bg-[#EAF5F1] text-[#356A70]"
                      }`}
                    >
                      {item.viewTypeLabel}
                    </span>
                    <h2 className="mt-1.5 truncate text-sm font-black text-[#183F41]">
                      {item.counterpartyName || "Người dùng HomeCycle"}
                    </h2>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase text-[#789092] lg:hidden">
                      Vai trò
                    </p>
                    <span className="text-xs font-black text-[#285E62]">
                      {item.viewPerspectiveLabel}
                    </span>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase text-[#789092] lg:hidden">
                      Thời gian
                    </p>
                    <p className="text-sm font-semibold text-[#183F41]">
                      {formatDate(appointmentDate)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase text-[#789092] lg:hidden">
                      Địa điểm
                    </p>
                    <p className="truncate text-sm text-[#68807F]" title={appointmentAddress}>
                      {appointmentAddress}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                        isChecked ? "text-green-700" : "text-[#789092]"
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-base"
                        aria-hidden="true"
                      >
                        {isChecked ? "check_circle" : "schedule"}
                      </span>
                      {isChecked ? "Đã check-in" : "Chưa check-in"}
                    </span>
                  </div>
                  <div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${meta.className}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <div className="lg:text-right">
                    <button
                      type="button"
                      onClick={() => openDetail(item)}
                      className="rounded-lg border border-[#4F8588] bg-white px-4 py-2 text-sm font-black text-[#285E62] transition hover:bg-[#4F8588] hover:text-white"
                    >
                      Chi tiết
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {!state.loading && !state.error && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPageNumber(currentPage - 1)}
            className="rounded-lg border border-[#9FBFBA] bg-white px-4 py-2 text-sm font-bold text-[#285E62] disabled:opacity-40"
          >
            Trước
          </button>
          <span className="text-sm font-bold text-[#68807F]">
            Trang {currentPage}/{totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setPageNumber(currentPage + 1)}
            className="rounded-lg border border-[#9FBFBA] bg-white px-4 py-2 text-sm font-bold text-[#285E62] disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      )}

      {selectedId && (
        <AppointmentDetailModal
          appointmentId={selectedId}
          perspective={selectedPerspective}
          onClose={closeDetail}
          onChanged={() => {
            setState((current) => ({ ...current, loading: true, error: "" }));
            setVersion((value) => value + 1);
          }}
        />
      )}
    </section>
  );
};

export default AppointmentPage;