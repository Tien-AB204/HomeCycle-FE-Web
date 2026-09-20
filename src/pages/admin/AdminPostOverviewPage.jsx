export default function AdminPostOverviewPage() {
  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 px-6 py-7 text-white shadow-[0_18px_45px_rgba(24,63,65,0.16)] sm:px-8">
        <div className="pointer-events-none absolute -right-12 -top-24 h-56 w-56 rounded-full border-[38px] border-white/5" />

        <div className="relative">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
            VẬN HÀNH
          </p>

          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            Tổng quan bài đăng
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">
            Theo dõi tình hình bài đăng trên HomeCycle. Việc kiểm duyệt và xử lý
            từng bài đăng thuộc Trung tâm kiểm duyệt.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center shadow-[0_10px_28px_rgba(24,63,65,0.04)]">
        <span
          className="material-symbols-outlined rounded-2xl bg-background p-3 text-[32px] text-textLight"
          aria-hidden="true"
        >
          article
        </span>

        <p className="mt-4 text-base font-black text-text">
          Chưa có dữ liệu tổng quan bài đăng để hiển thị.
        </p>

        <p className="mt-2 max-w-md text-sm leading-6 text-textLight">
          Số liệu tổng hợp về bài đăng sẽ xuất hiện tại đây khi được bổ sung.
        </p>
      </div>
    </section>
  );
}
