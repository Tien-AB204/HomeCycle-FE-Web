const formatMoney = (value) =>
  new Intl.NumberFormat(
    "vi-VN",
    {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    },
  ).format(Number(value) || 0);

const formatCompactMoney = (value) =>
  `${new Intl.NumberFormat(
    "vi-VN",
    {
      notation: "compact",
      maximumFractionDigits: 1,
    },
  ).format(Number(value) || 0)} ₫`;

const formatPercent = (value) =>
  `${new Intl.NumberFormat(
    "vi-VN",
    {
      maximumFractionDigits: 1,
    },
  ).format(Number(value) || 0)}%`;

const formatDateShort = (value) => {
  const parts =
    String(value || "").split("-");

  if (parts.length !== 3) {
    return "—";
  }

  return `${parts[2]}/${parts[1]}`;
};

const EmptyChart = () => (
  <div className="flex min-h-64 items-center justify-center rounded-xl bg-background text-sm font-semibold text-textLight">
    Chưa có dữ liệu.
  </div>
);

export function FinanceCashFlowChart({
  rows,
}) {
  const safeRows =
    Array.isArray(rows)
      ? rows
      : [];

  if (safeRows.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
        <h3 className="text-lg font-black text-text">
          Dòng tiền thực theo thời gian
        </h3>

        <p className="mt-1 text-xs leading-5 text-textLight">
          Tiền thực đi vào, đi ra và dòng tiền thuần theo kỳ.
        </p>

        <div className="mt-5">
          <EmptyChart />
        </div>
      </section>
    );
  }

  const definitions = [
    {
      key: "inflow",
      label: "Tiền vào",
      className: "text-success",
    },
    {
      key: "outflow",
      label: "Tiền ra",
      className: "text-warning",
    },
    {
      key: "net",
      label: "Dòng tiền thuần",
      className: "text-primary",
    },
  ];

  const allValues =
    safeRows.flatMap(
      (row) =>
        definitions.map(
          (definition) =>
            Number(
              row?.[
                definition.key
              ],
            ) || 0,
        ),
    );

  const minValue =
    Math.min(
      0,
      ...allValues,
    );

  const maxValue =
    Math.max(
      0,
      ...allValues,
    );

  const domain =
    maxValue -
      minValue ||
    1;

  const width =
    Math.max(
      900,
      safeRows.length * 46,
    );

  const height = 340;
  const left = 78;
  const right = 28;
  const top = 28;
  const bottom = 54;

  const usableWidth =
    width - left - right;

  const usableHeight =
    height - top - bottom;

  const xFor = (index) =>
    safeRows.length <= 1
      ? left +
        usableWidth / 2
      : left +
        (index /
          (
            safeRows.length -
            1
          )) *
          usableWidth;

  const yFor = (value) =>
    top +
    (
      (
        maxValue -
        (Number(value) || 0)
      ) /
      domain
    ) *
      usableHeight;

  const tickIndexes =
    Array.from(
      new Set(
        safeRows.length <= 6
          ? safeRows.map(
              (_, index) =>
                index,
            )
          : [
              0,
              Math.round(
                (
                  safeRows.length -
                  1
                ) * 0.2,
              ),
              Math.round(
                (
                  safeRows.length -
                  1
                ) * 0.4,
              ),
              Math.round(
                (
                  safeRows.length -
                  1
                ) * 0.6,
              ),
              Math.round(
                (
                  safeRows.length -
                  1
                ) * 0.8,
              ),
              safeRows.length -
                1,
            ],
      ),
    );

  const gridValues =
    Array.from(
      { length: 5 },
      (_, index) =>
        maxValue -
        (
          domain *
          index
        ) /
          4,
    );

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-text">
            Dòng tiền thực theo thời gian
          </h3>

          <p className="mt-1 text-xs leading-5 text-textLight">
            Tiền thực đi vào, đi ra và dòng tiền thuần. Hoàn tiền và giải ngân nội bộ không được coi là tiền ra khỏi nền tảng.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {definitions.map(
            (definition) => (
              <div
                key={definition.key}
                className="flex items-center gap-2"
              >
                <span
                  className={[
                    "h-2.5 w-6 rounded-full bg-current",
                    definition.className,
                  ].join(" ")}
                />

                <span className="text-xs font-bold text-textLight">
                  {definition.label}
                </span>
              </div>
            ),
          )}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[340px]"
          style={{
            minWidth: `${width}px`,
            width: "100%",
          }}
          role="img"
          aria-label="Biểu đồ dòng tiền tài chính"
        >
          {gridValues.map(
            (
              value,
              index,
            ) => {
              const y =
                yFor(value);

              return (
                <g
                  key={`${value}-${index}`}
                >
                  <line
                    x1={left}
                    x2={
                      width -
                      right
                    }
                    y1={y}
                    y2={y}
                    stroke="currentColor"
                    className="text-border"
                    strokeDasharray="4 6"
                  />

                  <text
                    x={
                      left -
                      10
                    }
                    y={y + 4}
                    textAnchor="end"
                    fill="currentColor"
                    className="text-[10px] text-textLight"
                  >
                    {formatCompactMoney(
                      value,
                    )}
                  </text>
                </g>
              );
            },
          )}

          <line
            x1={left}
            x2={width - right}
            y1={yFor(0)}
            y2={yFor(0)}
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-textLight"
          />

          {definitions.map(
            (definition) => {
              const points =
                safeRows.map(
                  (
                    row,
                    index,
                  ) => ({
                    x:
                      xFor(index),
                    y:
                      yFor(
                        row?.[
                          definition
                            .key
                        ],
                      ),
                    value:
                      Number(
                        row?.[
                          definition
                            .key
                        ],
                      ) || 0,
                    row,
                  }),
                );

              return (
                <g
                  key={definition.key}
                  className={
                    definition.className
                  }
                >
                  <polyline
                    points={points
                      .map(
                        (point) =>
                          `${point.x},${point.y}`,
                      )
                      .join(" ")}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />

                  {points.map(
                    (
                      point,
                      index,
                    ) => (
                      <circle
                        key={`${definition.key}-${index}`}
                        cx={point.x}
                        cy={point.y}
                        r="3.5"
                        fill="currentColor"
                      >
                        <title>
                          {`${formatDateShort(
                            point
                              .row
                              ?.from,
                          )} · ${
                            definition.label
                          }: ${formatMoney(
                            point.value,
                          )}`}
                        </title>
                      </circle>
                    ),
                  )}
                </g>
              );
            },
          )}

          {tickIndexes.map(
            (index) => (
              <text
                key={index}
                x={xFor(index)}
                y={height - 18}
                textAnchor="middle"
                fill="currentColor"
                className="text-[11px] text-textLight"
              >
                {formatDateShort(
                  safeRows[index]
                    ?.from,
                )}
              </text>
            ),
          )}
        </svg>
      </div>
    </section>
  );
}

