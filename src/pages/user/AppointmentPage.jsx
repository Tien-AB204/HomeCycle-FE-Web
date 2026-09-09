import { useCallback, useEffect, useState } from "react";
import {
  APPOINTMENT_PERSPECTIVE,
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_OPTIONS,
  APPOINTMENT_TYPE,
  getAppointmentStatusMeta,
} from "../../constants/appointments";
import { ROLES } from "../../constants/roles";
import BusinessAppointmentCalendar from "../../features/appointments/BusinessAppointmentCalendar";
import CollectionSchedulePanel from "../../features/appointments/CollectionSchedulePanel";
import OrderSettlementPaymentPanel from "../../features/appointments/OrderSettlementPaymentPanel";
import { useAuth } from "../../hooks/useAuth";
import appointmentApi from "../../services/apis/appointmentApi";
import inspectionFormApi from "../../services/apis/inspectionFormApi";

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
  <div className="flex items-start gap-3 border-b border-border py-3 last:border-b-0">
    <span
      className={`material-symbols-outlined mt-0.5 text-xl ${
        checkedAt ? "text-success" : "text-textLight"
      }`}
      aria-hidden="true"
    >
      {checkedAt ? "check_circle" : "radio_button_unchecked"}
    </span>
    <div>
      <p className="text-sm font-black text-text">{label}</p>
      <p className="mt-0.5 text-xs text-textLight">
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
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  const [inspectionState, setInspectionState] =
    useState({
      loading: false,
      form: null,
      error: "",
    });

  const [scheduleOpen, setScheduleOpen] =
    useState(false);

  const [
    settlementPayment,
    setSettlementPayment,
  ] = useState(null);

  const loadDetail = useCallback(async () => {
    setState((current) => ({
      ...current,
      loading: true,
      error: "",
    }));

    setInspectionState({
      loading: true,
      form: null,
      error: "",
    });

    try {
      const detail =
        await appointmentApi.getById(
          appointmentId,
        );

      if (detail?.inspectionAppointment) {
        try {
          const inspectionForm =
            await inspectionFormApi.getByAppointment(
              appointmentId,
            );

          setInspectionState({
            loading: false,
            form: inspectionForm,
            error: "",
          });

          const pendingPaymentId =
            localStorage.getItem(
              "homecycle:pending-order-settlement-payment-id",
            ) || "";

          const pendingOrderId =
            localStorage.getItem(
              "homecycle:pending-order-settlement-order-id",
            ) || "";

          const pendingAmount =
            localStorage.getItem(
              "homecycle:pending-order-settlement-amount",
            ) || "";

          const currentOrderId =
            String(
              inspectionForm.orderId ||
                "",
            ).trim();

          if (
            pendingPaymentId &&
            pendingOrderId &&
            currentOrderId &&
            pendingOrderId ===
              currentOrderId
          ) {
            setSettlementPayment({
              paymentId:
                pendingPaymentId,

              orderId:
                pendingOrderId ||
                inspectionForm.orderId ||
                "",

              amount:
                pendingAmount,
            });
          } else {
            setSettlementPayment(
              null,
            );
          }
        } catch (inspectionError) {
          if (
            inspectionError?.name !==
              "CanceledError" &&
            inspectionError?.code !==
              "ERR_CANCELED"
          ) {
            setInspectionState({
              loading: false,
              form: null,
              error: getErrorMessage(
                inspectionError,
                "Biên bản kiểm định chưa sẵn sàng.",
              ),
            });
          }
        }
      } else {
        setInspectionState({
          loading: false,
          form: null,
          error: "",
        });
      }

      setState({
        loading: false,
        detail,
        error: "",
      });
    } catch (error) {
      setInspectionState({
        loading: false,
        form: null,
        error: "",
      });

      setState({
        loading: false,
        detail: null,
        error: getErrorMessage(
          error,
          "Không thể tải chi tiết lịch hẹn.",
        ),
      });
    }
  }, [appointmentId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const handleCheckIn = async () => {
    setBusy("check-in");
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
      setBusy("");
    }
  };

  const handleCollectNow = async () => {
    const inspectionForm =
      inspectionState.form;

    if (
      !inspectionForm?.actions?.canCollectNow
    ) {
      return;
    }

    const accepted = window.confirm(
      "Thu gom ngay sẽ tiếp tục giao dịch mà không tạo một lịch thu gom mới. Bạn có chắc muốn tiếp tục?",
    );

    if (!accepted) {
      return;
    }

    setBusy("collect-now");
    setNotice("");

    try {
      await inspectionFormApi.collectNow(
        inspectionForm.inspectionFormId,
        inspectionForm.revision,
      );

      setNotice(
        "Đã xác nhận thu gom ngay. Dữ liệu giao dịch đang được tải lại.",
      );

      await loadDetail();
      onChanged();
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Không thể thực hiện thu gom ngay.",
      );

      /*
       * Revision có thể đã thay đổi ở thiết bị khác.
       * Luôn tải lại dữ liệu mới nhất, không tự retry
       * bằng revision cũ.
       */
      await loadDetail();

      setState((current) => ({
        ...current,
        error: message,
      }));
    } finally {
      setBusy("");
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="appointment-detail-title"
    >
      <div className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-white shadow-[0_24px_70px_rgba(23,40,48,0.25)]">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
              Chi tiết lịch hẹn
            </p>
            <h2
              id="appointment-detail-title"
              className="mt-1 text-lg font-black text-text"
            >
              {getAppointmentTypeLabel(isInspection)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết lịch hẹn"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary transition hover:bg-primary/20"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </header>

        <div className="p-5 sm:p-6">
          {state.loading && (
            <div className="py-12 text-center text-textLight" role="status">
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
            <div className="mb-4 rounded-xl border border-error/30 bg-error/10 p-3 text-sm font-semibold text-error">
              {state.error}
            </div>
          )}

          {notice && (
            <div className="mb-4 rounded-xl border border-success/30 bg-success/10 p-3 text-sm font-semibold text-success">
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
                <span className="text-xs font-semibold text-textLight">
                  {perspective === APPOINTMENT_PERSPECTIVE.BUYER
                    ? "Người mua"
                    : "Người bán"}
                </span>
              </div>

              <dl className="mt-5 divide-y divide-border rounded-xl border border-border bg-background px-4">
                <div className="grid gap-1 py-3 sm:grid-cols-[135px_1fr]">
                  <dt className="text-xs font-bold uppercase tracking-wide text-textLight">
                    Thời gian
                  </dt>
                  <dd className="font-bold text-text">
                    {formatDate(
                      specialized.inspectionDate || specialized.collectionDate,
                    )}
                  </dd>
                </div>
                <div className="grid gap-1 py-3 sm:grid-cols-[135px_1fr]">
                  <dt className="text-xs font-bold uppercase tracking-wide text-textLight">
                    Địa điểm
                  </dt>
                  <dd className="font-bold text-text">
                    {specialized.inspectionAddress ||
                      specialized.pickupAddress ||
                      "—"}
                  </dd>
                </div>
                {specialized.deliveryAddress && (
                  <div className="grid gap-1 py-3 sm:grid-cols-[135px_1fr]">
                    <dt className="text-xs font-bold uppercase tracking-wide text-textLight">
                      Địa chỉ nhận
                    </dt>
                    <dd className="font-bold text-text">
                      {specialized.deliveryAddress}
                    </dd>
                  </div>
                )}
                {specialized.deliveryMethod && (
                  <div className="grid gap-1 py-3 sm:grid-cols-[135px_1fr]">
                    <dt className="text-xs font-bold uppercase tracking-wide text-textLight">
                      Giao nhận
                    </dt>
                    <dd className="font-bold text-text">
                      {specialized.deliveryMethod}
                    </dd>
                  </div>
                )}
              </dl>

              <section className="mt-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                  Tiến trình check-in
                </p>
                <div className="mt-2 rounded-xl border border-border px-4">
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
                <p className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-sm leading-6 text-primary">
                  Lịch kiểm định được hoàn tất sau khi cả hai bên xác nhận
                  check-in.
                </p>
              )}

              {isInspection && (
                <section className="mt-4 rounded-xl border border-border bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
                        Biên bản kiểm định
                      </p>

                      <p className="mt-1 text-xs leading-5 text-textLight">
                        Quyền thao tác được lấy trực tiếp từ máy chủ.
                      </p>
                    </div>

                    {inspectionState.form && (
                      <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-black text-text">
                        Phiên bản {inspectionState.form.revision}
                      </span>
                    )}
                  </div>

                  {inspectionState.loading && (
                    <div
                      className="mt-4 flex items-center gap-2 text-sm font-semibold text-textLight"
                      role="status"
                    >
                      <span
                        className="material-symbols-outlined animate-spin text-lg"
                        aria-hidden="true"
                      >
                        progress_activity
                      </span>
                      Đang tải biên bản kiểm định...
                    </div>
                  )}

                  {!inspectionState.loading &&
                    inspectionState.error && (
                      <div className="mt-4 rounded-lg border border-warning/20 bg-warning/10 px-3 py-2.5 text-xs font-semibold leading-5 text-warning">
                        {inspectionState.error}
                      </div>
                    )}

                  {!inspectionState.loading &&
                    inspectionState.form && (
                      <div className="mt-4 space-y-3">
                        <p className="text-xs leading-5 text-textLight">
                          {inspectionState.form.actions?.canCollectNow
                            ? "Máy chủ cho phép thu gom ngay từ biên bản hiện tại."
                            : inspectionState.form.actions?.canScheduleCollection
                              ? "Máy chủ đã cho phép tạo lịch thu gom từ biên bản hiện tại."
                              : "Hiện chưa có thao tác thu gom khả dụng cho biên bản này."}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {inspectionState.form.actions?.canCollectNow && (
                            <button
                              type="button"
                              onClick={handleCollectNow}
                              disabled={Boolean(busy)}
                              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {busy === "collect-now"
                                ? "Đang xử lý..."
                                : "Thu gom ngay"}
                            </button>
                          )}

                          {inspectionState.form.actions?.canScheduleCollection && (
                            <button
                              type="button"
                              onClick={() =>
                                setScheduleOpen(
                                  (current) => !current,
                                )
                              }
                              disabled={Boolean(busy)}
                              className="rounded-lg border border-primary bg-white px-4 py-2.5 text-sm font-black text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {scheduleOpen
                                ? "Ẩn tạo lịch"
                                : "Tạo lịch thu gom"}
                            </button>
                          )}
                        </div>

                        {scheduleOpen &&
                          inspectionState.form.actions
                            ?.canScheduleCollection && (
                            <CollectionSchedulePanel
                              inspectionForm={inspectionState.form}
                              onClose={() =>
                                setScheduleOpen(false)
                              }
                              onRefreshRequired={async () => {
                                setScheduleOpen(false);
                                await loadDetail();
                              }}
                              onScheduled={async (result) => {
                                setScheduleOpen(false);

                                /*
                                 * Một schedule response mới phải thay
                                 * hoàn toàn settlement cũ của màn hình.
                                 */
                                localStorage.removeItem(
                                  "homecycle:pending-order-settlement-payment-id",
                                );

                                localStorage.removeItem(
                                  "homecycle:pending-order-settlement-order-id",
                                );

                                localStorage.removeItem(
                                  "homecycle:pending-order-settlement-amount",
                                );

                                setSettlementPayment(
                                  null,
                                );

                                if (result?.paymentRequired) {
                                  const paymentId =
                                    String(
                                      result.paymentId ||
                                        "",
                                    ).trim();

                                  const orderId =
                                    String(
                                      result.orderId ||
                                        inspectionState.form
                                          .orderId ||
                                        "",
                                    ).trim();

                                  const amount =
                                    Number(
                                      result.additionalPaymentAmount,
                                    );

                                  if (!paymentId) {
                                    setState((current) => ({
                                      ...current,
                                      error:
                                        "Máy chủ yêu cầu thanh toán bổ sung nhưng chưa trả về mã thanh toán.",
                                    }));
                                  } else {
                                    const nextSettlement = {
                                      paymentId,
                                      orderId,
                                      appointmentId:
                                        result.appointmentId ||
                                        "",
                                      amount:
                                        Number.isFinite(
                                          amount,
                                        )
                                          ? amount
                                          : "",
                                    };

                                    localStorage.setItem(
                                      "homecycle:pending-order-settlement-payment-id",
                                      paymentId,
                                    );

                                    if (orderId) {
                                      localStorage.setItem(
                                        "homecycle:pending-order-settlement-order-id",
                                        orderId,
                                      );
                                    }

                                    if (
                                      Number.isFinite(
                                        amount,
                                      )
                                    ) {
                                      localStorage.setItem(
                                        "homecycle:pending-order-settlement-amount",
                                        String(amount),
                                      );
                                    }

                                    setSettlementPayment(
                                      nextSettlement,
                                    );

                                    setNotice(
                                      Number.isFinite(
                                        amount,
                                      )
                                        ? `Đã tạo lịch thu gom. Cần thanh toán phần còn lại ${amount.toLocaleString(
                                            "vi-VN",
                                          )} đ.`
                                        : "Đã tạo lịch thu gom và phát sinh khoản thanh toán bổ sung.",
                                    );
                                  }
                                } else {
                                  setSettlementPayment(
                                    null,
                                  );

                                  setNotice(
                                    "Đã tạo lịch thu gom thành công.",
                                  );
                                }

                                await loadDetail();
                                onChanged();
                              }}
                            />
                          )}

                        {settlementPayment && (
                          <OrderSettlementPaymentPanel
                            settlement={
                              settlementPayment
                            }
                            onCompleted={async () => {
                              localStorage.removeItem(
                                "homecycle:pending-order-settlement-payment-id",
                              );

                              localStorage.removeItem(
                                "homecycle:pending-order-settlement-order-id",
                              );

                              localStorage.removeItem(
                                "homecycle:pending-order-settlement-amount",
                              );

                              setSettlementPayment(
                                null,
                              );

                              setNotice(
                                "Đã thanh toán phần còn lại thành công.",
                              );

                              await loadDetail();
                              onChanged();
                            }}
                          />
                        )}
                      </div>
                    )}
                </section>
              )}

              <div className="mt-6 flex justify-end border-t border-border pt-5">
                {canCheckIn ? (
                  <button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={Boolean(busy)}
                    className="rounded-lg bg-primary px-5 py-2.5 text-sm font-black text-white transition hover:bg-primary/90 disabled:opacity-50"
                  >
                    {busy === "check-in" ? "Đang check-in..." : "Xác nhận check-in"}
                  </button>
                ) : (
                  <span className="rounded-lg bg-primary/10 px-4 py-2.5 text-sm font-bold text-textLight">
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
  const { user } = useAuth();
  const isBusiness =
    user?.role === ROLES.BUSINESS;

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

  if (isBusiness) {
    return (
      <>
        <BusinessAppointmentCalendar
          items={state.items}
          loading={state.loading}
          error={state.error}
          keyword={keyword}
          appliedKeyword={appliedKeyword}
          status={status}
          onKeywordChange={setKeyword}
          onSearch={(nextKeyword) =>
            changeFilter(
              setAppliedKeyword,
              nextKeyword,
            )
          }
          onStatusChange={(nextStatus) =>
            changeFilter(
              setStatus,
              nextStatus,
            )
          }
          onReset={() => {
            setState((current) => ({
              ...current,
              loading: true,
              error: "",
            }));
            setKeyword("");
            setAppliedKeyword("");
            setStatus("");
            setPageNumber(1);
          }}
          onOpenDetail={openDetail}
        />

        {selectedId && (
          <AppointmentDetailModal
            appointmentId={selectedId}
            perspective={
              selectedPerspective
            }
            onClose={closeDetail}
            onChanged={() => {
              setState((current) => ({
                ...current,
                loading: true,
                error: "",
              }));
              setVersion(
                (value) => value + 1,
              );
            }}
          />
        )}
      </>
    );
  }

  return (
    <section className="mx-auto min-h-[calc(100vh-220px)] w-full max-w-7xl px-4 pb-14 pt-7 sm:px-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
            Lịch giao dịch
          </p>
          <h1 className="mt-1 text-2xl font-black text-text sm:text-3xl">
            Lịch hẹn của tôi
          </h1>
          <p className="mt-1.5 text-sm text-textLight">
            Tất cả lịch kiểm định và thu gom trong giao dịch mua, bán của bạn.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-black">
          <span className="rounded-full bg-primary/10 px-3 py-1.5 text-primary">
            {inspectionCount} lịch kiểm định
          </span>
          <span className="rounded-full bg-textLight/10 px-3 py-1.5 text-textLight">
            {collectionCount} lịch thu gom
          </span>
        </div>
      </header>

      <div className="mt-4 rounded-xl border border-border bg-white p-3 shadow-[0_8px_24px_rgba(23,40,48,0.04)]">
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
                className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-textLight"
                aria-hidden="true"
              >
                search
              </span>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo tên đối tác..."
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm text-text outline-none focus:border-primary focus:bg-white"
            />
            </label>
            <button
              type="submit"
              className="rounded-lg border border-primary bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/10"
            >
              Tìm
            </button>
          </form>

          <select
            value={status}
            onChange={(event) => changeFilter(setStatus, event.target.value)}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-bold text-textLight outline-none focus:border-primary"
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
              className="rounded-lg px-3 py-2 text-sm font-bold text-primary transition hover:bg-primary/10"
            >
              Đặt lại
            </button>
          )}
        </div>
      </div>

      {state.loading && (
        <div className="mt-5 rounded-2xl border border-border bg-white p-12 text-center font-semibold text-textLight">
          Đang tải lịch hẹn...
        </div>
      )}

      {state.error && (
        <div className="mt-5 rounded-xl border border-error/30 bg-error/10 p-4 text-sm font-semibold text-error">
          {state.error}
        </div>
      )}

      {!state.loading && !state.error && state.items.length === 0 && (
        <div className="mt-5 rounded-2xl border border-border bg-white p-12 text-center shadow-[0_10px_30px_rgba(23,40,48,0.05)]">
          <span
            className="material-symbols-outlined text-5xl text-primary"
            aria-hidden="true"
          >
            event_busy
          </span>
          <h2 className="mt-3 font-black text-text">
            Chưa có lịch hẹn phù hợp
          </h2>
        </div>
      )}

      {!state.loading && !state.error && state.items.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-white shadow-[0_8px_24px_rgba(23,40,48,0.04)]">
          <div className="hidden grid-cols-[minmax(190px,1.15fr)_90px_165px_minmax(180px,1fr)_120px_110px_104px] items-center gap-3 bg-background px-5 py-3 text-[11px] font-black uppercase tracking-[0.08em] text-textLight lg:grid">
            <span>Lịch hẹn</span>
            <span>Vai trò</span>
            <span>Thời gian</span>
            <span>Địa điểm</span>
            <span>Check-in</span>
            <span>Trạng thái</span>
            <span className="sr-only">Thao tác</span>
          </div>
          <div className="divide-y divide-border">
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
                  className="grid gap-3 px-5 py-4 transition hover:bg-background lg:grid-cols-[minmax(190px,1.15fr)_90px_165px_minmax(180px,1fr)_120px_110px_104px] lg:items-center"
                >
                  <div className="min-w-0">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                        item.viewType === APPOINTMENT_TYPE.INSPECTION
                          ? "bg-primary/10 text-primary"
                          : "bg-textLight/10 text-textLight"
                      }`}
                    >
                      {item.viewTypeLabel}
                    </span>
                    <h2 className="mt-1.5 truncate text-sm font-black text-text">
                      {item.counterpartyName || "Người dùng HomeCycle"}
                    </h2>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase text-textLight lg:hidden">
                      Vai trò
                    </p>
                    <span className="text-xs font-black text-primary">
                      {item.viewPerspectiveLabel}
                    </span>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase text-textLight lg:hidden">
                      Thời gian
                    </p>
                    <p className="text-sm font-semibold text-text">
                      {formatDate(appointmentDate)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase text-textLight lg:hidden">
                      Địa điểm
                    </p>
                    <p className="truncate text-sm text-textLight" title={appointmentAddress}>
                      {appointmentAddress}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                        isChecked ? "text-success" : "text-textLight"
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
                      className="rounded-lg border border-primary bg-white px-4 py-2 text-sm font-black text-primary transition hover:bg-primary hover:text-white"
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
            className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold text-primary disabled:opacity-40"
          >
            Trước
          </button>
          <span className="text-sm font-bold text-textLight">
            Trang {currentPage}/{totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setPageNumber(currentPage + 1)}
            className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold text-primary disabled:opacity-40"
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