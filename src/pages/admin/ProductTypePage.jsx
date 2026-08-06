import {
  useEffect,
  useState,
} from "react";
import ProductTypeModal from "../../features/system/productType/ProductTypeModal";
import categoryApi from "../../services/apis/categoryApi";
import productTypeApi from "../../services/apis/productTypeApi";

const PAGE_SIZE = 10;
const CATEGORY_PAGE_SIZE = 100;
const SEARCH_DEBOUNCE_TIME = 400;

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

export default function ProductTypePage() {
  const [productTypes, setProductTypes] =
    useState([]);

  const [categories, setCategories] =
    useState([]);

  const [categoryNames, setCategoryNames] =
    useState({});

  const [pagination, setPagination] =
    useState(INITIAL_PAGINATION);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState("");

  const [actionError, setActionError] =
    useState("");

  const [categoryError, setCategoryError] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [
    debouncedSearchTerm,
    setDebouncedSearchTerm,
  ] = useState("");

  const [
    selectedCategoryId,
    setSelectedCategoryId,
  ] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [requestVersion, setRequestVersion] =
    useState(0);

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [
    editingProductType,
    setEditingProductType,
  ] = useState(null);

  const [
    loadingProductTypeId,
    setLoadingProductTypeId,
  ] = useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  const [modalError, setModalError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [
    deletingProductType,
    setDeletingProductType,
  ] = useState(null);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [deleteError, setDeleteError] =
    useState("");

  const hasAppliedFilters =
    Boolean(debouncedSearchTerm) ||
    Boolean(selectedCategoryId) ||
    statusFilter !== "all";

  const hasInputFilters =
    Boolean(searchTerm.trim()) ||
    Boolean(selectedCategoryId) ||
    statusFilter !== "all";

  const isWaitingForSearch =
    searchTerm.trim() !==
    debouncedSearchTerm;

  const isLoadingProductTypeDetails =
    Boolean(loadingProductTypeId);

  useEffect(() => {
    const controller =
      new AbortController();

    let isActive = true;

    categoryApi
      .getAll({
        pageNumber: 1,
        pageSize: CATEGORY_PAGE_SIZE,
        signal: controller.signal,
      })
      .then((result) => {
        if (!isActive) {
          return;
        }

        setCategories(result.items);

        const nextCategoryNames =
          result.items.reduce(
            (currentResult, category) => {
              currentResult[
                category.categoryId
              ] = category.categoryName;

              return currentResult;
            },
            {},
          );

        setCategoryNames(
          nextCategoryNames,
        );

        setCategoryError("");
      })
      .catch((requestError) => {
        if (
          !isActive ||
          isCanceledRequest(requestError)
        ) {
          return;
        }

        setCategories([]);
        setCategoryNames({});

        setCategoryError(
          getErrorMessage(requestError),
        );
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const nextSearchTerm =
      searchTerm.trim();

    if (
      nextSearchTerm ===
      debouncedSearchTerm
    ) {
      return undefined;
    }

    const timeoutId = window.setTimeout(
      () => {
        setLoading(true);
        setError("");

        setDebouncedSearchTerm(
          nextSearchTerm,
        );

        setPagination(
          (currentPagination) => {
            if (
              currentPagination.pageNumber ===
              1
            ) {
              return currentPagination;
            }

            return {
              ...currentPagination,
              pageNumber: 1,
            };
          },
        );
      },
      SEARCH_DEBOUNCE_TIME,
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    searchTerm,
    debouncedSearchTerm,
  ]);

  useEffect(() => {
    const controller =
      new AbortController();

    let isActive = true;

    const isActiveFilter =
      statusFilter === "active"
        ? true
        : statusFilter === "inactive"
          ? false
          : undefined;

    const request = hasAppliedFilters
      ? productTypeApi.search({
          categoryId:
            selectedCategoryId ||
            undefined,
          keyword:
            debouncedSearchTerm ||
            undefined,
          isActive: isActiveFilter,
          pageNumber:
            pagination.pageNumber,
          pageSize: PAGE_SIZE,
          signal: controller.signal,
        })
      : productTypeApi.getAll({
          pageNumber:
            pagination.pageNumber,
          pageSize: PAGE_SIZE,
          signal: controller.signal,
        });

    request
      .then((result) => {
        if (!isActive) {
          return;
        }

        setProductTypes(result.items);

        setPagination({
          pageNumber: result.pageNumber,
          pageSize: result.pageSize,
          totalCount: result.totalCount,
          totalPages: result.totalPages,
          hasPreviousPage:
            result.hasPreviousPage,
          hasNextPage:
            result.hasNextPage,
        });

        setError("");
      })
      .catch((requestError) => {
        if (
          !isActive ||
          isCanceledRequest(requestError)
        ) {
          return;
        }

        setProductTypes([]);

        setError(
          getErrorMessage(requestError),
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
    debouncedSearchTerm,
    selectedCategoryId,
    statusFilter,
    pagination.pageNumber,
    requestVersion,
    hasAppliedFilters,
  ]);

  const refreshCurrentPage = () => {
    setLoading(true);
    setError("");

    setRequestVersion(
      (currentVersion) =>
        currentVersion + 1,
    );
  };

  const refreshFirstPage = () => {
    setLoading(true);
    setError("");
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setSelectedCategoryId("");
    setStatusFilter("all");

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

  const handleSearchTermChange = (
    event,
  ) => {
    setSearchTerm(event.target.value);
    setSuccessMessage("");
    setActionError("");
  };

  const handleClearKeyword = () => {
    setLoading(true);
    setError("");
    setActionError("");
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setSuccessMessage("");

    setPagination(
      (currentPagination) => ({
        ...currentPagination,
        pageNumber: 1,
      }),
    );
  };

  const handleCategoryFilterChange = (
    event,
  ) => {
    setLoading(true);
    setError("");
    setActionError("");

    setSelectedCategoryId(
      event.target.value,
    );

    setSuccessMessage("");

    setPagination(
      (currentPagination) => ({
        ...currentPagination,
        pageNumber: 1,
      }),
    );
  };

  const handleStatusFilterChange = (
    event,
  ) => {
    setLoading(true);
    setError("");
    setActionError("");
    setStatusFilter(event.target.value);
    setSuccessMessage("");

    setPagination(
      (currentPagination) => ({
        ...currentPagination,
        pageNumber: 1,
      }),
    );
  };

  const handleResetFilters = () => {
    setLoading(true);
    setError("");
    setActionError("");
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setSelectedCategoryId("");
    setStatusFilter("all");
    setSuccessMessage("");

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
    if (
      isLoadingProductTypeDetails ||
      isDeleting
    ) {
      return;
    }

    if (categories.length === 0) {
      setCategoryError(
        "Không có dữ liệu danh mục để tạo loại sản phẩm.",
      );

      return;
    }

    setEditingProductType(null);
    setModalError("");
    setActionError("");
    setSuccessMessage("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal =
    async (productType) => {
      if (
        isLoadingProductTypeDetails ||
        isDeleting ||
        !productType?.productTypeId
      ) {
        return;
      }

      const productTypeId =
        productType.productTypeId;

      setLoadingProductTypeId(
        productTypeId,
      );

      setActionError("");
      setModalError("");
      setSuccessMessage("");

      try {
        const detailedProductType =
          await productTypeApi.getById(
            productTypeId,
          );

        setEditingProductType(
          detailedProductType,
        );

        setIsModalOpen(true);
      } catch (requestError) {
        setEditingProductType(null);

        setActionError(
          getErrorMessage(requestError),
        );
      } finally {
        setLoadingProductTypeId("");
      }
    };

  const handleCloseModal = () => {
    if (isSaving) {
      return;
    }

    setModalError("");
    setEditingProductType(null);
    setIsModalOpen(false);
  };

  const handleSaveProductType =
    async (formData) => {
      if (isSaving) {
        return;
      }

      setIsSaving(true);
      setModalError("");

      try {
        if (editingProductType) {
          const updatedProductType =
            await productTypeApi.update(
              editingProductType.productTypeId,
              formData,
            );

          setSuccessMessage(
            `Đã cập nhật loại sản phẩm "${updatedProductType.productTypeName}" thành công.`,
          );

          refreshCurrentPage();
        } else {
          const createdProductType =
            await productTypeApi.create(
              formData,
            );

          setSuccessMessage(
            `Đã tạo loại sản phẩm "${createdProductType.productTypeName}" thành công.`,
          );

          refreshFirstPage();
        }

        setActionError("");
        setEditingProductType(null);
        setIsModalOpen(false);
      } catch (requestError) {
        setModalError(
          getErrorMessage(requestError),
        );
      } finally {
        setIsSaving(false);
      }
    };

  const handleOpenDeleteDialog = (
    productType,
  ) => {
    if (
      isDeleting ||
      isLoadingProductTypeDetails
    ) {
      return;
    }

    setDeletingProductType(productType);
    setDeleteError("");
    setActionError("");
    setSuccessMessage("");
  };

  const handleCloseDeleteDialog = () => {
    if (isDeleting) {
      return;
    }

    setDeletingProductType(null);
    setDeleteError("");
  };

  const handleConfirmDelete = async () => {
    if (
      isDeleting ||
      !deletingProductType?.productTypeId
    ) {
      return;
    }

    const productTypeId =
      deletingProductType.productTypeId;

    const productTypeName =
      deletingProductType.productTypeName;

    setIsDeleting(true);
    setDeleteError("");

    try {
      await productTypeApi.remove(
        productTypeId,
      );

      setSuccessMessage(
        `Đã xóa/ẩn loại sản phẩm "${productTypeName}" thành công.`,
      );

      setActionError("");
      setDeletingProductType(null);
      setLoading(true);
      setError("");

      const isLastItemOnPage =
        productTypes.length === 1;

      if (
        isLastItemOnPage &&
        pagination.pageNumber > 1
      ) {
        setPagination(
          (currentPagination) => ({
            ...currentPagination,
            pageNumber:
              currentPagination.pageNumber -
              1,
          }),
        );
      } else {
        setRequestVersion(
          (currentVersion) =>
            currentVersion + 1,
        );
      }
    } catch (requestError) {
      setDeleteError(
        getErrorMessage(requestError),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePreviousPage = () => {
    if (
      loading ||
      isLoadingProductTypeDetails ||
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
      isLoadingProductTypeDetails ||
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
    setActionError("");

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
            Loại sản phẩm & Thuộc tính
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {hasAppliedFilters
              ? `Tìm thấy ${pagination.totalCount} loại sản phẩm phù hợp`
              : `Quản lý ${pagination.totalCount} loại sản phẩm hiện có trên hệ thống`}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          disabled={
            loading ||
            categories.length === 0 ||
            isDeleting ||
            isLoadingProductTypeDetails
          }
          title={
            categories.length === 0
              ? "Chưa tải được danh sách danh mục"
              : "Thêm loại sản phẩm mới"
          }
          className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[20px]">
            add
          </span>

          Thêm loại SP mới
        </button>
      </div>

      <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(180px,1fr)_minmax(160px,0.8fr)_auto]">
          <div>
            <label
              htmlFor="product-type-search"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Tìm kiếm
            </label>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-gray-400">
                search
              </span>

              <input
                id="product-type-search"
                type="search"
                value={searchTerm}
                onChange={
                  handleSearchTermChange
                }
                placeholder="Tìm theo tên loại sản phẩm..."
                className="w-full rounded-md border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClearKeyword}
                  aria-label="Xóa từ khóa tìm kiếm"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    close
                  </span>
                </button>
              )}
            </div>

            {isWaitingForSearch && (
              <p className="mt-1 text-xs text-gray-500">
                Đang chờ bạn nhập xong...
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="product-type-category-filter"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Danh mục
            </label>

            <select
              id="product-type-category-filter"
              value={selectedCategoryId}
              onChange={
                handleCategoryFilterChange
              }
              disabled={
                loading ||
                isLoadingProductTypeDetails
              }
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="">
                Tất cả danh mục
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={category.categoryId}
                    value={
                      category.categoryId
                    }
                  >
                    {category.categoryName}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="product-type-status-filter"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Trạng thái
            </label>

            <select
              id="product-type-status-filter"
              value={statusFilter}
              onChange={
                handleStatusFilterChange
              }
              disabled={
                loading ||
                isLoadingProductTypeDetails
              }
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="all">
                Tất cả trạng thái
              </option>

              <option value="active">
                Hoạt động
              </option>

              <option value="inactive">
                Đang ẩn
              </option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleResetFilters}
              disabled={
                loading ||
                isLoadingProductTypeDetails ||
                !hasInputFilters
              }
              className="flex w-full items-center justify-center gap-1 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 lg:w-auto"
            >
              <span className="material-symbols-outlined text-[18px]">
                filter_alt_off
              </span>

              Đặt lại
            </button>
          </div>
        </div>
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
          className="mb-6 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <div>
            <p className="text-sm font-medium text-red-700">
              Không thể tải chi tiết loại sản
              phẩm.
            </p>

            <p className="mt-1 whitespace-pre-line text-xs text-red-600">
              {actionError}
            </p>
          </div>

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

      {categoryError && (
        <div
          role="alert"
          className="mb-6 flex items-start justify-between gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4"
        >
          <div>
            <p className="text-sm text-yellow-800">
              Không thể tải đầy đủ dữ liệu
              danh mục.
            </p>

            <p className="mt-1 text-xs text-yellow-700">
              {categoryError}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setCategoryError("")
            }
            aria-label="Đóng cảnh báo"
            className="text-yellow-700 hover:text-yellow-900"
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
              <th className="p-4 font-semibold">
                Tên loại SP
              </th>

              <th className="p-4 font-semibold">
                Thuộc danh mục
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
                      {hasAppliedFilters
                        ? "Đang tìm kiếm..."
                        : "Đang tải loại sản phẩm..."}
                    </span>
                  </div>
                </td>
              </tr>
            ) : productTypes.length > 0 ? (
              productTypes.map(
                (productType) => {
                  const categoryName =
                    categoryNames[
                      productType.categoryId
                    ];

                  const isLoadingThisProductType =
                    loadingProductTypeId ===
                    productType.productTypeId;

                  return (
                    <tr
                      key={
                        productType.productTypeId
                      }
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="p-4 font-bold text-[#244f4d]">
                        {
                          productType.productTypeName
                        }
                      </td>

                      <td
                        className="p-4 font-medium text-gray-600"
                        title={
                          productType.categoryId
                        }
                      >
                        {categoryName ||
                          productType.categoryId ||
                          "Không xác định"}
                      </td>

                      <td className="max-w-[420px] p-4 text-gray-600">
                        <p className="line-clamp-2">
                          {productType.description ||
                            "Không có mô tả"}
                        </p>
                      </td>

                      <td className="whitespace-nowrap p-4 text-gray-600">
                        {formatCreatedAt(
                          productType.createdAt,
                        )}
                      </td>

                      <td className="p-4">
                        <span
                          className={[
                            "inline-block rounded-full px-3 py-1 text-xs font-semibold",
                            productType.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600",
                          ].join(" ")}
                        >
                          {productType.isActive
                            ? "Hoạt động"
                            : "Đang ẩn"}
                        </span>
                      </td>

                      <td className="space-x-2 p-4 text-right">
                        <button
                          type="button"
                          disabled
                          title="Sẽ gắn API thuộc tính ở bước sau"
                          aria-label={`Quản lý thuộc tính ${productType.productTypeName}`}
                          className="cursor-not-allowed rounded-md p-1.5 text-gray-300"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            settings
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleOpenEditModal(
                              productType,
                            )
                          }
                          disabled={
                            isDeleting ||
                            isLoadingProductTypeDetails
                          }
                          title={
                            isLoadingThisProductType
                              ? "Đang tải thông tin..."
                              : "Chỉnh sửa loại sản phẩm"
                          }
                          aria-label={`Chỉnh sửa ${productType.productTypeName}`}
                          className="rounded-md p-1.5 text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <span
                            className={[
                              "material-symbols-outlined text-[18px]",
                              isLoadingThisProductType
                                ? "animate-spin"
                                : "",
                            ].join(" ")}
                          >
                            {isLoadingThisProductType
                              ? "refresh"
                              : "edit"}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleOpenDeleteDialog(
                              productType,
                            )
                          }
                          disabled={
                            isDeleting ||
                            isLoadingProductTypeDetails
                          }
                          title="Xóa hoặc ẩn loại sản phẩm"
                          aria-label={`Xóa hoặc ẩn ${productType.productTypeName}`}
                          className="rounded-md p-1.5 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            visibility_off
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                },
              )
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="p-10 text-center text-gray-500"
                >
                  {hasAppliedFilters
                    ? "Không tìm thấy loại sản phẩm phù hợp."
                    : "Chưa có loại sản phẩm nào."}
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
              Trang {pagination.pageNumber} /{" "}
              {Math.max(
                pagination.totalPages,
                1,
              )}{" "}
              · {pagination.totalCount} kết quả
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePreviousPage}
                disabled={
                  loading ||
                  isDeleting ||
                  isLoadingProductTypeDetails ||
                  !pagination.hasPreviousPage
                }
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trang trước
              </button>

              <button
                type="button"
                onClick={handleNextPage}
                disabled={
                  loading ||
                  isDeleting ||
                  isLoadingProductTypeDetails ||
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
        <ProductTypeModal
          key={
            editingProductType?.productTypeId ||
            "create-product-type"
          }
          categories={categories}
          editingProductType={
            editingProductType
          }
          onClose={handleCloseModal}
          onSubmit={handleSaveProductType}
          submitting={isSaving}
          serverError={modalError}
        />
      )}

      {deletingProductType && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !isDeleting
            ) {
              handleCloseDeleteDialog();
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-product-type-title"
            aria-describedby="delete-product-type-description"
            className="w-full max-w-md rounded-xl bg-white shadow-2xl"
          >
            <div className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                <span className="material-symbols-outlined">
                  warning
                </span>
              </div>

              <h3
                id="delete-product-type-title"
                className="text-lg font-bold text-gray-900"
              >
                Xác nhận xóa/ẩn loại sản phẩm
              </h3>

              <p
                id="delete-product-type-description"
                className="mt-3 text-sm leading-6 text-gray-600"
              >
                Bạn có chắc chắn muốn xóa hoặc
                ẩn loại sản phẩm{" "}
                <strong className="text-gray-900">
                  “
                  {
                    deletingProductType.productTypeName
                  }
                  ”
                </strong>
                ?
              </p>

              <p className="mt-2 text-xs text-gray-500">
                Loại sản phẩm có thể không còn
                xuất hiện trong danh sách sau
                thao tác này.
              </p>

              {deleteError && (
                <div
                  role="alert"
                  className="mt-4 whitespace-pre-line rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {deleteError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 rounded-b-xl border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={
                  handleCloseDeleteDialog
                }
                disabled={isDeleting}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting && (
                  <span className="material-symbols-outlined animate-spin text-[18px]">
                    refresh
                  </span>
                )}

                {isDeleting
                  ? "Đang xử lý..."
                  : "Xác nhận xóa/ẩn"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}