export function FinanceAmountBarChart({
  title,
  description,
  rows,
  getLabel,
}) {
  const safeRows =
    Array.isArray(rows)
      ? rows
      : [];

  const maxAmount =
    Math.max(
      1,
      ...safeRows.map(
        (item) =>
          Math.abs(
            Number(
              item?.amount,
            ) || 0,
          ),
      ),
    );

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
      <h3 className="text-lg font-black text-text">
        {title}
      </h3>

      {description && (
        <p className="mt-1 text-xs leading-5 text-textLight">
          {description}
        </p>
      )}

      {safeRows.length === 0 ? (
        <div className="mt-5">
          <EmptyChart />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {safeRows.map(
            (
              item,
              index,
            ) => {
              const amount =
                Number(
                  item?.amount,
                ) || 0;

              const width =
                Math.abs(
                  amount,
                ) > 0
                  ? Math.max(
                      3,
                      (
                        Math.abs(
                          amount,
                        ) /
                        maxAmount
                      ) *
                        100,
                    )
                  : 0;

              const tone =
                [
                  "bg-primary",
                  "bg-success",
                  "bg-warning",
                  "bg-textLight",
                  "bg-error",
                ][
                  index % 5
                ];

              return (
                <div
                  key={`${item?.key}-${index}`}
                >
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <span className="min-w-0 break-words text-sm font-bold leading-5 text-text">
                      {getLabel(item)}
                    </span>

                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-black text-text">
                        {formatMoney(
                          amount,
                        )}
                      </span>

                      <span className="block text-[11px] font-bold text-textLight">
                        {formatPercent(
                          item?.percentage,
                        )}
                      </span>
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-background">
                    <div
                      className={[
                        "h-full rounded-full transition-all duration-300",
                        tone,
                      ].join(" ")}
                      style={{
                        width: `${width}%`,
                      }}
                    />
                  </div>
                </div>
              );
            },
          )}
        </div>
      )}
    </section>
  );
}