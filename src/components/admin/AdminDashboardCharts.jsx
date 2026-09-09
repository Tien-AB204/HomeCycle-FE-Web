const TONES = [
  "text-primary",
  "text-success",
  "text-warning",
  "text-error",
  "text-textLight",
];

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const toneFor = (
  value,
  index,
) => {
  const key =
    normalize(value);

  if (
    [
      "completed",
      "resolved",
      "paid",
      "success",
    ].includes(key)
  ) {
    return "text-success";
  }

  if (
    [
      "failed",
      "rejected",
      "cancelled",
      "expired",
    ].includes(key)
  ) {
    return "text-error";
  }

  if (
    [
      "pending",
      "proposed",
    ].includes(key)
  ) {
    return "text-warning";
  }

  if (
    [
      "processing",
      "scheduled",
      "inprogress",
      "disputing",
      "underreview",
    ].includes(key)
  ) {
    return "text-primary";
  }

  return TONES[
    index % TONES.length
  ];
};

const formatNumber = (value) =>
  new Intl.NumberFormat(
    "vi-VN",
  ).format(Number(value) || 0);

const formatDecimal = (value) =>
  new Intl.NumberFormat(
    "vi-VN",
    {
      maximumFractionDigits: 1,
    },
  ).format(Number(value) || 0);

const formatDateShort = (value) => {
  if (!value) {
    return "—";
  }

  const parts =
    String(value).split("-");

  if (parts.length !== 3) {
    return "—";
  }

  return `${parts[2]}/${parts[1]}`;
};

const emptyState = (
  <div className="flex min-h-64 items-center justify-center rounded-xl bg-background text-sm font-semibold text-textLight">
    Chưa có dữ liệu.
  </div>
);

