import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getNegotiationStatusMeta } from "../../constants/negotiations";
import negotiationApi from "../../services/apis/negotiationApi";

const PAGE_SIZE = 10;

const isCanceledRequest = (error) => {
  return error?.name === "CanceledError" || error?.code === "ERR_CANCELED";
};

const getErrorMessage = (error, fallbackMessage) => {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallbackMessage
  );
};

const formatCurrency = (value) => {
  const amount = Number(value);

  return value !== null && value !== undefined && Number.isFinite(amount)
    ? `${amount.toLocaleString("vi-VN")} đ`
    : "—";
};

const formatDate = (value) => {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const NegotiationListPage = () => {
  const [pageNumber, setPageNumber] = useState(1);
  const [requestVersion, setRequestVersion] = useState(0);
  const requestKey = `${pageNumber}:${requestVersion}`;
  const [requestState, setRequestState] = useState({
    requestKey: "",
    result: null,
    error: "",
  });

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    negotiationApi
      .getAll({
        pageNumber,
        pageSize: PAGE_SIZE,
        signal: controller.signal,
      })
      .then((result) => {
        if (isActive) {
          setRequestState({ requestKey, result, error: "" });
        }
      })
      .catch((requestError) => {
        if (!isActive || isCanceledRequest(requestError)) {
          return;
        }

        setRequestState({
          requestKey,
          result: null,
          error: getErrorMessage(
            requestError,
            "Không thể tải danh sách phiên thương lượng.",
          ),
        });
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [pageNumber, requestKey]);

  const loading = requestState.requestKey !== requestKey;
  const result = loading ? null : requestState.result;
  const error = loading ? "" : requestState.error;
  const negotiations = Array.isArray(result?.items) ? result.items : [];

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <div className="overflow-hidden rounded-2xl border border-[#BAC2C1]/40 bg-white shadow-sm">
        <div className="bg-[#172830] px-6 py-6 text-white sm:flex sm:items-end sm:justify-between sm:gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C1EAEC]">
              Trung tâm giao dịch
            </p>
            <h1 className="mt-2 text-2xl font-black">Phiên thương lượng</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#B7C9D4]">
              Tiếp tục trao đổi giá và số lượng với đối tác sau khi đề nghị được chấp nhận.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 sm:mt-0">
            <Link
              to="/thuong-luong"
              className="rounded-lg border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
            >
              Quản lý đề nghị
            </Link>
            <button
              type="button"
              onClick={() =>
                setRequestVersion((currentVersion) => currentVersion + 1)
              }
              className="rounded-lg bg-[#2B5659] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#547B7D]"
            >
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div role="status" className="mt-5 rounded-xl border border-[#BAC2C1]/40 bg-white p-12 text-center text-[#547B7D] shadow-sm">
          <span className="material-symbols-outlined animate-spin text-3xl">refresh</span>
          <p className="mt-2 text-sm font-semibold">Đang tải phiên thương lượng...</p>
        </div>
      )}

      {error && !loading && (
        <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="font-semibold text-red-700">{error}</p>
          <button
            type="button"
            onClick={() =>
              setRequestVersion((currentVersion) => currentVersion + 1)
            }
            className="mt-4 rounded-lg bg-[#7A1012] px-4 py-2 text-sm font-bold text-white"
          >
            Thử lại
          </button>
        </div>
      )}

      {!loading && !error && negotiations.length === 0 && (
        <div className="mt-5 rounded-xl border border-dashed border-[#BAC2C1] bg-white px-6 py-14 text-center shadow-sm">
          <span className="text-5xl" aria-hidden="true">💬</span>
          <h2 className="mt-4 text-lg font-bold text-[#172830]">
            Chưa có phiên thương lượng
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#547B7D]">
            Phiên mới sẽ xuất hiện khi chủ bài đăng chấp nhận một đề nghị mua hàng.
          </p>
          <Link
            to="/thuong-luong"
            className="mt-5 inline-flex rounded-lg bg-[#2B5659] px-5 py-3 text-sm font-bold text-white"
          >
            Xem các đề nghị
          </Link>
        </div>
      )}

      {!loading && !error && negotiations.length > 0 && (
        <>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {negotiations.map((negotiation) => {
              const statusMeta = getNegotiationStatusMeta(
                negotiation.negotiationStatus,
              );
              const name = negotiation.otherPartyName;

              return (
                <article
                  key={negotiation.negotiationId}
                  className="rounded-xl border border-[#BAC2C1]/40 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      {negotiation.otherPartyAvatarUrl ? (
                        <img
                          src={negotiation.otherPartyAvatarUrl}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2B5659] text-lg font-black text-white">
                          {name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#547B7D]">Đang trao đổi với</p>
                        <p className="truncate font-bold text-[#172830]">{name}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-[#7A1012]/8 p-3">
                      <p className="text-xs font-semibold text-[#7A1012]">Mức giá hiện tại</p>
                      <p className="mt-1 text-lg font-black text-[#7A1012]">
                        {formatCurrency(negotiation.currentOfferPrice)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-[#f5f8f8] p-3">
                      <p className="text-xs font-semibold text-[#547B7D]">Số lượng</p>
                      <p className="mt-1 text-lg font-black text-[#172830]">
                        {negotiation.currentOfferQuantity ?? "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#BAC2C1]/25 pt-4">
                    <p className="text-xs text-[#547B7D]">
                      Cập nhật {formatDate(negotiation.lastMessageAt)}
                    </p>
                    <Link
                      to={`/thuong-luong/${encodeURIComponent(negotiation.negotiationId)}`}
                      state={{ negotiationSummary: negotiation }}
                      className="rounded-lg bg-[#2B5659] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#172830]"
                    >
                      Mở phòng
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-xl border border-[#BAC2C1]/35 bg-white p-4 sm:flex-row">
            <p className="text-sm font-medium text-[#547B7D]">
              Trang {result?.pageNumber ?? pageNumber} / {Math.max(result?.totalPages ?? 1, 1)}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPageNumber((currentPage) => currentPage - 1)}
                disabled={!result?.hasPreviousPage}
                className="rounded-lg border border-[#BAC2C1] bg-white px-4 py-2 text-sm font-bold text-[#172830] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trang trước
              </button>
              <button
                type="button"
                onClick={() => setPageNumber((currentPage) => currentPage + 1)}
                disabled={!result?.hasNextPage}
                className="rounded-lg border border-[#BAC2C1] bg-white px-4 py-2 text-sm font-bold text-[#172830] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trang sau
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default NegotiationListPage;
