import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import adminUserApi from "../../services/apis/adminUserApi";
import { getUserId } from "../../utils/authUtils";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_TIME = 400;

const ROLE_OPTIONS = [
  { value: "", label: "Tất cả vai trò" },
  { value: "Personal", label: "Cá nhân" },
  { value: "Business", label: "Doanh nghiệp" },
  { value: "Moderator", label: "Kiểm duyệt viên" },
  { value: "Admin", label: "Quản trị viên" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "Pending", label: "Chờ kích hoạt" },
  { value: "Active", label: "Đang hoạt động" },
  { value: "Suspended", label: "Đã bị khóa" },
  { value: "Deleted", label: "Đã xóa" },
];

const ROLE_META = {
  personal: {
    label: "Cá nhân",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  business: {
    label: "Doanh nghiệp",
    className: "border-violet-200 bg-violet-50 text-violet-700",
  },
  moderator: {
    label: "Kiểm duyệt viên",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  admin: {
    label: "Quản trị viên",
    className: "border-slate-300 bg-slate-100 text-slate-700",
  },
};

const STATUS_META = {
  pending: {
    label: "Chờ kích hoạt",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  active: {
    label: "Đang hoạt động",
    className: "border-green-200 bg-green-50 text-green-700",
  },
  suspended: {
    label: "Đã bị khóa",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  deleted: {
    label: "Đã xóa",
    className: "border-gray-300 bg-gray-100 text-gray-600",
  },
};

const normalizeValue = (value) =>
  String(value || "").trim().toLowerCase();

const getRoleMeta = (role) =>
  ROLE_META[normalizeValue(role)] || {
    label: role || "Chưa xác định",
    className: "border-gray-200 bg-gray-50 text-gray-600",
  };

const getStatusMeta = (status) =>
  STATUS_META[normalizeValue(status)] || {
    label: status || "Chưa xác định",
    className: "border-gray-200 bg-gray-50 text-gray-600",
  };

const getErrorMessage = (error) => {
  const responseData = error?.response?.data;

  return (
    responseData?.error?.message ||
    responseData?.message ||
    error?.message ||
    "Không thể thực hiện yêu cầu quản lý người dùng."
  );
};

const isCanceledRequest = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const formatDate = (value) => {
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
  }).format(date);
};

const getDisplayName = (account) =>
  account?.username || account?.email || "Người dùng HomeCycle";

const getAvatarCharacter = (account) =>
  getDisplayName(account).trim().charAt(0).toUpperCase() || "U";

const getAvailableAction = (account, currentUserId) => {
  const accountId = String(account?.userId || "").trim();
  const role = normalizeValue(account?.role);
  const status = normalizeValue(account?.status);

  if (accountId && accountId === currentUserId) {
    return {
      type: "",
      label: "Tài khoản hiện tại",
      disabled: true,
    };
  }

  if (role === "admin") {
    return {
      type: "",
      label: "Được bảo vệ",
      disabled: true,
    };
  }

  if (status === "active") {
    return {
      type: "lock",
      label: "Khóa tài khoản",
      disabled: false,
    };
  }

  if (status === "suspended") {
    return {
      type: "unlock",
      label: "Mở khóa",
      disabled: false,
    };
  }

  return {
    type: "",
    label: "Không có thao tác",
    disabled: true,
  };
};

const Badge = ({ meta }) => (
  <span
    className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}
  >
    {meta.label}
  </span>
);

export default function UserManagementPage() {
  const { user } = useAuth();
  const currentUserId = getUserId(user);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [requestVersion, setRequestVersion] = useState(0);
  const requestKey = `${debouncedKeyword}:${roleFilter}:${statusFilter}:${pageNumber}:${requestVersion}`;
  const [listState, setListState] = useState({
    requestKey: "",
    error: "",
    result: null,
  });
  const [pendingAction, setPendingAction] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const nextKeyword = keyword.trim();

    if (nextKeyword === debouncedKeyword) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setDebouncedKeyword(nextKeyword);
      setPageNumber(1);
    }, SEARCH_DEBOUNCE_TIME);

    return () => window.clearTimeout(timeoutId);
  }, [keyword, debouncedKeyword]);

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    adminUserApi
      .getAll({
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        keyword: debouncedKeyword || undefined,
        pageNumber,
        pageSize: PAGE_SIZE,
        signal: controller.signal,
      })
      .then((result) => {
        if (!isActive) {
          return;
        }

        setListState({
          requestKey,
          error: "",
          result,
        });
      })
      .catch((error) => {
        if (!isActive || isCanceledRequest(error)) {
          return;
        }

        setListState({
          requestKey,
          error: getErrorMessage(error),
          result: null,
        });
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [
    debouncedKeyword,
    pageNumber,
    requestKey,
    roleFilter,
    statusFilter,
  ]);

  const isLoading = listState.requestKey !== requestKey;
  const accounts = useMemo(
    () =>
      Array.isArray(listState.result?.items)
        ? listState.result.items
        : [],
    [listState.result],
  );
  const hasFilters = Boolean(
    keyword.trim() || roleFilter || statusFilter,
  );

  const resetFilters = () => {
    setKeyword("");
    setDebouncedKeyword("");
    setRoleFilter("");
    setStatusFilter("");
    setPageNumber(1);
  };

  const openConfirmation = (account, action) => {
    if (!action?.type || action.disabled || actionBusy) {
      return;
    }

    setActionError("");
    setSuccessMessage("");
    setPendingAction({ account, type: action.type });
  };

  const closeConfirmation = () => {
    if (actionBusy) {
      return;
    }

    setActionError("");
    setPendingAction(null);
  };

  const handleConfirmAction = async () => {
    if (!pendingAction || actionBusy) {
      return;
    }

    setActionBusy(true);
    setActionError("");

    try {
      if (pendingAction.type === "lock") {
        await adminUserApi.lock(pendingAction.account.userId);
        setSuccessMessage("Đã khóa tài khoản thành công.");
      } else {
        await adminUserApi.unlock(pendingAction.account.userId);
        setSuccessMessage("Đã mở khóa tài khoản thành công.");
      }

      setPendingAction(null);
      setRequestVersion((currentVersion) => currentVersion + 1);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-700">
          Quản trị hệ thống
        </p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          Quản lý người dùng
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Tìm kiếm, theo dõi trạng thái và kiểm soát quyền truy cập tài khoản.
        </p>
      </header>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_220px_auto]">
          <label className="relative block">
            <span className="sr-only">Tìm kiếm người dùng</span>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-gray-400">
              search
            </span>
            <input
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo username, email, số điện thoại..."
              className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
            />
          </label>

          <select
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value);
              setPageNumber(1);
            }}
            aria-label="Lọc theo vai trò"
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPageNumber(1);
            }}
            aria-label="Lọc theo trạng thái"
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasFilters}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Xóa bộ lọc
          </button>
        </div>
      </div>

      {successMessage && (
        <div
          role="status"
          className="flex items-start justify-between gap-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700"
        >
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            aria-label="Đóng thông báo"
            className="shrink-0 font-black"
          >
            ×
          </button>
        </div>
      )}

      {isLoading && (
        <div
          role="status"
          className="flex min-h-64 items-center justify-center rounded-xl border border-gray-100 bg-white text-green-700 shadow-sm"
        >
          <span className="material-symbols-outlined animate-spin text-3xl">
            refresh
          </span>
          <span className="ml-3 text-sm font-semibold">
            Đang tải danh sách người dùng...
          </span>
        </div>
      )}

      {!isLoading && listState.error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-8 text-center"
        >
          <h2 className="font-bold text-red-800">
            Không thể tải danh sách người dùng
          </h2>
          <p className="mt-2 text-sm text-red-700">{listState.error}</p>
          <button
            type="button"
            onClick={() =>
              setRequestVersion((currentVersion) => currentVersion + 1)
            }
            className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
          >
            Thử lại
          </button>
        </div>
      )}

      {!isLoading && !listState.error && accounts.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <span className="material-symbols-outlined text-5xl text-gray-300">
            group_off
          </span>
          <h2 className="mt-3 font-bold text-gray-800">
            Không tìm thấy người dùng
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Hãy thay đổi từ khóa hoặc điều kiện lọc hiện tại.
          </p>
        </div>
      )}

      {!isLoading && !listState.error && accounts.length > 0 && (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm md:block">
            <table className="w-full min-w-[1120px] table-fixed border-collapse text-left text-sm">
              <colgroup>
                <col className="w-[27%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[12%]" />
                <col className="w-[13%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-semibold">Người dùng</th>
                  <th className="px-4 py-3 font-semibold">Vai trò</th>
                  <th className="px-4 py-3 font-semibold">Số điện thoại</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold">Ngày tạo</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {accounts.map((account) => {
                  const roleMeta = getRoleMeta(account.role);
                  const statusMeta = getStatusMeta(account.status);
                  const action = getAvailableAction(account, currentUserId);

                  return (
                    <tr
                      key={account.userId}
                      className="transition hover:bg-gray-50/70"
                    >
                      <td className="px-4 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-green-100 font-bold text-green-700">
                            {account.avatarUrl ? (
                              <img
                                src={account.avatarUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              getAvatarCharacter(account)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-gray-900">
                              {getDisplayName(account)}
                            </p>
                            <p className="mt-1 truncate text-xs text-gray-500">
                              {account.email || "Chưa có email"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge meta={roleMeta} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-gray-600">
                        {account.phoneNumber || "—"}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                            account.isEmailVerified
                              ? "text-green-700"
                              : "text-amber-700"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[17px]">
                            {account.isEmailVerified ? "verified" : "warning"}
                          </span>
                          {account.isEmailVerified ? "Đã xác thực" : "Chưa xác thực"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Badge meta={statusMeta} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-gray-500">
                        {formatDate(account.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openConfirmation(account, action)}
                          disabled={action.disabled}
                          title={action.label}
                          className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400 ${
                            action.type === "unlock"
                              ? "border-green-700 text-green-700 hover:bg-green-700 hover:text-white"
                              : "border-red-700 text-red-700 hover:bg-red-700 hover:text-white"
                          }`}
                        >
                          {action.label}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {accounts.map((account) => {
              const roleMeta = getRoleMeta(account.role);
              const statusMeta = getStatusMeta(account.status);
              const action = getAvailableAction(account, currentUserId);

              return (
                <article
                  key={account.userId}
                  className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-green-100 font-bold text-green-700">
                      {account.avatarUrl ? (
                        <img
                          src={account.avatarUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getAvatarCharacter(account)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-bold text-gray-900">
                        {getDisplayName(account)}
                      </h2>
                      <p className="mt-1 break-all text-xs text-gray-500">
                        {account.email || "Chưa có email"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge meta={roleMeta} />
                        <Badge meta={statusMeta} />
                      </div>
                    </div>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4 text-xs">
                    <div>
                      <dt className="text-gray-400">Số điện thoại</dt>
                      <dd className="mt-1 font-semibold text-gray-700">
                        {account.phoneNumber || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-400">Ngày tạo</dt>
                      <dd className="mt-1 font-semibold text-gray-700">
                        {formatDate(account.createdAt)}
                      </dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    onClick={() => openConfirmation(account, action)}
                    disabled={action.disabled}
                    className={`mt-4 w-full rounded-lg border px-3 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400 ${
                      action.type === "unlock"
                        ? "border-green-700 text-green-700"
                        : "border-red-700 text-red-700"
                    }`}
                  >
                    {action.label}
                  </button>
                </article>
              );
            })}
          </div>

          <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm sm:flex-row">
            <p className="text-sm text-gray-500">
              Trang {listState.result?.pageNumber || pageNumber} /{" "}
              {Math.max(1, listState.result?.totalPages || 1)} · Tổng{" "}
              {listState.result?.totalCount || 0} người dùng
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPageNumber((currentPage) => currentPage - 1)}
                disabled={!listState.result?.hasPreviousPage}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trang trước
              </button>
              <button
                type="button"
                onClick={() => setPageNumber((currentPage) => currentPage + 1)}
                disabled={!listState.result?.hasNextPage}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trang sau
              </button>
            </div>
          </div>
        </>
      )}

      {pendingAction && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeConfirmation();
            }
          }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-user-action-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                  pendingAction.type === "lock"
                    ? "bg-red-50 text-red-700"
                    : "bg-green-50 text-green-700"
                }`}
              >
                <span className="material-symbols-outlined">
                  {pendingAction.type === "lock" ? "lock" : "lock_open"}
                </span>
              </div>
              <div className="min-w-0">
                <h2
                  id="admin-user-action-title"
                  className="text-lg font-bold text-gray-900"
                >
                  {pendingAction.type === "lock"
                    ? "Khóa tài khoản?"
                    : "Mở khóa tài khoản?"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  {pendingAction.type === "lock"
                    ? "Người dùng sẽ không thể tiếp tục đăng nhập và sử dụng các chức năng yêu cầu tài khoản."
                    : "Người dùng sẽ có thể đăng nhập và sử dụng lại tài khoản."}
                </p>
                <p className="mt-2 truncate text-sm font-bold text-gray-800">
                  {getDisplayName(pendingAction.account)}
                </p>
              </div>
            </div>

            {actionError && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {actionError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeConfirmation}
                disabled={actionBusy}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={actionBusy}
                className={`inline-flex min-w-32 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  pendingAction.type === "lock"
                    ? "bg-red-700 hover:bg-red-800"
                    : "bg-green-700 hover:bg-green-800"
                }`}
              >
                {actionBusy && (
                  <span className="material-symbols-outlined animate-spin text-[18px]">
                    refresh
                  </span>
                )}
                {actionBusy
                  ? "Đang xử lý..."
                  : pendingAction.type === "lock"
                    ? "Xác nhận khóa"
                    : "Xác nhận mở khóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
