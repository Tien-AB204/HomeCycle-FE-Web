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

const defaultHeavyItem = (order) => ({
  name: String(
    order?.productName ||
      "Sản phẩm HomeCycle",
  ),

  code: "",

  quantity:
    Number(order?.quantity) > 0
      ? Number(order.quantity)
      : 1,

  weightGram: "",
  lengthCm: "",
  widthCm: "",
  heightCm: "",
});

export const createGhnCollectionInfo = ({
  order,
  existingInfo,
} = {}) => {
  const existing =
    existingInfo &&
    typeof existingInfo === "object"
      ? existingInfo
      : null;

  const serviceTypeId =
    Number(existing?.serviceTypeId) === 5
      ? 5
      : 2;

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

    items:
      serviceTypeId === 5 &&
      Array.isArray(existing?.items) &&
      existing.items.length > 0
        ? existing.items
        : [defaultHeavyItem(order)],
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

  if (serviceTypeId === 5) {
    if (
      !Array.isArray(info.items) ||
      info.items.length === 0
    ) {
      return "Hàng nặng cần ít nhất một kiện hàng.";
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

      if (!quantity || quantity <= 0) {
        return "Số lượng kiện hàng phải lớn hơn 0.";
      }

      if (
        !weight ||
        weight < 1 ||
        weight > 1600000
      ) {
        return "Khối lượng mỗi kiện phải từ 1 đến 1.600.000 gram.";
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
      totalWeight > 1600000
    ) {
      return "Tổng khối lượng hàng nặng phải từ 1 đến 1.600.000 gram.";
    }
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

    items:
      serviceTypeId === 5
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
        : [],
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