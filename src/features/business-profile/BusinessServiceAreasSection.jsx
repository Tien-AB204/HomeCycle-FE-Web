import { useState } from "react";
import businessProfileApi from "../../services/apis/businessProfileApi";
import BusinessAddressFields from "./BusinessAddressFields";
import {
  BusinessSectionIntro,
  FormMessage,
  SaveButton,
} from "./BusinessFormControls";
import {
  getBusinessApiErrorMessage,
  getServiceAreaId,
  pickValue,
} from "./businessProfileUtils";

const emptyForm = {
  city: "",
  ward: "",
  street: "",
};

const normalizeArea = (area) => ({
  city: pickValue(area, [
    "city",
    "province",
  ]),
  ward: pickValue(area, ["ward"]),
  street: pickValue(area, [
    "street",
    "address",
  ]),
});

export default function BusinessServiceAreasSection({
  serviceAreas,
  onUpdated,
}) {
  const [form, setForm] = useState(
    emptyForm,
  );
  const [editingId, setEditingId] =
    useState("");
  const [deleteTarget, setDeleteTarget] =
    useState(null);
  const [isSaving, setIsSaving] =
    useState(false);
  const [error, setError] =
    useState("");
  const [success, setSuccess] =
    useState("");

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId("");
  };

  const handleEdit = (area) => {
    setEditingId(getServiceAreaId(area));
    setForm(normalizeArea(area));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (
      !form.city ||
      !form.ward ||
      !form.street.trim()
    ) {
      setError(
        "Vui lòng nhập đầy đủ khu vực hoạt động.",
      );
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        city: form.city,
        ward: form.ward,
        street: form.street.trim(),
      };

      if (editingId) {
        await businessProfileApi.updateServiceArea(
          editingId,
          payload,
        );
      } else {
        await businessProfileApi.addServiceArea(
          payload,
        );
      }

      await onUpdated?.();
      setSuccess(
        editingId
          ? "Khu vực hoạt động đã được cập nhật."
          : "Đã thêm khu vực hoạt động mới.",
      );
      resetForm();
    } catch (updateError) {
      setError(
        getBusinessApiErrorMessage(
          updateError,
          "Không thể lưu khu vực hoạt động.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const areaId = getServiceAreaId(
      deleteTarget,
    );

    if (!areaId) {
      setError(
        "Không tìm thấy mã khu vực cần xóa.",
      );
      setDeleteTarget(null);
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await businessProfileApi.deleteServiceArea(
        areaId,
      );
      await onUpdated?.();
      setDeleteTarget(null);
      if (editingId === areaId) {
        resetForm();
      }
      setSuccess(
        "Khu vực hoạt động đã được xóa.",
      );
    } catch (deleteError) {
      setError(
        getBusinessApiErrorMessage(
          deleteError,
          "Không thể xóa khu vực hoạt động.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <BusinessSectionIntro
        icon="distance"
        title="Khu vực hoạt động"
        description="Quản lý các địa bàn doanh nghiệp có thể thu mua, giao nhận hoặc cung cấp dịch vụ."
      />
      <FormMessage
        error={error}
        success={success}
      />

      <div className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {serviceAreas.length === 0 ? (
          <div className="sm:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-border bg-background px-6 py-9 text-center">
            <span className="material-symbols-outlined text-4xl text-border">
              add_location_alt
            </span>
            <p className="mt-2 font-black text-text">
              Chưa có khu vực hoạt động
            </p>
            <p className="mt-1 text-sm text-textLight">
              Thêm khu vực đầu tiên bằng biểu mẫu bên dưới.
            </p>
          </div>
        ) : (
          serviceAreas.map((area, index) => {
            const areaId =
              getServiceAreaId(area);
            const normalizedArea =
              normalizeArea(area);

            return (
              <article
                key={areaId || index}
                className="rounded-2xl border border-border bg-background p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
                    <span className="material-symbols-outlined text-[20px]">
                      location_on
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        handleEdit(area)
                      }
                      className="rounded-lg p-2 text-textLight hover:bg-white hover:text-primary"
                      aria-label="Sửa khu vực"
                    >
                      <span className="material-symbols-outlined text-[19px]">
                        edit
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteTarget(area);
                        setError("");
                        setSuccess("");
                      }}
                      className="rounded-lg p-2 text-textLight hover:bg-error/10 hover:text-error"
                      aria-label="Xóa khu vực"
                    >
                      <span className="material-symbols-outlined text-[19px]">
                        delete
                      </span>
                    </button>
                  </div>
                </div>
                <h3 className="mt-3 font-black text-text">
                  {normalizedArea.city ||
                    "Chưa có tỉnh thành"}
                </h3>
                <p className="mt-1 text-sm leading-6 text-textLight">
                  {[
                    normalizedArea.street,
                    normalizedArea.ward,
                  ]
                    .filter(Boolean)
                    .join(", ") ||
                    "Chưa có địa chỉ chi tiết"}
                </p>
              </article>
            );
          })
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-border bg-white p-4 sm:p-5"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="font-black text-text">
            {editingId
              ? "Chỉnh sửa khu vực"
              : "Thêm khu vực mới"}
          </h3>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm font-bold text-textLight hover:text-primary"
            >
              Hủy chỉnh sửa
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <BusinessAddressFields
            key={editingId || "new"}
            idPrefix="service-area"
            city={form.city}
            ward={form.ward}
            street={form.street}
            streetLabel="Địa bàn / tuyến đường"
            onChange={setForm}
          />
        </div>

        <div className="mt-5 flex justify-end">
          <SaveButton isSaving={isSaving}>
            {editingId
              ? "LƯU KHU VỰC"
              : "THÊM KHU VỰC"}
          </SaveButton>
        </div>
      </form>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-primary/45 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) {
              setDeleteTarget(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-area-title"
            className="w-full max-w-md rounded-3xl border border-white/60 bg-white p-6 shadow-2xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-error/10 text-error">
              <span className="material-symbols-outlined">
                delete_forever
              </span>
            </div>
            <h3
              id="delete-area-title"
              className="mt-4 text-xl font-black text-text"
            >
              Xóa khu vực hoạt động?
            </h3>
            <p className="mt-2 text-sm leading-6 text-textLight">
              Khu vực {normalizeArea(deleteTarget).city} sẽ bị xóa khỏi hồ sơ doanh nghiệp.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setDeleteTarget(null)
                }
                disabled={isSaving}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-textLight hover:bg-background disabled:opacity-60"
              >
                Giữ lại
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSaving}
                className="rounded-xl bg-error px-4 py-2.5 text-sm font-black text-white hover:bg-error disabled:opacity-60"
              >
                {isSaving
                  ? "ĐANG XÓA..."
                  : "XÓA KHU VỰC"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
