export const GHN_REQUIRED_NOTES = Object.freeze([
  {
    value: "CHOTHUHANG",
    label: "Cho thử hàng",
  },
  {
    value: "CHOXEMHANGKHONGTHU",
    label: "Cho xem hàng, không thử",
  },
  {
    value: "KHONGCHOXEMHANG",
    label: "Không cho xem hàng",
  },
]);

export const createEmptyGhnAddress = () => ({
  provinceId: 0,
  provinceName: "",
  districtId: 0,
  districtName: "",
  wardCode: "",
  wardName: "",
  addressDetail: "",
});

const normalizeContact = (
  contact,
  fallback = {},
) => ({
  fullName: String(
    contact?.fullName ||
      fallback.fullName ||
      "",
  ),

  phone: String(
    contact?.phone ||
      fallback.phone ||
      "",
  ),

  address: {
    ...createEmptyGhnAddress(),
    ...(contact?.address || {}),
  },
});

/*
 * Milestone hiện tại chỉ hỗ trợ MỘT kiện hàng vật lý cho mỗi lượt giao GHN.
 * Quantity của kiện luôn là 1 - đây là số lượng KIỆN VẬT LÝ, hoàn toàn khác
 * với Quantity thương mại của Post/Agreement (số lượng sản phẩm giao dịch).
 * Backend từ chối thẳng bất kỳ kiện nào có Quantity khác 1, nên KHÔNG được
 * lấy theo Quantity của order/agreement để khởi tạo giá trị này.
 */
const MAX_SHIPMENT_WEIGHT_GRAM = 50000;
const HEAVY_SERVICE_WEIGHT_THRESHOLD_GRAM = 20000;

const createSingleParcelItem = (order) => ({
  name: String(
    order?.productName ||
      "Sản phẩm HomeCycle",
  ),

  code: "",

  quantity: 1,

  weightGram: "",
  lengthCm: "",
  widthCm: "",
  heightCm: "",
});

/*
 * Tổng khối lượng kiện hàng vật lý - dùng để suy ra ServiceTypeId và kiểm
 * tra giới hạn khối lượng, khớp đúng công thức hiện tại của Backend
 * (GhnShippingCalculationHelper).
 */
export const getGhnTotalWeightGram = (items) => {
  if (!Array.isArray(items)) {
    return 0;
  }

  return items.reduce((total, item) => {
    const weight = Number(item?.weightGram) || 0;
    const quantity = Number(item?.quantity) || 1;

    return total + weight * quantity;
  }, 0);
};

/*
 * ServiceTypeId hiện được suy ra trực tiếp từ tổng khối lượng kiện hàng vật
 * lý theo đúng công thức Backend (< 20.000g -> 2, >= 20.000g -> 5) - không
 * còn là lựa chọn thủ công của người dùng, và không được ghi đè bởi một
 * serviceTypeId cũ do API sản phẩm trả về cho một kiện mới nộp đơn.
 */
export const deriveGhnServiceTypeId = (
  totalWeightGram,
) =>
  Number(totalWeightGram) >=
  HEAVY_SERVICE_WEIGHT_THRESHOLD_GRAM
    ? 5
    : 2;

export const createGhnCollectionInfo = ({
  order,
  existingInfo,
} = {}) => {
  const existing =
    existingInfo &&
    typeof existingInfo === "object"
      ? existingInfo
      : null;

  /*
   * Dữ liệu nhiều kiện đã tồn tại (hydrate từ Agreement/lịch thu gom cũ)
   * phải được giữ nguyên - không được gộp/rút gọn về một kiện. Chỉ tạo
   * kiện mặc định (đúng MỘT kiện, Quantity=1) khi chưa có dữ liệu kiện nào.
   */
  const items =
    Array.isArray(existing?.items) &&
    existing.items.length > 0
      ? existing.items
      : [createSingleParcelItem(order)];

  const serviceTypeId = deriveGhnServiceTypeId(
    getGhnTotalWeightGram(items),
  );

  return {
    sender: normalizeContact(
      existing?.sender,
      {
        fullName:
          order?.counterparty?.username ||
          "",
        phone:
          order?.counterparty?.phoneNumber ||
          "",
      },
    ),

    receiver: normalizeContact(
      existing?.receiver,
    ),

    serviceTypeId,

    requiredNote:
      GHN_REQUIRED_NOTES.some(
        (item) =>
          item.value ===
          existing?.requiredNote,
      )
        ? existing.requiredNote
        : "CHOXEMHANGKHONGTHU",

    lightParcel: null,

    items,
  };
};

const asInteger = (value) => {
  const parsed = Number(value);

  return Number.isInteger(parsed)
    ? parsed
    : null;
};

const validateContact = (
  contact,
  label,
) => {
  if (!String(contact?.fullName || "").trim()) {
    return `Vui lòng nhập tên ${label}.`;
  }

  if (!String(contact?.phone || "").trim()) {
    return `Vui lòng nhập số điện thoại ${label}.`;
  }

  const address =
    contact?.address;

  if (
    !address ||
    asInteger(address.provinceId) <= 0 ||
    asInteger(address.districtId) <= 0 ||
    !String(address.wardCode || "").trim() ||
    !String(address.addressDetail || "").trim()
  ) {
    return `Vui lòng chọn đầy đủ địa chỉ GHN của ${label}.`;
  }

  return "";
};

