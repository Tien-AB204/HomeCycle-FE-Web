/*
 * Chuyển một mẫu demo thành giá trị form tạo tin của Web. Ảnh vẫn do người
 * dùng tự thêm; thuộc tính đi theo cùng đường với luồng sửa tin để được chọn
 * sẵn khi thông số loại sản phẩm tải xong.
 */

export const buildDemoAttributeValues = (sampleAttributes) =>
  (Array.isArray(sampleAttributes) ? sampleAttributes : []).reduce(
    (result, item) => {
      if (!item?.attributeId) return result;

      result[item.attributeId] = {
        optionId: item.optionId || "",
        valueBoolean: "",
        valueText: item.valueText ?? "",
        valueNumber:
          item.valueNumber === undefined || item.valueNumber === null
            ? ""
            : String(item.valueNumber),
      };

      return result;
    },
    {},
  );

export const buildDemoSellForm = (currentForm, sample) => ({
  ...currentForm,
  categoryId: sample.categoryId,
  productTypeId: sample.productTypeId,
  brandId: sample.brandId,
  productName: sample.productName,
  modelNumber: sample.modelNumber,
  price: sample.basePrice,
  originalPrice: sample.originalPrice,
  quantity: sample.quantity,
  description: sample.description,
  detailDescription: sample.detailDescription,
  deliveryMethod: sample.deliveryMethod,
  city: sample.city,
  ward: sample.ward,
  streetAddress: sample.streetAddress,
  spaceUsage: sample.spaceUsage,
  functionalityStatus: sample.functionalityStatus,
  usageDuration: sample.usageDuration,
  damageLevel: sample.damageLevel,
  length: sample.length,
  width: sample.width,
  height: sample.height,
  weight: sample.weight,
});

export const buildDemoBuyForm = (currentForm, sample) => ({
  ...currentForm,
  categoryId: sample.categoryId,
  productTypeId: sample.productTypeId,
  brandId: sample.brandId,
  productName: sample.productName,
  price: sample.priceTo,
  priceFrom: sample.priceFrom,
  quantity: sample.quantity,
  description: sample.description,
  city: sample.city,
  ward: sample.ward,
  streetAddress: sample.streetAddress,
  functionalityStatus: sample.functionalityStatus,
  usageDuration: sample.usageDuration,
  damageLevel: sample.damageLevel,
});
