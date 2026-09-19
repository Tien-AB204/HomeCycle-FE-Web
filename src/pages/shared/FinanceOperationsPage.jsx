import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Drawer, Empty, Input, Select, Spin, Table, Tag } from "antd";
import financeOperationsApi from "../../services/apis/financeOperationsApi";

const PAGE_SIZE = 10;

const TRANSACTION_TYPE_LABELS = {
  Escrow_Deposit: "Nạp tiền ký quỹ",
  Wallet_Payment: "Thanh toán qua ví",
  Payout_Release: "Giải ngân cho người bán",
  Order_Refund: "Hoàn tiền đơn hàng",
  Withdrawal_Lock: "Khóa tiền cho yêu cầu rút",
  Withdrawal_Success: "Rút tiền thành công",
  Withdrawal_Revert: "Hoàn tiền yêu cầu rút",
  Commission_Fee: "Phí hoa hồng",
  Subscription_Fee: "Phí gói đăng ký",
  Shipping_Fee_Collected: "Thu phí vận chuyển",
};

const REFERENCE_TYPE_LABELS = {
  Order: "Đơn hàng",
  Subscription: "Gói đăng ký",
  Dispute: "Tranh chấp",
  Withdrawal: "Yêu cầu rút tiền",
};

const TRANSACTION_STATUS_LABELS = {
  Pending: "Đang chờ",
  Completed: "Hoàn tất",
  Failed: "Thất bại",
  Cancelled: "Đã hủy",
};

const USER_ROLE_LABELS = {
  Personal: "Cá nhân",
  Business: "Doanh nghiệp",
  Moderator: "Kiểm duyệt viên",
  Admin: "Quản trị viên",
};

const WALLET_TYPE_LABELS = {
  Personal: "Cá nhân",
  Business: "Doanh nghiệp",
  System: "Hệ thống",
};

const SYSTEM_PURPOSE_LABELS = {
  Shipping_Escrow: "Ký quỹ vận chuyển",
  Platform_Revenue: "Doanh thu nền tảng",
};

const LEDGER_DIRECTION_LABELS = {
  In: "Vào",
  Out: "Ra",
};

const LEDGER_BALANCE_TYPE_LABELS = {
  Available: "Khả dụng",
  Hold: "Đang giữ",
};

const formatEnumFallback = (value) =>
  String(value || "")
    .split("_")
    .filter(Boolean)
    .join(" ");

const getLabel = (map, value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return map[value] || formatEnumFallback(value) || "—";
};

const shortenId = (value) => {
  const id = String(value || "").trim();

  if (!id) {
    return "";
  }

  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
};

const getReferenceLabel = (referenceType, referenceCode, referenceId) => {
  const typeLabel = referenceType
    ? getLabel(REFERENCE_TYPE_LABELS, referenceType)
    : "";

  if (referenceCode) {
    return typeLabel ? `${typeLabel} · ${referenceCode}` : referenceCode;
  }

  if (referenceId) {
    const shortened = shortenId(referenceId);
    return typeLabel ? `${typeLabel} · ${shortened}` : shortened;
  }

  return typeLabel || "—";
};

const getPartyDisplayName = (party) => {
  if (!party) {
    return "—";
  }

  if (party.username) {
    return party.username;
  }

  if (party.systemPurpose) {
    return getLabel(SYSTEM_PURPOSE_LABELS, party.systemPurpose);
  }

  return getLabel(WALLET_TYPE_LABELS, party.walletType);
};

const getPartySubLabel = (party) => {
  if (!party) {
    return "";
  }

  if (party.username) {
    return getLabel(USER_ROLE_LABELS, party.role);
  }

  return getLabel(WALLET_TYPE_LABELS, party.walletType);
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const formatCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "medium",
      }).format(date);
};

const toIsoStartOfDay = (value) =>
  value ? new Date(`${value}T00:00:00`).toISOString() : undefined;

const toIsoEndOfDay = (value) =>
  value ? new Date(`${value}T23:59:59`).toISOString() : undefined;

const DetailField = ({ label, value }) => (
  <div>
    <p className="text-xs font-semibold uppercase text-textLight">{label}</p>
    <p className="mt-1 break-all text-sm font-bold text-text">
      {value === null || value === undefined || value === "" ? "—" : value}
    </p>
  </div>
);

