import {
  useEffect,
  useState,
} from "react";
import BrandModal from "../../features/system/brand/BrandModal";
import brandApi from "../../services/apis/brandApi";

const PAGE_SIZE = 10;

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

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
};

const isCanceledRequest = (error) => {
  return (
    error?.name === "CanceledError" ||
    error?.code === "ERR_CANCELED"
  );
};

const getValidationMessage = (
  errors,
) => {
  if (!errors) {
    return "";
  }

  return Object.values(errors)
    .flat()
    .filter(Boolean)
    .join("\n");
};

const getErrorMessage = (error) => {
  const responseData =
    error?.response?.data;

  return (
    getValidationMessage(
      responseData?.errors,
    ) ||
    responseData?.error?.message ||
    responseData?.message ||
    error?.message ||
    "Đã xảy ra lỗi. Vui lòng thử lại."
  );
};

const getBrandInitial = (
  brandName,
) => {
  return (
    brandName
      ?.trim()
      .charAt(0)
      .toUpperCase() || "B"
  );
};

export default function BrandPage() {
  const [brands, setBrands] =
    useState([]);

  const [pagination, setPagination] =
    useState(INITIAL_PAGINATION);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    actionError,
    setActionError,
  ] = useState("");

  const [
    requestVersion,
    setRequestVersion,
  ] = useState(0);

  const [
    isModalOpen,
    setIsModalOpen,
  ] = useState(false);

  const [
    editingBrand,
    setEditingBrand,
  ] = useState(null);

  const [isSaving, setIsSaving] =
    useState(false);

  const [
    deletingBrandId,
    setDeletingBrandId,
  ] = useState(null);

  const [
    modalError,
    setModalError,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  useEffect(() => {
    const controller =
      new AbortController();

    let isActive = true;

    brandApi
      .getAll({
        pageNumber:
          pagination.pageNumber,
        pageSize: PAGE_SIZE,
        signal: controller.signal,
      })
      .then((result) => {
        if (!isActive) {
          return;
        }

        setBrands(result.items);
        setPagination(result);
        setError("");
      })
      .catch((requestError) => {
        if (
          !isActive ||
          isCanceledRequest(
            requestError,
          )
        ) {
          return;
        }

        setBrands([]);

        setError(
          getErrorMessage(
            requestError,
          ),
        );
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
    pagination.pageNumber,
    requestVersion,
  ]);

  const refreshCurrentPage = () => {
    setLoading(true);

    setRequestVersion(
      (currentVersion) =>
        currentVersion + 1,
    );
  };

  const refreshFirstPage = () => {
    setLoading(true);

    if (pagination.pageNumber !== 1) {
      setPagination(
        (currentPagination) => ({
          ...currentPagination,
          pageNumber: 1,
        }),
      );

      return;
    }

    setRequestVersion(
      (currentVersion) =>
        currentVersion + 1,
    );
  };

  const handleOpenCreateModal = () => {
    setEditingBrand(null);
    setModalError("");
    setActionError("");
    setSuccessMessage("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (
    brand,
  ) => {
    setEditingBrand(brand);
    setModalError("");
    setActionError("");
    setSuccessMessage("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSaving) {
      return;
    }

    setEditingBrand(null);
    setModalError("");
    setIsModalOpen(false);
  };

  const handleSaveBrand = async (
    formData,
  ) => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setModalError("");

    try {
      if (editingBrand) {
        const updatedBrand =
          await brandApi.update(
            editingBrand.brandId,
            formData,
          );

        setSuccessMessage(
          `Đã cập nhật thương hiệu "${updatedBrand.brandName}" thành công.`,
        );

        refreshCurrentPage();
      } else {
        const createdBrand =
          await brandApi.create(
            formData,
          );

        setSuccessMessage(
          `Đã tạo thương hiệu "${createdBrand.brandName}" thành công.`,
        );

        refreshFirstPage();
      }

      setEditingBrand(null);
      setIsModalOpen(false);
    } catch (requestError) {
      setModalError(
        getErrorMessage(
          requestError,
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleHideBrand = async (
    brand,
  ) => {
    if (deletingBrandId) {
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn ẩn thương hiệu "${brand.brandName}"?\n\nThương hiệu sẽ không còn xuất hiện trong các danh sách đang hoạt động.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingBrandId(
      brand.brandId,
    );
    setActionError("");
    setSuccessMessage("");

    try {
      await brandApi.remove(
        brand.brandId,
      );

      setSuccessMessage(
        `Đã ẩn thương hiệu "${brand.brandName}" thành công.`,
      );

      refreshCurrentPage();
    } catch (requestError) {
      setActionError(
        getErrorMessage(
          requestError,
        ),
      );
    } finally {
      setDeletingBrandId(null);
    }
  };

  const handlePreviousPage = () => {
    if (
      loading ||
      !pagination.hasPreviousPage
    ) {
      return;
    }

    setLoading(true);
    setError("");
    setActionError("");
    setSuccessMessage("");

    setPagination(
      (currentPagination) => ({
        ...currentPagination,
        pageNumber:
          currentPagination.pageNumber -
          1,
      }),
    );
  };

  const handleNextPage = () => {
    if (
      loading ||
      !pagination.hasNextPage
    ) {
      return;
    }

    setLoading(true);
    setError("");
    setActionError("");
    setSuccessMessage("");

    setPagination(
      (currentPagination) => ({
        ...currentPagination,
        pageNumber:
          currentPagination.pageNumber +
          1,
      }),
    );
  };

  const handleRetry = () => {
    setLoading(true);
    setError("");

    setRequestVersion(
      (currentVersion) =>
        currentVersion + 1,
    );
  };

  return (
    <div className="m-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            Quản lý thương hiệu
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Quản lý{" "}
            {pagination.totalCount} thương
            hiệu sản phẩm trên hệ thống
          </p>
        </div>

        <button
          type="button"
          onClick={
            handleOpenCreateModal
          }
          disabled={Boolean(
            deletingBrandId,
          )}
          className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[20px]">
            add
          </span>

          Thêm thương hiệu mới
        </button>
      </div>

      {successMessage && (
        <div
          role="status"
          className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-4"
        >
          <p className="text-sm text-green-700">
            {successMessage}
          </p>

          <button
            type="button"
            onClick={() =>
              setSuccessMessage("")
            }
            aria-label="Đóng thông báo"
            className="text-green-700 hover:text-green-900"
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
          className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <p className="whitespace-pre-line text-sm text-red-700">
            {actionError}
          </p>

          <button
            type="button"
            onClick={() =>
              setActionError("")
            }
            aria-label="Đóng thông báo lỗi"
            className="text-red-700 hover:text-red-900"
          >
            <span className="material-symbols-outlined text-[20px]">
              close
            </span>
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-6 flex flex-col items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center"
        >
          <p className="whitespace-pre-line text-sm text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={handleRetry}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
          >
            Thử lại
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <th className="w-20 p-4 font-semibold">
                Logo
              </th>

              <th className="p-4 font-semibold">
                Tên thương hiệu
              </th>

              <th className="p-4 font-semibold">
                Mô tả
              </th>

              <th className="p-4 font-semibold">
                Ngày tạo
              </th>

              <th className="p-4 font-semibold">
                Trạng thái
              </th>

              <th className="p-4 text-right font-semibold">
                Thao tác
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 text-sm">
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-10 text-center text-gray-500"
                >
                  <div
                    role="status"
                    className="flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined animate-spin">
                      refresh
                    </span>

                    <span>
                      Đang tải thương hiệu...
                    </span>
                  </div>
                </td>
              </tr>
            ) : brands.length > 0 ? (
              brands.map((brand) => {
                const isDeleting =
                  deletingBrandId ===
                  brand.brandId;

                return (
                  <tr
                    key={brand.brandId}
                    className="transition-colors hover:bg-gray-50"
                  >
                    <td className="p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#244f4d] text-lg font-bold text-white">
                        {getBrandInitial(
                          brand.brandName,
                        )}
                      </div>
                    </td>

                    <td className="p-4 font-bold text-[#244f4d]">
                      {brand.brandName}
                    </td>

                    <td className="max-w-[420px] p-4 text-gray-600">
                      <p className="line-clamp-2">
                        {brand.description ||
                          "Không có mô tả"}
                      </p>
                    </td>

                    <td className="whitespace-nowrap p-4 text-gray-600">
                      {formatCreatedAt(
                        brand.createdAt,
                      )}
                    </td>

                    <td className="p-4">
                      <span
                        className={[
                          "inline-block rounded-full px-3 py-1 text-xs font-semibold",
                          brand.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600",
                        ].join(" ")}
                      >
                        {brand.isActive
                          ? "Hoạt động"
                          : "Đang ẩn"}
                      </span>
                    </td>

                    <td className="space-x-2 p-4 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenEditModal(
                            brand,
                          )
                        }
                        disabled={Boolean(
                          deletingBrandId,
                        )}
                        title="Chỉnh sửa"
                        aria-label={`Chỉnh sửa ${brand.brandName}`}
                        className="rounded-md p-1.5 text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          edit
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleHideBrand(
                            brand,
                          )
                        }
                        disabled={
                          Boolean(
                            deletingBrandId,
                          ) ||
                          !brand.isActive
                        }
                        title={
                          brand.isActive
                            ? "Ẩn thương hiệu"
                            : "Thương hiệu đã được ẩn"
                        }
                        aria-label={`Ẩn ${brand.brandName}`}
                        className="rounded-md p-1.5 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:opacity-50"
                      >
                        <span
                          className={[
                            "material-symbols-outlined text-[18px]",
                            isDeleting
                              ? "animate-spin"
                              : "",
                          ].join(" ")}
                        >
                          {isDeleting
                            ? "refresh"
                            : "visibility_off"}
                        </span>
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="p-10 text-center text-gray-500"
                >
                  Chưa có thương hiệu nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!loading &&
        !error &&
        pagination.totalCount > 0 && (
          <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-4 sm:flex-row">
            <p className="text-sm text-gray-500">
              Trang{" "}
              {pagination.pageNumber} /{" "}
              {Math.max(
                pagination.totalPages,
                1,
              )}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={
                  handlePreviousPage
                }
                disabled={
                  loading ||
                  !pagination.hasPreviousPage
                }
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trang trước
              </button>

              <button
                type="button"
                onClick={
                  handleNextPage
                }
                disabled={
                  loading ||
                  !pagination.hasNextPage
                }
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trang sau
              </button>
            </div>
          </div>
        )}

      {isModalOpen && (
        <BrandModal
          key={
            editingBrand?.brandId ||
            "create-brand"
          }
          editingBrand={editingBrand}
          onClose={handleCloseModal}
          onSubmit={handleSaveBrand}
          submitting={isSaving}
          serverError={modalError}
        />
      )}
    </div>
  );
}