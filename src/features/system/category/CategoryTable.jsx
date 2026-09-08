// src/features/system/category/CategoryTable.jsx

export default function CategoryTable({
  categories,
  isLoading,
  onEdit,
  onDelete,
}) {
  if (isLoading) {
    return (
      <div className="p-8 text-center text-textLight">
        Đang tải danh sách danh mục...
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="p-8 text-center text-textLight">Chưa có danh mục nào.</div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-background border-b text-sm font-semibold text-textLight">
            <th className="p-4">STT</th>
            <th className="p-4">Tên danh mục</th>
            <th className="p-4">Mô tả</th>
            <th className="p-4">Trạng thái</th>
            <th className="p-4 text-center">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y text-sm text-text">
          {categories.map((item, index) => (
            <tr key={item.id} className="hover:bg-background transition-colors">
              <td className="p-4 font-medium">{index + 1}</td>
              <td className="p-4 font-semibold text-text">{item.name}</td>
              <td className="p-4 text-textLight max-w-xs truncate">
                {item.description || "—"}
              </td>
              <td className="p-4">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    item.isActive
                      ? "bg-success/10 text-success"
                      : "bg-background text-textLight"
                  }`}
                >
                  {item.isActive ? "Hoạt động" : "Ẩn"}
                </span>
              </td>
              <td className="p-4 text-center space-x-2">
                <button
                  onClick={() => onEdit(item)}
                  className="px-3 py-1 bg-primary/5 text-primary hover:bg-primary/10 rounded text-xs font-medium transition"
                >
                  Sửa
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="px-3 py-1 bg-error/10 text-error hover:bg-error/20 rounded text-xs font-medium transition"
                >
                  Xóa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