export const validateGhnCollectionInfo = (
  info,
) => {
  if (!info) {
    return "Thiếu thông tin vận chuyển GHN.";
  }

  const senderError =
    validateContact(
      info.sender,
      "người gửi",
    );

  if (senderError) {
    return senderError;
  }

  const receiverError =
    validateContact(
      info.receiver,
      "người nhận",
    );

  if (receiverError) {
    return receiverError;
  }

  const serviceTypeId =
    asInteger(info.serviceTypeId);

  if (
    serviceTypeId !== 2 &&
    serviceTypeId !== 5
  ) {
    return "Loại hàng GHN không hợp lệ.";
  }

  if (
    !GHN_REQUIRED_NOTES.some(
      (item) =>
        item.value ===
        info.requiredNote,
    )
  ) {
    return "Quy định kiểm tra hàng GHN không hợp lệ.";
  }

  if (
    !Array.isArray(info.items) ||
    info.items.length === 0
  ) {
    return "Vui lòng nhập thông tin kiện hàng.";
  }

  let totalWeight = 0;

  for (const item of info.items) {
    if (!String(item?.name || "").trim()) {
      return "Tên kiện hàng không được để trống.";
    }

    const quantity =
      asInteger(item.quantity);

    const weight =
      asInteger(item.weightGram);

    const length =
      asInteger(item.lengthCm);

    const width =
      asInteger(item.widthCm);

    const height =
      asInteger(item.heightCm);

    /*
     * Backend hiện chỉ chấp nhận đúng MỘT kiện vật lý cho mỗi kiện hàng -
     * Quantity của kiện luôn phải là 1, không liên quan đến số lượng
     * thương mại của sản phẩm/giao dịch.
     */
    if (quantity !== 1) {
      return "Mỗi kiện hàng GHN hiện chỉ hỗ trợ đúng 1 kiện vật lý.";
    }

    if (
      !weight ||
      weight < 1 ||
      weight > MAX_SHIPMENT_WEIGHT_GRAM
    ) {
      return `Khối lượng mỗi kiện phải từ 1 đến ${MAX_SHIPMENT_WEIGHT_GRAM.toLocaleString("vi-VN")} gram.`;
    }

    if (
      [length, width, height].some(
        (value) =>
          !value ||
          value < 1 ||
          value > 200,
      )
    ) {
      return "Kích thước mỗi kiện phải từ 1 đến 200 cm.";
    }

    totalWeight +=
      weight * quantity;
  }

  if (
    totalWeight < 1 ||
    totalWeight > MAX_SHIPMENT_WEIGHT_GRAM
  ) {
    return `Tổng khối lượng kiện hàng phải từ 1 đến ${MAX_SHIPMENT_WEIGHT_GRAM.toLocaleString("vi-VN")} gram.`;
  }

  return "";
};

const sanitizeContact = (contact) => ({
  fullName:
    String(contact.fullName || "").trim(),

  phone:
    String(contact.phone || "").trim(),

  address: {
    provinceId:
      Number(contact.address.provinceId),

    provinceName:
      String(
        contact.address.provinceName ||
          "",
      ).trim(),

    districtId:
      Number(contact.address.districtId),

    districtName:
      String(
        contact.address.districtName ||
          "",
      ).trim(),

    wardCode:
      String(
        contact.address.wardCode ||
          "",
      ).trim(),

    wardName:
      String(
        contact.address.wardName ||
          "",
      ).trim(),

    addressDetail:
      String(
        contact.address.addressDetail ||
          "",
      ).trim(),
  },
});

export const sanitizeGhnCollectionInfo = (
  info,
) => {
  const serviceTypeId =
    Number(info.serviceTypeId);

  const items =
    Array.isArray(info.items)
      ? info.items.map(
          (item) => ({
            name:
              String(
                item.name || "",
              ).trim(),

            code:
              String(
                item.code || "",
              ).trim() || null,

            quantity:
              Number(item.quantity),

            weightGram:
              Number(item.weightGram),

            lengthCm:
              Number(item.lengthCm),

            widthCm:
              Number(item.widthCm),

            heightCm:
              Number(item.heightCm),
          }),
        )
      : [];

  /*
   * Backend (GhnShippingCalculationHelper.ValidatePhysicalParcels) băm chữ
   * ký GHN dựa trên CẢ root parcel fields LẪN items[] và bắt buộc chúng
   * khớp tuyệt đối (Ghn.TotalWeightMismatch / Ghn.ParcelDimensionsMismatch).
   * Root ở đây không phải nguồn dữ liệu độc lập - luôn được suy ra từ chính
   * items để không bao giờ lệch nhau. Kiện đầu tiên là kiện vật lý duy nhất
   * được milestone hiện tại hỗ trợ xác nhận.
   */
  const singleParcel =
    items.length > 0 ? items[0] : null;

  return {
    sender:
      sanitizeContact(info.sender),

    receiver:
      sanitizeContact(info.receiver),

    serviceTypeId,

    requiredNote:
      String(
        info.requiredNote || "",
      )
        .trim()
        .toUpperCase(),

    lightParcel: null,

    parcelCount: items.length,

    weightGram:
      getGhnTotalWeightGram(items),

    lengthCm: singleParcel
      ? Number(singleParcel.lengthCm)
      : 0,

    widthCm: singleParcel
      ? Number(singleParcel.widthCm)
      : 0,

    heightCm: singleParcel
      ? Number(singleParcel.heightCm)
      : 0,

    items,
  };
};

export const formatGhnContactAddress = (
  contact,
) => {
  const address =
    contact?.address || {};

  return [
    address.addressDetail,
    address.wardName,
    address.districtName,
    address.provinceName,
  ]
    .map((value) =>
      String(value || "").trim(),
    )
    .filter(Boolean)
    .join(", ");
};