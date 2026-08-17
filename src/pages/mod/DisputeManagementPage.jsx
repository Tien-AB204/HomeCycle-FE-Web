import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Descriptions,
  Empty,
  Image,
  Input,
  Pagination,
  Select,
  Spin,
  Tag,
} from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import axiosClient from "../../services/apis/axiosClient";

const STATUS_OPTIONS = [
  { value: 0, label: "Chờ xử lý" },
  { value: 1, label: "Đã giải quyết" },
  { value: 2, label: "Đã từ chối" },
  { value: 3, label: "Đã đóng" },
];

const CATEGORY_OPTIONS = [
  { value: 1, label: "Không xuất hiện" },
  { value: 2, label: "Sản phẩm không khớp" },
  { value: 3, label: "Người bán chưa gửi hàng" },
  { value: 4, label: "Hư hỏng hoặc thất lạc" },
  { value: 5, label: "Chưa nhận được hàng" },
  { value: 6, label: "Gian lận / lừa đảo" },
  { value: 7, label: "Đánh giá mang tính công kích" },
  { value: 8, label: "Thanh toán chưa hoàn tất" },
  { value: 9, label: "Vi phạm cam kết" },
  { value: 99, label: "Khác" },
];

const TARGET_TYPE_OPTIONS = [
  { value: 1, label: "Lịch hẹn" },
  { value: 2, label: "Đơn hàng" },
  { value: 3, label: "Đánh giá" },
];

const ENUM_NAME_TO_VALUE = {
  status: {
    pending: 0,
    resolved: 1,
    rejected: 2,
    closed: 3,
  },
  category: {
    noshow: 1,
    itemmismatch: 2,
    sellernotshipped: 3,
    damagedorlost: 4,
    itemnotreceived: 5,
    fraudorscam: 6,
    abusivereview: 7,
    paymentnotcompleted: 8,
    commitmentviolation: 9,
    other: 99,
  },
  targetType: {
    appointment: 1,
    order: 2,
    review: 3,
  },
};

const normalizeEnumValue = (value, type) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (/^-?\d+$/.test(String(value))) return Number(value);
  return ENUM_NAME_TO_VALUE[type]?.[String(value).toLowerCase()] ?? value;
};

const optionLabel = (options, value, type) => {
  const normalized = normalizeEnumValue(value, type);
  return options.find((option) => option.value === normalized)?.label || value || "N/A";
};

const getStatusMeta = (status) => {
  const normalized = normalizeEnumValue(status, "status");

  switch (normalized) {
    case 0:
      return { label: "Chờ xử lý", color: "gold" };
    case 1:
      return { label: "Đã giải quyết", color: "green" };
    case 2:
      return { label: "Đã từ chối", color: "red" };
    case 3:
      return { label: "Đã đóng", color: "default" };
    default:
      return { label: status ?? "N/A", color: "blue" };
  }
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatMoney = (value) => {
  if (value === null || value === undefined || value === "") return "N/A";
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  return `${number.toLocaleString("vi-VN")} ₫`;
};

const extractPagedData = (response) => {
  const payload = response?.data ?? response ?? {};
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload)
      ? payload
      : [];

  return {
    items,
    pageNumber: payload?.pageNumber || 1,
    pageSize: payload?.pageSize || 10,
    totalCount: payload?.totalCount ?? items.length,
  };
};

