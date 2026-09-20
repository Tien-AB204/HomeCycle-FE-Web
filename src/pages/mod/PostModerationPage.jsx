import { useState, useEffect, useRef } from "react";
import {
  SearchOutlined,
  LoadingOutlined,
  WarningOutlined,
  FileTextOutlined,
  StopOutlined,
  InfoCircleOutlined,
  AppstoreOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { Alert, Button } from "antd";
import { postApi } from "../../services/apis/postApi";
import moderatorListingApi from "../../services/apis/moderatorListingApi";
import useDebounce from "../../hooks/useDebounce";
import EvidenceImage from "../../components/shared/EvidenceImage";
import ListMonthDropdown from "../../components/shared/ListMonthDropdown";
import ListSortDropdown from "../../components/shared/ListSortDropdown";
import useActionToast from "../../hooks/useActionToast";
import { filterItemsByMonth } from "../../utils/sortListItems";

const MODERATOR_FUNCTIONALITY_LABELS = {
  "0": "Hoạt động hoàn hảo",
  fullyfunctional: "Hoạt động hoàn hảo",

  "1": "Hoạt động một phần",
  partiallyfunctional: "Hoạt động một phần",

  "2": "Không hoạt động",
  nonfunctional: "Không hoạt động",
};

const MODERATOR_DAMAGE_LABELS = {
  "0": "Không hư hỏng",
  none: "Không hư hỏng",

  "1": "Hư hại thẩm mỹ",
  cosmeticdamage: "Hư hại thẩm mỹ",

  "2": "Hư hại nhẹ",
  minordamage: "Hư hại nhẹ",

  "3": "Hư hại trung bình",
  moderatedamage: "Hư hại trung bình",

  "4": "Hư hại nặng",
  severedamage: "Hư hại nặng",

  "5": "Tổn thất toàn bộ",
  totalloss: "Tổn thất toàn bộ",
};

const normalizeModeratorProductEnum = (value) =>
  String(value ?? "")
    .trim()
    .replace(/[\s_-]+/g, "")
    .toLowerCase();

const getModeratorFunctionalityLabel = (value) => {
  if (value === null || value === undefined || value === "") {
    return "Chưa cập nhật";
  }

  return (
    MODERATOR_FUNCTIONALITY_LABELS[
      normalizeModeratorProductEnum(value)
    ] || "Chưa xác định"
  );
};

const getModeratorDamageLabel = (value) => {
  if (value === null || value === undefined || value === "") {
    return "Chưa cập nhật";
  }

  return (
    MODERATOR_DAMAGE_LABELS[
      normalizeModeratorProductEnum(value)
    ] || "Chưa xác định"
  );
};
const PAGE_SIZE = 50;
const REPORTED_PAGE_SIZE = 20;
const WARNING_MESSAGE_MAX_LENGTH = 1000;

const LIST_SOURCES = [
  { key: "all", label: "Tất cả bài đăng" },
  { key: "reported", label: "Bị báo cáo" },
];

const formatReportedAt = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const reasonLabel = (reason) =>
  String(reason?.name || "")
    .trim()
    .toLowerCase() === "unspecified" || !reason?.name
    ? "Chưa phân loại"
    : reason.name;

const PostModerationPage = () => {
  const actionToast = useActionToast();
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);

  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [sortOption, setSortOption] = useState("newest");
  const [monthFilter, setMonthFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: PAGE_SIZE,
    totalCount: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });
  const [requestVersion, setRequestVersion] = useState(0);

  const [listSource, setListSource] = useState("all");
  const [reportedOpenOnly, setReportedOpenOnly] = useState(true);
  const [reportedItems, setReportedItems] = useState([]);
  const [reportedError, setReportedError] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [warningMessage, setWarningMessage] = useState("");

  const isReportedSource = listSource === "reported";

  // --- STATE RESIZABLE CỘT TRÁI ---
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const resizeSessionRef = useRef(null);

  const startResizing = (e) => {
    e.preventDefault();

    resizeSessionRef.current = {
      startX: e.clientX,
      startWidth: sidebarWidth,
    };

    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      const session = resizeSessionRef.current;

      if (!isResizing || !session) return;

      const delta =
        e.clientX - session.startX;

      const newWidth =
        session.startWidth + delta;

      if (newWidth >= 300 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      resizeSessionRef.current = null;
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Inline Actions
  const [actionState, setActionState] = useState("idle");
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [globalFeedback, setGlobalFeedback] = useState(null);

  // =========================================================================
  // API EFFECTS
  // =========================================================================
  useEffect(() => {
    if (isReportedSource) return undefined;

    const controller = new AbortController();
    let isCurrent = true;

    const timeoutId = window.setTimeout(() => {
      setIsLoadingList(true);
      postApi
        .getAll({
          pageNumber,
          pageSize: PAGE_SIZE,
          signal: controller.signal,
        })
        .then((response) => {
          if (!isCurrent) return;

          setPosts(response?.items || []);
          setPagination({
            pageNumber: response?.pageNumber ?? pageNumber,
            pageSize: response?.pageSize ?? PAGE_SIZE,
            totalCount: response?.totalCount ?? 0,
            totalPages: response?.totalPages ?? 0,
            hasPreviousPage: Boolean(response?.hasPreviousPage),
            hasNextPage: Boolean(response?.hasNextPage),
          });
        })
        .catch((error) => {
          if (!isCurrent || error?.code === "ERR_CANCELED") return;
          setPosts([]);
        })
        .finally(() => {
          if (isCurrent) setIsLoadingList(false);
        });
    }, 0);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [isReportedSource, pageNumber, requestVersion]);

  useEffect(() => {
    if (!isReportedSource) return undefined;

    const controller = new AbortController();
    let isCurrent = true;

    const timeoutId = window.setTimeout(() => {
      setIsLoadingList(true);
      setReportedError("");
      moderatorListingApi
        .getReportedPosts({
          openOnly: reportedOpenOnly,
          keyword: debouncedSearchQuery,
          pageNumber,
          pageSize: REPORTED_PAGE_SIZE,
          signal: controller.signal,
        })
        .then((response) => {
          if (!isCurrent) return;

          setReportedItems(response.items);
          setPagination({
            pageNumber: response.pageNumber,
            pageSize: response.pageSize,
            totalCount: response.totalCount,
            totalPages: response.totalPages,
            hasPreviousPage: response.pageNumber > 1,
            hasNextPage: response.pageNumber < response.totalPages,
          });
        })
        .catch((error) => {
          if (!isCurrent || error?.code === "ERR_CANCELED") return;
          setReportedItems([]);
          setReportedError("Không thể tải danh sách bài đăng bị báo cáo. Vui lòng thử lại.");
        })
        .finally(() => {
          if (isCurrent) setIsLoadingList(false);
        });
    }, 0);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    isReportedSource,
    reportedOpenOnly,
    debouncedSearchQuery,
    pageNumber,
    requestVersion,
  ]);

  const switchListSource = (nextSource) => {
    if (nextSource === listSource) return;
    setListSource(nextSource);
    setPageNumber(1);
    setStatusFilter("");
    setMonthFilter("");
  };

  const toggleReportedOpenOnly = () => {
    setReportedOpenOnly((current) => !current);
    setPageNumber(1);
  };

  const reportedStatusFiltered = statusFilter
    ? reportedItems.filter(
        (item) =>
          String(item.status || "")
            .trim()
            .toUpperCase() === statusFilter,
      )
    : reportedItems;

  // --- LỌC CLIENT-SIDE (Hỗ trợ tìm theo tên, mô tả VÀ ID bài đăng) ---
  const searchedPosts = debouncedSearchQuery
    ? posts.filter((p) => {
        const query = debouncedSearchQuery.toLowerCase();
        const productName = p.productName?.toLowerCase() || "";
        const description = p.description?.toLowerCase() || "";
        const postId = (p.postId || p.id || "").toLowerCase();

        // Format ngày tạo sang chuỗi tiếng Việt (ví dụ: "12/8/2026") để khớp với từ khóa gõ vào
        const dateString = p.createdAt
          ? new Date(p.createdAt).toLocaleDateString("vi-VN").toLowerCase()
          : "";

        return (
          productName.includes(query) ||
          description.includes(query) ||
          postId.includes(query) ||
          dateString.includes(query)
        );
      })
    : posts;

  const filteredPosts = statusFilter
    ? searchedPosts.filter(
        (post) =>
          String(post.status || "")
            .trim()
            .toUpperCase() === statusFilter,
      )
    : searchedPosts;

  const monthFilteredPosts = filterItemsByMonth(
    filteredPosts,
    monthFilter,
    (post) => post?.createdAt,
  );

  const sortedPosts = [...monthFilteredPosts].sort((a, b) => {
    if (sortOption === "oldest") {
      const timeA = Date.parse(a.createdAt || "") || 0;
      const timeB = Date.parse(b.createdAt || "") || 0;
      return timeA - timeB;
    }

    if (sortOption === "name-asc") {
      const nameA = String(
        a.productName || a.description || "",
      );

      const nameB = String(
        b.productName || b.description || "",
      );

      return nameA.localeCompare(
        nameB,
        "vi",
        { sensitivity: "base" },
      );
    }

    if (sortOption === "name-desc") {
      const nameA = String(
        a.productName || a.description || "",
      );

      const nameB = String(
        b.productName || b.description || "",
      );

      return nameB.localeCompare(
        nameA,
        "vi",
        { sensitivity: "base" },
      );
    }

    const timeA =
      Date.parse(a.createdAt || "") || 0;

    const timeB =
      Date.parse(b.createdAt || "") || 0;

    return timeB - timeA;
  });

  const handleSelectPost = async (id, report = null) => {
    if (!id) return;
    setSelectedReport(report);
    setIsLoadingDetail(true);
    setDetailError(null);
    setActionState("idle");
    setActionFeedback(null);
    setWarningMessage("");
    setGlobalFeedback(null);

    try {
      const data = await postApi.getById(id);
      setSelectedPost(data);
    } catch (error) {
      setSelectedPost(null);
      if (error.response?.status >= 500) {
        setDetailError("Lỗi máy chủ. Vui lòng thử lại sau.");
      } else {
        setDetailError("Dữ liệu bài đăng bị lỗi hoặc không tồn tại.");
      }
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // =========================================================================
  // ACTIONS HANDLERS
  // =========================================================================
  const handleSuspendPost = async () => {
    setIsProcessing(true);
    setActionFeedback(null);
    try {
      const currentId = selectedPost.postId || selectedPost.id;
      await moderatorListingApi.suspendPost(currentId);

      setSelectedPost(null);
      setSelectedReport(null);
      setGlobalFeedback({
        type: "success",
        text: "Đã đình chỉ bài đăng thành công!",
      });
      actionToast.success("Đã đình chỉ bài đăng");
      setRequestVersion((version) => version + 1);
    } catch (error) {
      const msg = error.response?.status >= 500
          ? "Lỗi máy chủ. Vui lòng thử lại sau."
          : "Không thể đình chỉ bài đăng. Vui lòng thử lại.";
      setActionFeedback({ type: "error", text: msg });
    } finally {
      setIsProcessing(false);
    }
  };

  const trimmedWarningMessage = warningMessage.trim();
  const warningMessageValid =
    trimmedWarningMessage.length > 0 &&
    trimmedWarningMessage.length <= WARNING_MESSAGE_MAX_LENGTH;

  const handleWarnOwner = async () => {
    if (!warningMessageValid || isProcessing) return;
    setIsProcessing(true);
    setActionFeedback(null);
    try {
      const currentId = selectedPost.postId || selectedPost.id;
      await moderatorListingApi.warnPostOwner(currentId, trimmedWarningMessage);

      setActionState("idle");
      setWarningMessage("");
      setActionFeedback({
        type: "success",
        text: "Đã gửi cảnh báo tới chủ bài đăng.",
      });
      actionToast.success("Đã gửi cảnh báo");
    } catch (error) {
      const status = error.response?.status;
      const msg =
        status >= 500
          ? "Lỗi máy chủ. Vui lòng thử lại sau."
          : status === 404
            ? "Không tìm thấy bài đăng để cảnh báo."
            : "Không thể gửi cảnh báo. Vui lòng kiểm tra nội dung và thử lại.";
      setActionFeedback({ type: "error", text: msg });
    } finally {
      setIsProcessing(false);
    }
  };

  // =========================================================================
  // UI HELPERS
  // =========================================================================
  const renderStatus = (status) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return (
          <span className="text-success bg-success/10 px-2 py-0.5 rounded text-xs font-semibold border border-success/20">
            Hoạt động
          </span>
        );
      case "SUSPENDED":
        return (
          <span className="text-error bg-error/10 px-2 py-0.5 rounded text-xs font-semibold border border-error/20">
            Bị đình chỉ
          </span>
        );
      case "CLOSED":
        return (
          <span className="text-textLight bg-textLight/10 px-2 py-0.5 rounded text-xs font-semibold border border-border">
            Đã đóng
          </span>
        );
      case "DELETED":
        return (
          <span className="text-stone-600 bg-stone-100 px-2 py-0.5 rounded text-xs font-semibold border border-stone-300">
            Đã xóa
          </span>
        );
      default:
        return (
          <span className="text-textLight bg-background px-2 py-0.5 rounded text-xs font-semibold">
            {status || "Chưa có"}
          </span>
        );
    }
  };

  const getPostTitle = (post) => {
    if (post.productName) return post.productName;
    if (post.description) return post.description.substring(0, 50) + "...";
    return "Bài đăng chưa cập nhật tên";
  };

  return (
    <div className="flex h-[calc(100vh-72px)] min-h-0 bg-white animate-fade-in overflow-hidden">
      {/* CỘT TRÁI (CÓ RESIZE & SEARCH ID) */}
      <div
        style={{ width: `${sidebarWidth}px` }}
        className="min-h-0 border-r border-border flex flex-col bg-white shrink-0 relative select-none"
      >
        <div className="p-4 flex justify-between items-center border-b border-border">
          <h2 className="text-lg font-bold text-text flex items-center gap-2">
            Quản lý Bài đăng
            {!isLoadingList && (
              <span className="bg-warning/10 text-warning text-xs py-0.5 px-2 rounded-full font-bold">
                {pagination.totalCount}
              </span>
            )}
          </h2>
        </div>

        <div className="p-4 pb-3 border-b border-border bg-background/60">
          <div
            role="tablist"
            aria-label="Nguồn danh sách bài đăng"
            className="grid grid-cols-2 gap-1.5 rounded-lg border border-border bg-white p-1"
          >
            {LIST_SOURCES.map((source) => {
              const active = listSource === source.key;
              return (
                <button
                  key={source.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchListSource(source.key)}
                  className={`rounded-md px-2 py-1.5 text-[11px] font-black transition ${
                    active
                      ? "bg-primary text-white"
                      : "text-textLight hover:bg-background hover:text-text"
                  }`}
                >
                  {source.label}
                </button>
              );
            })}
          </div>

          {isReportedSource && (
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-semibold text-text">
              <input
                type="checkbox"
                checked={reportedOpenOnly}
                onChange={toggleReportedOpenOnly}
                className="h-4 w-4 accent-primary"
              />
              Chỉ hiện bài còn báo cáo chưa giải quyết
            </label>
          )}

          <div className="relative mt-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (isReportedSource) setPageNumber(1);
              }}
              placeholder={
                isReportedSource
                  ? "Tìm theo tên sản phẩm hoặc chủ bài đăng..."
                  : "Tìm trong trang hiện tại..."
              }
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none transition-shadow"
            />
            <SearchOutlined className="absolute left-3 top-2.5 text-textLight" />
          </div>

          <div className="mt-3">
            <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-textLight">
              Trạng thái
            </span>

            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {[
                {
                  value: "",
                  label: "Tất cả",
                },
                {
                  value: "ACTIVE",
                  label: "Hoạt động",
                },
                {
                  value: "CLOSED",
                  label: "Đã đóng",
                },
                {
                  value: "SUSPENDED",
                  label: "Đình chỉ",
                },
              ].map((option) => (
                <button
                  key={option.value || "all"}
                  type="button"
                  onClick={() =>
                    setStatusFilter(option.value)
                  }
                  className={[
                    "rounded-lg border px-2 py-1.5 text-[11px] font-bold transition",
                    statusFilter === option.value
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-white text-textLight hover:border-primary/40 hover:text-primary",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {!isReportedSource && (
          <div className="mt-2 flex items-center gap-2">
            <span className="shrink-0 text-xs font-semibold text-textLight">
              Sắp xếp
            </span>

            <ListSortDropdown
              value={sortOption}
              onChange={setSortOption}
              className="min-w-0 flex-1"
              scopeLabel="bài đăng trong trang hiện tại"
              options={[
                { key: "newest", label: "Mới nhất" },
                { key: "oldest", label: "Cũ nhất" },
                { key: "name-asc", label: "Tên A → Z" },
                { key: "name-desc", label: "Tên Z → A" },
              ]}
            />

            <ListMonthDropdown
              items={filteredPosts}
              value={monthFilter}
              onChange={setMonthFilter}
              getValue={(post) => post?.createdAt}
              compact
              scopeLabel="bài đăng trong trang hiện tại"
            />
          </div>
          )}

          <p className="mt-3 text-xs leading-5 text-textLight">
            {isReportedSource
              ? "Từ khóa được tìm trên toàn bộ bài bị báo cáo; lọc trạng thái áp dụng cho trang đang tải."
              : "Tìm kiếm, trạng thái, tháng và sắp xếp hiện áp dụng cho trang đang tải."}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background/60">
          {isLoadingList ? (
            <div className="flex flex-col items-center justify-center h-full text-textLight">
              <LoadingOutlined className="text-3xl mb-2 text-primary" />
              <p className="text-sm">Đang tải danh sách...</p>
            </div>
          ) : isReportedSource ? (
            reportedError ? (
              <div className="p-6 text-center text-sm text-error">
                <p>{reportedError}</p>
                <Button
                  size="small"
                  className="mt-3"
                  onClick={() => setRequestVersion((version) => version + 1)}
                >
                  Thử lại
                </Button>
              </div>
            ) : reportedStatusFiltered.length === 0 ? (
              <div className="p-8 text-center text-textLight text-sm">
                {reportedOpenOnly
                  ? "Không có bài đăng nào còn báo cáo chưa giải quyết."
                  : "Không tìm thấy bài đăng bị báo cáo nào."}
              </div>
            ) : (
              reportedStatusFiltered.map((item) => {
                const isSelected =
                  selectedPost &&
                  (selectedPost.postId === item.postId ||
                    selectedPost.id === item.postId);
                return (
                  <div
                    key={item.postId}
                    onClick={() => handleSelectPost(item.postId, item)}
                    className={`p-4 border-b border-border cursor-pointer transition-all ${isSelected ? "bg-primary/10 border-l-4 border-l-primary" : "hover:bg-primary/5 border-l-4 border-l-transparent"}`}
                  >
                    <h3
                      className={`font-semibold text-sm line-clamp-2 ${isSelected ? "text-primary" : "text-text"}`}
                    >
                      {item.productName || "Bài đăng chưa cập nhật tên"}
                    </h3>
                    <p className="mt-1 text-xs text-textLight">
                      Chủ bài đăng:{" "}
                      <span className="font-semibold text-text">{item.ownerName || "—"}</span>
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-textLight">
                      {renderStatus(item.status)}
                      <span className="rounded bg-error/10 px-2 py-0.5 font-bold text-error">
                        {item.reportCount} báo cáo · {item.reporterCount} người
                      </span>
                    </div>
                    {Array.isArray(item.reasons) && item.reasons.length > 0 && (
                      <p className="mt-1.5 line-clamp-2 text-[11px] leading-4 text-textLight">
                        {item.reasons
                          .map((reason) => `${reasonLabel(reason)} (${reason.count})`)
                          .join(" · ")}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-textLight">
                      Báo cáo gần nhất: {formatReportedAt(item.latestReportedAt)}
                    </p>
                  </div>
                );
              })
            )
          ) : sortedPosts.length === 0 ? (
            <div className="p-8 text-center text-textLight text-sm">
              Không tìm thấy bài đăng nào.
            </div>
          ) : (
            sortedPosts.map((post) => {
              const currentId = post.postId || post.id;
              const isSelected =
                selectedPost &&
                (selectedPost.postId === currentId ||
                  selectedPost.id === currentId);
              return (
                <div
                  key={currentId}
                  onClick={() => handleSelectPost(currentId)}
                  className={`p-4 border-b border-border cursor-pointer transition-all ${isSelected ? "bg-primary/10 border-l-4 border-l-primary" : "hover:bg-primary/5 border-l-4 border-l-transparent"}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3
                      className={`font-semibold text-sm line-clamp-2 ${isSelected ? "text-primary" : "text-text"}`}
                    >
                      {post.postType === "Buy" ? (
                        <span className="text-error mr-1">[Thu mua]</span>
                      ) : (
                        <span className="text-success mr-1">[Bán]</span>
                      )}
                      {getPostTitle(post)}
                    </h3>
                  </div>
                  <div className="flex justify-between items-center text-xs text-textLight mt-1.5">
                    {renderStatus(post.status)}
                    <span>
                      {post.createdAt
                        ? new Date(post.createdAt).toLocaleDateString("vi-VN")
                        : ""}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border bg-white px-4 py-3 text-xs text-textLight">
          <span>
            Trang {pagination.pageNumber} / {Math.max(pagination.totalPages, 1)}
          </span>
          <div className="flex gap-2">
            <Button
              size="small"
              disabled={isLoadingList || !pagination.hasPreviousPage}
              onClick={() => setPageNumber((page) => Math.max(1, page - 1))}
            >
              Trước
            </Button>
            <Button
              size="small"
              disabled={isLoadingList || !pagination.hasNextPage}
              onClick={() => setPageNumber((page) => page + 1)}
            >
              Sau
            </Button>
          </div>
        </div>

        {/* Thanh kéo chuột resize */}
        <div
          onMouseDown={startResizing}
          className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize transition-colors z-20 hover:bg-success ${isResizing ? "bg-success" : "bg-transparent"}`}
          title="Kéo để thay đổi kích thước"
        />
      </div>

      {/* CỘT PHẢI */}
      <div className="min-h-0 min-w-0 flex-1 flex flex-col bg-white overflow-hidden border-l border-border">
        {!selectedPost && !isLoadingDetail ? (
          <div className="flex-1 flex flex-col items-center justify-center text-textLight bg-background p-8 text-center">
            {globalFeedback && (
              <Alert
                message={globalFeedback.text}
                type={globalFeedback.type}
                showIcon
                className="mb-6 w-full max-w-md"
              />
            )}
            <div className="w-full max-w-md rounded-2xl border border-border bg-white p-7 text-center shadow-[0_12px_32px_rgba(24,63,65,0.06)]">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileTextOutlined className="text-2xl" />
              </span>

              <h2 className="mt-4 text-lg font-black text-text">
                Chi tiết bài đăng
              </h2>

              <p className="mt-2 text-sm leading-6 text-textLight">
                Chọn một bài đăng bên trái để xem thông tin,
                hình ảnh và thao tác kiểm duyệt.
              </p>
            </div>
          </div>
        ) : isLoadingDetail ? (
          <div className="flex-1 flex flex-col items-center justify-center text-textLight bg-background">
            <LoadingOutlined className="text-5xl text-primary mb-4" />
            <p className="text-lg">Đang truy xuất dữ liệu chi tiết...</p>
          </div>
        ) : detailError ? (
          <div className="flex-1 flex flex-col items-center justify-center text-error bg-background">
            <WarningOutlined className="text-5xl mb-3" />
            <span className="text-lg font-medium">{detailError}</span>
          </div>
        ) : selectedPost ? (
          <>
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between gap-4 border-b border-border bg-white px-5 py-4 shadow-sm z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold text-white ${selectedPost.postType === "Buy" ? "bg-error" : "bg-success"}`}
                  >
                    {selectedPost.postType === "Buy" ? "THU MUA" : "ĐĂNG BÁN"}
                  </span>
                  <h1 className="text-2xl font-bold text-text">
                    {getPostTitle(selectedPost)}
                  </h1>
                </div>
                <p className="text-sm text-textLight flex items-center gap-2 mt-1">
                  <FileTextOutlined /> Mã bài đăng:{" "}
                  <strong className="text-text">
                    {selectedPost.postId || selectedPost.id || "Chưa có"}
                  </strong>
                </p>
              </div>
              <div>{renderStatus(selectedPost.status)}</div>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background/60 p-4 xl:p-5">
              <div className="mx-auto w-full max-w-[1500px] space-y-4">
                {selectedReport &&
                  (selectedReport.postId === selectedPost.postId ||
                    selectedReport.postId === selectedPost.id) && (
                    <section className="rounded-2xl border border-error/20 bg-error/5 p-5">
                      <h3 className="mb-3 flex items-center gap-2 border-b border-error/10 pb-3 text-sm font-black text-error">
                        <WarningOutlined /> Báo cáo từ người dùng
                      </h3>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                        <div>
                          <span className="block text-textLight mb-1">Số báo cáo</span>
                          <span className="font-bold text-text">{selectedReport.reportCount}</span>
                        </div>
                        <div>
                          <span className="block text-textLight mb-1">Số người báo cáo</span>
                          <span className="font-bold text-text">{selectedReport.reporterCount}</span>
                        </div>
                        <div>
                          <span className="block text-textLight mb-1">Báo cáo gần nhất</span>
                          <span className="font-medium text-text">
                            {formatReportedAt(selectedReport.latestReportedAt)}
                          </span>
                        </div>
                      </div>
                      {Array.isArray(selectedReport.reasons) && selectedReport.reasons.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {selectedReport.reasons.map((reason, index) => (
                            <span
                              key={`${reason.categoryId ?? "unspecified"}-${index}`}
                              className="rounded-full border border-error/20 bg-white px-2.5 py-1 text-xs font-semibold text-text"
                            >
                              {reasonLabel(reason)} · {reason.count}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="mt-3 text-xs leading-5 text-textLight">
                        Số liệu tính trên các báo cáo{" "}
                        {reportedOpenOnly ? "chưa giải quyết" : "đã ghi nhận"} tại thời điểm tải danh sách.
                      </p>
                    </section>
                  )}

                {/* Thông tin cơ bản */}
                <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)]">
                  <h3 className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-sm font-black text-text">
                    <InfoCircleOutlined className="text-primary" /> Thông tin
                    cơ bản
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    <div>
                      <span className="block text-textLight mb-1">Giá trị</span>
                      <span className="font-bold text-lg text-primary">
                        {selectedPost.basePrice
                          ? selectedPost.basePrice.toLocaleString("vi-VN") +
                            " đ"
                          : "Thỏa thuận"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-textLight mb-1">
                        Ngày đăng
                      </span>
                      <span className="font-medium text-text">
                        {selectedPost.createdAt
                          ? new Date(selectedPost.createdAt).toLocaleString(
                              "vi-VN",
                            )
                          : "Chưa có"}
                      </span>
                    </div>
                    <div className="col-span-2 my-1 border-t border-dashed border-border"></div>
                    <div className="col-span-2">
                      <span className="block text-textLight mb-1">
                        Mô tả bài đăng
                      </span>
                      <p className="font-medium text-text whitespace-pre-wrap leading-relaxed">
                        {selectedPost.description || "Không có mô tả"}
                      </p>
                    </div>
                    {selectedPost.product?.detailDescription && (
                      <div className="col-span-2">
                        <span className="block text-textLight mb-1">
                          Mô tả chi tiết sản phẩm
                        </span>
                        <p className="font-medium text-text whitespace-pre-wrap leading-relaxed">
                          {selectedPost.product.detailDescription}
                        </p>
                      </div>
                    )}
                    {selectedPost.medias && selectedPost.medias.length > 0 && (
                      <div className="col-span-2 mt-2">
                        <span className="block text-textLight mb-2">
                          Hình ảnh đính kèm ({selectedPost.medias.length})
                        </span>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                          {selectedPost.medias.map((img, idx) => (
                            <EvidenceImage
                              key={idx}
                              src={img.url || img.mediaUrl || img}
                              alt="Ảnh bài đăng"
                              onOpen={(url) => window.open(url, "_blank")}
                              className="h-32 w-32"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Phân loại */}
                <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)]">
                  <h3 className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-sm font-black text-text">
                    <AppstoreOutlined className="text-primary" /> Phân loại &
                    Tình trạng
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    <div className="col-span-2 md:col-span-1">
                      <span className="block text-textLight mb-1">
                        Danh mục - Ngành hàng
                      </span>
                      <span className="font-medium text-text">
                        {selectedPost.categoryName || "Chưa có"}{" "}
                        {selectedPost.productTypeName
                          ? `> ${selectedPost.productTypeName}`
                          : ""}
                      </span>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <span className="block text-textLight mb-1">
                        Thương hiệu
                      </span>
                      <span className="font-medium text-text">
                        {selectedPost.brandName || "Chưa cập nhật"}
                      </span>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <span className="block text-textLight mb-1">
                        Tình trạng hoạt động
                      </span>
                      <span className="font-medium text-textLight bg-background px-2 py-0.5 rounded">
                        {getModeratorFunctionalityLabel(selectedPost.product?.functionalityStatus)}
                      </span>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <span className="block text-textLight mb-1">
                        Mức độ hư hỏng (Ngoại hình)
                      </span>
                      <span className="font-medium text-warning bg-warning/10 px-2 py-0.5 rounded">
                        {getModeratorDamageLabel(selectedPost.product?.damageLevel)}
                      </span>
                    </div>
                    <div className="col-span-2 my-1 border-t border-dashed border-border"></div>
                    <div className="col-span-2">
                      <span className="block text-textLight mb-1 flex items-center gap-1">
                        <EnvironmentOutlined /> Khu vực giao dịch
                      </span>
                      <span className="font-medium text-text">
                        {[
                          selectedPost.streetAddress,
                          selectedPost.ward,
                          selectedPost.city,
                        ]
                          .filter(Boolean)
                          .join(", ") || "Chưa cập nhật địa chỉ"}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Thuộc tính */}
                {selectedPost.product?.attributeValues &&
                  selectedPost.product.attributeValues.length > 0 && (
                    <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)]">
                      <h3 className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-sm font-black text-text">
                        <AppstoreOutlined className="text-primary" /> Thông số
                        kỹ thuật
                      </h3>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                        {selectedPost.product.attributeValues.map(
                          (attr, idx) => {
                            // Lọc bỏ chữ "string" hoặc null/undefined/rỗng
                            const rawUnit = attr.unit;
                            const isValidUnit =
                              rawUnit && rawUnit.toLowerCase() !== "string";
                            const unitText = isValidUnit ? ` ${rawUnit}` : "";

                            return (
                              <div
                                key={idx}
                                className="bg-background p-3 rounded-lg border border-border"
                              >
                                <span className="block text-textLight mb-1 text-xs">
                                  {attr.attributeName}
                                </span>
                                <span className="font-semibold text-text">
                                  {attr.valueText ||
                                    attr.valueNumber ||
                                    attr.optionValue ||
                                    "Chưa có"}
                                  {unitText}
                                </span>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </section>
                  )}
              </div>
            </div>

            {/* INLINE ACTIONS FOOTER */}
            <div className="shrink-0 px-8 py-4 border-t border-border bg-white flex flex-col gap-3 z-10 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)]">
              {actionFeedback && (
                <Alert
                  message={actionFeedback.text}
                  type={actionFeedback.type}
                  showIcon
                />
              )}

              {actionState === "idle" && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="mr-1 text-[11px] font-black uppercase tracking-[0.1em] text-textLight">
                      Xử lý kiểm duyệt
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => {
                        setWarningMessage("");
                        setActionState("warning");
                      }}
                      className="flex items-center gap-2 font-semibold"
                    >
                      <WarningOutlined /> Cảnh báo chủ bài đăng
                    </Button>

                    {!["SUSPENDED", "DELETED"].includes(selectedPost.status?.toUpperCase()) && (
                      <Button
                        onClick={() => setActionState("suspending")}
                        danger
                        className="flex items-center gap-2 font-semibold"
                      >
                        <StopOutlined /> Đình chỉ bài đăng
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {actionState === "warning" && (
                <div className="bg-warning/10 p-4 rounded-lg border border-warning/20">
                  <p className="font-semibold text-warning mb-2 flex items-center gap-2">
                    <WarningOutlined /> Gửi cảnh báo tới chủ bài đăng
                  </p>
                  <p className="mb-3 text-sm text-textLight">
                    Nội dung cảnh báo sẽ được gửi tới chủ bài đăng. Bài đăng vẫn giữ nguyên trạng thái hiện tại.
                  </p>
                  <textarea
                    value={warningMessage}
                    onChange={(event) => setWarningMessage(event.target.value)}
                    maxLength={WARNING_MESSAGE_MAX_LENGTH}
                    rows={4}
                    disabled={isProcessing}
                    placeholder="Nhập nội dung cảnh báo (bắt buộc, tối đa 1000 ký tự)..."
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text outline-none transition focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-background"
                  />
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-xs text-textLight">
                      {trimmedWarningMessage.length}/{WARNING_MESSAGE_MAX_LENGTH} ký tự
                    </span>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setActionState("idle");
                          setWarningMessage("");
                        }}
                        disabled={isProcessing}
                      >
                        Hủy
                      </Button>
                      <Button
                        type="primary"
                        onClick={handleWarnOwner}
                        loading={isProcessing}
                        disabled={!warningMessageValid}
                      >
                        Gửi cảnh báo
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {actionState === "suspending" && (
                <div className="bg-error/10 p-4 rounded-lg border border-error/20">
                  <p className="font-semibold text-error mb-2 flex items-center gap-2">
                    <WarningOutlined /> Xác nhận đình chỉ bài đăng?
                  </p>
                  <p className="mb-3 text-sm text-textLight">
                    Bài đăng sẽ bị đình chỉ và không còn hiển thị công khai.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={() => setActionState("idle")}
                      disabled={isProcessing}
                    >
                      Hủy
                    </Button>
                    <Button
                      danger
                      type="primary"
                      onClick={handleSuspendPost}
                      loading={isProcessing}
                    >
                      Xác nhận đình chỉ
                    </Button>
                  </div>
                </div>
              )}

            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default PostModerationPage;
