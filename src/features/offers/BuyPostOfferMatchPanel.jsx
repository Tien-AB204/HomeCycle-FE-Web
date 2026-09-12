import {
  DAMAGE_LEVEL_OPTIONS,
  FUNCTIONALITY_OPTIONS,
  LEGACY_DAMAGE_LEVEL_ALIASES,
  LEGACY_FUNCTIONALITY_ALIASES,
} from "../../constants/postFormOptions";

const MATCH_STATES = Object.freeze({
  MATCHED: "matched",
  NOT_MATCHED: "notMatched",
  UNKNOWN: "unknown",
});

const RESULT_META = Object.freeze({
  [MATCH_STATES.MATCHED]: {
    label: "Phù hợp",
    icon: "✓",
    className:
      "border-success/20 bg-success/10 text-success",
  },
  [MATCH_STATES.NOT_MATCHED]: {
    label: "Khác yêu cầu",
    icon: "!",
    className:
      "border-warning/20 bg-warning/10 text-warning",
  },
  [MATCH_STATES.UNKNOWN]: {
    label: "Chưa đủ thông tin",
    icon: "?",
    className:
      "border-border bg-background text-textLight",
  },
});

const isSpecified = (value) => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return Boolean(value.trim());
  }

  return true;
};

const normalizeId = (value) => {
  return String(value ?? "")
    .trim()
    .toLowerCase();
};

const sameId = (left, right) => {
  return (
    normalizeId(left) !== "" &&
    normalizeId(left) === normalizeId(right)
  );
};

const normalizeAlias = (
  value,
  aliases,
) => {
  if (!isSpecified(value)) {
    return value;
  }

  if (typeof value === "number") {
    return value;
  }

  const raw = String(value).trim();

  return (
    aliases?.[raw] ||
    raw
  );
};

