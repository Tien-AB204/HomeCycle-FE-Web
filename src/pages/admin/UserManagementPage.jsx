import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import adminDashboardApi from "../../services/apis/adminDashboardApi";
import adminUserApi from "../../services/apis/adminUserApi";
import { getUserId } from "../../utils/authUtils";
import Avatar from "../../components/shared/Avatar";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_TIME = 400;

const MODERATOR_USERNAME_PATTERN =
  /^[A-Za-z0-9_]+$/;

const MODERATOR_EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createEmptyModeratorForm = () => ({
  email: "",
  username: "",
});

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
    className: "border-primary/30 bg-primary/10 text-primary",
  },
  business: {
    label: "Doanh nghiệp",
    className: "border-success/30 bg-success/10 text-success",
  },
  moderator: {
    label: "Kiểm duyệt viên",
    className: "border-warning/20 bg-warning/10 text-warning",
  },
  admin: {
    label: "Quản trị viên",
    className: "border-border bg-background text-textLight",
  },
};

const STATUS_META = {
  pending: {
    label: "Chờ kích hoạt",
    className: "border-warning/20 bg-warning/10 text-warning",
  },
  active: {
    label: "Đang hoạt động",
    className: "border-success/20 bg-success/10 text-success",
  },
  suspended: {
    label: "Đã bị khóa",
    className: "border-error/20 bg-error/10 text-error",
  },
  deleted: {
    label: "Đã xóa",
    className: "border-border bg-background text-textLight",
  },
};

const normalizeValue = (value) =>
  String(value || "").trim().toLowerCase();

const getRoleMeta = (role) =>
  ROLE_META[normalizeValue(role)] || {
    label: role || "Chưa xác định",
    className: "border-border bg-background text-textLight",
  };

const getStatusMeta = (status) =>
  STATUS_META[normalizeValue(status)] || {
    label: status || "Chưa xác định",
    className: "border-border bg-background text-textLight",
  };

const getErrorMessage = (error) => {
  const responseData = error?.response?.data;

  return (
    responseData?.error?.message ||
    responseData?.message ||
    "Không thể thực hiện yêu cầu quản lý người dùng."
  );
};

