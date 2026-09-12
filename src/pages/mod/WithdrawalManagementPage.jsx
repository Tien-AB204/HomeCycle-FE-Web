import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Input,
  Modal,
  Select,
  Table,
  Tag,
} from "antd";
import {
  EyeInvisibleOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import moderatorWithdrawalApi from "../../services/apis/moderatorWithdrawalApi";

const { RangePicker } = DatePicker;

const PAGE_SIZE = 10;

const WITHDRAWAL_STATUS_META = {
  Pending: { label: "Chờ xử lý", color: "gold" },
  Approved: { label: "Đã duyệt", color: "blue" },
  Processing: { label: "Đang xử lý", color: "processing" },
  Completed: { label: "Hoàn tất", color: "success" },
  Rejected: { label: "Đã từ chối", color: "error" },
  Failed: { label: "Thất bại", color: "error" },
};

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "Pending", label: "Chờ xử lý" },
  { value: "Approved", label: "Đã duyệt" },
  { value: "Processing", label: "Đang xử lý" },
  { value: "Completed", label: "Hoàn tất" },
  { value: "Rejected", label: "Đã từ chối" },
  { value: "Failed", label: "Thất bại" },
];

const getWithdrawalStatusMeta = (status) => {
  const key = String(status ?? "").trim();

  return (
    WITHDRAWAL_STATUS_META[key] || {
      label: "Chưa xác định",
      color: "default",
    }
  );
};

const formatCurrency = (value) => {
  const amount = Number(value);

  return Number.isFinite(amount)
    ? `${amount.toLocaleString("vi-VN")} đ`
    : "—";
};

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
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

const WALLET_TRANSACTION_STATUS_META = {
  Pending: { label: "Đang chờ", color: "gold" },
  Completed: { label: "Hoàn tất", color: "success" },
  Failed: { label: "Thất bại", color: "error" },
  Cancelled: { label: "Đã hủy", color: "default" },
};

const getWalletTransactionStatusMeta = (status) => {
  const key = String(status ?? "").trim();

  return (
    WALLET_TRANSACTION_STATUS_META[key] || {
      label: "Không xác định",
      color: "default",
    }
  );
};

const WITHDRAWAL_EVENT_TYPE_LABELS = {
  Withdrawal_Lock: "Khóa tiền cho yêu cầu rút",
  Withdrawal_Success: "Rút tiền thành công",
  Withdrawal_Revert: "Hoàn tiền về số dư khả dụng",
};

const getWithdrawalEventTypeLabel = (value) => {
  const key = String(value ?? "").trim();

  return WITHDRAWAL_EVENT_TYPE_LABELS[key] || "Diễn biến giao dịch";
};

const BANK_VERIFY_STATUS_META = {
  Unverified: "Chưa xác thực",
  Pending: "Đang xác thực",
  Verified: "Đã xác thực",
  Rejected: "Bị từ chối",
};

const getBankVerifyStatusLabel = (value) => {
  const key = String(value ?? "").trim();

  return BANK_VERIFY_STATUS_META[key] || "Không xác định";
};

const maskAccountNumber = (value) => {
  const digits = String(value ?? "").trim();

  if (!digits) {
    return "";
  }

  if (digits.length <= 6) {
    return "•".repeat(digits.length);
  }

  const first = digits.slice(0, 3);
  const last = digits.slice(-3);

  return `${first}${"•".repeat(digits.length - 6)}${last}`;
};

