const normalizeText = (value) =>
  String(value ?? "").trim().toLowerCase();

const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const getProductValue = (post, keys) => {
  const product = post?.product || {};

  for (const key of keys) {
    const value = post?.[key] ?? product?.[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return undefined;
};

const hasComparableValue = (value) =>
  value !== undefined &&
  value !== null &&
  value !== "";

const compareMatchingProductField = (
  changes,
  label,
  previousPost,
  latestPost,
  keys,
  normalize = normalizeText,
) => {
  for (const key of keys) {
    const previousValue = getProductValue(
      previousPost,
      [key],
    );
    const latestValue = getProductValue(
      latestPost,
      [key],
    );

    if (
      !hasComparableValue(previousValue) ||
      !hasComparableValue(latestValue)
    ) {
      continue;
    }

    if (
      normalize(previousValue) !==
      normalize(latestValue)
    ) {
      changes.push(label);
    }

    return;
  }
};

const compareDefinedField = (
  changes,
  label,
  previousValue,
  latestValue,
  normalize = normalizeText,
) => {
  if (
    previousValue === undefined ||
    previousValue === null ||
    previousValue === ""
  ) {
    return;
  }

  if (normalize(previousValue) !== normalize(latestValue)) {
    changes.push(label);
  }
};

const unique = (values) => [...new Set(values.filter(Boolean))];

export const POST_CHANGED_WARNING =
  "Giá bài đăng, thành phố, mức độ hư hỏng hoặc thông tin sản phẩm đã được chỉnh sửa. Vui lòng kiểm tra lại trước khi gửi đề nghị.";

export const OFFER_CHANGED_WARNING =
  "Đề nghị vừa được cập nhật lại mức giá, số lượng hoặc trạng thái. Vui lòng kiểm tra lại trước khi tiếp tục.";

export const NEGOTIATION_CHANGED_WARNING =
  "Phiên thương lượng hoặc đề xuất vừa được cập nhật. Vui lòng kiểm tra lại trước khi tiếp tục.";

export const AGREEMENT_CHANGED_WARNING =
  "Nội dung hoặc trạng thái thỏa thuận vừa được cập nhật. Vui lòng kiểm tra lại trước khi xác nhận.";

export const VERIFICATION_FAILED_WARNING =
  "Không thể kiểm tra dữ liệu mới nhất. Vui lòng thử lại trước khi tiếp tục.";

export const getPostChangedFields = (previousPost, latestPost) => {
  if (!previousPost || !latestPost) {
    return ["thông tin bài đăng"];
  }

  const changes = [];

  compareDefinedField(
    changes,
    "giá bài đăng",
    previousPost.basePrice ?? previousPost.price,
    latestPost.basePrice ?? latestPost.price,
    normalizeNumber,
  );

  compareMatchingProductField(
    changes,
    "thành phố",
    previousPost,
    latestPost,
    ["city", "provinceName"],
  );

  // Ưu tiên so sánh tên khi cả hai response đều có tên.
  // Search/list và detail có thể trả productTypeId ở shape khác nhau,
  // nên không dùng ID để kết luận thay đổi nếu tên vẫn giống nhau.
  compareMatchingProductField(
    changes,
    "loại sản phẩm",
    previousPost,
    latestPost,
    ["productTypeName", "productTypeId"],
  );

  compareMatchingProductField(
    changes,
    "mức độ hư hỏng",
    previousPost,
    latestPost,
    ["damageLevel", "condition"],
  );

  compareMatchingProductField(
    changes,
    "tình trạng hoạt động",
    previousPost,
    latestPost,
    ["functionalityStatus"],
  );

  compareDefinedField(
    changes,
    "số lượng còn lại",
    previousPost.remainingQuantity,
    latestPost.remainingQuantity,
    normalizeNumber,
  );

  compareDefinedField(
    changes,
    "số lượng",
    previousPost.quantity,
    latestPost.quantity,
    normalizeNumber,
  );

  compareDefinedField(
    changes,
    "trạng thái bài đăng",
    previousPost.status,
    latestPost.status,
  );

  const previousUpdatedAt = previousPost.updatedAt;
  const latestUpdatedAt = latestPost.updatedAt;

  if (
    changes.length === 0 &&
    previousUpdatedAt &&
    latestUpdatedAt &&
    new Date(previousUpdatedAt).getTime() !==
      new Date(latestUpdatedAt).getTime()
  ) {
    changes.push("thông tin bài đăng");
  }

  return unique(changes);
};

export const getOfferChangedFields = (previousOffer, latestOffer) => {
  if (!previousOffer || !latestOffer) {
    return ["thông tin đề nghị"];
  }

  const changes = [];

  compareDefinedField(
    changes,
    "mức giá đề nghị",
    previousOffer.offerPrice,
    latestOffer.offerPrice,
    normalizeNumber,
  );
  compareDefinedField(
    changes,
    "số lượng đề nghị",
    previousOffer.offerQuantity,
    latestOffer.offerQuantity,
    normalizeNumber,
  );
  compareDefinedField(
    changes,
    "trạng thái đề nghị",
    previousOffer.offerStatus,
    latestOffer.offerStatus,
  );

  ["canUpdate", "canCancel", "canAccept", "canReject"].forEach(
    (field) => {
      if (
        typeof previousOffer[field] === "boolean" &&
        previousOffer[field] !== Boolean(latestOffer[field])
      ) {
        changes.push("quyền xử lý đề nghị");
      }
    },
  );

  return unique(changes);
};

export const getNegotiationChangedFields = (
  previousNegotiation,
  latestNegotiation,
) => {
  if (!previousNegotiation || !latestNegotiation) {
    return ["phiên thương lượng"];
  }

  const changes = [];

  compareDefinedField(
    changes,
    "trạng thái phiên thương lượng",
    previousNegotiation.negotiationStatus,
    latestNegotiation.negotiationStatus,
  );
  compareDefinedField(
    changes,
    "mức giá hiện tại",
    previousNegotiation.currentOfferPrice,
    latestNegotiation.currentOfferPrice,
    normalizeNumber,
  );
  compareDefinedField(
    changes,
    "số lượng hiện tại",
    previousNegotiation.currentOfferQuantity,
    latestNegotiation.currentOfferQuantity,
    normalizeNumber,
  );

  return unique(changes);
};

export const getProposalChangedFields = (
  previousProposal,
  latestNegotiation,
) => {
  if (!previousProposal || !latestNegotiation) {
    return ["đề xuất"];
  }

  const latestProposal = (latestNegotiation.messages || []).find(
    (message) => message.messageId === previousProposal.messageId,
  );

  if (!latestProposal) {
    return ["đề xuất"];
  }

  const changes = [];

  compareDefinedField(
    changes,
    "mức giá đề xuất",
    previousProposal.offerPrice,
    latestProposal.offerPrice,
    normalizeNumber,
  );
  compareDefinedField(
    changes,
    "số lượng đề xuất",
    previousProposal.offerQuantity,
    latestProposal.offerQuantity,
    normalizeNumber,
  );
  compareDefinedField(
    changes,
    "trạng thái đề xuất",
    previousProposal.offerStatus,
    latestProposal.offerStatus,
  );

  return unique(changes);
};

const stableSerialize = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${key}:${stableSerialize(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value ?? null);
};

export const getAgreementChangedFields = (
  previousAgreement,
  latestAgreement,
) => {
  if (!previousAgreement || !latestAgreement) {
    return ["thỏa thuận"];
  }

  const changes = [];

  compareDefinedField(
    changes,
    "trạng thái thỏa thuận",
    previousAgreement.agreementStatus,
    latestAgreement.agreementStatus,
  );
  compareDefinedField(
    changes,
    "tổng giá trị thỏa thuận",
    previousAgreement.totalAmount,
    latestAgreement.totalAmount,
    normalizeNumber,
  );

  if (
    stableSerialize(previousAgreement.agreementDetails) !==
    stableSerialize(latestAgreement.agreementDetails)
  ) {
    changes.push("điều khoản thỏa thuận");
  }

  return unique(changes);
};

export const hasFreshnessChanges = (...changeGroups) =>
  changeGroups.some((changes) => Array.isArray(changes) && changes.length > 0);

export const isConcurrencyConflict = (error) =>
  [409, 412].includes(Number(error?.response?.status));
