import { useEffect, useState } from "react";
import CategoryModal from "../../features/system/category/CategoryModal";
import ConfirmActionModal from "../../components/shared/ConfirmActionModal";
import categoryApi from "../../services/apis/categoryApi";

const PAGE_SIZE = 5;
const SEARCH_DELAY = 400;

const INITIAL_PAGINATION = {
  pageNumber: 1,
  pageSize: PAGE_SIZE,
  totalCount: 0,
  totalPages: 0,
  hasPreviousPage: false,
  hasNextPage: false,
};

const formatCreatedAt = (value) => {
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

const isCanceledRequest = (error) => {
  return error?.name === "CanceledError" || error?.code === "ERR_CANCELED";
};

const getValidationMessage = (errors) => {
  if (!errors) {
    return "";
  }

  return Object.values(errors).flat().filter(Boolean).join("\n");
};

const getErrorMessage = (error) => {
  const responseData = error?.response?.data;

  return (
    getValidationMessage(responseData?.errors) ||
    responseData?.error?.message ||
    responseData?.message ||
    error?.message ||
    "Đã xảy ra lỗi. Vui lòng thử lại."
  );
};

const getStatusValue = (statusFilter) => {
  if (statusFilter === "active") {
    return true;
  }

  if (statusFilter === "inactive") {
    return false;
  }

  return undefined;
};

export default function CategoryPage() {
  const [categories, setCategories] = useState([]);

  const [pagination, setPagination] = useState(INITIAL_PAGINATION);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [actionError, setActionError] = useState("");

  const [requestVersion, setRequestVersion] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingCategory, setEditingCategory] = useState(null);

  const [isSaving, setIsSaving] = useState(false);

  const [deletingCategoryId, setDeletingCategoryId] = useState(null);

  const [pendingStatusCategory, setPendingStatusCategory] = useState(null);

  const [modalError, setModalError] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const normalizedSearchTerm = searchTerm.trim();

    /*
     * Không tạo timer khi giá trị tìm kiếm
     * chưa thực sự thay đổi.
     *
     * Điều này ngăn loading bị bật lại
     * sau lần tải dữ liệu đầu tiên.
     */
    if (normalizedSearchTerm === debouncedSearchTerm) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setLoading(true);
      setError("");

      setDebouncedSearchTerm(normalizedSearchTerm);

      setPagination((currentPagination) => ({
        ...currentPagination,
        pageNumber: 1,
      }));
    }, SEARCH_DELAY);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchTerm, debouncedSearchTerm]);

  useEffect(() => {
    const controller = new AbortController();

    let isActive = true;

    const hasSearchFilter =
      Boolean(debouncedSearchTerm) || statusFilter !== "all";

    const request = hasSearchFilter
      ? categoryApi.search({
          keyword: debouncedSearchTerm,
          isActive: getStatusValue(statusFilter),
          pageNumber: pagination.pageNumber,
          pageSize: PAGE_SIZE,
          signal: controller.signal,
        })
      : categoryApi.getAll({
          pageNumber: pagination.pageNumber,
          pageSize: PAGE_SIZE,
          signal: controller.signal,
        });

    request
      .then((result) => {
        if (!isActive) {
          return;
        }

        setCategories(result.items);
        setError("");

        setPagination({
          pageNumber: result.pageNumber,
          pageSize: result.pageSize,
          totalCount: result.totalCount,
          totalPages: result.totalPages,
          hasPreviousPage: result.hasPreviousPage,
          hasNextPage: result.hasNextPage,
        });
      })
      .catch((requestError) => {
        if (!isActive || isCanceledRequest(requestError)) {
          return;
        }

        setCategories([]);

        setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [
    debouncedSearchTerm,
    pagination.pageNumber,
    requestVersion,
    statusFilter,
  ]);

  const refreshCurrentPage = () => {
    setLoading(true);

    setRequestVersion((currentVersion) => currentVersion + 1);
  };

  const refreshFirstPage = () => {
    setLoading(true);

    if (pagination.pageNumber !== 1) {
      setPagination((currentPagination) => ({
        ...currentPagination,
        pageNumber: 1,
      }));

      return;
    }

    setRequestVersion((currentVersion) => currentVersion + 1);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setSuccessMessage("");
    setActionError("");
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setLoading(true);
    setError("");

    setPagination((currentPagination) => ({
      ...currentPagination,
      pageNumber: 1,
    }));
  };

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);

    setLoading(true);
    setError("");
    setActionError("");
    setSuccessMessage("");

    setPagination((currentPagination) => ({
      ...currentPagination,
      pageNumber: 1,
    }));
  };

  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setModalError("");
    setActionError("");
    setSuccessMessage("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (category) => {
    setEditingCategory(category);
    setModalError("");
    setActionError("");
    setSuccessMessage("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSaving) {
      return;
    }

    setModalError("");
    setEditingCategory(null);
    setIsModalOpen(false);
  };

  const handleSaveCategory = async (formData) => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setModalError("");

    try {
      if (editingCategory) {
        const updatedCategory = await categoryApi.update(
          editingCategory.categoryId,
          formData,
        );

        setSuccessMessage(
          `Đã cập nhật danh mục "${updatedCategory.categoryName}" thành công.`,
        );

        refreshCurrentPage();
      } else {
        const createdCategory = await categoryApi.create(formData);

        setSuccessMessage(
          `Đã tạo danh mục "${createdCategory.categoryName}" thành công.`,
        );

        refreshFirstPage();
      }

      setEditingCategory(null);
      setIsModalOpen(false);
    } catch (requestError) {
      setModalError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenStatusConfirmation = (category) => {
    if (deletingCategoryId) {
      return;
    }

    setActionError("");
    setSuccessMessage("");
    setPendingStatusCategory(category);
  };

  const handleCloseStatusConfirmation = () => {
    if (!deletingCategoryId) {
      setPendingStatusCategory(null);
    }
  };

  const handleChangeCategoryStatus = async () => {
    const category = pendingStatusCategory;

    if (!category || deletingCategoryId) {
      return;
    }

    const shouldActivate = !category.isActive;

    if (deletingCategoryId) {
      return;
    }

    setDeletingCategoryId(category.categoryId);
    setActionError("");
    setSuccessMessage("");

    try {
      if (shouldActivate) {
        await categoryApi.update(category.categoryId, {
          categoryName: category.categoryName,
          description: category.description || "",
          isActive: true,
        });
      } else {
        await categoryApi.remove(category.categoryId);
      }

      setSuccessMessage(
        `Đã ${shouldActivate ? "kích hoạt lại" : "ẩn"} danh mục "${category.categoryName}" thành công.`,
      );

      setPendingStatusCategory(null);

      const isLastItemOnPage = !shouldActivate && categories.length === 1;

      if (isLastItemOnPage && pagination.pageNumber > 1) {
        setLoading(true);

        setPagination((currentPagination) => ({
          ...currentPagination,
          pageNumber: currentPagination.pageNumber - 1,
        }));
      } else {
        refreshCurrentPage();
      }
    } catch (requestError) {
      setActionError(getErrorMessage(requestError));
    } finally {
      setDeletingCategoryId(null);
    }
  };

  const handlePreviousPage = () => {
    if (loading || !pagination.hasPreviousPage) {
      return;
    }

    setLoading(true);
    setError("");
    setActionError("");
    setSuccessMessage("");

    setPagination((currentPagination) => ({
      ...currentPagination,
      pageNumber: currentPagination.pageNumber - 1,
    }));
  };

  const handleNextPage = () => {
    if (loading || !pagination.hasNextPage) {
      return;
    }

    setLoading(true);
    setError("");
    setActionError("");
    setSuccessMessage("");

    setPagination((currentPagination) => ({
      ...currentPagination,
      pageNumber: currentPagination.pageNumber + 1,
    }));
  };

  const handleRetry = () => {
    setLoading(true);
    setError("");

    setRequestVersion((currentVersion) => currentVersion + 1);
  };

  const hasFilters = Boolean(debouncedSearchTerm) || statusFilter !== "all";

  return (
    <div className="m-6 rounded-xl border border-border bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-text">
            Danh sách danh mục
          </h2>

          <p className="mt-1 text-sm text-textLight">
            {hasFilters
              ? `Tìm thấy ${pagination.totalCount} danh mục`
              : `Quản lý ${pagination.totalCount} danh mục hiện có trên hệ thống`}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          disabled={Boolean(deletingCategoryId)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Thêm danh mục mới
        </button>
      </div>

      <div className="mb-6 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-textLight">
            search
          </span>

          <input
            type="search"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Tìm theo tên hoặc mô tả danh mục..."
            className="w-full rounded-md border border-border py-2.5 pl-10 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />

          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Xóa từ khóa tìm kiếm"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-textLight hover:text-text"
            >
              <span className="material-symbols-outlined text-[20px]">
                close
              </span>
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={handleStatusChange}
          className="rounded-md border border-border bg-white px-4 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">Tất cả trạng thái</option>

          <option value="active">Đang hoạt động</option>

          <option value="inactive">Đang ẩn</option>
        </select>
      </div>

      {successMessage && (
        <div
          role="status"
          className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-success/20 bg-success/10 p-4"
        >
          <p className="text-sm text-success">{successMessage}</p>

          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            aria-label="Đóng thông báo"
            className="text-success hover:text-success/80"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-error/20 bg-error/10 p-4"
        >
          <p className="whitespace-pre-line text-sm text-error">
            {actionError}
          </p>

          <button
            type="button"
            onClick={() => setActionError("")}
            aria-label="Đóng thông báo lỗi"
            className="text-error hover:text-error/80"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-6 flex flex-col items-start justify-between gap-3 rounded-lg border border-error/20 bg-error/10 p-4 sm:flex-row sm:items-center"
        >
          <p className="whitespace-pre-line text-sm text-error">{error}</p>

          <button
            type="button"
            onClick={handleRetry}
            className="rounded-md bg-error px-4 py-2 text-sm font-medium text-white transition hover:bg-error"
          >
            Thử lại
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-background text-xs uppercase tracking-wider text-textLight">
              <th className="p-4 font-semibold">Tên danh mục</th>

              <th className="p-4 font-semibold">Mô tả</th>

              <th className="p-4 font-semibold">Ngày tạo</th>

              <th className="p-4 font-semibold">Trạng thái</th>

              <th className="p-4 text-right font-semibold">Thao tác</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border text-sm">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-10 text-center text-textLight">
                  <div
                    role="status"
                    className="flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined animate-spin">
                      refresh
                    </span>

                    <span>Đang tải danh mục...</span>
                  </div>
                </td>
              </tr>
            ) : categories.length > 0 ? (
              categories.map((category) => {
                const isDeleting = deletingCategoryId === category.categoryId;

                return (
                  <tr
                    key={category.categoryId}
                    className="transition-colors hover:bg-background"
                  >
                    <td className="p-4 font-bold text-text">
                      {category.categoryName}
                    </td>

                    <td className="max-w-[420px] p-4 text-textLight">
                      <p className="line-clamp-2">
                        {category.description || "Không có mô tả"}
                      </p>
                    </td>

                    <td className="whitespace-nowrap p-4 text-textLight">
                      {formatCreatedAt(category.createdAt)}
                    </td>

                    <td className="p-4">
                      <span
                        className={[
                          "inline-block rounded-full px-3 py-1 text-xs font-semibold",
                          category.isActive
                            ? "bg-success/10 text-success"
                            : "bg-background text-textLight",
                        ].join(" ")}
                      >
                        {category.isActive ? "Hoạt động" : "Đang ẩn"}
                      </span>
                    </td>

                    <td className="space-x-2 p-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(category)}
                        disabled={Boolean(deletingCategoryId)}
                        title="Chỉnh sửa"
                        aria-label={`Chỉnh sửa ${category.categoryName}`}
                        className="rounded-md p-1.5 text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          edit
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenStatusConfirmation(category)}
                        disabled={Boolean(deletingCategoryId)}
                        title={
                          category.isActive
                            ? "Ẩn danh mục"
                            : "Kích hoạt lại danh mục"
                        }
                        aria-label={`${category.isActive ? "Ẩn" : "Kích hoạt lại"} ${category.categoryName}`}
                        className={`rounded-md p-1.5 transition disabled:cursor-not-allowed disabled:text-border disabled:opacity-50 ${
                          category.isActive
                            ? "text-error hover:bg-error/10"
                            : "text-success hover:bg-success/10"
                        }`}
                      >
                        <span
                          className={[
                            "material-symbols-outlined text-[18px]",
                            isDeleting ? "animate-spin" : "",
                          ].join(" ")}
                        >
                          {isDeleting
                            ? "progress_activity"
                            : category.isActive
                              ? "visibility_off"
                              : "visibility"}
                        </span>
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="p-10 text-center text-textLight">
                  {hasFilters
                    ? "Không tìm thấy danh mục phù hợp."
                    : "Chưa có danh mục nào."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!loading && !error && pagination.totalCount > 0 && (
        <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row">
          <p className="text-sm text-textLight">
            Trang {pagination.pageNumber} / {Math.max(pagination.totalPages, 1)}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePreviousPage}
              disabled={loading || !pagination.hasPreviousPage}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trang trước
            </button>

            <button
              type="button"
              onClick={handleNextPage}
              disabled={loading || !pagination.hasNextPage}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trang sau
            </button>
          </div>
        </div>
      )}

      {isModalOpen && (
        <CategoryModal
          key={editingCategory?.categoryId || "create-category"}
          editingCategory={editingCategory}
          onClose={handleCloseModal}
          onSubmit={handleSaveCategory}
          submitting={isSaving}
          serverError={modalError}
        />
      )}

      <ConfirmActionModal
        open={Boolean(pendingStatusCategory)}
        title={
          pendingStatusCategory?.isActive
            ? "Ẩn danh mục"
            : "Kích hoạt lại danh mục"
        }
        description={
          pendingStatusCategory?.isActive
            ? `Danh mục “${pendingStatusCategory?.categoryName || ""}” sẽ không còn hiển thị cho người dùng.`
            : `Danh mục “${pendingStatusCategory?.categoryName || ""}” sẽ được hiển thị trở lại trên hệ thống.`
        }
        confirmLabel={pendingStatusCategory?.isActive ? "Ẩn danh mục" : "Kích hoạt"}
        tone={pendingStatusCategory?.isActive ? "danger" : "success"}
        busy={Boolean(deletingCategoryId)}
        onCancel={handleCloseStatusConfirmation}
        onConfirm={handleChangeCategoryStatus}
      />
    </div>
  );
}