const WithdrawalManagementPage = () => {
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [dateRange, setDateRange] = useState(null);

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const [state, setState] = useState({
    items: [],
    totalCount: 0,
    loading: true,
    error: "",
  });

  const [selectedWithdrawalId, setSelectedWithdrawalId] = useState("");

  const [detailState, setDetailState] = useState({
    withdrawalId: "",
    loading: false,
    data: null,
    error: "",
  });

  const [isAccountRevealed, setIsAccountRevealed] = useState(false);

  const detailRequestRef = useRef(0);
  const detailControllerRef = useRef(null);

  const listParams = useMemo(() => {
    const fromDate = dateRange?.[0]?.startOf("day").toISOString();
    const toDate = dateRange?.[1]?.endOf("day").toISOString();

    return {
      pageNumber,
      pageSize,
      keyword,
      status,
      fromDate,
      toDate,
    };
  }, [pageNumber, pageSize, keyword, status, dateRange]);

  const loadWithdrawals = useCallback(
    async (signal) => {
      setState((current) => ({ ...current, loading: true, error: "" }));

      try {
        const result = await moderatorWithdrawalApi.getWithdrawals({
          ...listParams,
          signal,
        });

        setState({
          items: result.items,
          totalCount: result.totalCount,
          loading: false,
          error: "",
        });
      } catch (error) {
        if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
          return;
        }

        setState({
          items: [],
          totalCount: 0,
          loading: false,
          error: "Không thể tải danh sách yêu cầu rút tiền. Vui lòng thử lại.",
        });
      }
    },
    [listParams],
  );

  useEffect(() => {
    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      void loadWithdrawals(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [loadWithdrawals]);

  const applyKeyword = () => {
    setPageNumber(1);
    setKeyword(keywordInput.trim());
  };

  const changeStatus = (nextStatus) => {
    setPageNumber(1);
    setStatus(nextStatus || "");
  };

  const changeDateRange = (nextRange) => {
    setPageNumber(1);
    setDateRange(nextRange);
  };

  const loadWithdrawalDetail = (withdrawalId) => {
    detailControllerRef.current?.abort();

    const controller = new AbortController();
    detailControllerRef.current = controller;

    const requestId = detailRequestRef.current + 1;
    detailRequestRef.current = requestId;

    setDetailState({
      withdrawalId,
      loading: true,
      data: null,
      error: "",
    });

    moderatorWithdrawalApi
      .getWithdrawalById(withdrawalId, { signal: controller.signal })
      .then((data) => {
        if (detailRequestRef.current !== requestId) {
          return;
        }

        setDetailState({
          withdrawalId,
          loading: false,
          data,
          error: "",
        });
      })
      .catch((error) => {
        if (detailRequestRef.current !== requestId) {
          return;
        }

        if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
          return;
        }

        const status = error?.response?.status;
        const code =
          error?.response?.data?.code ??
          error?.response?.data?.error?.code ??
          "";

        const isNotFound = status === 404 || code === "Withdrawal.NotFound";

        setDetailState({
          withdrawalId,
          loading: false,
          data: null,
          error: isNotFound
            ? "Không tìm thấy yêu cầu rút tiền."
            : "Không thể tải chi tiết yêu cầu rút tiền. Vui lòng thử lại.",
        });
      });
  };

  const openWithdrawalDetail = (withdrawalId) => {
    const id = String(withdrawalId || "").trim();

    if (!id) {
      return;
    }

    if (selectedWithdrawalId === id && detailState.loading) {
      return;
    }

    setSelectedWithdrawalId(id);
    setIsAccountRevealed(false);
    loadWithdrawalDetail(id);
  };

  const closeWithdrawalDetail = () => {
    detailControllerRef.current?.abort();

    setSelectedWithdrawalId("");
    setIsAccountRevealed(false);

    setDetailState({
      withdrawalId: "",
      loading: false,
      data: null,
      error: "",
    });
  };

  const columns = [
    {
      title: "Người dùng",
      dataIndex: "user",
      key: "user",
      render: (user) => (
        <div>
          <p className="font-bold text-text">
            {user?.username || "Người dùng HomeCycle"}
          </p>
          {user?.email && (
            <p className="text-xs text-textLight">{user.email}</p>
          )}
        </div>
      ),
    },
    {
      title: "Số tiền",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => (
        <span className="font-black text-text">
          {formatCurrency(amount)}
        </span>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (statusValue, record) => {
        const meta = getWithdrawalStatusMeta(statusValue);
        const needsAction =
          record?.actions?.canApprove || record?.actions?.canReject;

        return (
          <div className="flex flex-col items-start gap-1">
            <Tag color={meta.color}>{meta.label}</Tag>
            {needsAction && (
              <span className="text-[11px] font-semibold text-primary">
                Cần xử lý
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: "Ngân hàng",
      dataIndex: "bankName",
      key: "bank",
      render: (bankName, record) => (
        <div>
          <p className="font-semibold text-text">
            {bankName || "Chưa xác định"}
          </p>
          <p className="text-xs text-textLight">
            {record?.maskedAccountNumber || "—"}
          </p>
        </div>
      ),
    },
    {
      title: "Thời gian yêu cầu",
      dataIndex: "requestedAt",
      key: "requestedAt",
      render: (value) => formatDateTime(value),
    },
    {
      title: "Thời gian xử lý",
      dataIndex: "processedAt",
      key: "processedAt",
      render: (value) => formatDateTime(value),
    },
    {
      title: "Lý do từ chối",
      dataIndex: "rejectReason",
      key: "rejectReason",
      ellipsis: true,
      render: (value) =>
        value ? (
          <span className="text-xs text-error" title={value}>
            {value}
          </span>
        ) : (
          "—"
        ),
    },
    {
      title: "",
      key: "detailAction",
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => openWithdrawalDetail(record.withdrawalId)}
        >
          Xem chi tiết
        </Button>
      ),
    },
  ];

  return (
    <section className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-3xl bg-primary px-6 py-7 text-white shadow-[0_18px_50px_rgba(23,40,48,0.14)]">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/65">
          Trung tâm kiểm duyệt
        </p>

        <h1 className="mt-2 text-3xl font-black">
          Quản lý yêu cầu rút tiền
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
          Theo dõi các yêu cầu rút tiền của người dùng trên toàn hệ thống theo
          trạng thái và thời gian.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-white p-4 shadow-[0_10px_28px_rgba(24,63,65,0.05)]">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-textLight">
            Tìm kiếm
          </label>
          <Input
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            onPressEnter={applyKeyword}
            placeholder="Tên, email hoặc tài khoản ngân hàng..."
            prefix={<SearchOutlined />}
            allowClear
          />
        </div>

        <div className="min-w-[180px]">
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-textLight">
            Trạng thái
          </label>
          <Select
            value={status || ""}
            onChange={changeStatus}
            options={STATUS_FILTER_OPTIONS}
            className="w-full"
          />
        </div>

        <div className="min-w-[260px]">
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-textLight">
            Thời gian yêu cầu
          </label>
          <RangePicker
            value={dateRange}
            onChange={changeDateRange}
            className="w-full"
            allowClear
          />
        </div>

        <Button type="primary" icon={<SearchOutlined />} onClick={applyKeyword}>
          Tìm kiếm
        </Button>

        <Button
          icon={<ReloadOutlined />}
          onClick={() => void loadWithdrawals()}
          disabled={state.loading}
        >
          Làm mới
        </Button>
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-white p-4 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-5">
        {state.error && (
          <Alert
            type="error"
            showIcon
            message={state.error}
            className="mb-4"
          />
        )}

        <Table
          rowKey={(record) => record.withdrawalId}
          columns={columns}
          dataSource={state.items}
          loading={state.loading}
          locale={{
            emptyText: (
              <Empty description="Chưa có yêu cầu rút tiền phù hợp." />
            ),
          }}
          pagination={{
            current: pageNumber,
            pageSize,
            total: state.totalCount,
            showSizeChanger: true,
            onChange: (nextPage, nextPageSize) => {
              setPageNumber(nextPage);
              setPageSize(nextPageSize);
            },
          }}
          scroll={{ x: true }}
        />
      </div>

      <Modal
        title="Chi tiết yêu cầu rút tiền"
        open={Boolean(selectedWithdrawalId)}
        onCancel={closeWithdrawalDetail}
        footer={
          <Button onClick={closeWithdrawalDetail}>Đóng</Button>
        }
        destroyOnClose
      >
        {detailState.loading && (
          <div
            role="status"
            className="rounded-xl border border-border bg-background p-5 text-center text-sm font-semibold text-textLight"
          >
            Đang tải chi tiết yêu cầu rút tiền...
          </div>
        )}

        {!detailState.loading && detailState.error && (
          <Alert type="error" showIcon message={detailState.error} />
        )}

        {!detailState.loading &&
          !detailState.error &&
          detailState.data &&
          (() => {
            const detail = detailState.data;

            const statusMeta = getWithdrawalStatusMeta(
              detail.status ?? detail.Status,
            );

            const user = detail.user ?? detail.User ?? {};
            const bankAccount =
              detail.bankAccount ?? detail.BankAccount ?? {};
            const processedBy =
              detail.processedBy ?? detail.ProcessedBy ?? null;

            const financialEvents = Array.isArray(
              detail.financialEvents ?? detail.FinancialEvents,
            )
              ? detail.financialEvents ?? detail.FinancialEvents
              : [];

            const rejectReason = String(
              detail.rejectReason ?? detail.RejectReason ?? "",
            ).trim();

            const processedAt = detail.processedAt ?? detail.ProcessedAt;

            const rawAccountNumber = String(
              bankAccount.accountNumber ?? bankAccount.AccountNumber ?? "",
            ).trim();

            const isAccountNumberNumeric = /^[0-9]+$/.test(rawAccountNumber);

            const canRevealAccountNumber =
              isAccountNumberNumeric && rawAccountNumber.length > 6;

            const maskedDisplay = isAccountNumberNumeric
              ? maskAccountNumber(rawAccountNumber)
              : rawAccountNumber;

            const displayedAccountNumber =
              canRevealAccountNumber && isAccountRevealed
                ? rawAccountNumber
                : maskedDisplay || "—";

            const bankCode = String(
              bankAccount.bankCode ?? bankAccount.BankCode ?? "",
            ).trim();

            const canApprove = Boolean(
              detail.actions?.canApprove ?? detail.Actions?.CanApprove,
            );

            const canReject = Boolean(
              detail.actions?.canReject ?? detail.Actions?.CanReject,
            );

            return (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-textLight">
                        Số tiền
                      </p>
                      <p className="mt-1 text-xl font-black text-text">
                        {formatCurrency(detail.amount ?? detail.Amount)}
                      </p>
                    </div>

                    <Tag color={statusMeta.color}>{statusMeta.label}</Tag>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-textLight">
                    <span>
                      Yêu cầu lúc{" "}
                      {formatDateTime(
                        detail.requestedAt ?? detail.RequestedAt,
                      )}
                    </span>
                    <span>Xử lý lúc {formatDateTime(processedAt)}</span>
                  </div>

                  {rejectReason && (
                    <p className="mt-3 text-xs font-semibold text-error">
                      Lý do: {rejectReason}
                    </p>
                  )}

                  <p className="mt-3 text-[11px] text-textLight">
                    {canApprove || canReject
                      ? "Có thể xử lý"
                      : "Không còn thao tác xử lý"}
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-primary">
                    Người dùng
                  </p>

                  <p className="mt-2 font-bold text-text">
                    {user.username || "Người dùng HomeCycle"}
                  </p>

                  {user.email && (
                    <p className="text-xs text-textLight">{user.email}</p>
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-primary">
                    Thông tin tài khoản ngân hàng
                  </p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase text-textLight">
                        Ngân hàng
                      </p>
                      <p className="mt-1 font-bold text-text">
                        {bankAccount.bankName ??
                          bankAccount.BankName ??
                          "—"}
                        {bankCode ? ` (${bankCode})` : ""}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase text-textLight">
                        Chủ tài khoản
                      </p>
                      <p className="mt-1 font-bold text-text">
                        {bankAccount.accountName ??
                          bankAccount.AccountName ??
                          "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase text-textLight">
                        Số tài khoản
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="font-mono font-bold tracking-wide text-text">
                          {displayedAccountNumber}
                        </p>

                        {canRevealAccountNumber && (
                          <button
                            type="button"
                            onClick={() =>
                              setIsAccountRevealed((current) => !current)
                            }
                            aria-label={
                              isAccountRevealed
                                ? "Ẩn số tài khoản"
                                : "Hiện số tài khoản"
                            }
                            className="text-textLight transition hover:text-primary"
                          >
                            {isAccountRevealed ? (
                              <EyeInvisibleOutlined />
                            ) : (
                              <EyeOutlined />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase text-textLight">
                        Trạng thái xác thực
                      </p>
                      <p className="mt-1 font-bold text-text">
                        {getBankVerifyStatusLabel(
                          bankAccount.verifyStatus ??
                            bankAccount.VerifyStatus,
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {processedBy && (
                  <div className="rounded-2xl border border-border bg-background/60 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-primary">
                      Người xử lý
                    </p>
                    <p className="mt-2 font-bold text-text">
                      {processedBy.username ??
                        processedBy.Username ??
                        "—"}
                    </p>
                  </div>
                )}

                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-primary">
                    Diễn biến tài chính
                  </p>

                  {financialEvents.length === 0 ? (
                    <p className="mt-2 text-sm text-textLight">
                      Chưa có diễn biến tài chính.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {financialEvents.map((event, index) => {
                        const eventKey =
                          event.walletTransactionId ??
                          event.WalletTransactionId ??
                          index;

                        const eventStatusMeta =
                          getWalletTransactionStatusMeta(
                            event.status ?? event.Status,
                          );

                        return (
                          <div
                            key={eventKey}
                            className="rounded-xl border border-border bg-white p-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className="text-sm font-bold text-text">
                                {getWithdrawalEventTypeLabel(
                                  event.transactionType ??
                                    event.TransactionType,
                                )}
                              </p>
                              <span className="text-sm font-black text-text">
                                {formatCurrency(
                                  event.amount ?? event.Amount,
                                )}
                              </span>
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-textLight">
                              <Tag color={eventStatusMeta.color}>
                                {eventStatusMeta.label}
                              </Tag>
                              <span>
                                {formatDateTime(
                                  event.createdAt ?? event.CreatedAt,
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
      </Modal>
    </section>
  );
};

export default WithdrawalManagementPage;
