import {
  REFERENCE_TYPE_LABELS,
  getFinanceLabel,
} from "../../finance/financePresentation.js";

export const FINANCE_TABS = Object.freeze([
  ["overview", "Tổng quan"],
  ["finance", "Tài chính"],
  ["payments", "Thanh toán"],
  ["ledger", "Lịch sử giao dịch"],
  ["escrows", "Tiền đơn hàng đang giữ"],
  ["holds", "Tạm giữ trong ví người dùng"],
]);

// Tab của trang "Ví & giao dịch" cũ và tab GHN đã gộp vào trang này.
const LEGACY_TABS = Object.freeze({
  funds: "overview",
  transactions: "ledger",
  ghn: "overview",
});

export const resolveFinanceTab = (requested) => {
  const key = LEGACY_TABS[requested] || requested;
  return FINANCE_TABS.some(([tab]) => tab === key) ? key : "overview";
};

export const getFinanceTabPath = (requested) => {
  const tab = resolveFinanceTab(requested);
  return tab === "overview"
    ? "/admin/dashboard/finance"
    : `/admin/dashboard/finance?tab=${tab}`;
};

const normalize = (value) =>
  String(value ?? "").trim().toLocaleLowerCase("vi-VN");

// Tìm trong dữ liệu đã tải: API danh sách không có tham số từ khóa.
export const matchesKeyword = (values, keyword) => {
  const query = normalize(keyword);
  if (!query) return true;
  return values.some((value) => normalize(value).includes(query));
};

const isWithdrawalReference = (referenceType) =>
  String(referenceType) === "Withdrawal" || String(referenceType) === "4";

/*
 * Chỉ khẳng định "liên quan yêu cầu rút tiền" khi tham chiếu đúng là
 * Withdrawal; các khoản khác không được tự suy ra là đang chờ rút.
 */
export const getHoldRelation = (hold) => {
  const referenceType = hold?.referenceType;
  if (isWithdrawalReference(referenceType)) return "Liên quan yêu cầu rút tiền";
  if (referenceType === null || referenceType === undefined || referenceType === "") {
    return "Chưa có tham chiếu";
  }
  return `Liên quan ${getFinanceLabel(REFERENCE_TYPE_LABELS, referenceType).toLocaleLowerCase("vi-VN")}`;
};

export const getHoldRelationKey = (hold) => {
  const referenceType = hold?.referenceType;
  if (isWithdrawalReference(referenceType)) return "Withdrawal";
  return referenceType === null || referenceType === undefined || referenceType === ""
    ? "none"
    : String(referenceType);
};

export const paginate = (items, pageNumber, pageSize) => {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, pageNumber), totalPages);
  return {
    page,
    totalPages,
    items: items.slice((page - 1) * pageSize, page * pageSize),
  };
};
