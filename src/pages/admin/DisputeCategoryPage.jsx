import { useEffect, useState } from "react";
import DisputeCategoryModal from "../../features/admin/disputeCategories/DisputeCategoryModal";
import ConfirmActionModal from "../../components/shared/ConfirmActionModal";
import disputeCategoryApi from "../../services/apis/disputeCategoryApi";
import { getSafeValidationMessage } from "../../utils/safeErrorMessage";

const TARGET_TYPE_LABELS = {
  Order: "Đơn hàng",
  Review: "Đánh giá",
  Post: "Bài đăng",
  Appointment: "Lịch hẹn",
};

const getTargetTypeLabel = (value) =>
  TARGET_TYPE_LABELS[value] || value;

const isCanceledRequest = (error) =>
  error?.name === "CanceledError" ||
  error?.code === "ERR_CANCELED";

/*
 * Backend trả lỗi dạng {code, message} trần (không bọc {error:{...}})
 * cho nhóm endpoint dispute-categories - chain fallback dưới đây vẫn xử
 * lý đúng cả hai kiểu bọc lỗi khác đang tồn tại trong dự án.
 */
const getErrorMessage = (error) => {
  const responseData = error?.response?.data;

  return (
    getSafeValidationMessage(responseData?.errors) ||
    responseData?.error?.message ||
    responseData?.message ||
    "Đã xảy ra lỗi. Vui lòng thử lại."
  );
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
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

export default function DisputeCategoryPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [requestVersion, setRequestVersion] = useState(0);

  const [statusFilter, setStatusFilter] = useState("active");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const [pendingStatusCategory, setPendingStatusCategory] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    const isActiveFilter =
      statusFilter === "active"
        ? true
        : statusFilter === "inactive"
          ? false
          : undefined;

    const loadCategories = async () => {
      setLoading(true);

      try {
        const result = await disputeCategoryApi.getAll({
          isActive: isActiveFilter,
          signal: controller.signal,
        });

        if (!isActive) {
          return;
        }

        setCategories(result);
        setError("");
      } catch (requestError) {
        if (!isActive || isCanceledRequest(requestError)) {
          return;
        }

        setCategories([]);
        setError(getErrorMessage(requestError));
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadCategories();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [statusFilter, requestVersion]);

  const refresh = () => {
    setRequestVersion((current) => current + 1);
  };

  const handleRetry = () => {
    setError("");
    refresh();
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

    setEditingCategory(null);
    setModalError("");
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
        const updated = await disputeCategoryApi.update(
          editingCategory.disputeCategoryId,
          formData,
        );

        setSuccessMessage(
          `Đã cập nhật danh mục "${updated.name}" thành công.`,
        );
      } else {
        const created = await disputeCategoryApi.create(formData);

        setSuccessMessage(
          `Đã tạo danh mục "${created.name}" thành công.`,
        );
      }

      setEditingCategory(null);
      setIsModalOpen(false);

      refresh();
    } catch (requestError) {
      setModalError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenStatusConfirmation = (category) => {
    if (updatingStatusId) {
      return;
    }

    setActionError("");
    setSuccessMessage("");
    setPendingStatusCategory(category);
  };

  const handleCloseStatusConfirmation = () => {
    if (!updatingStatusId) {
      setPendingStatusCategory(null);
    }
  };

  const handleChangeCategoryStatus = async () => {
    const category = pendingStatusCategory;

    if (!category || updatingStatusId) {
      return;
    }

    const nextIsActive = !category.isActive;

    setUpdatingStatusId(category.disputeCategoryId);
    setActionError("");
    setSuccessMessage("");

    try {
      await disputeCategoryApi.updateStatus(
        category.disputeCategoryId,
        nextIsActive,
      );

      setSuccessMessage(
        `Đã ${nextIsActive ? "bật" : "tắt"} danh mục "${category.name}" thành công.`,
      );

      setPendingStatusCategory(null);

      refresh();
    } catch (requestError) {
      setActionError(getErrorMessage(requestError));
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleStatusFilterChange = (event) => {
    setActionError("");
    setSuccessMessage("");
    setStatusFilter(event.target.value);
  };

  return (
    <div className="m-6 rounded-xl border border-border bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-text">
            Danh mục tranh chấp
          </h2>

          <p className="mt-1 text-sm text-textLight">
            Quản lý {categories.length} danh mục nguyên nhân tranh chấp trên hệ thống.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          disabled={Boolean(updatingStatusId)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[20px]">
            add
          </span>

          Tạo danh mục
        </button>
      </div>

      <section className="mb-6 rounded-lg border border-border bg-background p-4">
        <label
          htmlFor="dispute-category-status-filter"
          className="mb-1.5 block text-sm font-medium text-text"
        >
          Trạng thái
        </label>

        <select
          id="dispute-category-status-filter"
          value={statusFilter}
          onChange={handleStatusFilterChange}
          className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:w-64"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Đã tắt</option>
        </select>

        <p className="mt-2 text-xs text-textLight">
          Danh mục đã tắt vẫn được giữ lại để hiển thị đúng dữ liệu tranh chấp lịch sử, chỉ không còn dùng được cho tranh chấp mới.
        </p>
      </section>

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
            <span className="material-symbols-outlined text-[20px]">
              close
            </span>
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
            <span className="material-symbols-outlined text-[20px]">
              close
            </span>
          </button>
        </div>
      )}

      {error ? (
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
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-background text-xs uppercase tracking-wider text-textLight">
                <th className="p-4 font-semibold">Mã</th>
                <th className="p-4 font-semibold">Tên</th>
                <th className="p-4 font-semibold">Mô tả</th>
                <th className="p-4 font-semibold">Áp dụng cho</th>
                <th className="p-4 font-semibold">Trạng thái</th>
                <th className="p-4 font-semibold">Cập nhật</th>
                <th className="p-4 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-textLight">
                    <div role="status" className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined animate-spin">
                        refresh
                      </span>
                      <span>Đang tải danh mục tranh chấp...</span>
                    </div>
                  </td>
                </tr>
              ) : categories.length > 0 ? (
                categories.map((category) => {
                  const isUpdatingStatus =
                    updatingStatusId === category.disputeCategoryId;

                  return (
                    <tr
                      key={category.disputeCategoryId}
                      className="transition-colors hover:bg-background"
                    >
                      <td className="whitespace-nowrap p-4 font-mono text-xs font-bold text-text">
                        {category.code}
                      </td>

                      <td className="p-4 font-bold text-text">
                        {category.name}
                      </td>

                      <td className="max-w-[320px] p-4 text-textLight">
                        <p className="line-clamp-2">
                          {category.description || "Không có mô tả"}
                        </p>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {(Array.isArray(category.targetTypes)
                            ? category.targetTypes
                            : []
                          ).map((type) => (
                            <span
                              key={type}
                              className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-semibold text-textLight"
                            >
                              {getTargetTypeLabel(type)}
                            </span>
                          ))}
                        </div>
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
                          {category.isActive ? "Đang hoạt động" : "Đã tắt"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap p-4 text-textLight">
                        {formatDateTime(category.updatedAt)}
                      </td>

                      <td className="space-x-2 p-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(category)}
                          disabled={Boolean(updatingStatusId)}
                          title="Chỉnh sửa"
                          aria-label={`Chỉnh sửa ${category.name}`}
                          className="rounded-md p-1.5 text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            edit
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenStatusConfirmation(category)}
                          disabled={Boolean(updatingStatusId)}
                          title={category.isActive ? "Tắt danh mục" : "Bật danh mục"}
                          aria-label={`${category.isActive ? "Tắt" : "Bật"} ${category.name}`}
                          className={`rounded-md p-1.5 transition disabled:cursor-not-allowed disabled:text-border disabled:opacity-50 ${
                            category.isActive
                              ? "text-error hover:bg-error/10"
                              : "text-success hover:bg-success/10"
                          }`}
                        >
                          <span
                            className={[
                              "material-symbols-outlined text-[18px]",
                              isUpdatingStatus ? "animate-spin" : "",
                            ].join(" ")}
                          >
                            {isUpdatingStatus
                              ? "progress_activity"
                              : category.isActive
                                ? "toggle_off"
                                : "toggle_on"}
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-textLight">
                    {statusFilter === "all"
                      ? "Chưa có danh mục tranh chấp nào."
                      : "Không có danh mục nào phù hợp với bộ lọc."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <DisputeCategoryModal
          key={editingCategory?.disputeCategoryId || "create-dispute-category"}
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
            ? "Tắt danh mục tranh chấp"
            : "Bật danh mục tranh chấp"
        }
        description={
          pendingStatusCategory?.isActive
            ? `Danh mục "${pendingStatusCategory?.name || ""}" sẽ không còn dùng được cho tranh chấp mới. Dữ liệu tranh chấp cũ dùng danh mục này vẫn được hiển thị bình thường.`
            : `Danh mục "${pendingStatusCategory?.name || ""}" sẽ có thể dùng lại cho tranh chấp mới.`
        }
        confirmLabel={pendingStatusCategory?.isActive ? "Tắt danh mục" : "Bật danh mục"}
        tone={pendingStatusCategory?.isActive ? "danger" : "success"}
        busy={Boolean(updatingStatusId)}
        onCancel={handleCloseStatusConfirmation}
        onConfirm={handleChangeCategoryStatus}
      />
    </div>
  );
}
