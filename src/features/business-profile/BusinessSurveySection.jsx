import {
  useEffect,
  useMemo,
  useState,
} from "react";
import businessProfileApi from "../../services/apis/businessProfileApi";
import productTypeApi from "../../services/apis/productTypeApi";
import provinceApi from "../../services/apis/provinceApi";
import { useAuth } from "../../hooks/useAuth";
import { getUserId } from "../../utils/authUtils";
import { saveBusinessSurveySnapshot } from "../../utils/businessSurveySession";
import {
  BUSINESS_SURVEY_DAMAGE_LEVELS,
  BUSINESS_SURVEY_FUNCTIONALITY_STATUSES,
  deriveBusinessSurveyFunctionalityStatuses,
  normalizeBusinessSurveyDamageLevels,
} from "../../utils/businessSurveyConditionUtils";
import {
  BusinessSectionIntro,
  FormMessage,
  SaveButton,
} from "./BusinessFormControls";
import {
  getBusinessApiErrorMessage,
  pickValue,
} from "./businessProfileUtils";

const PROCUREMENT_SCALES = [
  { value: 0, label: "Thu mua lẻ" },
  { value: 1, label: "Thu mua theo lô" },
];

const toArray = (value) =>
  Array.isArray(value) ? value : [];

const toNumberArray = (value) =>
  toArray(value)
    .map((item) =>
      Number(
        typeof item === "object"
          ? item.value ?? item.id
          : item,
      ),
    )
    .filter(Number.isInteger);

const createForm = (survey) => {
  const acceptableDamageLevels =
    normalizeBusinessSurveyDamageLevels(
      pickValue(
        survey,
        ["acceptableDamageLevels"],
        [],
      ),
    );

  return {
    targetCities: toArray(
      pickValue(
        survey,
        ["targetCities", "cities"],
        [],
      ),
    ).map((item) =>
      String(
        typeof item === "object"
          ? item.name ?? item.city ?? ""
          : item,
      ),
    ),
    acceptableDamageLevels,
    acceptableFunctionalityStatuses:
      deriveBusinessSurveyFunctionalityStatuses(
        acceptableDamageLevels,
      ),
    procurementScales: toNumberArray(
      pickValue(
        survey,
        ["procurementScales"],
        [],
      ),
    ),
    productTypeIds: toArray(
      pickValue(
        survey,
        ["productTypeIds", "productTypes"],
        [],
      ),
    )
      .map((item) =>
        String(
          typeof item === "object"
            ? item.productTypeId ?? item.id ?? ""
            : item,
        ),
      )
      .filter(Boolean),
  };
};

