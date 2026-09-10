import { useState } from "react";

export default function ModeratorWorkspaceShell({
  eyebrow = "Trung tâm kiểm duyệt",
  title,
  description,
  icon,
  searchPlaceholder = "Tìm kiếm...",
  statusOptions = [],
  capabilities = [],
  readOnly = false,
  detailTitle = "Chi tiết",
  detailDescription = "Chọn một mục trong danh sách để xem thông tin chi tiết.",
}) {
  const [searchQuery, setSearchQuery] =
    useState("");

  const [status, setStatus] =
    useState("");

  return (
    <section className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 p-4 sm:p-6 lg:p-8 xl:h-[calc(100vh-72px)] xl:min-h-0 xl:overflow-hidden">
      <header className="relative shrink-0 overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 px-6 py-7 text-white shadow-[0_18px_45px_rgba(24,63,65,0.16)] sm:px-8">
        <div className="pointer-events-none absolute -right-12 -top-24 h-56 w-56 rounded-full border-[38px] border-white/5" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
              {eyebrow}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-black sm:text-3xl">
                {title}
              </h1>

              {readOnly && (
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                  Chỉ xem
                </span>
              )}
            </div>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">
              {description}
            </p>
          </div>

          <span
            className="material-symbols-outlined flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[28px]"
            aria-hidden="true"
          >
            {icon}
          </span>
        </div>
      </header>

      {readOnly && (
        <div className="flex shrink-0 items-start gap-3 rounded-2xl border border-warning/20 bg-warning/10 px-5 py-4">
          <span
            className="material-symbols-outlined mt-0.5 text-[21px] text-warning"
            aria-hidden="true"
          >
            visibility
          </span>

          <div>
            <p className="text-sm font-black text-text">
              Khu vực chỉ đọc
            </p>

            <p className="mt-1 text-sm leading-6 text-textLight">
              Kiểm duyệt viên chỉ được xem thông tin
              phục vụ kiểm tra, không được chỉnh sửa
              nội dung trao đổi.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
        <aside className="flex min-h-[430px] flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-[0_10px_28px_rgba(24,63,65,0.05)] xl:min-h-0">
          <div className="shrink-0 border-b border-border p-4">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-textLight">
                Tìm kiếm
              </span>

              <div className="relative mt-2">
                <span
                  className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[19px] text-textLight"
                  aria-hidden="true"
                >
                  search
                </span>

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(
                      event.target.value,
                    )
                  }
                  placeholder={searchPlaceholder}
                  className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-3 text-sm font-semibold text-text outline-none transition focus:border-primary"
                />
              </div>
            </label>

            {statusOptions.length > 0 && (
              <label className="mt-4 block">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-textLight">
                  Trạng thái
                </span>

                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-bold text-text outline-none focus:border-primary"
                >
                  {statusOptions.map(
                    (option) => (
                      <option
                        key={option}
                        value={
                          option === "Tất cả"
                            ? ""
                            : option
                        }
                      >
                        {option}
                      </option>
                    ),
                  )}
                </select>
              </label>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-contain px-6 py-12 text-center">
            <span
              className="material-symbols-outlined flex h-14 w-14 items-center justify-center rounded-2xl bg-background text-[27px] text-primary"
              aria-hidden="true"
            >
              inbox
            </span>

            <h2 className="mt-4 text-base font-black text-text">
              Chưa có dữ liệu để hiển thị
            </h2>

            <p className="mt-2 max-w-xs text-sm leading-6 text-textLight">
              Danh sách phù hợp với bộ lọc sẽ
              xuất hiện tại khu vực này.
            </p>
          </div>
        </aside>

        <div className="space-y-6 xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
          <section className="relative overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
            <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-primary/[0.035]" />

            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <span
                  className="material-symbols-outlined flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-[24px] text-primary"
                  aria-hidden="true"
                >
                  description
                </span>

                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">
                    Chi tiết kiểm duyệt
                  </p>

                  <h2 className="mt-1 text-xl font-black text-text">
                    {detailTitle}
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-textLight">
                    {detailDescription}
                  </p>
                </div>
              </div>

              <span className="rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-black text-textLight">
                Chọn một mục
              </span>
            </div>

            <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
              {[
                {
                  icon: "badge",
                  title: "Thông tin chính",
                  text: "Thông tin nhận diện và trạng thái.",
                },
                {
                  icon: "history",
                  title: "Lịch sử liên quan",
                  text: "Các sự kiện phục vụ đối chiếu.",
                },
                {
                  icon: "fact_check",
                  title: "Kết quả xử lý",
                  text: readOnly
                    ? "Khu vực này chỉ dùng để tra cứu."
                    : "Thao tác phù hợp sẽ hiển thị tại đây.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-border bg-background/50 p-4"
                >
                  <span
                    className="material-symbols-outlined text-[20px] text-primary"
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>

                  <p className="mt-2 text-sm font-black text-text">
                    {item.title}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-textLight">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
              Phạm vi xử lý
            </p>

            <h2 className="mt-1 text-xl font-black text-text">
              Nghiệp vụ của kiểm duyệt viên
            </h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {capabilities.map(
                (capability) => (
                  <div
                    key={capability}
                    className="flex items-start gap-3 rounded-xl border border-border bg-background/50 px-4 py-3"
                  >
                    <span
                      className="material-symbols-outlined mt-0.5 text-[19px] text-primary"
                      aria-hidden="true"
                    >
                      check_circle
                    </span>

                    <span className="text-sm font-semibold leading-6 text-text">
                      {capability}
                    </span>
                  </div>
                ),
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}