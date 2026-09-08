import {
  useEffect,
  useState,
} from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";
import AttributeModal from "../../features/system/productType/AttributeModal";
import DeleteConfirmationModal from "../../features/system/productType/DeleteConfirmationModal";
import OptionModal from "../../features/system/productType/OptionModal";
import productTypeApi from "../../services/apis/productTypeApi";
import productTypeAttributeApi from "../../services/apis/productTypeAttributeApi";
import productTypeOptionApi from "../../services/apis/productTypeOptionApi";

const INPUT_MODE_LABELS = {
  OptionOnly: "Chỉ chọn tùy chọn",
  FreeText: "Nhập tự do",
  OptionOrText: "Chọn hoặc nhập",
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

const getInputModeLabel = (
  inputMode,
) => {
  if (!inputMode) {
    return "Chưa cấu hình";
  }

  return (
    INPUT_MODE_LABELS[inputMode] ||
    inputMode
  );
};

const getNextOptionDisplayOrder = (
  options,
) => {
  return (
    options.reduce(
      (currentMaximum, option) => {
        const displayOrder =
          Number.isInteger(
            option.displayOrder,
          )
            ? option.displayOrder
            : 0;

        return Math.max(
          currentMaximum,
          displayOrder,
        );
      },
      0,
    ) + 1
  );
};

export default function ProductTypeAttributePage() {
  const navigate = useNavigate();

  const {
    productTypeId = "",
  } = useParams();

  const [
    productType,
    setProductType,
  ] = useState(null);

  const [attributes, setAttributes] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    requestVersion,
    setRequestVersion,
  ] = useState(0);

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [
    editingAttribute,
    setEditingAttribute,
  ] = useState(null);

  const [
    loadingAttributeId,
    setLoadingAttributeId,
  ] = useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  const [modalError, setModalError] =
    useState("");

  const [actionError, setActionError] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    optionModalAttribute,
    setOptionModalAttribute,
  ] = useState(null);

  const [
    editingOption,
    setEditingOption,
  ] = useState(null);

  const [
    isOptionModalOpen,
    setIsOptionModalOpen,
  ] = useState(false);

  const [
    isSavingOption,
    setIsSavingOption,
  ] = useState(false);

  const [
    optionModalError,
    setOptionModalError,
  ] = useState("");

  const [
    loadingOptionsAttributeId,
    setLoadingOptionsAttributeId,
  ] = useState("");

  const [
    deletingOptionContext,
    setDeletingOptionContext,
  ] = useState(null);

  const [
    isDeletingOption,
    setIsDeletingOption,
  ] = useState(false);

  const [
    deleteOptionError,
    setDeleteOptionError,
  ] = useState("");

  const [
    deletingAttribute,
    setDeletingAttribute,
  ] = useState(null);

  const [
    isDeletingAttribute,
    setIsDeletingAttribute,
  ] = useState(false);

  const [
    deleteAttributeError,
    setDeleteAttributeError,
  ] = useState("");

  const [
    deleteAttributeProgress,
    setDeleteAttributeProgress,
  ] = useState({
    stage: "idle",
    deletedOptions: 0,
    totalOptions: 0,
  });

  useEffect(() => {
    const controller =
      new AbortController();

    let isActive = true;

    Promise.all([
      productTypeApi.getById(
        productTypeId,
        {
          signal: controller.signal,
        },
      ),
      productTypeAttributeApi.getAll(
        productTypeId,
        {
          signal: controller.signal,
        },
      ),
    ])
      .then(
        ([
          productTypeResult,
          attributeResult,
        ]) => {
          if (!isActive) {
            return;
          }

          setProductType(
            productTypeResult,
          );

          setAttributes(
            attributeResult,
          );

          setError("");
        },
      )
      .catch((requestError) => {
        if (
          !isActive ||
          isCanceledRequest(requestError)
        ) {
          return;
        }

        setProductType(null);
        setAttributes([]);

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
    productTypeId,
    requestVersion,
  ]);

  const handleBack = () => {
    navigate("/admin/product-types");
  };

  const handleRefresh = () => {
    if (loading) {
      return;
    }

    setLoading(true);
    setError("");

    setRequestVersion(
      (currentVersion) =>
        currentVersion + 1,
    );
  };

  const handleOpenCreateModal = () => {
    if (
      loading ||
      isSaving ||
      loadingAttributeId
    ) {
      return;
    }

    setEditingAttribute(null);
    setModalError("");
    setActionError("");
    setSuccessMessage("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal =
    async (attribute) => {
      if (
        loading ||
        isSaving ||
        loadingAttributeId ||
        !attribute?.attributeId
      ) {
        return;
      }

      setLoadingAttributeId(
        attribute.attributeId,
      );

      setModalError("");
      setActionError("");
      setSuccessMessage("");

      try {
        const detailedAttribute =
          await productTypeAttributeApi.getById(
            attribute.attributeId,
          );

        setEditingAttribute(
          detailedAttribute,
        );

        setIsModalOpen(true);
      } catch (requestError) {
        setEditingAttribute(null);

        setActionError(
          getErrorMessage(requestError),
        );
      } finally {
        setLoadingAttributeId("");
      }
    };

  const handleCloseModal = () => {
    if (isSaving) {
      return;
    }

    setEditingAttribute(null);
    setModalError("");
    setIsModalOpen(false);
  };

  const handleSaveAttribute =
    async (formData) => {
      if (isSaving) {
        return;
      }

      setIsSaving(true);
      setModalError("");

      try {
        if (editingAttribute) {
          const updatedAttribute =
            await productTypeAttributeApi.update(
              editingAttribute.attributeId,
              formData,
            );

          setSuccessMessage(
            'Đã cập nhật thuộc tính "' +
              updatedAttribute.attributeName +
              '" thành công.',
          );
        } else {
          const createdAttribute =
            await productTypeAttributeApi.create(
              productTypeId,
              formData,
            );

          setSuccessMessage(
            'Đã tạo thuộc tính "' +
              createdAttribute.attributeName +
              '" thành công.',
          );
        }

        setEditingAttribute(null);
        setIsModalOpen(false);
        setActionError("");
        setLoading(true);

        setRequestVersion(
          (currentVersion) =>
            currentVersion + 1,
        );
      } catch (requestError) {
        setModalError(
          getErrorMessage(requestError),
        );
      } finally {
        setIsSaving(false);
      }
    };

  const handleOpenCreateOptionModal =
    async (attribute) => {
    if (
      loading ||
      isSavingOption ||
      isDeletingOption ||
      loadingOptionsAttributeId ||
      !attribute?.attributeId
    ) {
      return;
    }

    setLoadingOptionsAttributeId(
      attribute.attributeId,
    );

    setActionError("");
    setSuccessMessage("");

    try {
      const options =
        await productTypeOptionApi.getAll(
          attribute.attributeId,
        );

      const refreshedAttribute = {
        ...attribute,
        options,
      };

      setAttributes(
        (currentAttributes) =>
          currentAttributes.map(
            (currentAttribute) =>
              currentAttribute.attributeId ===
              attribute.attributeId
                ? refreshedAttribute
                : currentAttribute,
          ),
      );

      setOptionModalAttribute(
        refreshedAttribute,
      );

      setEditingOption(null);
      setOptionModalError("");
      setIsOptionModalOpen(true);
    } catch (requestError) {
      setActionError(
        getErrorMessage(requestError),
      );
    } finally {
      setLoadingOptionsAttributeId("");
    }
  };

  const handleOpenEditOptionModal =
    async (attribute, option) => {
    if (
      loading ||
      isSavingOption ||
      isDeletingOption ||
      loadingOptionsAttributeId ||
      !attribute?.attributeId ||
      !option?.optionId
    ) {
      return;
    }

    setLoadingOptionsAttributeId(
      attribute.attributeId,
    );

    setActionError("");
    setSuccessMessage("");

    try {
      const options =
        await productTypeOptionApi.getAll(
          attribute.attributeId,
        );

      const refreshedOption =
        options.find(
          (currentOption) =>
            currentOption.optionId ===
            option.optionId,
        );

      if (!refreshedOption) {
        throw new Error(
          "Tùy chọn không còn tồn tại. Vui lòng tải lại dữ liệu.",
        );
      }

      const refreshedAttribute = {
        ...attribute,
        options,
      };

      setAttributes(
        (currentAttributes) =>
          currentAttributes.map(
            (currentAttribute) =>
              currentAttribute.attributeId ===
              attribute.attributeId
                ? refreshedAttribute
                : currentAttribute,
          ),
      );

      setOptionModalAttribute(
        refreshedAttribute,
      );

      setEditingOption(
        refreshedOption,
      );

      setOptionModalError("");
      setIsOptionModalOpen(true);
    } catch (requestError) {
      setActionError(
        getErrorMessage(requestError),
      );
    } finally {
      setLoadingOptionsAttributeId("");
    }
  };

  const handleCloseOptionModal = () => {
    if (isSavingOption) {
      return;
    }

    setOptionModalAttribute(null);
    setEditingOption(null);
    setOptionModalError("");
    setIsOptionModalOpen(false);
  };

  const handleSaveOption =
    async (formData) => {
      if (
        isSavingOption ||
        !optionModalAttribute
      ) {
        return;
      }

      setIsSavingOption(true);
      setOptionModalError("");

      try {
        if (editingOption) {
          const updatedOption =
            await productTypeOptionApi.update(
              editingOption.optionId,
              formData,
            );

          setSuccessMessage(
            'Đã cập nhật tùy chọn "' +
              updatedOption.optionValue +
              '" thành công.',
          );
        } else {
          const createdOption =
            await productTypeOptionApi.create(
              optionModalAttribute.attributeId,
              formData,
            );

          setSuccessMessage(
            'Đã thêm tùy chọn "' +
              createdOption.optionValue +
              '" thành công.',
          );
        }

        setOptionModalAttribute(null);
        setEditingOption(null);
        setIsOptionModalOpen(false);
        setActionError("");
        setLoading(true);

        setRequestVersion(
          (currentVersion) =>
            currentVersion + 1,
        );
      } catch (requestError) {
        setOptionModalError(
          getErrorMessage(requestError),
        );
      } finally {
        setIsSavingOption(false);
      }
    };

  const handleRequestDeleteOption = (
    attribute,
    option,
  ) => {
    if (
      loading ||
      isSavingOption ||
      isDeletingOption ||
      !attribute?.attributeId ||
      !option?.optionId
    ) {
      return;
    }

    if (
      attribute.options.length <= 1
    ) {
      setActionError(
        "Thuộc tính OptionOnly phải giữ lại ít nhất một tùy chọn.",
      );

      return;
    }

    setDeletingOptionContext({
      attribute,
      option,
    });

    setDeleteOptionError("");
    setActionError("");
    setSuccessMessage("");
  };

  const handleCancelDeleteOption = () => {
    if (isDeletingOption) {
      return;
    }

    setDeletingOptionContext(null);
    setDeleteOptionError("");
  };

  const handleConfirmDeleteOption =
    async () => {
      const option =
        deletingOptionContext?.option;

      if (
        isDeletingOption ||
        !option?.optionId
      ) {
        return;
      }

      setIsDeletingOption(true);
      setDeleteOptionError("");

      try {
        await productTypeOptionApi.remove(
          option.optionId,
        );

        setSuccessMessage(
          'Đã xóa tùy chọn "' +
            option.optionValue +
            '" thành công.',
        );

        setDeletingOptionContext(null);
        setActionError("");
        setLoading(true);

        setRequestVersion(
          (currentVersion) =>
            currentVersion + 1,
        );
      } catch (requestError) {
        setDeleteOptionError(
          getErrorMessage(requestError),
        );
      } finally {
        setIsDeletingOption(false);
      }
    };

  const handleRequestDeleteAttribute = (
    attribute,
  ) => {
    if (
      loading ||
      isSaving ||
      isSavingOption ||
      isDeletingOption ||
      isDeletingAttribute ||
      loadingAttributeId ||
      loadingOptionsAttributeId ||
      !attribute?.attributeId
    ) {
      return;
    }

    setDeletingAttribute(attribute);
    setDeleteAttributeError("");
    setActionError("");
    setSuccessMessage("");

    setDeleteAttributeProgress({
      stage: "idle",
      deletedOptions: 0,
      totalOptions:
        attribute.options.length,
    });
  };

  const handleCancelDeleteAttribute =
    () => {
      if (isDeletingAttribute) {
        return;
      }

      setDeletingAttribute(null);
      setDeleteAttributeError("");

      setDeleteAttributeProgress({
        stage: "idle",
        deletedOptions: 0,
        totalOptions: 0,
      });
    };

  const handleConfirmDeleteAttribute =
    async () => {
      if (
        isDeletingAttribute ||
        !deletingAttribute?.attributeId
      ) {
        return;
      }

      let deletedOptionCount = 0;
      let totalOptionCount = 0;

      setIsDeletingAttribute(true);
      setDeleteAttributeError("");

      setDeleteAttributeProgress({
        stage: "loading-options",
        deletedOptions: 0,
        totalOptions: 0,
      });

      try {
        const latestOptions =
          await productTypeOptionApi.getAll(
            deletingAttribute.attributeId,
          );

        totalOptionCount =
          latestOptions.length;

        setDeleteAttributeProgress({
          stage: "deleting-options",
          deletedOptions: 0,
          totalOptions:
            totalOptionCount,
        });

        for (
          let optionIndex = 0;
          optionIndex <
          latestOptions.length;
          optionIndex += 1
        ) {
          await productTypeOptionApi.remove(
            latestOptions[optionIndex]
              .optionId,
          );

          deletedOptionCount =
            optionIndex + 1;

          setDeleteAttributeProgress({
            stage:
              "deleting-options",
            deletedOptions:
              deletedOptionCount,
            totalOptions:
              totalOptionCount,
          });
        }

        setDeleteAttributeProgress({
          stage:
            "deleting-attribute",
          deletedOptions:
            deletedOptionCount,
          totalOptions:
            totalOptionCount,
        });

        await productTypeAttributeApi.remove(
          deletingAttribute.attributeId,
        );

        setSuccessMessage(
          'Đã xóa thuộc tính "' +
            deletingAttribute.attributeName +
            '" thành công.',
        );

        setDeletingAttribute(null);
        setActionError("");

        setDeleteAttributeProgress({
          stage: "idle",
          deletedOptions: 0,
          totalOptions: 0,
        });

        setLoading(true);

        setRequestVersion(
          (currentVersion) =>
            currentVersion + 1,
        );
      } catch (requestError) {
        const partialDeletionMessage =
          deletedOptionCount > 0
            ? "\nĐã xóa " +
              deletedOptionCount +
              "/" +
              totalOptionCount +
              " tùy chọn. Bạn có thể thử lại để tiếp tục."
            : "";

        setDeleteAttributeError(
          getErrorMessage(
            requestError,
          ) +
            partialDeletionMessage,
        );

        setLoading(true);

        setRequestVersion(
          (currentVersion) =>
            currentVersion + 1,
        );
      } finally {
        setIsDeletingAttribute(false);
      }
    };

  const totalOptions =
    attributes.reduce(
      (currentTotal, attribute) => {
        return (
          currentTotal +
          attribute.options.length
        );
      },
      0,
    );

  const requiredAttributeCount =
    attributes.filter(
      (attribute) =>
        attribute.isRequired,
    ).length;

  const filterableAttributeCount =
    attributes.filter(
      (attribute) =>
        attribute.isFilterable,
    ).length;

  const nextDisplayOrder =
    attributes.reduce(
      (currentMaximum, attribute) => {
        const displayOrder =
          Number.isInteger(
            attribute.displayOrder,
          )
            ? attribute.displayOrder
            : 0;

        return Math.max(
          currentMaximum,
          displayOrder,
        );
      },
      0,
    ) + 1;

  const attributeDeleteMessage = (() => {
    if (!deletingAttribute) {
      return "";
    }

    if (!isDeletingAttribute) {
      const optionCount =
        deletingAttribute.options.length;

      return (
        'Bạn có chắc muốn xóa thuộc tính "' +
        deletingAttribute.attributeName +
        '"? Hệ thống sẽ xóa ' +
        optionCount +
        " tùy chọn trước khi xóa thuộc tính. Thao tác này không thể hoàn tác."
      );
    }

    if (
      deleteAttributeProgress.stage ===
      "loading-options"
    ) {
      return "Đang kiểm tra danh sách tùy chọn mới nhất...";
    }

    if (
      deleteAttributeProgress.stage ===
      "deleting-options"
    ) {
      return (
        "Đang xóa tùy chọn " +
        deleteAttributeProgress.deletedOptions +
        "/" +
        deleteAttributeProgress.totalOptions +
        "..."
      );
    }

    return "Đã xóa toàn bộ tùy chọn. Đang xóa thuộc tính...";
  })();


  return (
    <div className="m-6 space-y-6">
      <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={handleBack}
              aria-label="Quay lại danh sách loại sản phẩm"
              title="Quay lại"
              className="mt-0.5 rounded-md border border-border p-2 text-textLight transition hover:bg-background hover:text-text"
            >
              <span className="material-symbols-outlined text-[20px]">
                arrow_back
              </span>
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-text">
                  {productType?.productTypeName ||
                    "Quản lý thuộc tính"}
                </h2>

                {productType && (
                  <span
                    className={[
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      productType.isActive
                        ? "bg-success/10 text-success"
                        : "bg-background text-textLight",
                    ].join(" ")}
                  >
                    {productType.isActive
                      ? "Hoạt động"
                      : "Đang ẩn"}
                  </span>
                )}
              </div>

              <p className="mt-1 text-sm text-textLight">
                {productType?.description ||
                  "Xem cấu hình thuộc tính và tùy chọn của loại sản phẩm."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={
                handleOpenCreateModal
              }
              disabled={
                loading ||
                isSaving ||
                Boolean(
                  loadingAttributeId,
                )
              }
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">
                add
              </span>

              Thêm thuộc tính
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-text transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span
                className={[
                  "material-symbols-outlined text-[18px]",
                  loading
                    ? "animate-spin"
                    : "",
                ].join(" ")}
              >
                refresh
              </span>

              Làm mới
            </button>
          </div>
        </div>
      </section>

      {error && (
        <section
          role="alert"
          className="rounded-xl border border-error/20 bg-error/10 p-5"
        >
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold text-error">
                Không thể tải dữ liệu thuộc tính
              </p>

              <p className="mt-1 whitespace-pre-line text-sm text-error">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              className="rounded-md bg-error px-4 py-2 text-sm font-medium text-white transition hover:bg-error"
            >
              Thử lại
            </button>
          </div>
        </section>
      )}

      {actionError && (
        <section
          role="alert"
          className="flex items-start justify-between gap-4 rounded-xl border border-error/20 bg-error/10 p-5"
        >
          <p className="whitespace-pre-line text-sm text-error">
            {actionError}
          </p>

          <button
            type="button"
            onClick={() =>
              setActionError("")
            }
            aria-label="Đóng thông báo lỗi"
            className="text-error hover:text-error"
          >
            <span className="material-symbols-outlined text-[20px]">
              close
            </span>
          </button>
        </section>
      )}

      {successMessage && (
        <section
          role="status"
          className="flex items-start justify-between gap-4 rounded-xl border border-success/20 bg-success/10 p-5"
        >
          <p className="text-sm text-success">
            {successMessage}
          </p>

          <button
            type="button"
            onClick={() =>
              setSuccessMessage("")
            }
            aria-label="Đóng thông báo thành công"
            className="text-success hover:text-success/80"
          >
            <span className="material-symbols-outlined text-[20px]">
              close
            </span>
          </button>
        </section>
      )}

      {loading ? (
        <section className="rounded-xl border border-border bg-white p-10 shadow-sm">
          <div
            role="status"
            className="flex items-center justify-center gap-3 text-textLight"
          >
            <span className="material-symbols-outlined animate-spin">
              refresh
            </span>

            <span>
              Đang tải thuộc tính và tùy chọn...
            </span>
          </div>
        </section>
      ) : !error ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-textLight">
                Tổng thuộc tính
              </p>

              <p className="mt-2 text-2xl font-bold text-text">
                {attributes.length}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-textLight">
                Tổng tùy chọn
              </p>

              <p className="mt-2 text-2xl font-bold text-primary">
                {totalOptions}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-textLight">
                Thuộc tính bắt buộc
              </p>

              <p className="mt-2 text-2xl font-bold text-warning">
                {requiredAttributeCount}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-textLight">
                Hỗ trợ bộ lọc
              </p>

              <p className="mt-2 text-2xl font-bold text-primary">
                {filterableAttributeCount}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h3 className="text-lg font-bold text-text">
                Danh sách thuộc tính
              </h3>

              <p className="mt-1 text-sm text-textLight">
                Các thuộc tính được sắp xếp theo thứ tự hiển thị từ API.
              </p>
            </div>

            {attributes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
                <span className="material-symbols-outlined text-[42px] text-border">
                  tune
                </span>

                <p className="mt-3 font-medium text-text">
                  Loại sản phẩm chưa có thuộc tính
                </p>

                <p className="mt-1 text-sm text-textLight">
                  Bấm “Thêm thuộc tính” để tạo cấu hình đầu tiên.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {attributes.map(
                  (
                    attribute,
                    attributeIndex,
                  ) => (
                    <article
                      key={
                        attribute.attributeId
                      }
                      className="overflow-hidden rounded-xl border border-border"
                    >
                      <div className="flex flex-col justify-between gap-4 border-b border-border bg-background px-5 py-4 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                            {attribute.displayOrder ??
                              attributeIndex +
                                1}
                          </span>

                          <div>
                            <h4 className="font-bold text-text">
                              {attribute.attributeName}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                            {getInputModeLabel(
                              attribute.inputMode,
                            )}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              handleOpenEditModal(
                                attribute,
                              )
                            }
                            disabled={
                              loading ||
                              isSaving ||
                              Boolean(
                                loadingAttributeId,
                              )
                            }
                            title={
                              loadingAttributeId ===
                              attribute.attributeId
                                ? "Đang tải chi tiết..."
                                : "Chỉnh sửa thuộc tính"
                            }
                            aria-label={
                              "Chỉnh sửa thuộc tính " +
                              attribute.attributeName
                            }
                            className="rounded-md p-2 text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <span
                              className={[
                                "material-symbols-outlined text-[18px]",
                                loadingAttributeId ===
                                attribute.attributeId
                                  ? "animate-spin"
                                  : "",
                              ].join(" ")}
                            >
                              {loadingAttributeId ===
                              attribute.attributeId
                                ? "refresh"
                                : "edit"}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleRequestDeleteAttribute(
                                attribute,
                              )
                            }
                            disabled={
                              loading ||
                              isSaving ||
                              isSavingOption ||
                              isDeletingOption ||
                              isDeletingAttribute ||
                              Boolean(
                                loadingAttributeId,
                              ) ||
                              Boolean(
                                loadingOptionsAttributeId,
                              )
                            }
                            title="Xóa thuộc tính"
                            aria-label={
                              "Xóa thuộc tính " +
                              attribute.attributeName
                            }
                            className="rounded-md p-2 text-error transition hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              delete
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="rounded-lg bg-background p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-textLight">
                              Kiểu dữ liệu
                            </p>

                            <p className="mt-1 text-sm font-semibold text-text">
                              {attribute.dataType ||
                                "Chưa cấu hình"}
                            </p>
                          </div>

                          <div className="rounded-lg bg-background p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-textLight">
                              Đơn vị
                            </p>

                            <p className="mt-1 text-sm font-semibold text-text">
                              {attribute.unit ||
                                "Không có"}
                            </p>
                          </div>

                          <div className="rounded-lg bg-background p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-textLight">
                              Bắt buộc
                            </p>

                            <p
                              className={[
                                "mt-1 text-sm font-semibold",
                                attribute.isRequired
                                  ? "text-warning"
                                  : "text-textLight",
                              ].join(" ")}
                            >
                              {attribute.isRequired
                                ? "Có"
                                : "Không"}
                            </p>
                          </div>

                          <div className="rounded-lg bg-background p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-textLight">
                              Cho phép lọc
                            </p>

                            <p
                              className={[
                                "mt-1 text-sm font-semibold",
                                attribute.isFilterable
                                  ? "text-primary"
                                  : "text-textLight",
                              ].join(" ")}
                            >
                              {attribute.isFilterable
                                ? "Có"
                                : "Không"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 border-t border-border pt-4">
                          <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                            <div>
                              <h5 className="text-sm font-bold text-text">
                                Tùy chọn
                              </h5>

                              <p className="mt-1 text-xs text-textLight">
                                {
                                  attribute.options
                                    .length
                                }{" "}
                                lựa chọn
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleOpenCreateOptionModal(
                                  attribute,
                                )
                              }
                              disabled={
                                loading ||
                                isSavingOption ||
                                isDeletingOption ||
                                Boolean(
                                  loadingOptionsAttributeId,
                                )
                              }
                              className="flex w-fit items-center gap-1 rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <span
                                className={[
                                  "material-symbols-outlined text-[18px]",
                                  loadingOptionsAttributeId ===
                                  attribute.attributeId
                                    ? "animate-spin"
                                    : "",
                                ].join(" ")}
                              >
                                {loadingOptionsAttributeId ===
                                attribute.attributeId
                                  ? "refresh"
                                  : "add"}
                              </span>

                              Thêm tùy chọn
                            </button>
                          </div>

                          {attribute.options
                            .length === 0 ? (
                            <p className="rounded-lg bg-background px-4 py-3 text-sm text-textLight">
                              Thuộc tính này chưa có tùy chọn.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {attribute.options.map(
                                (
                                  option,
                                  optionIndex,
                                ) => (
                                  <div
                                    key={
                                      option.optionId
                                    }
                                    className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3 sm:flex-row sm:items-center"
                                  >
                                    <div className="flex min-w-0 items-center gap-3">
                                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-textLight shadow-sm">
                                        {option.displayOrder ??
                                          optionIndex +
                                            1}
                                      </span>

                                      <span className="break-words text-sm font-medium text-text">
                                        {
                                          option.optionValue
                                        }
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1 self-end sm:self-auto">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenEditOptionModal(
                                            attribute,
                                            option,
                                          )
                                        }
                                        disabled={
                                          loading ||
                                          isSavingOption ||
                                          isDeletingOption ||
                                          Boolean(
                                            loadingOptionsAttributeId,
                                          )
                                        }
                                        title="Chỉnh sửa tùy chọn"
                                        aria-label={
                                          "Chỉnh sửa tùy chọn " +
                                          option.optionValue
                                        }
                                        className="rounded-md p-2 text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        <span className="material-symbols-outlined text-[18px]">
                                          edit
                                        </span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRequestDeleteOption(
                                            attribute,
                                            option,
                                          )
                                        }
                                        disabled={
                                          loading ||
                                          isSavingOption ||
                                          isDeletingOption ||
                                          Boolean(
                                            loadingOptionsAttributeId,
                                          ) ||
                                          attribute
                                            .options
                                            .length <=
                                            1
                                        }
                                        title={
                                          attribute
                                            .options
                                            .length <= 1
                                            ? "Phải giữ lại ít nhất một tùy chọn"
                                            : "Xóa tùy chọn"
                                        }
                                        aria-label={
                                          "Xóa tùy chọn " +
                                          option.optionValue
                                        }
                                        className="rounded-md p-2 text-error transition hover:bg-error/10 disabled:cursor-not-allowed disabled:text-border"
                                      >
                                        <span className="material-symbols-outlined text-[18px]">
                                          delete
                                        </span>
                                      </button>
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  ),
                )}
              </div>
            )}
          </section>
        </>
      ) : null}
      {isOptionModalOpen &&
        optionModalAttribute && (
          <OptionModal
            key={
              editingOption?.optionId ||
              "create-option"
            }
            attributeName={
              optionModalAttribute.attributeName
            }
            editingOption={
              editingOption
            }
            existingOptions={
              optionModalAttribute.options
            }
            defaultDisplayOrder={
              getNextOptionDisplayOrder(
                optionModalAttribute.options,
              )
            }
            onClose={
              handleCloseOptionModal
            }
            onSubmit={
              handleSaveOption
            }
            submitting={
              isSavingOption
            }
            serverError={
              optionModalError
            }
          />
        )}

      {deletingOptionContext && (
        <DeleteConfirmationModal
          title="Xóa tùy chọn"
          message={
            'Bạn có chắc muốn xóa tùy chọn "' +
            deletingOptionContext.option
              .optionValue +
            '" khỏi thuộc tính "' +
            deletingOptionContext.attribute
              .attributeName +
            '"?'
          }
          confirmText="Xóa tùy chọn"
          onCancel={
            handleCancelDeleteOption
          }
          onConfirm={
            handleConfirmDeleteOption
          }
          confirming={
            isDeletingOption
          }
          error={
            deleteOptionError
          }
        />
      )}

      {deletingAttribute && (
        <DeleteConfirmationModal
          title="Xóa thuộc tính"
          message={
            attributeDeleteMessage
          }
          confirmText="Xóa thuộc tính"
          onCancel={
            handleCancelDeleteAttribute
          }
          onConfirm={
            handleConfirmDeleteAttribute
          }
          confirming={
            isDeletingAttribute
          }
          error={
            deleteAttributeError
          }
        />
      )}

      {isModalOpen && (
        <AttributeModal
          key={
            editingAttribute?.attributeId ||
            "create-attribute"
          }
          editingAttribute={
            editingAttribute
          }
          defaultDisplayOrder={
            nextDisplayOrder
          }
          onClose={handleCloseModal}
          onSubmit={
            handleSaveAttribute
          }
          submitting={isSaving}
          serverError={modalError}
        />
      )}
    </div>
  );
}