import { formatListingPrice } from "./listingMonitorPresentation";
import { formatDate, isBuy, num, stateKey, stateLabel } from "./postsAdminPresentation";

export default function PostTable({ rows, onOpen, emptyText = "Không có bài đăng phù hợp." }) {
  if (!rows.length) return <div className="empty">{emptyText}</div>;
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            <th>Bài đăng</th>
            <th>Loại tin</th>
            <th>Giá đăng tin</th>
            <th className="right">Số lượng</th>
            <th>Trạng thái</th>
            <th>Ngày tạo</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.postId}>
              <td>
                <button type="button" className="text post-title" onClick={() => onOpen(item)}>
                  {item.productName || "Bài đăng chưa đặt tên"}
                </button>
                <span className="sub">{[item.ownerName, item.categoryName].filter(Boolean).join(" · ") || "—"}</span>
                {item.openReportCount > 0 && <span className="sub report-status">{num(item.openReportCount)} báo cáo chưa giải quyết</span>}
                {item.isExpired && <span className="sub report-status">Đã hết hạn</span>}
              </td>
              <td><span className={`badge ${isBuy(item) ? "blue" : ""}`}>{isBuy(item) ? "Tin mua" : "Tin bán"}</span></td>
              <td className="right">{formatListingPrice(item)}</td>
              <td className="right">{num(item.quantity)}</td>
              <td><span className={`badge ${stateKey(item.status)}`}>{stateLabel(item.status)}</span></td>
              <td>{formatDate(item.createdAt)}</td>
              <td><button type="button" onClick={() => onOpen(item)}>Chi tiết</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