const DisputeManagementPage = () => {
  const [disputes, setDisputes] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState(null);

  const [selectedDisputeId, setSelectedDisputeId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState(undefined);
  const [category, setCategory] = useState(undefined);
  const [targetType, setTargetType] = useState(undefined);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const listParams = useMemo(
    () => ({
      pageNumber,
      pageSize,
      ...(keyword ? { keyword } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(targetType !== undefined ? { targetType } : {}),
    }),
    [pageNumber, pageSize, keyword, status, category, targetType],
  );

  const fetchDisputes = async () => {
    setLoadingList(true);
    setListError(null);

    try {
      const response = await axiosClient.get("/moderator/disputes", {
        params: listParams,
      });
      const paged = extractPagedData(response);
      setDisputes(paged.items);
      setTotalCount(paged.totalCount);

      if (paged.pageNumber !== pageNumber) {
        setPageNumber(paged.pageNumber);
      }
      if (paged.pageSize !== pageSize) {
        setPageSize(paged.pageSize);
      }

      if (
        selectedDisputeId &&
        !paged.items.some((item) => item.disputeId === selectedDisputeId)
      ) {
        setSelectedDisputeId(null);
        setDetail(null);
      }
    } catch (error) {
      setDisputes([]);
      setTotalCount(0);
      setListError(
        error?.response?.data?.message || "Không thể tải danh sách tranh chấp.",
      );
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, [listParams]);

  useEffect(() => {
    if (!selectedDisputeId) {
      setDetail(null);
      setDetailError(null);
      return;
    }

    const fetchDetail = async () => {
      setLoadingDetail(true);
      setDetailError(null);

      try {
        const response = await axiosClient.get(
          `/moderator/disputes/${selectedDisputeId}`,
        );
        setDetail(response?.data ?? response ?? null);
      } catch (error) {
        setDetail(null);
        setDetailError(
          error?.response?.data?.message || "Không thể tải chi tiết tranh chấp.",
        );
      } finally {
        setLoadingDetail(false);
      }
    };

    fetchDetail();
  }, [selectedDisputeId]);

  const applySearch = () => {
    setPageNumber(1);
    setKeyword(keywordInput.trim());
  };

  const clearFilters = () => {
    setKeywordInput("");
    setKeyword("");
    setStatus(undefined);
    setCategory(undefined);
    setTargetType(undefined);
    setPageNumber(1);
  };

  const renderUserCard = (title, user) => {
    if (!user) {
      return (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-400">
          {title}: Không có dữ liệu
        </div>
      );
    }

    const initial = (user.username || "U").charAt(0).toUpperCase();

    return (
      <div className="rounded-xl border border-[#DCE8E5] bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#78908E]">
          {title}
        </p>
        <div className="flex items-center gap-3">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.username || title}
              className="h-11 w-11 rounded-full border border-[#DCE8E5] object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E6F2F0] font-black text-[#285E62]">
              {initial}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-bold text-[#183F41]">
              {user.username || "N/A"}
            </p>
            <p className="truncate text-xs text-[#78908E]">
              ID: {user.userId || "N/A"}
            </p>
            <p className="mt-1 text-xs text-[#5F7472]">
              Vai trò: {user.role ?? "N/A"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const detailStatus = getStatusMeta(detail?.status);
  const order = detail?.target?.order;
  const evidenceImages = Array.isArray(detail?.evidenceImages)
    ? [...detail.evidenceImages].sort(
        (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0),
      )
    : [];

  return (
    <div className="flex h-full min-h-0 bg-[#F4F7F6] text-[#183436]">
      <section className="flex w-[420px] shrink-0 flex-col border-r border-[#DCE8E5] bg-white">
        <div className="border-b border-[#E6EFED] p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#2F6F9F]">
                Moderator
              </p>
              <h1 className="text-xl font-black text-[#183F41]">
                Quản lý tranh chấp
              </h1>
            </div>
            <div className="rounded-full bg-[#E6F2F0] px-3 py-1 text-xs font-black text-[#285E62]">
              {totalCount}
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              onPressEnter={applySearch}
              prefix={<SearchOutlined className="text-gray-400" />}
              placeholder="Tìm mã, người dùng, đơn hàng..."
              allowClear
            />
            <Button type="primary" onClick={applySearch} className="bg-[#285E62]">
              Tìm
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Select
              allowClear
              placeholder="Trạng thái"
              value={status}
              options={STATUS_OPTIONS}
              onChange={(value) => {
                setStatus(value);
                setPageNumber(1);
              }}
            />
            <Select
              allowClear
              placeholder="Đối tượng"
              value={targetType}
              options={TARGET_TYPE_OPTIONS}
              onChange={(value) => {
                setTargetType(value);
                setPageNumber(1);
              }}
            />
            <Select
              allowClear
              className="col-span-2"
              placeholder="Loại tranh chấp"
              value={category}
              options={CATEGORY_OPTIONS}
              onChange={(value) => {
                setCategory(value);
                setPageNumber(1);
              }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <Button type="link" onClick={clearFilters} className="px-0 text-[#5F7472]">
              Xóa bộ lọc
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchDisputes}
              loading={loadingList}
            >
              Làm mới
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {listError && (
            <Alert
              type="error"
              showIcon
              message={listError}
              className="m-4"
            />
          )}

          {loadingList && disputes.length === 0 ? (
            <div className="flex h-full items-center justify-center p-10">
              <Spin />
            </div>
          ) : disputes.length === 0 ? (
            <Empty description="Không có tranh chấp phù hợp" className="mt-14" />
          ) : (
            <div className="divide-y divide-[#EDF3F1]">
              {disputes.map((item) => {
                const statusMeta = getStatusMeta(item.status);
                const isSelected = selectedDisputeId === item.disputeId;

                return (
                  <button
                    type="button"
                    key={item.disputeId}
                    onClick={() => setSelectedDisputeId(item.disputeId)}
                    className={`w-full border-l-4 p-4 text-left transition ${
                      isSelected
                        ? "border-[#285E62] bg-[#EFF6F4]"
                        : "border-transparent bg-white hover:bg-[#F8FBFA]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-[#183F41]">
                          {item.orderCode || `Tranh chấp ${String(item.disputeId).slice(0, 8)}`}
                        </p>
                        <p className="mt-1 truncate text-xs text-[#78908E]">
                          Người gửi: {item.senderUsername || "N/A"}
                        </p>
                      </div>
                      <Tag color={statusMeta.color} className="m-0 shrink-0">
                        {statusMeta.label}
                      </Tag>
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm leading-5 text-[#536B69]">
                      {item.description || "Không có mô tả"}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-[#78908E]">
                      <span>
                        {optionLabel(
                          CATEGORY_OPTIONS,
                          item.category,
                          "category",
                        )}
                      </span>
                      <span>{formatDateTime(item.createdAt)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-[#E6EFED] bg-white p-3">
          <Pagination
            current={pageNumber}
            pageSize={pageSize}
            total={totalCount}
            showSizeChanger
            pageSizeOptions={[10, 20, 50, 100]}
            size="small"
            onChange={(page, size) => {
              setPageNumber(size !== pageSize ? 1 : page);
              setPageSize(size);
            }}
          />
        </div>
      </section>

      <section className="min-w-0 flex-1 overflow-y-auto">
        {!selectedDisputeId ? (
          <div className="flex h-full min-h-[520px] flex-col items-center justify-center p-8 text-center text-[#78908E]">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E6F2F0] text-[#285E62]">
              <WarningOutlined className="text-3xl" />
            </div>
            <h2 className="text-lg font-black text-[#183F41]">Chi tiết tranh chấp</h2>
            <p className="mt-2 max-w-md text-sm">
              Chọn một tranh chấp ở danh sách bên trái để xem thông tin người gửi,
              đối tượng liên quan và bằng chứng.
            </p>
          </div>
        ) : loadingDetail ? (
          <div className="flex h-full min-h-[520px] items-center justify-center">
            <Spin size="large" />
          </div>
        ) : detailError ? (
          <div className="p-6">
            <Alert type="error" showIcon message={detailError} />
          </div>
        ) : detail ? (
          <div className="mx-auto max-w-6xl p-6 lg:p-8">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#2F6F9F]">
                  Chi tiết tranh chấp
                </p>
                <h2 className="mt-1 text-2xl font-black text-[#183F41]">
                  {order?.orderCode || `#${String(detail.disputeId).slice(0, 8)}`}
                </h2>
                <p className="mt-1 break-all text-xs text-[#78908E]">
                  ID: {detail.disputeId}
                </p>
              </div>
              <Tag color={detailStatus.color} className="m-0 px-3 py-1 text-sm font-bold">
                {detailStatus.label}
              </Tag>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {renderUserCard("Người gửi tranh chấp", detail.sender)}
              {renderUserCard("Người bị phản ánh", detail.targetUser)}
            </div>

            <div className="mt-6 rounded-2xl border border-[#DCE8E5] bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-base font-black text-[#183F41]">
                Nội dung tranh chấp
              </h3>
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Loại tranh chấp">
                  {optionLabel(CATEGORY_OPTIONS, detail.category, "category")}
                </Descriptions.Item>
                <Descriptions.Item label="Đối tượng">
                  {optionLabel(
                    TARGET_TYPE_OPTIONS,
                    detail.target?.targetType,
                    "targetType",
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="ID đối tượng">
                  {detail.target?.targetId || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Mô tả">
                  <span className="whitespace-pre-wrap">
                    {detail.description || "Không có mô tả"}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="Ngày gửi">
                  {formatDateTime(detail.createdAt)}
                </Descriptions.Item>
                <Descriptions.Item label="Cập nhật lần cuối">
                  {formatDateTime(detail.updatedAt)}
                </Descriptions.Item>
                <Descriptions.Item label="Thời gian giải quyết">
                  {formatDateTime(detail.resolvedAt)}
                </Descriptions.Item>
                <Descriptions.Item label="Moderator phụ trách">
                  {detail.moderatorId || "Chưa có"}
                </Descriptions.Item>
                <Descriptions.Item label="Ghi chú Moderator">
                  {detail.moderatorNote || "Chưa có ghi chú"}
                </Descriptions.Item>
              </Descriptions>
            </div>

            {order && (
              <div className="mt-6 rounded-2xl border border-[#DCE8E5] bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-base font-black text-[#183F41]">
                  Thông tin đơn hàng liên quan
                </h3>
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="Mã đơn hàng">
                    {order.orderCode || "N/A"}
                  </Descriptions.Item>
                  <Descriptions.Item label="ID đơn hàng">
                    {order.orderId || "N/A"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Sản phẩm">
                    {order.productName || "N/A"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Số lượng">
                    {order.quantity ?? "N/A"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Tổng tiền">
                    {formatMoney(order.finalTotalAmount)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Trạng thái đơn">
                    {order.orderStatus ?? "N/A"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Trạng thái thanh toán">
                    {order.paymentStatus ?? "N/A"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Hạn tạo tranh chấp">
                    {formatDateTime(order.disputeDeadlineUtc)}
                  </Descriptions.Item>
                </Descriptions>
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-[#DCE8E5] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-base font-black text-[#183F41]">Bằng chứng</h3>
                <span className="text-xs font-bold text-[#78908E]">
                  {evidenceImages.length} tệp
                </span>
              </div>

              {evidenceImages.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có ảnh bằng chứng" />
              ) : (
                <Image.PreviewGroup>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                    {evidenceImages.map((media) => (
                      <div
                        key={media.mediaId || media.url}
                        className="overflow-hidden rounded-xl border border-[#DCE8E5] bg-[#F8FBFA]"
                      >
                        <Image
                          src={media.url}
                          alt={media.fileName || "Bằng chứng tranh chấp"}
                          className="h-40 w-full object-cover"
                          width="100%"
                        />
                        <div className="p-2">
                          <p className="truncate text-xs font-bold text-[#536B69]">
                            {media.fileName || "Ảnh bằng chứng"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Image.PreviewGroup>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default DisputeManagementPage;