const ToggleOption = ({
  checked,
  onChange,
  disabled = false,
  children,
}) => (
  <label
    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
      disabled ? "cursor-not-allowed opacity-75" : "cursor-pointer"
    } ${
      checked
        ? "border-[#4F8588] bg-[#EAF4F1] text-[#214F53]"
        : `border-[#D8E5E2] bg-white text-[#607B7A] ${
            disabled ? "" : "hover:border-[#9FBFBA]"
          }`
    }`}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="h-4 w-4 accent-[#4F8588]"
    />
    {children}
  </label>
);

export default function BusinessSurveySection({
  survey,
  onUpdated,
}) {
  const { user } = useAuth();
  const [form, setForm] = useState(() =>
    createForm(survey),
  );
  const [provinces, setProvinces] =
    useState([]);
  const [productTypes, setProductTypes] =
    useState([]);
  const [cityQuery, setCityQuery] =
    useState("");
  const [productQuery, setProductQuery] =
    useState("");
  const [isLoadingOptions, setIsLoadingOptions] =
    useState(true);
  const [isSaving, setIsSaving] =
    useState(false);
  const [error, setError] =
    useState("");
  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    let isActive = true;

    Promise.allSettled([
      provinceApi.getProvinces(),
      productTypeApi.getAll({
        pageNumber: 1,
        pageSize: 100,
      }),
    ]).then(([provinceResult, typeResult]) => {
      if (!isActive) return;

      if (
        provinceResult.status ===
        "fulfilled"
      ) {
        setProvinces(
          Array.isArray(provinceResult.value)
            ? provinceResult.value
            : [],
        );
      }

      if (typeResult.status === "fulfilled") {
        setProductTypes(
          typeResult.value?.items || [],
        );
      }

      if (
        provinceResult.status ===
          "rejected" &&
        typeResult.status === "rejected"
      ) {
        setError(
          "Không thể tải danh sách tỉnh thành và loại sản phẩm.",
        );
      }

      setIsLoadingOptions(false);
    });

    return () => {
      isActive = false;
    };
  }, []);

  const filteredProvinces = useMemo(() => {
    const query = cityQuery
      .trim()
      .toLowerCase();

    return provinces
      .filter((province) =>
        province.name
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 18);
  }, [cityQuery, provinces]);

  const filteredProductTypes = useMemo(() => {
    const query = productQuery
      .trim()
      .toLowerCase();

    return productTypes
      .filter((item) =>
        String(
          item.productTypeName ||
            item.name ||
            "",
        )
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 24);
  }, [productQuery, productTypes]);

  const toggleValue = (
    field,
    value,
  ) => {
    setForm((current) => {
      const values = current[field];
      const exists = values.includes(value);

      return {
        ...current,
        [field]: exists
          ? values.filter(
              (item) => item !== value,
            )
          : [...values, value],
      };
    });
    setError("");
    setSuccess("");
  };

  const toggleDamageLevel = (value) => {
    setForm((current) => {
      const selectedDamageLevels = current.acceptableDamageLevels.includes(
        value,
      )
        ? current.acceptableDamageLevels.filter((item) => item !== value)
        : [...current.acceptableDamageLevels, value];
      const acceptableDamageLevels =
        normalizeBusinessSurveyDamageLevels(selectedDamageLevels);

      return {
        ...current,
        acceptableDamageLevels,
        acceptableFunctionalityStatuses:
          deriveBusinessSurveyFunctionalityStatuses(
            acceptableDamageLevels,
          ),
      };
    });
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.targetCities.length === 0) {
      setError(
        "Vui lòng chọn ít nhất một tỉnh thành mục tiêu.",
      );
      return;
    }
    if (
      form.acceptableDamageLevels.length ===
      0
    ) {
      setError(
        "Vui lòng chọn mức độ hư hỏng có thể thu mua.",
      );
      return;
    }
    if (
      form.acceptableFunctionalityStatuses
        .length === 0
    ) {
      setError(
        "Vui lòng chọn tình trạng hoạt động có thể thu mua.",
      );
      return;
    }
    if (
      form.procurementScales.length === 0
    ) {
      setError(
        "Vui lòng chọn ít nhất một quy mô thu mua.",
      );
      return;
    }
    if (form.productTypeIds.length === 0) {
      setError(
        "Vui lòng chọn ít nhất một loại sản phẩm.",
      );
      return;
    }

    setIsSaving(true);
    try {
      await businessProfileApi.submitSurvey(
        form,
      );
      saveBusinessSurveySnapshot(
        getUserId(user),
        form,
      );
      setSuccess(
        "Khảo sát nhu cầu thu mua đã được cập nhật thành công.",
      );
      onUpdated?.(form);
    } catch (updateError) {
      setError(
        getBusinessApiErrorMessage(
          updateError,
          "Không thể lưu khảo sát thu mua.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <BusinessSectionIntro
        icon="query_stats"
        title="Khảo sát nhu cầu thu mua"
        description="Thiết lập nhóm sản phẩm, địa bàn và tình trạng hàng hóa doanh nghiệp quan tâm để HomeCycle đề xuất chính xác hơn."
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-7"
      >
        <fieldset>
          <legend className="mb-3 text-sm font-black text-[#183F41]">
            Tỉnh thành mục tiêu
          </legend>
          <input
            type="search"
            value={cityQuery}
            onChange={(event) =>
              setCityQuery(event.target.value)
            }
            placeholder="Tìm tỉnh / thành phố"
            className="mb-3 w-full rounded-xl border border-[#CDDED9] px-3 py-2.5 text-sm outline-none focus:border-[#4F8588] sm:max-w-sm"
          />
          <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProvinces.map(
              (province) => (
                <ToggleOption
                  key={province.code}
                  checked={form.targetCities.includes(
                    province.name,
                  )}
                  onChange={() =>
                    toggleValue(
                      "targetCities",
                      province.name,
                    )
                  }
                >
                  {province.name}
                </ToggleOption>
              ),
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-sm font-black text-[#183F41]">
            Mức độ hư hỏng chấp nhận
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {BUSINESS_SURVEY_DAMAGE_LEVELS.map((option) => (
              <ToggleOption
                key={option.value}
                checked={form.acceptableDamageLevels.includes(
                  option.value,
                )}
                onChange={() =>
                  toggleDamageLevel(option.value)
                }
              >
                {option.label}
              </ToggleOption>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-sm font-black text-[#183F41]">
            Tình trạng hoạt động
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {BUSINESS_SURVEY_FUNCTIONALITY_STATUSES.map(
              (option) => (
                <ToggleOption
                  key={option.value}
                  checked={form.acceptableFunctionalityStatuses.includes(
                    option.value,
                  )}
                  disabled
                >
                  {option.label}
                </ToggleOption>
              ),
            )}
          </div>
          <p className="mt-2 text-xs font-medium text-[#68807F]">
            Tự động xác định theo mức độ hư hỏng đã chọn để đồng bộ với bài đăng.
          </p>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-sm font-black text-[#183F41]">
            Quy mô thu mua
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {PROCUREMENT_SCALES.map(
              (option) => (
                <ToggleOption
                  key={option.value}
                  checked={form.procurementScales.includes(
                    option.value,
                  )}
                  onChange={() =>
                    toggleValue(
                      "procurementScales",
                      option.value,
                    )
                  }
                >
                  {option.label}
                </ToggleOption>
              ),
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-sm font-black text-[#183F41]">
            Loại sản phẩm quan tâm
          </legend>
          <input
            type="search"
            value={productQuery}
            onChange={(event) =>
              setProductQuery(
                event.target.value,
              )
            }
            placeholder="Tìm loại sản phẩm"
            className="mb-3 w-full rounded-xl border border-[#CDDED9] px-3 py-2.5 text-sm outline-none focus:border-[#4F8588] sm:max-w-sm"
          />
          <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProductTypes.map(
              (item) => {
                const id = String(
                  item.productTypeId ||
                    item.id ||
                    "",
                );
                return (
                  <ToggleOption
                    key={id}
                    checked={form.productTypeIds.includes(
                      id,
                    )}
                    onChange={() =>
                      toggleValue(
                        "productTypeIds",
                        id,
                      )
                    }
                  >
                    {item.productTypeName ||
                      item.name ||
                      "Loại sản phẩm"}
                  </ToggleOption>
                );
              },
            )}
          </div>
        </fieldset>

        {isLoadingOptions && (
          <p className="text-sm text-[#68807F]">
            Đang tải danh mục khảo sát...
          </p>
        )}

        <div className="border-t border-[#E4ECEA] pt-5">
          <div className="flex justify-end">
            <SaveButton isSaving={isSaving}>
              LƯU KHẢO SÁT
            </SaveButton>
          </div>
          <div className="mt-3">
            <FormMessage
              error={error}
              success={success}
            />
          </div>
        </div>
      </form>
    </div>
  );
}
