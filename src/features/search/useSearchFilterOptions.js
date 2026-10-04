import { useEffect, useState } from "react";
import categoryApi from "../../services/apis/categoryApi";
import productTypeApi from "../../services/apis/productTypeApi";
import { provinceApi } from "../../services/apis/provinceApi";
import { getApiErrorMessage, isCanceledRequest } from "../../utils/apiError";

const EMPTY_STATE = { key: "", items: [], error: "" };

/*
 * Dữ liệu cho bộ lọc tìm kiếm: danh mục đang hoạt động, tỉnh/thành, loại
 * sản phẩm theo danh mục và thuộc tính lọc theo loại sản phẩm. Mỗi danh sách
 * gắn với khóa đã tải để không hiển thị dữ liệu của lựa chọn cũ.
 */
export const useSearchFilterOptions = ({ categoryId, productTypeId }) => {
  const [categories, setCategories] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [productTypeState, setProductTypeState] = useState(EMPTY_STATE);
  const [attributeState, setAttributeState] = useState(EMPTY_STATE);

  useEffect(() => {
    const controller = new AbortController();

    categoryApi
      .getActive({ signal: controller.signal })
      .then(setCategories)
      .catch(() => {
        if (!controller.signal.aborted) {
          setCategories([]);
        }
      });

    provinceApi
      .getProvinces({ signal: controller.signal })
      .then((items) =>
        setProvinces(
          (Array.isArray(items) ? items : [])
            .map((province) => province?.name)
            .filter(Boolean),
        ),
      )
      .catch(() => {
        if (!controller.signal.aborted) {
          setProvinces([]);
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!categoryId) {
      return undefined;
    }

    const controller = new AbortController();

    productTypeApi
      .getByCategory(categoryId, { signal: controller.signal })
      .then((items) =>
        setProductTypeState({
          key: categoryId,
          items: items.filter((item) => item?.isActive !== false),
          error: "",
        }),
      )
      .catch((error) => {
        if (controller.signal.aborted || isCanceledRequest(error)) {
          return;
        }

        setProductTypeState({
          key: categoryId,
          items: [],
          error: getApiErrorMessage(
            error,
            "Không thể tải loại sản phẩm. Bạn vẫn có thể tìm theo danh mục.",
          ),
        });
      });

    return () => controller.abort();
  }, [categoryId]);

  useEffect(() => {
    if (!productTypeId) {
      return undefined;
    }

    const controller = new AbortController();

    productTypeApi
      .getFilterableAttributes(productTypeId, { signal: controller.signal })
      .then((items) =>
        setAttributeState({ key: productTypeId, items, error: "" }),
      )
      .catch((error) => {
        if (controller.signal.aborted || isCanceledRequest(error)) {
          return;
        }

        setAttributeState({
          key: productTypeId,
          items: [],
          error: getApiErrorMessage(
            error,
            "Không thể tải bộ lọc mở rộng. Bạn vẫn có thể dùng các bộ lọc khác.",
          ),
        });
      });

    return () => controller.abort();
  }, [productTypeId]);

  const hasProductTypes = Boolean(categoryId) && productTypeState.key === categoryId;
  const hasAttributes =
    Boolean(productTypeId) && attributeState.key === productTypeId;

  return {
    categories,
    provinces,
    productTypes: hasProductTypes ? productTypeState.items : [],
    isLoadingProductTypes: Boolean(categoryId) && !hasProductTypes,
    productTypeError: hasProductTypes ? productTypeState.error : "",
    attributes: hasAttributes ? attributeState.items : [],
    isLoadingAttributes: Boolean(productTypeId) && !hasAttributes,
    attributeError: hasAttributes ? attributeState.error : "",
  };
};