export function DashboardDonutChart({
  title,
  description,
  rows,
  getLabel,
}) {
  const safeRows =
    Array.isArray(rows)
      ? rows
      : [];

  if (safeRows.length === 0) {
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

        <div className="mt-5">
          {emptyState}
        </div>
      </section>
    );
  }

  const total =
    safeRows.reduce(
      (sum, item) =>
        sum +
        (Number(item?.count) || 0),
      0,
    );

  const segments =
    safeRows.map(
      (item, index) => {
        const count =
          Number(item?.count) || 0;

        const percent =
          total > 0
            ? (count / total) * 100
            : 0;

        const offset =
          safeRows
            .slice(0, index)
            .reduce(
              (
                sum,
                previousItem,
              ) => {
                const previousCount =
                  Number(
                    previousItem?.count,
                  ) || 0;

                const previousPercent =
                  total > 0
                    ? (
                        previousCount /
                        total
                      ) * 100
                    : 0;

                return (
                  sum +
                  previousPercent
                );
              },
              0,
            );

        return {
          ...item,
          count,
          percent,
          offset,
          tone:
            toneFor(
              item?.key ||
                item?.label,
              index,
            ),
        };
      },
    );

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
      <div>
        <h3 className="text-lg font-black text-text">
          {title}
        </h3>

        {description && (
          <p className="mt-1 text-xs leading-5 text-textLight">
            {description}
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-7 md:grid-cols-[230px_1fr] md:items-center">
        <div className="relative mx-auto h-52 w-52">
          <svg
            viewBox="0 0 120 120"
            className="h-full w-full -rotate-90"
            role="img"
            aria-label={title}
          >
            <circle
              cx="60"
              cy="60"
              r="44"
              fill="none"
              stroke="currentColor"
              strokeWidth="16"
              className="text-background"
            />

            {segments.map(
              (
                item,
                index,
              ) =>
                item.percent > 0 && (
                  <circle
                    key={`${item.key}-${index}`}
                    cx="60"
                    cy="60"
                    r="44"
                    fill="none"
                    pathLength="100"
                    stroke="currentColor"
                    strokeWidth="16"
                    strokeLinecap="butt"
                    strokeDasharray={`${item.percent} ${
                      100 -
                      item.percent
                    }`}
                    strokeDashoffset={
                      -item.offset
                    }
                    className={
                      item.tone
                    }
                  >
                    <title>
                      {`${getLabel(item)}: ${formatNumber(
                        item.count,
                      )} (${formatDecimal(
                        item.percent,
                      )}%)`}
                    </title>
                  </circle>
                ),
            )}
          </svg>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-text">
              {formatNumber(total)}
            </span>

            <span className="mt-1 text-xs font-bold text-textLight">
              tổng cộng
            </span>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {segments.map(
            (
              item,
              index,
            ) => (
              <div
                key={`${item.key}-legend-${index}`}
                className="flex items-start justify-between gap-3 rounded-xl bg-background px-3 py-2.5"
              >
                <div className="flex min-w-0 items-start gap-2">
                  <span
                    className={[
                      "h-3 w-3 shrink-0 rounded-full bg-current",
                      item.tone,
                    ].join(" ")}
                  />

                  <span className="min-w-0 whitespace-normal break-words text-xs font-bold leading-4 text-text">
                    {getLabel(item)}
                  </span>
                </div>

                <span className="shrink-0 text-xs font-black text-text">
                  {formatNumber(
                    item.count,
                  )}
                  {" · "}
                  {formatDecimal(
                    item.percent,
                  )}
                  %
                </span>
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  );
}

export function DashboardColumnChart({
  title,
  description,
  rows,
  getLabel,
}) {
  const safeRows =
    Array.isArray(rows)
      ? rows
      : [];

  const maxValue =
    Math.max(
      1,
      ...safeRows.map(
        (item) =>
          Number(item?.count) ||
          0,
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
          {emptyState}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto pb-2">
          <div
            className="flex h-72 items-end gap-4 border-b border-border px-3 pt-8"
            style={{
              minWidth: `${Math.max(
                560,
                safeRows.length *
                  105,
              )}px`,
            }}
          >
            {safeRows.map(
              (
                item,
                index,
              ) => {
                const count =
                  Number(
                    item?.count,
                  ) || 0;

                const height =
                  count > 0
                    ? Math.max(
                        8,
                        (count /
                          maxValue) *
                          100,
                      )
                    : 2;

                const tone =
                  toneFor(
                    item?.key ||
                      item?.label,
                    index,
                  );

                return (
                  <div
                    key={`${item.key}-${index}`}
                    className="flex h-full min-w-20 flex-1 flex-col items-center justify-end"
                  >
                    <span className="mb-2 text-sm font-black text-text">
                      {formatNumber(
                        count,
                      )}
                    </span>

                    <div
                      className={[
                        "w-full max-w-16 rounded-t-xl bg-current transition-all duration-300",
                        tone,
                      ].join(" ")}
                      style={{
                        height: `${height}%`,
                      }}
                      title={`${getLabel(
                        item,
                      )}: ${formatNumber(
                        count,
                      )}`}
                    />

                    <span className="mt-3 min-h-10 max-w-24 text-center text-[11px] font-bold leading-4 text-textLight">
                      {getLabel(item)}
                    </span>
                  </div>
                );
              },
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export function DashboardHorizontalBarChart({
  title,
  description,
  rows,
  getLabel,
  hideZero = false,
}) {
  const safeRows =
    Array.isArray(rows)
      ? rows
      : [];

  const visibleRows =
    hideZero
      ? safeRows.filter(
          (item) =>
            (Number(item?.count) || 0) >
            0,
        )
      : safeRows;

  const maxValue =
    Math.max(
      1,
      ...visibleRows.map(
        (item) =>
          Number(item?.count) || 0,
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

      {visibleRows.length === 0 ? (
        <div className="mt-5">
          {emptyState}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {visibleRows.map(
            (
              item,
              index,
            ) => {
              const count =
                Number(
                  item?.count,
                ) || 0;

              const width =
                count > 0
                  ? Math.max(
                      3,
                      (count /
                        maxValue) *
                        100,
                    )
                  : 0;

              const percentage =
                Number(
                  item?.percentage,
                ) || 0;

              const tone =
                toneFor(
                  item?.key ||
                    item?.label,
                  index,
                );

              return (
                <div
                  key={`${item.key}-${index}`}
                >
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <span className="min-w-0 break-words text-sm font-bold leading-5 text-text">
                      {getLabel(item)}
                    </span>

                    <span className="shrink-0 text-sm font-black text-text">
                      {formatNumber(
                        count,
                      )}
                      {" · "}
                      {formatDecimal(
                        percentage,
                      )}
                      %
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-background">
                    <div
                      className={[
                        "h-full rounded-full bg-current transition-all duration-300",
                        tone,
                      ].join(" ")}
                      style={{
                        width: `${width}%`,
                      }}
                      title={`${getLabel(
                        item,
                      )}: ${formatNumber(
                        count,
                      )}`}
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
export function DashboardLineChart({
  title,
  description,
  rows,
  series,
}) {
  const safeRows =
    Array.isArray(rows)
      ? rows
      : [];

  const safeSeries =
    Array.isArray(series)
      ? series
      : [];

  if (
    safeRows.length === 0 ||
    safeSeries.length === 0
  ) {
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

        <div className="mt-5">
          {emptyState}
        </div>
      </section>
    );
  }

  const width =
    Math.max(
      820,
      safeRows.length * 44,
    );

  const height = 320;
  const left = 56;
  const right = 24;
  const top = 28;
  const bottom = 52;

  const usableWidth =
    width - left - right;

  const usableHeight =
    height - top - bottom;

  const maxValue =
    Math.max(
      1,
      ...safeRows.flatMap(
        (row) =>
          safeSeries.map(
            (item) =>
              Number(
                row?.[
                  item.key
                ],
              ) || 0,
          ),
      ),
    );

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
    usableHeight -
    (
      (Number(value) || 0) /
      maxValue
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

  const gridValues = [
    maxValue,
    maxValue / 2,
    0,
  ];

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-text">
            {title}
          </h3>

          {description && (
            <p className="mt-1 text-xs leading-5 text-textLight">
              {description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {safeSeries.map(
            (item) => (
              <div
                key={item.key}
                className="flex items-center gap-2"
              >
                <span
                  className={[
                    "h-2.5 w-6 rounded-full bg-current",
                    item.className ||
                      "text-primary",
                  ].join(" ")}
                />

                <span className="text-xs font-bold text-textLight">
                  {item.label}
                </span>
              </div>
            ),
          )}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[320px]"
          style={{
            minWidth: `${width}px`,
            width: "100%",
          }}
          role="img"
          aria-label={title}
        >
          {gridValues.map(
            (
              value,
              index,
            ) => {
              const y =
                top +
                (
                  index /
                  (
                    gridValues.length -
                    1
                  )
                ) *
                  usableHeight;

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
                    className="text-[11px] text-textLight"
                  >
                    {formatNumber(
                      value,
                    )}
                  </text>
                </g>
              );
            },
          )}

          {safeSeries.map(
            (
              line,
              lineIndex,
            ) => {
              const tone =
                line.className ||
                TONES[
                  lineIndex %
                    TONES.length
                ];

              const points =
                safeRows.map(
                  (
                    row,
                    index,
                  ) => ({
                    x:
                      xFor(
                        index,
                      ),
                    y:
                      yFor(
                        row?.[
                          line.key
                        ],
                      ),
                    value:
                      Number(
                        row?.[
                          line.key
                        ],
                      ) || 0,
                    row,
                  }),
                );

              const polyline =
                points
                  .map(
                    (point) =>
                      `${point.x},${point.y}`,
                  )
                  .join(" ");

              return (
                <g
                  key={line.key}
                  className={
                    tone
                  }
                >
                  <polyline
                    points={
                      polyline
                    }
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
                        key={`${line.key}-${index}`}
                        cx={
                          point.x
                        }
                        cy={
                          point.y
                        }
                        r="3.5"
                        fill="currentColor"
                      >
                        <title>
                          {`${formatDateShort(
                            point
                              .row
                              ?.from,
                          )} · ${
                            line.label
                          }: ${formatNumber(
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
            (index) => {
              const x =
                xFor(index);

              return (
                <text
                  key={index}
                  x={x}
                  y={
                    height -
                    18
                  }
                  textAnchor="middle"
                  fill="currentColor"
                  className="text-[11px] text-textLight"
                >
                  {formatDateShort(
                    safeRows[
                      index
                    ]?.from,
                  )}
                </text>
              );
            },
          )}
        </svg>
      </div>
    </section>
  );
}