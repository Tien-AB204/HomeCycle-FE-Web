import {
  useMemo,
  useState,
} from "react";
import {
  APPOINTMENT_PERSPECTIVE,
  APPOINTMENT_STATUS_OPTIONS,
  APPOINTMENT_TYPE,
  getAppointmentStatusMeta,
} from "../../constants/appointments";

const DAYS_IN_WEEK = 7;
const START_HOUR = 6;
const END_HOUR = 20;
const HOUR_HEIGHT = 52;
const CALENDAR_HEIGHT =
  (END_HOUR - START_HOUR) * HOUR_HEIGHT;

const WEEKDAY_LABELS = [
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
  "CN",
];

const MONTH_WEEKDAY_LABELS = [
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
  "CN",
];

const TYPE_FILTERS = [
  {
    value: APPOINTMENT_TYPE.INSPECTION,
    label: "Kiểm định",
  },
  {
    value: APPOINTMENT_TYPE.COLLECTION,
    label: "Thu gom",
  },
];

const PERSPECTIVE_FILTERS = [
  {
    value: APPOINTMENT_PERSPECTIVE.BUYER,
    label: "Người mua",
  },
  {
    value: APPOINTMENT_PERSPECTIVE.SELLER,
    label: "Người bán",
  },
];

const toValidDate = (value) => {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
};

const startOfDay = (value) => {
  const date = new Date(value);

  date.setHours(0, 0, 0, 0);

  return date;
};

const startOfWeek = (value) => {
  const date = startOfDay(value);
  const day = date.getDay();
  const distanceFromMonday =
    day === 0 ? -6 : 1 - day;

  date.setDate(
    date.getDate() + distanceFromMonday,
  );

  return date;
};

const startOfMonth = (value) => {
  const date = startOfDay(value);

  date.setDate(1);

  return date;
};

const addDays = (value, amount) => {
  const date = new Date(value);

  date.setDate(date.getDate() + amount);

  return date;
};

const addMonths = (value, amount) => {
  const date = new Date(value);

  date.setDate(1);
  date.setMonth(date.getMonth() + amount);

  return date;
};

const getAppointmentDate = (item) =>
  toValidDate(
    item?.inspectionDate ||
      item?.collectionDate ||
      item?.createdAt,
  );

const sameDay = (left, right) =>
  left?.getFullYear() === right?.getFullYear() &&
  left?.getMonth() === right?.getMonth() &&
  left?.getDate() === right?.getDate();

const isDateInWeek = (date, weekStart) => {
  if (!date) {
    return false;
  }

  const start = startOfDay(weekStart);
  const end = addDays(start, DAYS_IN_WEEK);

  return date >= start && date < end;
};

const formatMonthTitle = (value) =>
  new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    year: "numeric",
  }).format(value);

const formatWeekTitle = (weekStart) => {
  const weekEnd = addDays(weekStart, 6);

  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();
  const startMonth = weekStart.getMonth();
  const endMonth = weekEnd.getMonth();

  if (startMonth === endMonth) {
    return `${startDay}–${endDay} tháng ${
      startMonth + 1
    }, ${weekStart.getFullYear()}`;
  }

  return `${startDay}/${
    startMonth + 1
  } – ${endDay}/${endMonth + 1}, ${
    weekEnd.getFullYear()
  }`;
};

const formatTime = (value) =>
  new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);

const buildMonthCells = (monthCursor) => {
  const monthStart = startOfMonth(monthCursor);
  const gridStart = startOfWeek(monthStart);

  return Array.from(
    { length: 42 },
    (_, index) => addDays(gridStart, index),
  );
};

const getEventStyle = (date) => {
  const minutesFromStart =
    (date.getHours() - START_HOUR) * 60 +
    date.getMinutes();

  const rawTop =
    (minutesFromStart / 60) * HOUR_HEIGHT;

  const top = Math.max(
    2,
    Math.min(
      CALENDAR_HEIGHT - 66,
      rawTop,
    ),
  );

  return {
    top: `${top}px`,
    minHeight: "78px",
  };
};

