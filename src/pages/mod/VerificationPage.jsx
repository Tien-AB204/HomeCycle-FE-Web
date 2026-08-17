import React, { useState, useEffect } from "react";
import { Input, Button, Spin, Descriptions, Empty, Tag, Alert } from "antd";
import {
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
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

  const startResizing = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = e.clientX - 250;
      if (newWidth >= 300 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);

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
  const [actionFeedback, setActionFeedback] = useState(null);
  const [globalSuccess, setGlobalSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchProfilesList = async () => {
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
    } catch (error) {
      return [];
    }
  };

  const fetchProfileDetail = async (id) => {
    const endpoint =
      activeTab === "business"
        ? `/moderator/business-profiles/${id}`
        : `/moderator/personal-profiles/${id}`;
    const res = await axiosClient.get(endpoint);
    const payload = res.data !== undefined ? res.data : res;
    return payload.data || payload;
  };

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
    const loadList = async () => {
      setLoadingList(true);
      const data = await fetchProfilesList();
      setProfiles(data);
      setLoadingList(false);
    };
    loadList();
    handleResetSelection();
  }, [activeTab]);

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
      setProfileDetail(null);
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
  }, [selectedProfileId]);

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
    email: "Email liên hệ",
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
        return status || "N/A";
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
    <div className="flex h-full bg-white text-gray-800 font-sans overflow-hidden">
      {/* CỘT TRÁI */}
      <div
        style={{ width: `${sidebarWidth}px` }}
        className="border-r border-gray-200 flex flex-col shrink-0 bg-gray-50/30 relative select-none"
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              Hồ sơ chờ duyệt
              {!loadingList && (
                <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-bold">
                  {filteredProfiles.length}
                </span>
              )}
            </h2>
          </div>
          <div className="flex border-b border-gray-200 mb-4">
            <button
              className={`flex-1 pb-2 font-medium text-sm transition-colors ${activeTab === "personal" ? "text-[#0aa679] border-b-2 border-[#0aa679]" : "text-gray-400 hover:text-gray-600"}`}
              onClick={() => {
                setActiveTab("personal");
                setSearchKeyword("");
              }}
            >
              Cá nhân
            </button>
            <button
              className={`flex-1 pb-2 font-medium text-sm transition-colors ${activeTab === "business" ? "text-[#0aa679] border-b-2 border-[#0aa679]" : "text-gray-400 hover:text-gray-600"}`}
              onClick={() => {
                setActiveTab("business");
                setSearchKeyword("");
              }}
            >
              Doanh nghiệp
            </button>
          </div>
          <Input
            prefix={<SearchOutlined className="text-gray-400" />}
            placeholder="Tìm theo tên, ID hoặc ngày..."
            className="rounded-lg"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex justify-center p-10">
              <Spin />
            </div>
          ) : filteredProfiles.length === 0 ? (
            <Empty description="Không có hồ sơ phù hợp" className="mt-10" />
          ) : (
            <div className="divide-y divide-gray-100">
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
                    className={`p-4 cursor-pointer transition-colors hover:bg-gray-100 ${selectedProfileId === currentId ? "bg-green-50/50 border-l-4 border-[#0aa679]" : "border-l-4 border-transparent"}`}
                  >
                    <h3 className="font-semibold text-[15px]">{currentName}</h3>
                    <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
                      <span className="truncate max-w-[150px]">
                        Mã: {currentId}
                      </span>
                      <span>
                        {p.createdAt
                          ? new Date(p.createdAt).toLocaleDateString("vi-VN")
                          : "N/A"}
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
          className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize transition-colors z-20 hover:bg-[#0aa679] ${isResizing ? "bg-[#0aa679]" : "bg-transparent"}`}
          title="Kéo để thay đổi kích thước"
        />
      </div>

      {/* CỘT PHẢI */}
      <div className="flex-1 flex flex-col relative bg-white overflow-y-auto">
        {!selectedProfileId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-slate-50">
            {globalSuccess && (
              <Alert
                message={globalSuccess}
                type="success"
                showIcon
                className="mb-6 w-full max-w-md shadow-sm"
              />
            )}
            <IdcardOutlined className="text-6xl mb-4 text-gray-300" />
            <p className="text-lg">
              Chọn một hồ sơ bên danh sách để bắt đầu đối chiếu dữ liệu
            </p>
          </div>
        ) : loadingDetail ? (
          <div className="flex-1 flex items-center justify-center bg-slate-50">
            <Spin size="large" />
          </div>
        ) : detailError ? (
          <div className="flex-1 flex flex-col items-center justify-center text-red-500 bg-slate-50">
            <CloseCircleOutlined className="text-5xl mb-3" />
            <span className="text-lg font-medium">{detailError}</span>
          </div>
        ) : profileDetail ? (
          <>
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
              <div className="mb-6 flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    {profileDetail.businessName ||
                      profileDetail.companyName ||
                      profileDetail.fullName ||
                      profileDetail.representativeName ||
                      profileDetail.name ||
                      "Hồ sơ"}
                  </h1>
                  <p className="text-gray-500 mt-1">
                    ID:{" "}
                    {profileDetail.businessProfileId ||
                      profileDetail.personalProfileId ||
                      profileDetail.id}
                  </p>
                </div>
                <Tag
                  color="processing"
                  className="px-3 py-1 text-sm border-none"
                >
                  Đang chờ duyệt
                </Tag>
              </div>

              {/* Thông tin Text */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <Descriptions
                  column={1}
                  labelStyle={{
                    width: "220px",
                    fontWeight: "600",
                    color: "#4b5563",
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
              <div className="mt-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4 border-b pb-2">
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
                            className="flex flex-col gap-1.5 p-2 border border-gray-100 rounded-lg bg-gray-50"
                          >
                            <span className="text-xs text-gray-600 font-bold uppercase tracking-wider">
                              {docLabel}
                            </span>
                            <img
                              src={doc.documentUrl}
                              alt={docLabel}
                              className="h-32 w-48 object-cover rounded shadow-sm border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
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
                              className="flex flex-col gap-1.5 p-2 border border-gray-100 rounded-lg bg-gray-50"
                            >
                              <span className="text-xs text-gray-600 font-bold uppercase tracking-wider">
                                {imgLabel}
                              </span>
                              <img
                                src={value}
                                alt={key}
                                className="h-32 w-48 object-cover rounded shadow-sm border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
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
                      <span className="text-gray-400 text-sm">
                        Người dùng không đính kèm hình ảnh nào.
                      </span>
                    )}
                </div>
              </div>
            </div>

            {/* INLINE ACTIONS FOOTER */}
            <div className="bg-white border-t border-gray-200 p-4 px-8 flex flex-col z-10 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)]">
              {actionFeedback && (
                <Alert
                  message={actionFeedback.text}
                  type={actionFeedback.type}
                  showIcon
                  className="mb-3"
                />
              )}

              {actionState === "idle" && (
                <div className="flex justify-end gap-3">
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
                    className="w-[140px] bg-[#0aa679] hover:bg-[#088c66] border-none font-medium shadow-md"
                  >
                    Duyệt hồ sơ
                  </Button>
                </div>
              )}

              {actionState === "approving" && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="font-semibold text-green-800 mb-3 flex items-center gap-2">
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
                      className="bg-[#0aa679] hover:bg-[#088c66] border-none shadow-sm"
                    >
                      Xác nhận duyệt
                    </Button>
                  </div>
                </div>
              )}

              {actionState === "rejecting" && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="font-semibold text-red-800 mb-2">
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
                      className="shadow-sm"
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
