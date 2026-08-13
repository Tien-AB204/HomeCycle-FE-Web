const PendingPaymentsPage = () => {
  return (
    <section className="mx-auto min-h-[calc(100vh-220px)] w-full max-w-7xl px-4 pb-14 pt-7 sm:px-6">
      <header className="border-b border-[#DCE8E5] pb-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6F9F]">
          Thanh toán
        </p>
        <h1 className="mt-1 text-2xl font-black text-[#183F41] sm:text-3xl">
          Lịch sử thanh toán
        </h1>
        <p className="mt-1.5 text-sm text-[#68807F]">
          Theo dõi các giao dịch đã được ghi nhận trên HomeCycle.
        </p>
      </header>

      <div className="mt-4 rounded-xl border border-dashed border-[#9FBFBA] bg-white px-6 py-14 text-center shadow-[0_8px_24px_rgba(24,63,65,0.05)]">
        <span
          className="material-symbols-outlined text-5xl text-[#4F8588]"
          aria-hidden="true"
        >
          receipt_long
        </span>
        <h2 className="mt-4 text-lg font-black text-[#183F41]">
          Chưa có lịch sử thanh toán
        </h2>
      </div>
    </section>
  );
};

export default PendingPaymentsPage;