const getEnumRank = (
  value,
  options,
  aliases = {},
) => {
  if (!isSpecified(value)) {
    return null;
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  const canonical = normalizeAlias(
    value,
    aliases,
  );

  const normalized = String(
    canonical,
  )
    .trim()
    .toLowerCase();

  const index = options.findIndex(
    (option) =>
      String(option.value)
        .trim()
        .toLowerCase() ===
      normalized,
  );

  return index >= 0 ? index : null;
};

const getEnumLabel = (
  value,
  options,
  aliases = {},
) => {
  if (!isSpecified(value)) {
    return "Chưa có thông tin";
  }

  if (typeof value === "number") {
    return (
      options[value]?.label ||
      "Đã khai báo"
    );
  }

  const canonical = normalizeAlias(
    value,
    aliases,
  );

  const option = options.find(
    (item) =>
      String(item.value)
        .trim()
        .toLowerCase() ===
      String(canonical)
        .trim()
        .toLowerCase(),
  );

  return option?.label || "Đã khai báo";
};

const compareCriterion = ({
  expected,
  actual,
  matches,
}) => {
  if (!isSpecified(expected)) {
    return null;
  }

  if (!isSpecified(actual)) {
    return MATCH_STATES.UNKNOWN;
  }

  return matches(expected, actual)
    ? MATCH_STATES.MATCHED
    : MATCH_STATES.NOT_MATCHED;
};

const compareRankedCriterion = ({
  expected,
  actual,
  options,
  aliases,
}) => {
  if (!isSpecified(expected)) {
    return null;
  }

  if (!isSpecified(actual)) {
    return MATCH_STATES.UNKNOWN;
  }

  const expectedRank = getEnumRank(
    expected,
    options,
    aliases,
  );

  const actualRank = getEnumRank(
    actual,
    options,
    aliases,
  );

  if (
    expectedRank === null ||
    actualRank === null
  ) {
    return MATCH_STATES.UNKNOWN;
  }

  return actualRank <= expectedRank
    ? MATCH_STATES.MATCHED
    : MATCH_STATES.NOT_MATCHED;
};

const formatCurrency = (value) => {
  if (!isSpecified(value)) {
    return "Chưa có thông tin";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "Chưa có thông tin";
  }

  return `${amount.toLocaleString(
    "vi-VN",
  )} đ`;
};

const formatBudget = (
  priceFrom,
  priceTo,
) => {
  const hasFrom =
    isSpecified(priceFrom) &&
    Number.isFinite(Number(priceFrom));

  const hasTo =
    isSpecified(priceTo) &&
    Number.isFinite(Number(priceTo));

  if (hasFrom && hasTo) {
    return `${formatCurrency(
      priceFrom,
    )} – ${formatCurrency(priceTo)}`;
  }

  if (hasFrom) {
    return `Từ ${formatCurrency(
      priceFrom,
    )}`;
  }

  if (hasTo) {
    return `Tối đa ${formatCurrency(
      priceTo,
    )}`;
  }

  return "Không đặt ngân sách";
};

const formatMonths = (value) => {
  if (!isSpecified(value)) {
    return "Chưa có thông tin";
  }

  const months = Number(value);

  return Number.isFinite(months)
    ? `${months} tháng`
    : "Chưa có thông tin";
};

const formatAttributeValue = (
  value,
) => {
  if (!value) {
    return "Chưa có thông tin";
  }

  if (isSpecified(value.optionValue)) {
    return String(value.optionValue);
  }

  if (value.valueBoolean === true) {
    return "Có";
  }

  if (value.valueBoolean === false) {
    return "Không";
  }

  if (isSpecified(value.valueNumber)) {
    const numberValue = Number(
      value.valueNumber,
    );

    const formatted =
      Number.isFinite(numberValue)
        ? numberValue.toLocaleString(
            "vi-VN",
          )
        : String(value.valueNumber);

    return value.unit
      ? `${formatted} ${value.unit}`
      : formatted;
  }

  if (isSpecified(value.valueText)) {
    return String(value.valueText);
  }

  return "Chưa có thông tin";
};

const attributesMatch = (
  expected,
  actual,
) => {
  const expectedOptionId =
    expected?.optionId ?? null;
  const actualOptionId =
    actual?.optionId ?? null;

  const optionMatches =
    expectedOptionId === null &&
    actualOptionId === null
      ? true
      : isSpecified(
            expectedOptionId,
          ) &&
          isSpecified(actualOptionId)
        ? sameId(
            expectedOptionId,
            actualOptionId,
          )
        : false;

  return (
    optionMatches &&
    (expected?.valueText ?? null) ===
      (actual?.valueText ?? null) &&
    (expected?.valueNumber ?? null) ===
      (actual?.valueNumber ?? null) &&
    (expected?.valueBoolean ?? null) ===
      (actual?.valueBoolean ?? null)
  );
};

const addRow = (
  rows,
  {
    key,
    label,
    requirement,
    actual,
    state,
  },
) => {
  if (!state) {
    return;
  }

  rows.push({
    key,
    label,
    requirement,
    actual,
    state,
  });
};

const buildOfferMatchComparison = (
  offer,
) => {
  if (
    !offer?.buyPostId ||
    !offer?.buyPost ||
    !offer?.product
  ) {
    return null;
  }

  const buyPost = offer.buyPost;
  const buyProduct =
    buyPost.product || {};
  const sellPost =
    offer.sellPost || {};
  const sellProduct =
    offer.product || {};

  const rows = [];

  addRow(rows, {
    key: "category",
    label: "Danh mục",
    requirement:
      buyProduct.categoryName ||
      "Danh mục đã chọn",
    actual:
      sellProduct.categoryName ||
      "Chưa có thông tin",
    state: compareCriterion({
      expected: buyProduct.categoryId,
      actual: sellProduct.categoryId,
      matches: sameId,
    }),
  });

  addRow(rows, {
    key: "productType",
    label: "Loại sản phẩm",
    requirement:
      buyProduct.productTypeName ||
      "Loại sản phẩm đã chọn",
    actual:
      sellProduct.productTypeName ||
      "Chưa có thông tin",
    state: compareCriterion({
      expected:
        buyProduct.productTypeId,
      actual:
        sellProduct.productTypeId,
      matches: sameId,
    }),
  });

  addRow(rows, {
    key: "brand",
    label: "Thương hiệu",
    requirement:
      buyProduct.brandName ||
      "Thương hiệu đã chọn",
    actual:
      sellProduct.brandName ||
      "Chưa có thông tin",
    state: compareCriterion({
      expected: buyProduct.brandId,
      actual: sellProduct.brandId,
      matches: sameId,
    }),
  });

  addRow(rows, {
    key: "functionality",
    label: "Tình trạng hoạt động",
    requirement: getEnumLabel(
      buyProduct.functionalityStatus,
      FUNCTIONALITY_OPTIONS,
      LEGACY_FUNCTIONALITY_ALIASES,
    ),
    actual: getEnumLabel(
      sellProduct.functionalityStatus,
      FUNCTIONALITY_OPTIONS,
      LEGACY_FUNCTIONALITY_ALIASES,
    ),
    state: compareRankedCriterion({
      expected:
        buyProduct.functionalityStatus,
      actual:
        sellProduct.functionalityStatus,
      options: FUNCTIONALITY_OPTIONS,
      aliases:
        LEGACY_FUNCTIONALITY_ALIASES,
    }),
  });

  addRow(rows, {
    key: "usageDuration",
    label: "Thời gian sử dụng",
    requirement: formatMonths(
      buyProduct.usageDuration,
    ),
    actual: formatMonths(
      sellProduct.usageDuration,
    ),
    state: compareCriterion({
      expected:
        buyProduct.usageDuration,
      actual:
        sellProduct.usageDuration,
      matches: (
        expected,
        actual,
      ) =>
        Number(actual) <=
        Number(expected),
    }),
  });

  addRow(rows, {
    key: "damageLevel",
    label: "Mức độ hư hại",
    requirement: getEnumLabel(
      buyProduct.damageLevel,
      DAMAGE_LEVEL_OPTIONS,
      LEGACY_DAMAGE_LEVEL_ALIASES,
    ),
    actual: getEnumLabel(
      sellProduct.damageLevel,
      DAMAGE_LEVEL_OPTIONS,
      LEGACY_DAMAGE_LEVEL_ALIASES,
    ),
    state: compareRankedCriterion({
      expected:
        buyProduct.damageLevel,
      actual:
        sellProduct.damageLevel,
      options: DAMAGE_LEVEL_OPTIONS,
      aliases:
        LEGACY_DAMAGE_LEVEL_ALIASES,
    }),
  });

  const hasPriceRequirement =
    isSpecified(buyPost.priceFrom) ||
    isSpecified(buyPost.priceTo);

  addRow(rows, {
    key: "price",
    label:
      "Giá chào phù hợp ngân sách",
    requirement: formatBudget(
      buyPost.priceFrom,
      buyPost.priceTo,
    ),
    actual: formatCurrency(
      offer.offerPrice,
    ),
    state: hasPriceRequirement
      ? compareCriterion({
          expected: true,
          actual: offer.offerPrice,
          matches: () => {
            const offerPrice = Number(
              offer.offerPrice,
            );

            if (
              !Number.isFinite(
                offerPrice,
              )
            ) {
              return false;
            }

            const from =
              Number(
                buyPost.priceFrom,
              );

            const to = Number(
              buyPost.priceTo,
            );

            const hasFrom =
              isSpecified(
                buyPost.priceFrom,
              ) &&
              Number.isFinite(from);

            const hasTo =
              isSpecified(
                buyPost.priceTo,
              ) &&
              Number.isFinite(to);

            return (
              (!hasFrom ||
                offerPrice >= from) &&
              (!hasTo ||
                offerPrice <= to)
            );
          },
        })
      : null,
  });

  addRow(rows, {
    key: "city",
    label: "Khu vực",
    requirement:
      buyPost.city ||
      "Khu vực đã chọn",
    actual:
      sellPost.city ||
      "Chưa có thông tin",
    state: compareCriterion({
      expected: buyPost.city,
      actual: sellPost.city,
      matches: (
        expected,
        actual,
      ) =>
        String(expected)
          .trim()
          .toLowerCase() ===
        String(actual)
          .trim()
          .toLowerCase(),
    }),
  });

  const expectedAttributes =
    Array.isArray(
      buyProduct.attributeValues,
    )
      ? buyProduct.attributeValues
      : [];

  const actualAttributes =
    Array.isArray(
      sellProduct.attributeValues,
    )
      ? sellProduct.attributeValues
      : [];

  expectedAttributes.forEach(
    (expectedAttribute) => {
      if (
        !expectedAttribute?.attributeId
      ) {
        return;
      }

      const actualAttribute =
        actualAttributes.find(
          (item) =>
            sameId(
              item?.attributeId,
              expectedAttribute.attributeId,
            ),
        );

      addRow(rows, {
        key: `attribute-${expectedAttribute.attributeId}`,
        label:
          expectedAttribute.attributeName ||
          "Thuộc tính sản phẩm",
        requirement:
          formatAttributeValue(
            expectedAttribute,
          ),
        actual:
          formatAttributeValue(
            actualAttribute,
          ),
        state: actualAttribute
          ? attributesMatch(
              expectedAttribute,
              actualAttribute,
            )
            ? MATCH_STATES.MATCHED
            : MATCH_STATES.NOT_MATCHED
          : MATCH_STATES.UNKNOWN,
      });
    },
  );

  const matchedCount =
    rows.filter(
      (row) =>
        row.state ===
        MATCH_STATES.MATCHED,
    ).length;

  const unknownCount =
    rows.filter(
      (row) =>
        row.state ===
        MATCH_STATES.UNKNOWN,
    ).length;

  const notMatchedCount =
    rows.filter(
      (row) =>
        row.state ===
        MATCH_STATES.NOT_MATCHED,
    ).length;

  return {
    rows,
    totalCriteriaCount:
      rows.length,
    matchedCount,
    unknownCount,
    notMatchedCount,
    offerQuantity:
      offer.offerQuantity,
    buyRemainingQuantity:
      buyPost.remainingQuantity,
  };
};

const ResultBadge = ({ state }) => {
  const meta =
    RESULT_META[state] ||
    RESULT_META[
      MATCH_STATES.UNKNOWN
    ];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black ${meta.className}`}
    >
      <span aria-hidden="true">
        {meta.icon}
      </span>
      {meta.label}
    </span>
  );
};

const getSummaryText = (
  comparison,
) => {
  if (
    !comparison ||
    comparison.totalCriteriaCount === 0
  ) {
    return "Doanh nghiệp chưa đặt tiêu chí cụ thể.";
  }

  const unknownSuffix =
    comparison.unknownCount > 0
      ? ` • ${comparison.unknownCount} chưa đủ thông tin`
      : "";

  return `Khớp ${comparison.matchedCount}/${comparison.totalCriteriaCount} tiêu chí đã đặt${unknownSuffix}`;
};

export default function BuyPostOfferMatchPanel({
  offer,
  compact = false,
}) {
  if (!offer?.buyPostId) {
    return null;
  }

  const comparison =
    buildOfferMatchComparison(offer);

  if (!comparison) {
    return (
      <div
        role="status"
        className="rounded-xl border border-border bg-background/60 p-3 text-sm text-textLight"
      >
        Chưa đủ dữ liệu để đối chiếu nhu cầu hiện tại.
      </div>
    );
  }

  if (compact) {
    return (
      <div className="rounded-xl border border-border bg-background/60 p-3">
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-primary">
          Đối chiếu nhu cầu hiện tại
        </p>

        <p className="mt-1 text-sm font-bold text-text">
          {getSummaryText(
            comparison,
          )}
        </p>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {comparison.rows
            .slice(0, 4)
            .map((row) => (
              <span
                key={row.key}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2 py-1 text-[11px] font-semibold text-textLight"
              >
                <span
                  className={
                    row.state ===
                    MATCH_STATES.MATCHED
                      ? "text-success"
                      : row.state ===
                          MATCH_STATES.NOT_MATCHED
                        ? "text-warning"
                        : "text-textLight"
                  }
                  aria-hidden="true"
                >
                  {
                    RESULT_META[
                      row.state
                    ].icon
                  }
                </span>
                {row.label}
              </span>
            ))}
        </div>
      </div>
    );
  }

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-border bg-background/40">
      <div className="border-b border-border bg-white px-4 py-4 sm:px-5">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
          Đối chiếu nhu cầu hiện tại
        </p>

        <p className="mt-1 font-black text-text">
          {getSummaryText(
            comparison,
          )}
        </p>

        <div className="mt-2 flex flex-wrap gap-2 text-xs text-textLight">
          <span>
            Chào{" "}
            <strong className="text-text">
              {comparison.offerQuantity ??
                "—"}
            </strong>
          </span>

          <span aria-hidden="true">
            •
          </span>

          <span>
            Còn cần{" "}
            <strong className="text-text">
              {comparison.buyRemainingQuantity ??
                "—"}
            </strong>
          </span>
        </div>

        <p className="mt-2 text-xs leading-5 text-textLight">
          Kết quả này hỗ trợ so sánh theo tiêu chí hiện tại, không thay thế kiểm định sản phẩm.
        </p>
      </div>

      {comparison.rows.length ===
      0 ? (
        <div className="px-4 py-5 text-sm text-textLight sm:px-5">
          Tin thu mua chưa có tiêu chí tùy chọn để so sánh.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="bg-background text-xs uppercase tracking-wide text-textLight">
              <tr>
                <th className="px-4 py-3 font-black sm:px-5">
                  Tiêu chí
                </th>
                <th className="px-4 py-3 font-black">
                  Yêu cầu
                </th>
                <th className="px-4 py-3 font-black">
                  Sản phẩm hoặc giá chào
                </th>
                <th className="px-4 py-3 font-black sm:px-5">
                  Kết quả
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border bg-white">
              {comparison.rows.map(
                (row) => (
                  <tr key={row.key}>
                    <td className="px-4 py-3 font-bold text-text sm:px-5">
                      {row.label}
                    </td>
                    <td className="px-4 py-3 text-textLight">
                      {row.requirement}
                    </td>
                    <td className="px-4 py-3 text-textLight">
                      {row.actual}
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      <ResultBadge
                        state={
                          row.state
                        }
                      />
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}