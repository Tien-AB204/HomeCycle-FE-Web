import { useState, useEffect, useCallback, useRef } from "react";
import { Input, Button, Spin, Descriptions, Empty, Tag, Alert } from "antd";
import {
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import axiosClient from "../../services/apis/axiosClient";
import useDebounce from "../../hooks/useDebounce";

const VerificationPage = () => {
  const [activeTab, setActiveTab] = useState("business");
  const [profiles, setProfiles] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const debouncedKeyword = useDebounce(searchKeyword, 500);

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

  // Chi tiết
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [profileDetail, setProfileDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // Inline Actions & Feedback
  const [actionState, setActionState] = useState("idle");
  const [rejectReason, setRejectReason] = useState("");
  const [supplementRequestNote, setSupplementRequestNote] =
    useState("");
  const [actionFeedback, setActionFeedback] = useState(null);
  const [globalSuccess, setGlobalSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchProfilesList = useCallback(async () => {
    try {
      const endpoint =
        activeTab === "business"
          ? "/moderator/business-profiles/pending"
          : "/moderator/personal-profiles/pending";
      const res = await axiosClient.get(endpoint);
      const payload = res.data !== undefined ? res.data : res;
      return (
        payload.data || payload.items || (Array.isArray(payload) ? payload : [])
      );
    } catch {
      return [];
    }
  }, [activeTab]);

  const fetchProfileDetail = useCallback(async (id) => {
    const endpoint =
      activeTab === "business"
        ? `/moderator/business-profiles/${id}`
        : `/moderator/personal-profiles/${id}`;
    const res = await axiosClient.get(endpoint);
    const payload = res.data !== undefined ? res.data : res;
    return payload.data || payload;
  }, [activeTab]);

  const reviewProfileApi = async (id, isApproved, rejectReasonStr = "") => {
    if (activeTab === "business") {
      const payload = {
        businessProfileId: id,
        isApproved,
        rejectReason: rejectReasonStr,
      };
      const res = await axiosClient.post(
        "/moderator/business-profiles/review",
        payload,
      );
      return res.data;
    } else {
      const decision = isApproved ? "Verified" : "Unverified";
      const payload = { decision };
      if (decision === "Unverified") payload.rejectReason = rejectReasonStr;
      const res = await axiosClient.post(
        `/moderator/personal-profiles/${id}/review`,
        payload,
      );
      return res.data;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadList = async () => {
      setLoadingList(true);

      const data = await fetchProfilesList();

      if (cancelled) return;

      setProfiles(data);
      setSelectedProfileId(null);
      setProfileDetail(null);
      setActionState("idle");
      setRejectReason("");
      setActionFeedback(null);
      setLoadingList(false);
    };

    loadList();

    return () => {
      cancelled = true;
    };
  }, [fetchProfilesList]);

  const filteredProfiles = debouncedKeyword
    ? profiles.filter((p) => {
        const query = debouncedKeyword.toLowerCase();
        const name = (
          p.businessName ||
          p.companyName ||
          p.fullName ||
          p.representativeName ||
          p.name ||
          ""
        ).toLowerCase();
        const id = (
          p.businessProfileId ||
          p.personalProfileId ||
          p.id ||
          ""
        ).toLowerCase();
        const dateStr = p.createdAt
          ? new Date(p.createdAt).toLocaleDateString("vi-VN").toLowerCase()
          : "";

        return (
          name.includes(query) || id.includes(query) || dateStr.includes(query)
        );
      })
    : profiles;

  useEffect(() => {
    if (!selectedProfileId) {
      return;
    }
    const loadDetail = async () => {
      setLoadingDetail(true);
      setDetailError(null);
      setActionState("idle");
      setActionFeedback(null);
      setGlobalSuccess(null);

      try {
        const data = await fetchProfileDetail(selectedProfileId);
        setProfileDetail(data);
      } catch (error) {
        setProfileDetail(null);
        if (error.response?.status >= 500) {
          setDetailError("Lỗi máy chủ. Vui lòng thử lại sau.");
        } else {
          setDetailError("Dữ liệu hồ sơ bị lỗi hoặc không tồn tại.");
        }
      } finally {
        setLoadingDetail(false);
      }
    };
    loadDetail();
  }, [selectedProfileId, fetchProfileDetail]);

  const handleResetSelection = (successMsg = null) => {
    setSelectedProfileId(null);
    setProfileDetail(null);
    setActionState("idle");
    setRejectReason("");
    setActionFeedback(null);
    if (successMsg) setGlobalSuccess(successMsg);
  };

  const submitApprove = async () => {
    try {
      setSubmitting(true);
      setActionFeedback(null);
      await reviewProfileApi(selectedProfileId, true, "Hợp lệ");

      setProfiles((prev) =>
        prev.filter(
          (p) =>
            (p.businessProfileId || p.personalProfileId || p.id) !==
            selectedProfileId,
        ),
      );
      handleResetSelection("Đã duyệt hồ sơ thành công!");
    } catch (error) {
      const msg =
        error.response?.status >= 500
          ? "Lỗi máy chủ. V.L lòng thử lại sau."
          : error.response?.data?.message || "Có lỗi xảy ra khi duyệt.";
      setActionFeedback({ type: "error", text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const submitReject = async () => {
    if (!rejectReason.trim()) {
      setActionFeedback({
        type: "error",
        text: "Vui lòng nhập lý do từ chối để thông báo cho người dùng.",
      });
      return;
    }
    try {
      setSubmitting(true);
      setActionFeedback(null);
      await reviewProfileApi(selectedProfileId, false, rejectReason.trim());

      setProfiles((prev) =>
        prev.filter(
          (p) =>
            (p.businessProfileId || p.personalProfileId || p.id) !==
            selectedProfileId,
        ),
      );
      handleResetSelection("Đã từ chối hồ sơ thành công!");
    } catch (error) {
      const msg =
        error.response?.status >= 500
          ? "Lỗi máy chủ. Vui lòng thử lại sau."
          : error.response?.data?.message || "Có lỗi xảy ra khi từ chối.";
      setActionFeedback({ type: "error", text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  // --- BẢNG ÁNH XẠ NHÃN (LABEL MAPPING) TIẾNG VIỆT TOÀN DIỆN ---
  const fieldLabels = {
    userId: "Mã người dùng",
    representativeCode: "Số CCCD",
    representativeName: "Tên CCCD",
    representativeDob: "Ngày sinh người đại diện",
    representativeAddress: "Địa chỉ CCCD",
    taxCode: "Mã số thuế",
    companyName: "Tên công ty",
    businessName: "Tên doanh nghiệp",
    fullName: "Họ và tên đại diện",
    businessDescription: "Mô tả doanh nghiệp",
    businessAddress: "Địa chỉ doanh nghiệp",
    ward: "Phường / Xã",
    city: "Tỉnh / Thành phố",
    identityNumber: "Số CMND / CCCD",
    identityName: "Tên trên CCCD",
    identityDob: "Ngày sinh trên CCCD",
    identityAddress: "Địa chỉ trên CCCD",
    operatingScope: "Phạm vi hoạt động",
    businessModel: "Mô hình kinh doanh",
    bankCode: "Mã ngân hàng",
    bankName: "Tên ngân hàng",
    accountNumber: "Số tài khoản",
    accountName: "Chủ tài khoản",
    email: "Thư điện tử liên hệ",
    phone: "Số điện thoại",
    address: "Địa chỉ liên hệ",
    verificationStatus: "Trạng thái xác thực",
    status: "Trạng thái",
    verificationRejectReason: "Lý do từ chối trước đó",
    rejectReason: "Lý do từ chối",
    verifiedBy: "Người duyệt",
    verifiedAt: "Thời gian duyệt",
    createdAt: "Ngày tạo hồ sơ",
  };

  const formatStatusText = (status) => {
    switch (status?.toString().toLowerCase()) {
      case "pending":
        return "Đang chờ duyệt";
      case "verified":
        return "Đã xác thực";
      case "unverified":
        return "Chưa xác thực";
      case "rejected":
        return "Đã từ chối";
      case "householdbusiness":
        return "Hộ kinh doanh";
      case "enterprise":
        return "Doanh nghiệp";
      default:
        return "Chưa xác định";
    }
  };

  // Key ảnh của Cá nhân
  const personalImageKeys = [
    "frontIdCardImage",
    "FrontIDCardImage",
    "FRONTIDCARDIMAGE",
    "backIdCardImage",
    "BackIDCardImage",
    "BACKIDCARDIMAGE",
    "businessLicenseImage",
    "BusinessLicenseImage",
    "avatar",
    "Avatar",
    "logo",
    "Logo",
  ];

  return (
    <div className="flex h-[calc(100vh-72px)] min-h-0 bg-white text-text font-sans overflow-hidden">
      {/* CỘT TRÁI */}
      <div
        style={{ width: `${sidebarWidth}px` }}
        className="min-h-0 border-r border-border flex flex-col shrink-0 bg-background/60 relative select-none"
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              Hồ sơ chờ duyệt
              {!loadingList && (
                <span className="bg-warning/10 text-warning text-xs px-2 py-0.5 rounded-full font-bold">
                  {filteredProfiles.length}
                </span>
              )}
            </h2>
          </div>
          <div className="flex border-b border-border mb-4">
            <button
              className={`flex-1 pb-2 font-medium text-sm transition-colors ${activeTab === "personal" ? "text-success border-b-2 border-success" : "text-textLight hover:text-text"}`}
              onClick={() => {
                setActiveTab("personal");
                setSearchKeyword("");
              }}
            >
              Cá nhân
            </button>
            <button
              className={`flex-1 pb-2 font-medium text-sm transition-colors ${activeTab === "business" ? "text-success border-b-2 border-success" : "text-textLight hover:text-text"}`}
              onClick={() => {
                setActiveTab("business");
                setSearchKeyword("");
              }}
            >
              Doanh nghiệp
            </button>
          </div>
          <Input
            prefix={<SearchOutlined className="text-textLight" />}
            placeholder="Tìm theo tên, mã hoặc ngày..."
            className="rounded-lg border-border"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {loadingList ? (
            <div className="flex justify-center p-10">
              <Spin />
            </div>
          ) : filteredProfiles.length === 0 ? (
            <Empty description="Không có hồ sơ phù hợp" className="mt-10" />
          ) : (
            <div className="divide-y divide-border">
              {filteredProfiles.map((p) => {
                const currentId =
                  p.businessProfileId || p.personalProfileId || p.id;
                const currentName =
                  p.businessName ||
                  p.companyName ||
                  p.fullName ||
                  p.representativeName ||
                  p.name ||
                  "Chưa cập nhật tên";
                return (
                  <div
                    key={currentId}
                    onClick={() => setSelectedProfileId(currentId)}
                    className={`p-4 cursor-pointer transition-colors hover:bg-background ${selectedProfileId === currentId ? "bg-success/10 border-l-4 border-success" : "border-l-4 border-transparent"}`}
                  >
                    <h3 className="font-semibold text-[15px] text-text">{currentName}</h3>
                    <div className="flex justify-between items-center mt-1 text-xs text-textLight">
                      <span className="truncate max-w-[150px]">
                        Mã: {currentId}
                      </span>
                      <span>
                        {p.createdAt
                          ? new Date(p.createdAt).toLocaleDateString("vi-VN")
                          : "Chưa có"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          onMouseDown={startResizing}
          className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize transition-colors z-20 hover:bg-success ${isResizing ? "bg-success" : "bg-transparent"}`}
          title="Kéo để thay đổi kích thước"
        />
      </div>

      {/* CỘT PHẢI */}
      <div className="min-h-0 min-w-0 flex-1 flex flex-col relative bg-white overflow-hidden">
        {!selectedProfileId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-textLight p-8 text-center bg-background">
            {globalSuccess && (
              <Alert
                message={globalSuccess}
                type="success"
                showIcon
                className="mb-6 w-full max-w-md shadow-sm"
              />
            )}
            <IdcardOutlined className="text-6xl mb-4 text-border" />
            <p className="text-lg">
              Chọn một hồ sơ bên danh sách để bắt đầu đối chiếu dữ liệu
            </p>
          </div>
        ) : loadingDetail ? (
          <div className="flex-1 flex items-center justify-center bg-background">
            <Spin size="large" />
          </div>
        ) : detailError ? (
          <div className="flex-1 flex flex-col items-center justify-center text-error bg-background">
            <CloseCircleOutlined className="text-5xl mb-3" />
            <span className="text-lg font-medium">{detailError}</span>
          </div>
        ) : profileDetail ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background/60 p-5">
              <div className="mb-4 flex items-start justify-between gap-4 rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)]">
                <div>
                  <h1 className="text-2xl font-bold text-text">
                    {profileDetail.businessName ||
                      profileDetail.companyName ||
                      profileDetail.fullName ||
                      profileDetail.representativeName ||
                      profileDetail.name ||
                      "Hồ sơ"}
                  </h1>
                  <p className="text-textLight mt-1">
                    ID:{" "}
                    {profileDetail.businessProfileId ||
                      profileDetail.personalProfileId ||
                      profileDetail.id}
                  </p>
                </div>
                <Tag className="bg-warning/10 text-warning px-3 py-1 text-sm border-none">
                  Đang chờ duyệt
                </Tag>
              </div>

              {/* Thông tin Text */}
              <div className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)]">
                <Descriptions
                  column={1}
                  labelStyle={{
                    width: "220px",
                    fontWeight: "600",
                    color: "var(--color-text-light)",
                  }}
                >
                  {Object.entries(profileDetail).map(([key, value]) => {
                    if (
                      [
                        "id",
                        "businessProfileId",
                        "personalProfileId",
                        "businessName",
                        "companyName",
                        "fullName",
                        "representativeName",
                        "name",
                        "status",
                        "documents",
                        "serviceAreas",
                      ].includes(key)
                    )
                      return null;
                    if (
                      personalImageKeys.some(
                        (imgKey) => imgKey.toLowerCase() === key.toLowerCase(),
                      )
                    )
                      return null;
                    if (
                      typeof value === "object" ||
                      typeof value === "boolean" ||
                      value === null ||
                      value === "" ||
                      value === "0001-01-01"
                    )
                      return null;

                    const labelText = fieldLabels[key] || key;
                    let displayValue = String(value);

                    const lowerKey = key.toLowerCase();
                    if (
                      lowerKey.includes("dob") ||
                      lowerKey.includes("birth")
                    ) {
                      const d = new Date(value);
                      if (!isNaN(d.getTime()) && value !== "0001-01-01") {
                        displayValue = d.toLocaleDateString("vi-VN");
                      } else {
                        displayValue = "Chưa cập nhật";
                      }
                    } else if (
                      lowerKey.includes("date") ||
                      lowerKey.includes("at")
                    ) {
                      const d = new Date(value);
                      if (!isNaN(d.getTime())) {
                        displayValue = d.toLocaleString("vi-VN");
                      }
                    } else if (
                      lowerKey.includes("status") ||
                      lowerKey.includes("model")
                    ) {
                      displayValue = formatStatusText(value);
                    }

                    return (
                      <Descriptions.Item key={key} label={labelText}>
                        {displayValue}
                      </Descriptions.Item>
                    );
                  })}
                </Descriptions>
              </div>

              {/* Thông tin Hình ảnh (Hỗ trợ cả trường riêng lẻ và mảng documents của Doanh nghiệp) */}
              <div className="mt-4 rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)]">
                <h3 className="font-semibold text-text mb-4 border-b pb-2">
                  Hình ảnh đính kèm (CCCD / Giấy phép)
                </h3>
                <div className="flex gap-4 flex-wrap">
                  {/* Trường hợp 1: Doanh nghiệp dùng mảng documents */}
                  {Array.isArray(profileDetail.documents) &&
                  profileDetail.documents.length > 0
                    ? profileDetail.documents.map((doc) => {
                        let docLabel = `Tài liệu (${doc.documentType})`;
                        if (doc.documentType === 0) docLabel = "Mặt trước CCCD";
                        else if (doc.documentType === 1)
                          docLabel = "Mặt sau CCCD";
                        else if (doc.documentType === 2)
                          docLabel = "Giấy phép kinh doanh";
                        else if (doc.documentType === 3)
                          docLabel = "Giấy ủy quyền";

                        return (
                          <div
                            key={doc.businessDocumentId}
                            className="flex flex-col gap-1.5 p-2 border border-border rounded-lg bg-background"
                          >
                            <span className="text-xs text-textLight font-bold uppercase tracking-wider">
                              {docLabel}
                            </span>
                            <img
                              src={doc.documentUrl}
                              alt={docLabel}
                              className="h-32 w-48 object-cover rounded shadow-sm border border-border cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() =>
                                window.open(doc.documentUrl, "_blank")
                              }
                            />
                          </div>
                        );
                      })
                    : /* Trường hợp 2: Cá nhân dùng các key ảnh riêng lẻ */
                      Object.entries(profileDetail).map(([key, value]) => {
                        if (
                          personalImageKeys.some(
                            (imgKey) =>
                              imgKey.toLowerCase() === key.toLowerCase(),
                          ) &&
                          value
                        ) {
                          let imgLabel = key;
                          if (key.toLowerCase().includes("front"))
                            imgLabel = "Mặt trước CCCD";
                          else if (key.toLowerCase().includes("back"))
                            imgLabel = "Mặt sau CCCD";
                          else if (key.toLowerCase().includes("license"))
                            imgLabel = "Giấy phép kinh doanh";

                          return (
                            <div
                              key={key}
                              className="flex flex-col gap-1.5 p-2 border border-border rounded-lg bg-background"
                            >
                              <span className="text-xs text-textLight font-bold uppercase tracking-wider">
                                {imgLabel}
                              </span>
                              <img
                                src={value}
                                alt={key}
                                className="h-32 w-48 object-cover rounded shadow-sm border border-border cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(value, "_blank")}
                              />
                            </div>
                          );
                        }
                        return null;
                      })}

                  {/* Nếu không có ảnh nào */}
                  {(!profileDetail.documents ||
                    profileDetail.documents.length === 0) &&
                    !Object.keys(profileDetail).some(
                      (k) =>
                        personalImageKeys.some(
                          (imgKey) => imgKey.toLowerCase() === k.toLowerCase(),
                        ) && profileDetail[k],
                    ) && (
                      <span className="text-textLight text-sm">
                        Người dùng không đính kèm hình ảnh nào.
                      </span>
                    )}
                </div>
              </div>
            </div>

            <section className="mx-5 mb-4 rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)]">
              <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-[20px] text-primary"
                    aria-hidden="true"
                  >
                    history
                  </span>

                  <div>
                    <h3 className="text-sm font-black text-text">
                      Lịch sử xác thực
                    </h3>

                    <p className="mt-0.5 text-xs text-textLight">
                      Theo dõi các lần thay đổi và kết quả xử lý hồ sơ.
                    </p>
                  </div>
                </div>

                <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-textLight">
                  Lịch sử
                </span>
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-xl border border-dashed border-border bg-background/50 p-4">
                <span
                  className="material-symbols-outlined text-[21px] text-textLight"
                  aria-hidden="true"
                >
                  schedule
                </span>

                <div>
                  <p className="text-sm font-bold text-text">
                    Chưa có lịch sử xác thực để hiển thị
                  </p>

                  <p className="mt-1 text-xs leading-5 text-textLight">
                    Các lần thay đổi trạng thái và kết quả xử lý sẽ
                    xuất hiện tại đây khi có dữ liệu.
                  </p>
                </div>
              </div>
            </section>

            {/* INLINE ACTIONS FOOTER */}
            <div className="shrink-0 bg-white border-t border-border p-4 px-8 flex flex-col z-10 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)]">
              {actionFeedback && (
                <Alert
                  message={actionFeedback.text}
                  type={actionFeedback.type}
                  showIcon
                  className="mb-3"
                />
              )}

              {actionState === "idle" && (
                <div className="flex flex-wrap justify-end gap-3">
                  <Button
                    size="large"
                    onClick={() => {
                      setSupplementRequestNote("");
                      setActionState("requesting-supplement");
                    }}
                    className="font-medium text-warning border-warning/40"
                  >
                    <span
                      className="material-symbols-outlined mr-1 text-[18px]"
                      aria-hidden="true"
                    >
                      note_add
                    </span>
                    Yêu cầu bổ sung
                  </Button>

                  <Button
                    danger
                    size="large"
                    icon={<CloseCircleOutlined />}
                    onClick={() => setActionState("rejecting")}
                    className="w-[140px] font-medium"
                  >
                    Từ chối
                  </Button>

                  <Button
                    type="primary"
                    size="large"
                    icon={<CheckCircleOutlined />}
                    onClick={() => setActionState("approving")}
                    className="w-[140px] bg-success hover:bg-success/90 border-none font-medium shadow-md"
                  >
                    Duyệt hồ sơ
                  </Button>
                </div>
              )}

              {actionState === "requesting-supplement" && (
                <div className="rounded-xl border border-warning/20 bg-warning/10 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 font-semibold text-warning">
                        <span
                          className="material-symbols-outlined text-[20px]"
                          aria-hidden="true"
                        >
                          note_add
                        </span>
                        Yêu cầu bổ sung giấy tờ
                      </p>

                      <p className="mt-1 text-xs text-textLight">
                        Ghi rõ giấy tờ hoặc thông tin người dùng cần bổ sung.
                      </p>
                    </div>

                    <span className="rounded-full border border-warning/20 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-warning">
                      Đang hoàn thiện
                    </span>
                  </div>

                  <Input.TextArea
                    rows={3}
                    value={supplementRequestNote}
                    onChange={(event) =>
                      setSupplementRequestNote(event.target.value)
                    }
                    placeholder="Ví dụ: Vui lòng bổ sung ảnh giấy phép rõ nét hơn..."
                    className="mt-3"
                  />

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-textLight">
                      Nội dung hiện chưa được gửi đi.
                    </p>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setSupplementRequestNote("");
                          setActionState("idle");
                        }}
                      >
                        Hủy
                      </Button>

                      <Button
                        type="primary"
                        disabled
                      >
                        Gửi yêu cầu
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {actionState === "approving" && (
                <div className="bg-success/10 p-4 rounded-lg border border-success/20">
                  <p className="font-semibold text-success mb-3 flex items-center gap-2">
                    <CheckCircleOutlined /> Xác nhận duyệt hồ sơ này?
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={() => setActionState("idle")}
                      disabled={submitting}
                    >
                      Hủy
                    </Button>
                    <Button
                      type="primary"
                      onClick={submitApprove}
                      loading={submitting}
                      className="bg-success hover:bg-success/90 border-none shadow-sm"
                    >
                      Xác nhận duyệt
                    </Button>
                  </div>
                </div>
              )}

              {actionState === "rejecting" && (
                <div className="bg-error/10 p-4 rounded-lg border border-error/20">
                  <p className="font-semibold text-error mb-2">
                    Lý do từ chối:
                  </p>
                  <Input.TextArea
                    rows={3}
                    placeholder="Nhập lý do từ chối hồ sơ..."
                    value={rejectReason}
                    onChange={(e) => {
                      setRejectReason(e.target.value);
                      if (actionFeedback) setActionFeedback(null);
                    }}
                    className="mb-3"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={() => {
                        setActionState("idle");
                        setRejectReason("");
                      }}
                      disabled={submitting}
                    >
                      Hủy
                    </Button>
                    <Button
                      danger
                      type="primary"
                      onClick={submitReject}
                      loading={submitting}
                      className="bg-error hover:bg-error/90 border-none shadow-sm"
                    >
                      Xác nhận từ chối
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

export default VerificationPage;
