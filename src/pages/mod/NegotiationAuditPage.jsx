export default function NegotiationAuditPage() {
  return (
    <section className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 px-6 py-7 text-white shadow-[0_18px_45px_rgba(24,63,65,0.16)] sm:px-8">
        <div className="pointer-events-none absolute -right-12 -top-24 h-56 w-56 rounded-full border-[38px] border-white/5" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
              Trung tâm kiểm duyệt
            </p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              Kiểm tra thương lượng
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">
              Chức năng tra cứu lịch sử thương lượng cho kiểm duyệt viên chưa
              có hợp đồng API từ hệ thống.
            </p>
          </div>
          <span className="material-symbols-outlined flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[28px]">
            forum
          </span>
        </div>
      </header>

      <div className="rounded-2xl border border-warning/20 bg-warning/10 p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
        <div className="flex items-start gap-4">
          <span className="material-symbols-outlined mt-0.5 text-[24px] text-warning">
            info
          </span>
          <div>
            <h2 className="text-lg font-black text-text">
              Chưa thể tra cứu dữ liệu thương lượng
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-textLight">
              Hệ thống hiện chưa cung cấp API kiểm tra thương lượng dành cho
              kiểm duyệt viên. Màn hình này không hiển thị dữ liệu mẫu và không
              thực hiện tìm kiếm hoặc thao tác nào.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
