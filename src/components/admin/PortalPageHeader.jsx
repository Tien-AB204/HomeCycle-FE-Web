// Tiêu đề trang dùng chung cho Admin và Kiểm duyệt viên (kiểu các trang Admin mới).
export default function PortalPageHeader({ title, description, actions, className = "" }) {
  return (
    <header className={`hc-page-head ${className}`}>
      <div className="min-w-0">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="hc-page-actions">{actions}</div>}
    </header>
  );
}