const PartyCard = ({ title, party }) => (
  <div className="rounded-xl border border-border bg-background/60 p-4">
    <p className="text-xs font-black uppercase tracking-wide text-primary">{title}</p>
    <p className="mt-2 text-sm font-black text-text">{getPartyDisplayName(party)}</p>
    <p className="mt-1 text-xs text-textLight">{getPartySubLabel(party)}</p>
  </div>
);

const FundsPanel = ({ data, loading, error }) => {
  if (loading) return <Spin />;
  if (error) return <Alert type="error" showIcon message={error} />;
  if (!data) return null;

  const primaryRows = [
    ["Tổng số dư khả dụng người dùng", data.totalUserAvailable],
    ["Tổng tiền người dùng đang giữ", data.totalUserHold],
    ["Tổng số dư khả dụng ví hệ thống", data.totalSystemAvailable],
    ["Tổng tiền ví hệ thống đang giữ", data.totalSystemHold],
    ["Tổng số dư được ghi nhận", data.totalRecordedBalance],
  ];

  const breakdownRows = [
    ["Cá nhân · Khả dụng", data.totalPersonalAvailable],
    ["Cá nhân · Đang giữ", data.totalPersonalHold],
    ["Doanh nghiệp · Khả dụng", data.totalBusinessAvailable],
    ["Doanh nghiệp · Đang giữ", data.totalBusinessHold],
  ];

  const systemWallets = Array.isArray(data.systemWallets)
    ? data.systemWallets
    : [];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {primaryRows.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-textLight">
              {label}
            </div>
            <div className="mt-2 text-xl font-black text-text">
              {formatCurrency(value)}
            </div>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-2 text-xs font-black uppercase tracking-wide text-textLight">
          Theo loại tài khoản
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {breakdownRows.map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-border bg-background/60 p-3"
            >
              <div className="text-xs font-bold text-textLight">{label}</div>
              <div className="mt-1 text-base font-black text-text">
                {formatCurrency(value)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {systemWallets.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-textLight">
            Ví hệ thống
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {systemWallets.map((wallet) => (
              <div
                key={wallet.walletId}
                className="rounded-xl border border-border bg-white p-3"
              >
                <p className="text-sm font-black text-text">
                  {wallet.purpose
                    ? getLabel(SYSTEM_PURPOSE_LABELS, wallet.purpose)
                    : getLabel(WALLET_TYPE_LABELS, wallet.walletType)}
                </p>
                <p className="mt-1 text-xs text-textLight">
                  Khả dụng {formatCurrency(wallet.availableBalance)} · Đang giữ{" "}
                  {formatCurrency(wallet.holdBalance)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const HoldsPanel = ({ data, loading, error }) => {
  const [searchTerm, setSearchTerm] = useState("");

  if (loading) return <Spin />;
  if (error) return <Alert type="error" showIcon message={error} />;

  const items = Array.isArray(data) ? data : [];

  if (!items.length) {
    return <Empty description="Không có khoản tiền đang giữ." />;
  }

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredItems = normalizedSearch
    ? items.filter((item) => {
        const haystack = [
          item.owner?.username,
          getLabel(REFERENCE_TYPE_LABELS, item.referenceType),
          item.referenceCode,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedSearch);
      })
    : items;

  const columns = [
    {
      title: "Chủ ví",
      render: (_, item) => (
        <div>
          <p className="font-bold text-text">
            {getPartyDisplayName(item.owner)}
          </p>
          <p className="text-xs text-textLight">
            {getPartySubLabel(item.owner)}
          </p>
        </div>
      ),
    },
    {
      title: "Tham chiếu",
      render: (_, item) =>
        getReferenceLabel(
          item.referenceType,
          item.referenceCode,
          item.referenceId,
        ),
    },
    {
      title: "Số tiền đang giữ",
      align: "right",
      render: (_, item) => formatCurrency(item.holdAmount),
    },
  ];

  return (
    <div>
      <Input
        allowClear
        placeholder="Tìm theo chủ ví hoặc mã tham chiếu..."
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        className="mb-3 max-w-sm"
      />

      <Table
        rowKey={(item, index) =>
          `${item.walletId}-${item.referenceId ?? index}`
        }
        pagination={{
          defaultPageSize: 10,
          pageSizeOptions: [10, 20, 50],
          showSizeChanger: true,
        }}
        locale={{ emptyText: "Không có kết quả phù hợp." }}
        columns={columns}
        dataSource={filteredItems}
        scroll={{ x: 720 }}
      />
    </div>
  );
};

export default function FinanceOperationsPage({ admin = false }) {
  const [funds, setFunds] = useState({ loading: admin, data: null, error: "" });
  const [holds, setHolds] = useState({ loading: true, data: null, error: "" });
  const [filters, setFilters] = useState({
    transactionType: "",
    referenceType: "",
    status: "",
    fromDate: "",
    toDate: "",
  });
  const [pageNumber, setPageNumber] = useState(1);
  const transactionsRequestKey = `${filters.transactionType}|${filters.referenceType}|${filters.status}|${filters.fromDate}|${filters.toDate}|${pageNumber}`;
  const [transactions, setTransactions] = useState({
    requestKey: "",
    error: "",
    page: {
      items: [],
      pageNumber: 1,
      pageSize: PAGE_SIZE,
      totalCount: 0,
      totalPages: 0,
    },
  });
  const transactionsLoading =
    transactions.requestKey !== transactionsRequestKey;
  const [detailId, setDetailId] = useState("");
  const [detail, setDetail] = useState({ loading: false, data: null, error: "" });

  const loadFunds = useCallback(() => {
    if (!admin) return undefined;
    const controller = new AbortController();
    financeOperationsApi
      .getFunds({ signal: controller.signal })
      .then((data) => setFunds({ loading: false, data, error: "" }))
      .catch((error) => {
        if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return;
        setFunds({
          loading: false,
          data: null,
          error: getErrorMessage(error, "Không thể tải tổng quan số dư."),
        });
      });
    return () => controller.abort();
  }, [admin]);

  const loadHolds = useCallback(() => {
    const controller = new AbortController();
    financeOperationsApi
      .getHolds({ signal: controller.signal })
      .then((data) => setHolds({ loading: false, data, error: "" }))
      .catch((error) => {
        if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return;
        setHolds({
          loading: false,
          data: null,
          error: getErrorMessage(error, "Không thể tải các khoản tiền đang giữ."),
        });
      });
    return () => controller.abort();
  }, []);

  const handleReloadFunds = () => {
    setFunds((current) => ({ ...current, loading: true, error: "" }));
    loadFunds();
  };

  const handleReloadHolds = () => {
    setHolds((current) => ({ ...current, loading: true, error: "" }));
    loadHolds();
  };

  useEffect(() => loadFunds(), [loadFunds]);
  useEffect(() => loadHolds(), [loadHolds]);

  useEffect(() => {
    const controller = new AbortController();

    financeOperationsApi
      .getTransactions({
        ...filters,
        fromDate: toIsoStartOfDay(filters.fromDate),
        toDate: toIsoEndOfDay(filters.toDate),
        pageNumber,
        pageSize: PAGE_SIZE,
        signal: controller.signal,
      })
      .then((page) =>
        setTransactions({
          requestKey: transactionsRequestKey,
          error: "",
          page,
        }),
      )
      .catch((error) => {
        if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return;
        setTransactions((current) => ({
          ...current,
          requestKey: transactionsRequestKey,
          error: getErrorMessage(error, "Không thể tải giao dịch tài chính."),
        }));
      });

    return () => controller.abort();
  }, [filters, pageNumber, transactionsRequestKey]);

  useEffect(() => {
    if (!detailId) {
      return undefined;
    }

    const controller = new AbortController();

    financeOperationsApi
      .getTransactionById(detailId, { signal: controller.signal })
      .then((data) => setDetail({ loading: false, data, error: "" }))
      .catch((error) => {
        if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return;
        setDetail({
          loading: false,
          data: null,
          error: getErrorMessage(error, "Không thể tải chi tiết giao dịch."),
        });
      });

    return () => controller.abort();
  }, [detailId]);

  const openDetail = (item) => {
    const nextDetailId = String(item.walletTransactionId || "");

    if (nextDetailId) {
      setDetail({ loading: true, data: null, error: "" });
    }

    setDetailId(nextDetailId);
  };

  const transactionColumns = useMemo(
    () => [
      {
        title: "Giao dịch",
        render: (_, item) => (
          <button
            type="button"
            className="text-left font-bold text-primary hover:underline"
            onClick={() => openDetail(item)}
          >
            {item.referenceCode ||
              shortenId(item.walletTransactionId) ||
              "Xem chi tiết"}
          </button>
        ),
      },
      {
        title: "Loại giao dịch",
        render: (_, item) =>
          getLabel(TRANSACTION_TYPE_LABELS, item.transactionType),
      },
      {
        title: "Tham chiếu",
        render: (_, item) =>
          getReferenceLabel(
            item.referenceType,
            item.referenceCode,
            item.referenceId,
          ),
      },
      {
        title: "Trạng thái",
        render: (_, item) => (
          <Tag>{getLabel(TRANSACTION_STATUS_LABELS, item.status)}</Tag>
        ),
      },
      {
        title: "Số tiền",
        align: "right",
        render: (_, item) => formatCurrency(item.amount),
      },
      {
        title: "Thời gian",
        render: (_, item) => formatDateTime(item.createdAt),
      },
    ],
    [],
  );

  const detailData = detail.data;
  const ledgers = Array.isArray(detailData?.ledgers) ? detailData.ledgers : [];

  return (
    <section className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="rounded-3xl bg-primary px-6 py-7 text-white shadow-[0_18px_45px_rgba(24,63,65,0.16)]">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
          {admin ? "Trung tâm quản trị" : "Trung tâm kiểm duyệt"}
        </p>
        <h1 className="mt-2 text-2xl font-black sm:text-3xl">
          Vận hành tài chính
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">
          Theo dõi số dư, các khoản tiền đang giữ và lịch sử giao dịch tài chính của hệ thống.
        </p>
      </header>

      {admin && (
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-text">Tổng quan số dư</h2>
            <Button onClick={handleReloadFunds}>Tải lại</Button>
          </div>
          <FundsPanel {...funds} />
        </div>
      )}

      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-text">Các khoản tiền đang giữ</h2>
          <Button onClick={handleReloadHolds}>Tải lại</Button>
        </div>
        <HoldsPanel {...holds} />
      </div>

      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-black text-text">Giao dịch tài chính</h2>
          <p className="mt-1 text-sm text-textLight">
            Lọc theo loại giao dịch, đối tượng tham chiếu và trạng thái. Bấm vào một giao dịch để xem chi tiết sao kê liên quan.
          </p>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-3 lg:grid-cols-5">
          <Select
            allowClear
            placeholder="Loại giao dịch"
            value={filters.transactionType || undefined}
            onChange={(value) => {
              setPageNumber(1);
              setFilters((current) => ({
                ...current,
                transactionType: value ?? "",
              }));
            }}
            options={Object.entries(TRANSACTION_TYPE_LABELS).map(
              ([value, label]) => ({ value, label }),
            )}
          />

          <Select
            allowClear
            placeholder="Loại tham chiếu"
            value={filters.referenceType || undefined}
            onChange={(value) => {
              setPageNumber(1);
              setFilters((current) => ({
                ...current,
                referenceType: value ?? "",
              }));
            }}
            options={Object.entries(REFERENCE_TYPE_LABELS).map(
              ([value, label]) => ({ value, label }),
            )}
          />

          <Select
            allowClear
            placeholder="Trạng thái"
            value={filters.status || undefined}
            onChange={(value) => {
              setPageNumber(1);
              setFilters((current) => ({
                ...current,
                status: value ?? "",
              }));
            }}
            options={Object.entries(TRANSACTION_STATUS_LABELS).map(
              ([value, label]) => ({ value, label }),
            )}
          />

          <input
            type="date"
            value={filters.fromDate}
            onChange={(event) => {
              setPageNumber(1);
              setFilters((current) => ({
                ...current,
                fromDate: event.target.value,
              }));
            }}
            className="rounded-lg border border-border px-3 py-2 text-sm text-text outline-none transition focus:border-primary"
          />

          <input
            type="date"
            value={filters.toDate}
            onChange={(event) => {
              setPageNumber(1);
              setFilters((current) => ({
                ...current,
                toDate: event.target.value,
              }));
            }}
            className="rounded-lg border border-border px-3 py-2 text-sm text-text outline-none transition focus:border-primary"
          />
        </div>

        {transactions.error && (
          <Alert className="mb-4" type="error" showIcon message={transactions.error} />
        )}

        <Table
          rowKey={(item, index) =>
            String(item.walletTransactionId ?? index)
          }
          loading={transactionsLoading}
          columns={transactionColumns}
          dataSource={transactions.page.items}
          scroll={{ x: 1000 }}
          pagination={{
            current: transactions.page.pageNumber,
            pageSize: transactions.page.pageSize,
            total: transactions.page.totalCount,
            showSizeChanger: false,
            onChange: setPageNumber,
          }}
        />
      </div>

      <Drawer
        title="Chi tiết giao dịch tài chính"
        width={720}
        open={Boolean(detailId)}
        onClose={() => {
          setDetailId("");
          setDetail({ loading: false, data: null, error: "" });
        }}
      >
        {detail.loading ? (
          <div className="flex justify-center py-14"><Spin /></div>
        ) : detail.error ? (
          <Alert type="error" showIcon message={detail.error} />
        ) : detailData ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-primary">
                Tổng quan
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <DetailField
                  label="Loại giao dịch"
                  value={getLabel(
                    TRANSACTION_TYPE_LABELS,
                    detailData.transactionType,
                  )}
                />
                <DetailField
                  label="Trạng thái"
                  value={getLabel(
                    TRANSACTION_STATUS_LABELS,
                    detailData.status,
                  )}
                />
                <DetailField
                  label="Số tiền"
                  value={formatCurrency(detailData.amount)}
                />
                <DetailField
                  label="Thời gian"
                  value={formatDateTime(detailData.createdAt)}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/60 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-primary">
                Đối tượng tham chiếu
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <DetailField
                  label="Loại tham chiếu"
                  value={getLabel(
                    REFERENCE_TYPE_LABELS,
                    detailData.referenceType,
                  )}
                />
                <div>
                  <p className="text-xs font-semibold uppercase text-textLight">
                    Mã tham chiếu
                  </p>
                  <p className="mt-1 text-sm font-bold text-text">
                    {detailData.referenceCode ||
                      shortenId(detailData.referenceId) ||
                      "—"}
                  </p>
                  {detailData.referenceCode && detailData.referenceId && (
                    <p
                      className="mt-0.5 font-mono text-[11px] text-textLight"
                      title={detailData.referenceId}
                    >
                      {shortenId(detailData.referenceId)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <PartyCard title="Từ" party={detailData.from} />
              <PartyCard title="Đến" party={detailData.to} />
            </div>

            <div className="rounded-xl border border-border bg-background/60 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-primary">
                Sao kê liên quan
              </p>

              {ledgers.length === 0 ? (
                <p className="mt-2 text-sm text-textLight">
                  Chưa có bút toán liên quan.
                </p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-textLight">
                        <th className="px-2 py-2">Thời gian</th>
                        <th className="px-2 py-2">Hướng</th>
                        <th className="px-2 py-2">Loại số dư</th>
                        <th className="px-2 py-2 text-right">Số tiền</th>
                        <th className="px-2 py-2 text-right">Trước → Sau</th>
                        <th className="px-2 py-2">Nội dung</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {ledgers.map((ledger) => (
                        <tr key={ledger.ledgerId}>
                          <td className="whitespace-nowrap px-2 py-2">
                            {formatDateTime(ledger.createdAt)}
                          </td>
                          <td className="px-2 py-2">
                            {getLabel(
                              LEDGER_DIRECTION_LABELS,
                              ledger.direction,
                            )}
                          </td>
                          <td className="px-2 py-2">
                            {getLabel(
                              LEDGER_BALANCE_TYPE_LABELS,
                              ledger.balanceType,
                            )}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-right font-bold text-text">
                            {formatCurrency(ledger.amount)}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-right text-textLight">
                            {formatCurrency(ledger.balanceBefore)} →{" "}
                            {formatCurrency(ledger.balanceAfter)}
                          </td>
                          <td className="px-2 py-2 text-textLight">
                            {ledger.description || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Drawer>
    </section>
  );
}