const getApiErrorCode = (error) =>
  String(
    error?.response?.data?.code ||
      error?.response?.data?.error?.code ||
      "",
  ).trim();

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
  account?.username || "Người dùng HomeCycle";

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
  const [warningMessage, setWarningMessage] = useState("");

  const [
    createModeratorOpen,
    setCreateModeratorOpen,
  ] = useState(false);

  const [
    moderatorForm,
    setModeratorForm,
  ] = useState(createEmptyModeratorForm);

  const [
    moderatorErrors,
    setModeratorErrors,
  ] = useState({});

  const [
    moderatorBusy,
    setModeratorBusy,
  ] = useState(false);

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

    adminDashboardApi
      .getUsers({
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

  const openCreateModerator = () => {
    if (moderatorBusy) {
      return;
    }

    setSuccessMessage("");
    setWarningMessage("");
    setModeratorErrors({});
    setModeratorForm(
      createEmptyModeratorForm(),
    );
    setCreateModeratorOpen(true);
  };

  const closeCreateModerator = () => {
    if (moderatorBusy) {
      return;
    }

    setModeratorErrors({});
    setModeratorForm(
      createEmptyModeratorForm(),
    );
    setCreateModeratorOpen(false);
  };

  const updateModeratorField = (
    field,
    value,
  ) => {
    setModeratorForm((current) => ({
      ...current,
      [field]: value,
    }));

    setModeratorErrors(
      (current) => ({
        ...current,
        [field]: "",
        form: "",
      }),
    );
  };

  const validateModerator = () => {
    const email =
      moderatorForm.email.trim();

    const username =
      moderatorForm.username.trim();

    const errors = {};

    if (!email) {
      errors.email =
        "Vui lòng nhập thư điện tử.";
    } else if (
      email.length > 255
    ) {
      errors.email =
        "Thư điện tử không được vượt quá 255 ký tự.";
    } else if (
      !MODERATOR_EMAIL_PATTERN.test(
        email,
      )
    ) {
      errors.email =
        "Thư điện tử không hợp lệ.";
    }

    if (!username) {
      errors.username =
        "Vui lòng nhập tên đăng nhập.";
    } else if (
      username.length > 100
    ) {
      errors.username =
        "Tên đăng nhập không được vượt quá 100 ký tự.";
    } else if (
      !MODERATOR_USERNAME_PATTERN.test(
        username,
      )
    ) {
      errors.username =
        "Tên đăng nhập chỉ được chứa chữ cái Latin, số và dấu gạch dưới.";
    }

    return {
      errors,
      payload: {
        email,
        username,
      },
    };
  };

  const handleCreateModerator =
    async (event) => {
      event.preventDefault();

      if (moderatorBusy) {
        return;
      }

      const {
        errors,
        payload,
      } = validateModerator();

      if (
        Object.keys(errors).length > 0
      ) {
        setModeratorErrors(
          errors,
        );
        return;
      }

      setModeratorBusy(true);
      setModeratorErrors({});
      setSuccessMessage("");
      setWarningMessage("");

      try {
        await adminUserApi
          .createModerator(
            payload,
          );

        setCreateModeratorOpen(false);
        setModeratorForm(
          createEmptyModeratorForm(),
        );

        setSuccessMessage(
          "Đã tạo tài khoản và gửi email xác nhận cho kiểm duyệt viên.",
        );

        setRequestVersion(
          (currentVersion) =>
            currentVersion + 1,
        );
      } catch (error) {
        const code =
          getApiErrorCode(error);

        if (
          code ===
          "AUTH_MODERATOR_EMAIL_FAILED"
        ) {
          /*
           * Backend đã tạo account Pending trước khi gửi mail.
           * Không tự POST tạo lại.
           */
          setCreateModeratorOpen(
            false,
          );

          setModeratorForm(
            createEmptyModeratorForm(),
          );

          setModeratorErrors({});

          setWarningMessage(
            "Tài khoản kiểm duyệt viên đã được tạo nhưng email xác nhận chưa gửi được. Không tạo lại tài khoản này.",
          );

          setRequestVersion(
            (currentVersion) =>
              currentVersion + 1,
          );

          return;
        }

        if (
          code ===
          "AUTH_EMAIL_EXISTS"
        ) {
          setModeratorErrors({
            email:
              "Thư điện tử này đã được sử dụng.",
          });
          return;
        }

        if (
          code ===
          "AUTH_USERNAME_EXISTS"
        ) {
          setModeratorErrors({
            username:
              "Tên đăng nhập này đã được sử dụng.",
          });
          return;
        }

        if (
          code ===
          "AUTH_MODERATOR_CREATION_FORBIDDEN"
        ) {
          setModeratorErrors({
            form:
              "Chỉ tài khoản Admin đang hoạt động mới được tạo Moderator.",
          });
          return;
        }

        setModeratorErrors({
          form:
            "Không thể tạo tài khoản Moderator. Vui lòng kiểm tra dữ liệu và thử lại.",
        });
      } finally {
        setModeratorBusy(false);
      }
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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Quản trị hệ thống
          </p>

          <h1 className="mt-1 text-2xl font-bold text-text">
            Quản lý người dùng
          </h1>

          <p className="mt-1 text-sm text-textLight">
            Tìm kiếm, theo dõi trạng thái và kiểm soát quyền truy cập tài khoản.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModerator}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-white transition hover:bg-primary/90"
        >
          <span
            className="material-symbols-outlined text-[20px]"
            aria-hidden="true"
          >
            person_add
          </span>

          Tạo kiểm duyệt viên
        </button>
      </header>

      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_220px_auto]">
          <label className="relative block">
            <span className="sr-only">Tìm kiếm người dùng</span>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-textLight">
              search
            </span>
            <input
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              maxLength={200}
              placeholder="Tìm theo tên đăng nhập, thư điện tử, số điện thoại..."
              className="w-full rounded-lg border border-border py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </label>

          <select
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value);
              setPageNumber(1);
            }}
            aria-label="Lọc theo vai trò"
            className="rounded-lg border border-border px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
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
            className="rounded-lg border border-border px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
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
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-textLight transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
          >
            Xóa bộ lọc
          </button>
        </div>
      </div>

      {successMessage && (
        <div
          role="status"
          className="flex items-start justify-between gap-4 rounded-xl border border-success/20 bg-success/10 p-4 text-sm font-semibold text-success"
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

      {warningMessage && (
        <div
          role="status"
          className="flex items-start justify-between gap-4 rounded-xl border border-warning/20 bg-warning/10 p-4 text-sm font-semibold leading-6 text-warning"
        >
          <span>{warningMessage}</span>

          <button
            type="button"
            onClick={() =>
              setWarningMessage("")
            }
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
          className="flex min-h-64 items-center justify-center rounded-xl border border-border bg-white text-primary shadow-sm"
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
          className="rounded-xl border border-error/20 bg-error/10 p-8 text-center"
        >
          <h2 className="font-bold text-error">
            Không thể tải danh sách người dùng
          </h2>
          <p className="mt-2 text-sm text-error">{listState.error}</p>
          <button
            type="button"
            onClick={() =>
              setRequestVersion((currentVersion) => currentVersion + 1)
            }
            className="mt-4 rounded-lg bg-error px-4 py-2 text-sm font-semibold text-white transition hover:bg-error"
          >
            Thử lại
          </button>
        </div>
      )}

      {!isLoading && !listState.error && accounts.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center shadow-sm">
          <span className="material-symbols-outlined text-5xl text-textLight">
            group_off
          </span>
          <h2 className="mt-3 font-bold text-text">
            Không tìm thấy người dùng
          </h2>
          <p className="mt-1 text-sm text-textLight">
            Hãy thay đổi từ khóa hoặc điều kiện lọc hiện tại.
          </p>
        </div>
      )}

      {!isLoading && !listState.error && accounts.length > 0 && (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-white shadow-sm md:block">
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
                <tr className="border-b border-border bg-background text-xs uppercase tracking-wide text-textLight">
                  <th className="px-4 py-3 font-semibold">Người dùng</th>
                  <th className="px-4 py-3 font-semibold">Vai trò</th>
                  <th className="px-4 py-3 font-semibold">Số điện thoại</th>
                  <th className="px-4 py-3 font-semibold">Thư điện tử</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold">Ngày tạo</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {accounts.map((account) => {
                  const roleMeta = getRoleMeta(account.role);
                  const statusMeta = getStatusMeta(account.status);
                  const action = getAvailableAction(account, currentUserId);

                  return (
                    <tr
                      key={account.userId}
                      className="transition hover:bg-background/70"
                    >
                      <td className="px-4 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar
                            src={account.avatarUrl}
                            alt={getDisplayName(account)}
                            className="h-11 w-11"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-bold text-text">
                              {getDisplayName(account)}
                            </p>
                            <p className="mt-1 truncate text-xs text-textLight">
                              {account.email || "Chưa có thư điện tử"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge meta={roleMeta} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-textLight">
                        {account.phoneNumber || "—"}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                            account.isEmailVerified
                              ? "text-success"
                              : "text-warning"
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
                      <td className="whitespace-nowrap px-4 py-4 text-textLight">
                        {formatDate(account.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openConfirmation(account, action)}
                          disabled={action.disabled}
                          title={action.label}
                          className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:border-border disabled:bg-background disabled:text-textLight ${
                            action.type === "unlock"
                              ? "border-success text-success hover:bg-success hover:text-white"
                              : "border-error text-error hover:bg-error hover:text-white"
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
                  className="rounded-xl border border-border bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <Avatar
                      src={account.avatarUrl}
                      alt={getDisplayName(account)}
                      className="h-12 w-12"
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-bold text-text">
                        {getDisplayName(account)}
                      </h2>
                      <p className="mt-1 break-all text-xs text-textLight">
                        {account.email || "Chưa có thư điện tử"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge meta={roleMeta} />
                        <Badge meta={statusMeta} />
                      </div>
                    </div>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs">
                    <div>
                      <dt className="text-textLight">Số điện thoại</dt>
                      <dd className="mt-1 font-semibold text-text">
                        {account.phoneNumber || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-textLight">Ngày tạo</dt>
                      <dd className="mt-1 font-semibold text-text">
                        {formatDate(account.createdAt)}
                      </dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    onClick={() => openConfirmation(account, action)}
                    disabled={action.disabled}
                    className={`mt-4 w-full rounded-lg border px-3 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:border-border disabled:bg-background disabled:text-textLight ${
                      action.type === "unlock"
                        ? "border-success text-success"
                        : "border-error text-error"
                    }`}
                  >
                    {action.label}
                  </button>
                </article>
              );
            })}
          </div>

          <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-sm sm:flex-row">
            <p className="text-sm text-textLight">
              Trang {listState.result?.pageNumber || pageNumber} /{" "}
              {Math.max(1, listState.result?.totalPages || 1)} · Tổng{" "}
              {listState.result?.totalCount || 0} người dùng
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPageNumber((currentPage) => currentPage - 1)}
                disabled={!listState.result?.hasPreviousPage}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trang trước
              </button>
              <button
                type="button"
                onClick={() => setPageNumber((currentPage) => currentPage + 1)}
                disabled={!listState.result?.hasNextPage}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trang sau
              </button>
            </div>
          </div>
        </>
      )}

      {createModeratorOpen && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeCreateModerator();
            }
          }}
          className="fixed inset-0 z-[85] flex items-center justify-center bg-black/50 p-4"
        >
          <form
            onSubmit={
              handleCreateModerator
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-moderator-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                  Tài khoản kiểm duyệt
                </p>

                <h2
                  id="create-moderator-title"
                  className="mt-1 text-xl font-black text-text"
                >
                  Tạo tài khoản kiểm duyệt viên
                </h2>

                <p className="mt-2 text-sm leading-6 text-textLight">
                  Admin chỉ tạo email và tên đăng nhập. Kiểm duyệt viên sẽ tự xác nhận email và đặt mật khẩu.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeCreateModerator
                }
                disabled={
                  moderatorBusy
                }
                aria-label="Đóng"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-textLight transition hover:bg-background disabled:opacity-50"
              >
                <span className="material-symbols-outlined">
                  close
                </span>
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-sm font-bold text-text">
                  Thư điện tử
                </span>

                <span className="ml-1 text-error">
                  *
                </span>

                <input
                  type="email"
                  value={
                    moderatorForm.email
                  }
                  onChange={(event) =>
                    updateModeratorField(
                      "email",
                      event.target.value,
                    )
                  }
                  maxLength={255}
                  autoComplete="off"
                  disabled={
                    moderatorBusy
                  }
                  placeholder="moderator@example.com"
                  className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-background"
                />

                {moderatorErrors.email && (
                  <span className="mt-1.5 block text-xs font-semibold text-error">
                    {moderatorErrors.email}
                  </span>
                )}
              </label>

              <label className="block">
                <span className="text-sm font-bold text-text">
                  Tên đăng nhập
                </span>

                <span className="ml-1 text-error">
                  *
                </span>

                <input
                  type="text"
                  value={
                    moderatorForm.username
                  }
                  onChange={(event) =>
                    updateModeratorField(
                      "username",
                      event.target.value,
                    )
                  }
                  maxLength={100}
                  autoComplete="off"
                  disabled={
                    moderatorBusy
                  }
                  placeholder="moderator_01"
                  className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-background"
                />

                <span className="mt-1.5 block text-xs text-textLight">
                  Chỉ chữ cái Latin, số và dấu gạch dưới.
                </span>

                {moderatorErrors.username && (
                  <span className="mt-1.5 block text-xs font-semibold text-error">
                    {moderatorErrors.username}
                  </span>
                )}
              </label>
            </div>

            {moderatorErrors.form && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-error/20 bg-error/10 p-3 text-sm font-semibold leading-6 text-error"
              >
                {moderatorErrors.form}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={
                  closeCreateModerator
                }
                disabled={
                  moderatorBusy
                }
                className="rounded-xl border border-border px-5 py-3 text-sm font-black text-text transition hover:bg-background disabled:opacity-50"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={
                  moderatorBusy
                }
                className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {moderatorBusy && (
                  <span className="material-symbols-outlined animate-spin text-[19px]">
                    progress_activity
                  </span>
                )}

                {moderatorBusy
                  ? "Đang tạo..."
                  : "Tạo tài khoản"}
              </button>
            </div>
          </form>
        </div>
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
                    ? "bg-error/10 text-error"
                    : "bg-success/10 text-success"
                }`}
              >
                <span className="material-symbols-outlined">
                  {pendingAction.type === "lock" ? "lock" : "lock_open"}
                </span>
              </div>
              <div className="min-w-0">
                <h2
                  id="admin-user-action-title"
                  className="text-lg font-bold text-text"
                >
                  {pendingAction.type === "lock"
                    ? "Khóa tài khoản?"
                    : "Mở khóa tài khoản?"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-textLight">
                  {pendingAction.type === "lock"
                    ? "Người dùng sẽ không thể tiếp tục đăng nhập và sử dụng các chức năng yêu cầu tài khoản."
                    : "Người dùng sẽ có thể đăng nhập và sử dụng lại tài khoản."}
                </p>
                <p className="mt-2 truncate text-sm font-bold text-text">
                  {getDisplayName(pendingAction.account)}
                </p>
              </div>
            </div>

            {actionError && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-error/20 bg-error/10 p-3 text-sm text-error"
              >
                {actionError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeConfirmation}
                disabled={actionBusy}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-bold text-text transition hover:bg-background disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={actionBusy}
                className={`inline-flex min-w-32 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  pendingAction.type === "lock"
                    ? "bg-error hover:bg-error/90"
                    : "bg-success hover:bg-success/90"
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