const FilterCheckbox = ({
  checked,
  label,
  onChange,
}) => (
  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-bold text-text transition hover:bg-background">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) =>
        onChange(event.target.checked)
      }
      className="h-4 w-4 accent-primary"
    />

    <span>{label}</span>
  </label>
);

const BusinessAppointmentCalendar = ({
  items,
  loading,
  error,
  keyword,
  appliedKeyword,
  status,
  onKeywordChange,
  onSearch,
  onStatusChange,
  onReset,
  onOpenDetail,
}) => {
  const now = new Date();

  const [weekStart, setWeekStart] =
    useState(() => startOfWeek(now));

  const [monthCursor, setMonthCursor] =
    useState(() => startOfMonth(now));

  const [enabledTypes, setEnabledTypes] =
    useState(
      () =>
        new Set([
          APPOINTMENT_TYPE.INSPECTION,
          APPOINTMENT_TYPE.COLLECTION,
        ]),
    );

  const [
    enabledPerspectives,
    setEnabledPerspectives,
  ] = useState(
    () =>
      new Set([
        APPOINTMENT_PERSPECTIVE.BUYER,
        APPOINTMENT_PERSPECTIVE.SELLER,
      ]),
  );

  const weekDays = useMemo(
    () =>
      Array.from(
        { length: DAYS_IN_WEEK },
        (_, index) =>
          addDays(weekStart, index),
      ),
    [weekStart],
  );

  const monthCells = useMemo(
    () => buildMonthCells(monthCursor),
    [monthCursor],
  );

  const visibleItems = useMemo(
    () =>
      items.filter(
        (item) =>
          enabledTypes.has(item.viewType) &&
          enabledPerspectives.has(
            item.viewPerspective,
          ),
      ),
    [
      enabledPerspectives,
      enabledTypes,
      items,
    ],
  );

  const weekItems = useMemo(
    () =>
      visibleItems
        .filter((item) =>
          isDateInWeek(
            getAppointmentDate(item),
            weekStart,
          ),
        )
        .sort((left, right) => {
          const leftDate =
            getAppointmentDate(left);
          const rightDate =
            getAppointmentDate(right);

          return (
            (leftDate?.getTime() || 0) -
            (rightDate?.getTime() || 0)
          );
        }),
    [visibleItems, weekStart],
  );

  const hours = useMemo(
    () =>
      Array.from(
        {
          length:
            END_HOUR - START_HOUR + 1,
        },
        (_, index) =>
          START_HOUR + index,
      ),
    [],
  );

  const toggleSetValue = (
    setter,
    value,
    checked,
  ) => {
    setter((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(value);
      } else {
        next.delete(value);
      }

      return next;
    });
  };

  const goToDate = (date) => {
    setWeekStart(startOfWeek(date));
    setMonthCursor(startOfMonth(date));
  };

  const goToday = () => {
    goToDate(new Date());
  };

  const moveWeek = (amount) => {
    const next = addDays(
      weekStart,
      amount * 7,
    );

    setWeekStart(next);
    setMonthCursor(startOfMonth(next));
  };

  const currentTimeTop = (() => {
    const minutesFromStart =
      (now.getHours() - START_HOUR) * 60 +
      now.getMinutes();

    return (
      (minutesFromStart / 60) *
      HOUR_HEIGHT
    );
  })();

  const showCurrentTime =
    isDateInWeek(now, weekStart) &&
    currentTimeTop >= 0 &&
    currentTimeTop <= CALENDAR_HEIGHT;

  return (
    <section className="mx-auto w-full max-w-[1540px] px-4 pb-14 pt-6 sm:px-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
            Lịch vận hành doanh nghiệp
          </p>

          <h1 className="mt-1 text-2xl font-black text-text sm:text-3xl">
            Lịch hẹn
          </h1>

          <p className="mt-1.5 text-sm text-textLight">
            Theo dõi lịch kiểm định và thu gom
            theo tuần.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={goToday}
            className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-black text-text transition hover:border-primary/30 hover:text-primary"
          >
            Hôm nay
          </button>

          <span className="rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-black text-primary">
            Chế độ tuần
          </span>
        </div>
      </header>

      <div className="mt-5 grid gap-5 xl:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="self-start overflow-hidden rounded-2xl border border-border bg-white shadow-[0_10px_28px_rgba(24,63,65,0.05)]">
          <section className="p-4">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() =>
                  setMonthCursor((current) =>
                    addMonths(current, -1),
                  )
                }
                aria-label="Tháng trước"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-textLight transition hover:bg-background hover:text-primary"
              >
                <span
                  className="material-symbols-outlined text-[19px]"
                  aria-hidden="true"
                >
                  chevron_left
                </span>
              </button>

              <h2 className="text-sm font-black capitalize text-text">
                {formatMonthTitle(monthCursor)}
              </h2>

              <button
                type="button"
                onClick={() =>
                  setMonthCursor((current) =>
                    addMonths(current, 1),
                  )
                }
                aria-label="Tháng sau"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-textLight transition hover:bg-background hover:text-primary"
              >
                <span
                  className="material-symbols-outlined text-[19px]"
                  aria-hidden="true"
                >
                  chevron_right
                </span>
              </button>
            </div>

            <div className="mt-4 grid grid-cols-7 text-center text-[10px] font-black uppercase text-textLight">
              {MONTH_WEEKDAY_LABELS.map(
                (label) => (
                  <span key={label}>
                    {label}
                  </span>
                ),
              )}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-y-1">
              {monthCells.map((date) => {
                const inCurrentMonth =
                  date.getMonth() ===
                  monthCursor.getMonth();

                const inSelectedWeek =
                  isDateInWeek(
                    date,
                    weekStart,
                  );

                const isToday =
                  sameDay(date, now);

                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    onClick={() =>
                      goToDate(date)
                    }
                    className={[
                      "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition",
                      isToday
                        ? "bg-primary text-white"
                        : inSelectedWeek
                          ? "bg-primary/10 text-primary"
                          : inCurrentMonth
                            ? "text-text hover:bg-background"
                            : "text-textLight/40 hover:bg-background",
                    ].join(" ")}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="border-t border-border p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-textLight">
              Loại lịch
            </p>

            <div className="mt-2 space-y-1">
              {TYPE_FILTERS.map((filter) => (
                <FilterCheckbox
                  key={filter.value}
                  label={filter.label}
                  checked={enabledTypes.has(
                    filter.value,
                  )}
                  onChange={(checked) =>
                    toggleSetValue(
                      setEnabledTypes,
                      filter.value,
                      checked,
                    )
                  }
                />
              ))}
            </div>

            <div className="my-4 border-t border-border" />

            <p className="text-xs font-black uppercase tracking-[0.14em] text-textLight">
              Vai trò giao dịch
            </p>

            <div className="mt-2 space-y-1">
              {PERSPECTIVE_FILTERS.map(
                (filter) => (
                  <FilterCheckbox
                    key={filter.value}
                    label={filter.label}
                    checked={enabledPerspectives.has(
                      filter.value,
                    )}
                    onChange={(checked) =>
                      toggleSetValue(
                        setEnabledPerspectives,
                        filter.value,
                        checked,
                      )
                    }
                  />
                ),
              )}
            </div>
          </section>

          <section className="border-t border-border bg-background/50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
              Chú thích
            </p>

            <div className="mt-3 space-y-3 text-xs font-bold text-textLight">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm border border-primary/30 bg-primary/10" />
                Kiểm định
              </div>

              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm border border-success/30 bg-success/10" />
                Thu gom
              </div>
            </div>
          </section>
        </aside>

        <div className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-border bg-white p-3 shadow-[0_10px_28px_rgba(24,63,65,0.05)]">
            <div className="grid gap-2 lg:grid-cols-[minmax(260px,1fr)_220px_auto]">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  onSearch(keyword.trim());
                }}
                className="flex min-w-0 gap-2"
              >
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">
                    Tìm theo tên đối tác
                  </span>

                  <span
                    className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-textLight"
                    aria-hidden="true"
                  >
                    search
                  </span>

                  <input
                    value={keyword}
                    onChange={(event) =>
                      onKeywordChange(
                        event.target.value,
                      )
                    }
                    placeholder="Tìm theo tên đối tác..."
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-3 text-sm text-text outline-none focus:border-primary focus:bg-white"
                  />
                </label>

                <button
                  type="submit"
                  className="rounded-xl border border-primary bg-white px-4 py-2 text-sm font-black text-primary transition hover:bg-primary/10"
                >
                  Tìm
                </button>
              </form>

              <select
                value={status}
                onChange={(event) =>
                  onStatusChange(
                    event.target.value,
                  )
                }
                className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-bold text-text outline-none focus:border-primary"
              >
                {APPOINTMENT_STATUS_OPTIONS.map(
                  (option) => (
                    <option
                      key={String(option.value)}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ),
                )}
              </select>

              {(appliedKeyword ||
                status !== "") && (
                <button
                  type="button"
                  onClick={onReset}
                  className="rounded-xl px-4 py-2.5 text-sm font-black text-primary transition hover:bg-primary/10"
                >
                  Đặt lại
                </button>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_12px_34px_rgba(24,63,65,0.06)]">
            <header className="flex flex-col gap-3 border-b border-border px-4 py-3.5 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    moveWeek(-1)
                  }
                  aria-label="Tuần trước"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-textLight transition hover:border-primary/30 hover:text-primary"
                >
                  <span
                    className="material-symbols-outlined text-[20px]"
                    aria-hidden="true"
                  >
                    chevron_left
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    moveWeek(1)
                  }
                  aria-label="Tuần sau"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-textLight transition hover:border-primary/30 hover:text-primary"
                >
                  <span
                    className="material-symbols-outlined text-[20px]"
                    aria-hidden="true"
                  >
                    chevron_right
                  </span>
                </button>

                <h2 className="ml-2 text-lg font-black text-text">
                  {formatWeekTitle(weekStart)}
                </h2>
              </div>

              <p className="text-sm font-bold text-textLight">
                {weekItems.length} lịch trong tuần
              </p>
            </header>

            {loading && (
              <div
                role="status"
                className="flex min-h-80 flex-col items-center justify-center p-10 text-center text-textLight"
              >
                <span
                  className="material-symbols-outlined animate-spin text-3xl text-primary"
                  aria-hidden="true"
                >
                  progress_activity
                </span>

                <p className="mt-3 text-sm font-bold">
                  Đang tải lịch hẹn...
                </p>
              </div>
            )}

            {error && !loading && (
              <div
                role="alert"
                className="m-5 rounded-xl border border-error/20 bg-error/10 p-4 text-sm font-bold text-error"
              >
                {error}
              </div>
            )}

            {!loading && !error && (
              <div className="overflow-x-auto overflow-y-hidden">
                <div className="min-w-[980px]">
                  <div className="grid grid-cols-[72px_repeat(7,minmax(125px,1fr))] border-b border-border">
                    <div className="flex items-end justify-center border-r border-border bg-background px-2 py-3 text-[10px] font-black uppercase text-textLight">
                      GMT+7
                    </div>

                    {weekDays.map(
                      (date, index) => (
                        <div
                          key={date.toISOString()}
                          className={[
                            "border-r border-border px-3 py-2.5 text-center last:border-r-0",
                            sameDay(date, now)
                              ? "bg-primary/5"
                              : "bg-white",
                          ].join(" ")}
                        >
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-textLight">
                            {
                              WEEKDAY_LABELS[
                                index
                              ]
                            }
                          </p>

                          <p
                            className={[
                              "mt-1 text-lg font-black",
                              sameDay(
                                date,
                                now,
                              )
                                ? "text-primary"
                                : "text-text",
                            ].join(" ")}
                          >
                            {date.getDate()}
                          </p>
                        </div>
                      ),
                    )}
                  </div>

                  <div className="grid grid-cols-[72px_repeat(7,minmax(125px,1fr))]">
                    <div
                      className="relative border-r border-border bg-background/40"
                      style={{
                        height: `${CALENDAR_HEIGHT}px`,
                      }}
                    >
                      {hours.map(
                        (hour, index) => (
                          <div
                            key={hour}
                            className="absolute left-0 right-0 -translate-y-1/2 px-2 text-right text-[11px] font-bold text-textLight"
                            style={{
                              top: `${
                                index *
                                HOUR_HEIGHT
                              }px`,
                            }}
                          >
                            {String(
                              hour,
                            ).padStart(
                              2,
                              "0",
                            )}
                            :00
                          </div>
                        ),
                      )}
                    </div>

                    {weekDays.map((date) => {
                      const dayItems =
                        weekItems.filter(
                          (item) =>
                            sameDay(
                              getAppointmentDate(
                                item,
                              ),
                              date,
                            ),
                        );

                      return (
                        <div
                          key={date.toISOString()}
                          className={[
                            "relative border-r border-border last:border-r-0",
                            sameDay(date, now)
                              ? "bg-primary/[0.025]"
                              : "bg-white",
                          ].join(" ")}
                          style={{
                            height: `${CALENDAR_HEIGHT}px`,
                          }}
                        >
                          {hours.map(
                            (hour, index) => (
                              <div
                                key={hour}
                                className="pointer-events-none absolute left-0 right-0 border-t border-border/70"
                                style={{
                                  top: `${
                                    index *
                                    HOUR_HEIGHT
                                  }px`,
                                }}
                              />
                            ),
                          )}

                          {showCurrentTime &&
                            sameDay(
                              date,
                              now,
                            ) && (
                              <div
                                className="pointer-events-none absolute left-0 right-0 z-20 border-t border-error"
                                style={{
                                  top: `${currentTimeTop}px`,
                                }}
                              >
                                <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-error" />
                              </div>
                            )}

                          {dayItems.map(
                            (item, index) => {
                              const appointmentDate =
                                getAppointmentDate(
                                  item,
                                );

                              if (
                                !appointmentDate
                              ) {
                                return null;
                              }

                              const statusMeta =
                                getAppointmentStatusMeta(
                                  item.appointmentStatus,
                                );

                              const isInspection =
                                item.viewType ===
                                APPOINTMENT_TYPE.INSPECTION;

                              return (
                                <button
                                  key={`${item.appointmentId}-${item.viewPerspective}-${item.viewType}`}
                                  type="button"
                                  onClick={() =>
                                    onOpenDetail(
                                      item,
                                    )
                                  }
                                  title="Mở chi tiết lịch hẹn"
                                  className={[
                                    "absolute left-1.5 right-1.5 z-10 overflow-hidden rounded-xl border px-2.5 py-2 text-left shadow-sm transition hover:z-30 hover:-translate-y-0.5 hover:shadow-md",
                                    isInspection
                                      ? "border-primary/25 bg-primary/10"
                                      : "border-success/25 bg-success/10",
                                  ].join(" ")}
                                  style={{
                                    ...getEventStyle(
                                      appointmentDate,
                                    ),
                                    transform:
                                      index > 0
                                        ? `translateX(${Math.min(
                                            index * 4,
                                            12,
                                          )}px)`
                                        : undefined,
                                  }}
                                >
                                  <p className="truncate text-[11px] font-black text-text">
                                    {isInspection
                                      ? "Kiểm định"
                                      : "Thu gom"}
                                  </p>

                                  <p className="mt-1 text-xs font-black text-text">
                                    {formatTime(
                                      appointmentDate,
                                    )}
                                  </p>

                                  <p
                                    className="mt-1.5 truncate text-[11px] font-bold text-text"
                                    title={
                                      item.counterpartyName ||
                                      "Người dùng HomeCycle"
                                    }
                                  >
                                    {item.counterpartyName ||
                                      "Người dùng HomeCycle"}
                                  </p>

                                  <div className="mt-1.5 flex items-center justify-between gap-1">
                                    <span className="truncate text-[9px] font-black uppercase tracking-[0.08em] text-textLight">
                                      {item.viewPerspectiveLabel}
                                    </span>

                                    <span
                                      className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-black ${statusMeta.className}`}
                                      title={statusMeta.label}
                                    >
                                      {statusMeta.label}
                                    </span>
                                  </div>
                                </button>
                              );
                            },
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {weekItems.length === 0 && (
                    <div className="border-t border-border bg-background/60 px-6 py-4 text-center text-sm font-bold text-textLight">
                      Tuần này chưa có lịch hẹn phù hợp.
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
};

export default BusinessAppointmentCalendar;