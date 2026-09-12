import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import orderApi from "../../services/apis/orderApi";
import paymentApi from "../../services/apis/paymentApi";

const PENDING_AGREEMENT_KEY =
  "homecycle:pending-payment-agreement-id";

const getErrorMessage = (error) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.response?.data?.detail ||
  "Hệ thống chưa thể xác nhận giao dịch.";

const isRequestCancelled = (error) =>
  error?.name === "CanceledError" ||
  error?.code === "ERR_CANCELED";

const PaymentResultPage = () => {
  const [searchParams] =
    useSearchParams();

  const location =
    useLocation();

  const agreementId =
    localStorage.getItem(
      PENDING_AGREEMENT_KEY,
    ) || "";

  const payOsStatus =
    String(
      searchParams.get("status") || "",
    ).toUpperCase();

  const cancelledByRoute =
    location.pathname.endsWith(
      "/cancel",
    ) ||
    String(
      searchParams.get("cancel") || "",
    ).toLowerCase() === "true";

  const [state, setState] =
    useState({
      loading:
        Boolean(agreementId) &&
        !cancelledByRoute,

      status:
        cancelledByRoute
          ? "Cancelled"
          : "",

      statusDetail: null,
      order: null,
      error: "",
    });

  useEffect(() => {
    const controller =
      new AbortController();

    const timeoutId =
      window.setTimeout(
        async () => {
          if (
            !agreementId ||
            cancelledByRoute
          ) {
            return;
          }

          try {
            const statusDetail =
              await paymentApi
                .getStatusDetail(
                  agreementId,
                  {
                    signal:
                      controller.signal,
                  },
                );

            const status =
              statusDetail
                .paymentStatus;

            let order = null;

            if (
              status.toLowerCase() ===
              "completed"
            ) {
              /*
               * Current Backend already returns OrderId / AppointmentId.
               * We preserve those identifiers first. Order detail is an
               * optional enrichment for this screen, not payment authority.
               */
              try {
                order =
                  await orderApi
                    .getByAgreementId(
                      agreementId,
                      {
                        signal:
                          controller.signal,
                      },
                    );
              } catch (orderError) {
                if (
                  isRequestCancelled(
                    orderError,
                  )
                ) {
                  return;
                }

                order = null;
              }

              localStorage.removeItem(
                PENDING_AGREEMENT_KEY,
              );
            }

            setState({
              loading: false,
              status,
              statusDetail,
              order,
              error: "",
            });
          } catch (error) {
            if (
              !isRequestCancelled(
                error,
              )
            ) {
              setState({
                loading: false,

                /*
                 * A PAID query parameter is not authoritative.
                 * Keep the UI pending until the Backend confirms.
                 */
                status:
                  payOsStatus === "PAID"
                    ? "Pending"
                    : "",

                statusDetail: null,
                order: null,

                error:
                  getErrorMessage(
                    error,
                  ),
              });
            }
          }
        },
        0,
      );

    return () => {
      window.clearTimeout(
        timeoutId,
      );

      controller.abort();
    };
  }, [
    agreementId,
    cancelledByRoute,
    payOsStatus,
  ]);

  const normalizedStatus =
    String(state.status || "")
      .trim()
      .toLowerCase();

  const completed =
    normalizedStatus ===
    "completed";

  const pending =
    normalizedStatus ===
    "pending";

  const refunded =
    normalizedStatus ===
    "refunded";

  const partiallyRefunded =
    normalizedStatus ===
    "partiallyrefunded";

  const cancelled =
    normalizedStatus ===
      "cancelled" ||
    (
      !normalizedStatus &&
      cancelledByRoute
    );

  const expired =
    normalizedStatus ===
    "expired";

  const failed =
    normalizedStatus ===
    "failed";

  const resultOrderId =
    String(
      state.statusDetail
        ?.orderId ||
        state.order
          ?.orderId ||
        "",
    ).trim();

  const resultAppointmentId =
    String(
      state.statusDetail
        ?.appointmentId ||
        "",
    ).trim();

  const title = (() => {
    if (completed) {
      return "Thanh toán thành công";
    }

    if (pending) {
      return "Đang chờ xác nhận thanh toán";
    }

    if (refunded) {
      return "Giao dịch đã được hoàn tiền";
    }

    if (partiallyRefunded) {
      return "Giao dịch đã hoàn tiền một phần";
    }

    if (expired) {
      return "Liên kết thanh toán đã hết hạn";
    }

    if (cancelled) {
      return "Thanh toán đã được hủy";
    }

    if (failed) {
      return "Thanh toán chưa thành công";
    }

    if (state.loading) {
      return "Đang xác nhận giao dịch";
    }

    return "Chưa xác nhận được giao dịch";
  })();

  const description = (() => {
    if (completed) {
      return "HomeCycle đã xác nhận thanh toán từ máy chủ và cập nhật giao dịch.";
    }

    if (pending) {
      return payOsStatus === "PAID"
        ? "PayOS đã chuyển bạn về nhưng HomeCycle vẫn đang đồng bộ trạng thái. Không dùng URL PayOS để kết luận thanh toán thành công."
        : "Giao dịch vẫn đang chờ thanh toán hoặc chờ hệ thống đồng bộ.";
    }

    if (refunded) {
      return "Khoản thanh toán đã được hoàn lại theo trạng thái hiện tại của máy chủ.";
    }

    if (partiallyRefunded) {
      return "Một phần khoản thanh toán đã được hoàn lại theo trạng thái hiện tại của máy chủ.";
    }

    if (expired) {
      return "Liên kết PayOS trước đã hết hiệu lực. Hãy quay lại thỏa thuận để tạo lại thanh toán nếu vẫn cần.";
    }

    if (cancelled) {
      return "Phiên thanh toán đã được hủy. Bạn có thể quay lại thỏa thuận để kiểm tra trước khi thử lại.";
    }

    if (failed) {
      return "Máy chủ ghi nhận giao dịch không thành công.";
    }

    return "Không thể kết luận giao dịch chỉ từ đường dẫn trả về của PayOS. Hãy kiểm tra lại từ thỏa thuận hoặc lịch sử thanh toán.";
  })();

  return (
    <section className="mx-auto flex min-h-[65vh] w-full max-w-2xl items-center px-4 py-10 sm:px-6">
      <div className="w-full rounded-2xl border border-border bg-white p-7 text-center shadow-[0_16px_42px_rgba(23,40,48,0.09)] sm:p-10">
        <span
          className={[
            "material-symbols-outlined text-5xl",
            completed
              ? "text-success"
              : cancelled ||
                  expired ||
                  failed
                ? "text-error"
                : "text-primary",
          ].join(" ")}
          aria-hidden="true"
        >
          {completed
            ? "check_circle"
            : cancelled ||
                expired ||
                failed
              ? "cancel"
              : state.loading
                ? "progress_activity"
                : "sync"}
        </span>

        <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-primary">
          Kết quả thanh toán
        </p>

        <h1 className="mt-2 text-2xl font-black text-text">
          {title}
        </h1>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-textLight">
          {description}
        </p>

        {state.error && (
          <div className="mt-5 rounded-xl border border-warning/30 bg-warning/10 p-4 text-left text-sm leading-6 text-warning">
            {state.error}
          </div>
        )}

        {completed &&
          (state.order ||
            resultOrderId) && (
            <div className="mt-5 rounded-xl border border-success/30 bg-success/10 p-4 text-left text-sm text-success">
              <p>
                <strong>
                  Đơn hàng:
                </strong>{" "}
                {state.order
                  ?.orderCode ||
                  resultOrderId}
              </p>

              {state.order
                ?.quantity !==
                undefined && (
                <p className="mt-1">
                  <strong>
                    Số lượng:
                  </strong>{" "}
                  {
                    state.order
                      .quantity
                  }
                </p>
              )}

              {resultAppointmentId && (
                <p className="mt-1">
                  Lịch hẹn đã được tạo hoặc liên kết với giao dịch này.
                </p>
              )}
            </div>
          )}

        {!agreementId && (
          <p className="mt-5 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
            Không tìm thấy mã thỏa thuận đã lưu để đối chiếu giao dịch.
            Bạn có thể mở Trung tâm thanh toán để kiểm tra các giao dịch gần đây.
          </p>
        )}

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {resultOrderId && (
            <Link
              to={`/don-hang/${resultOrderId}`}
              className="rounded-lg bg-primary px-5 py-3 text-sm font-black text-white transition hover:bg-primary/90"
            >
              Xem đơn hàng
            </Link>
          )}

          {completed &&
            resultAppointmentId && (
              <Link
                to="/lich-hen"
                className="rounded-lg border border-primary bg-white px-5 py-3 text-sm font-black text-primary transition hover:bg-primary/10"
              >
                Xem lịch hẹn
              </Link>
            )}

          <Link
            to="/thanh-toan"
            className="rounded-lg border border-primary bg-white px-5 py-3 text-sm font-black text-primary transition hover:bg-primary/10"
          >
            Trung tâm thanh toán
          </Link>

          <Link
            to="/"
            className="rounded-lg border border-border bg-white px-5 py-3 text-sm font-black text-text transition hover:bg-background"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PaymentResultPage;