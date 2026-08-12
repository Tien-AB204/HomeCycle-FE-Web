import React, { useState, useEffect } from "react";
import {
  Input,
  Button,
  Spin,
  Descriptions,
  Modal,
  message,
  Empty,
  Tag,
} from "antd";
import {
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";
import axiosClient from "../../services/apis/axiosClient"; // Import axiosClient trực tiếp

const VerificationPage = () => {
  const [activeTab, setActiveTab] = useState("business"); // "personal" hoặc "business"
  const [profiles, setProfiles] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  // State cho Chi tiết & Actions
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [profileDetail, setProfileDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // State cho Modal Từ chối
  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // =========================================================================
  // 1. CÁC HÀM GỌI API TRỰC TIẾP (INLINE APIs)
  // =========================================================================

  // API Lấy danh sách (Giả định endpoint list, bạn điều chỉnh lại nếu Backend có route khác)
  const fetchProfilesList = async () => {
    try {
      const endpoint =
        activeTab === "business"
          ? "/api/moderator/business-profiles"
          : "/api/moderator/personal-profiles";

      const res = await axiosClient.get(endpoint, {
        params: { status: "Pending" },
      });
      return res.data?.items || res.data || [];
    } catch (error) {
      console.error("Lỗi lấy danh sách hồ sơ:", error);
      return [];
    }
  };

  // API Lấy chi tiết hồ sơ
  const fetchProfileDetail = async (id) => {
    const endpoint =
      activeTab === "business"
        ? `/api/moderator/business-profiles/${id}`
        : `/api/moderator/personal-profiles/${id}`;
    const res = await axiosClient.get(endpoint);
    return res.data;
  };

  // API Duyệt / Từ chối (Review)
  const reviewProfile = async (payload) => {
    const endpoint =
      activeTab === "business"
        ? "/api/moderator/business-profiles/review"
        : "/api/moderator/personal-profiles/review";
    const res = await axiosClient.post(endpoint, payload);
    return res.data;
  };

  // =========================================================================
  // 2. EFFECTS & HANDLERS
  // =========================================================================

  // Tải danh sách khi đổi Tab
  useEffect(() => {
    const loadList = async () => {
      setLoadingList(true);
      const data = await fetchProfilesList();
      setProfiles(data);
      setLoadingList(false);
    };
    loadList();
    setSelectedProfileId(null); // Reset detail khi đổi tab
  }, [activeTab]);

  // Tải chi tiết khi click vào 1 item
  useEffect(() => {
    if (!selectedProfileId) {
      setProfileDetail(null);
      return;
    }
    const loadDetail = async () => {
      setLoadingDetail(true);
      try {
        const data = await fetchProfileDetail(selectedProfileId);
        setProfileDetail(data);
      } catch (error) {
        message.error("Không thể tải thông tin chi tiết hồ sơ!");
        setProfileDetail(null);
      } finally {
        setLoadingDetail(false);
      }
    };
    loadDetail();
  }, [selectedProfileId]);

  // Xử lý nút Duyệt
  const handleApprove = () => {
    Modal.confirm({
      title: "Xác nhận duyệt hồ sơ",
      content: "Bạn có chắc chắn hồ sơ này hợp lệ và muốn duyệt không?",
      okText: "Duyệt ngay",
      cancelText: "Hủy",
      okButtonProps: {
        style: { backgroundColor: "#0aa679", borderColor: "#0aa679" },
      },
      onOk: async () => {
        try {
          setSubmitting(true);
          await reviewProfile({
            businessProfileId: selectedProfileId, // Payload chuẩn theo Swagger
            isApproved: true,
            rejectReason: "Hợp lệ",
          });
          message.success("Đã duyệt hồ sơ thành công!");

          // Cập nhật lại UI (Xóa item khỏi list và clear detail)
          setProfiles((prev) => prev.filter((p) => p.id !== selectedProfileId));
          setSelectedProfileId(null);
        } catch (error) {
          message.error(
            "Lỗi khi duyệt: " +
              (error.response?.data?.message || error.message),
          );
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  // Xử lý nút Xác nhận Từ chối trong Modal
  const submitReject = async () => {
    if (!rejectReason.trim()) {
      message.warning(
        "Vui lòng nhập lý do từ chối để thông báo cho người dùng!",
      );
      return;
    }
    try {
      setSubmitting(true);
      await reviewProfile({
        businessProfileId: selectedProfileId,
        isApproved: false,
        rejectReason: rejectReason.trim(),
      });
      message.success("Đã từ chối hồ sơ!");

      setIsRejectModalVisible(false);
      setRejectReason("");

      // Cập nhật lại UI
      setProfiles((prev) => prev.filter((p) => p.id !== selectedProfileId));
      setSelectedProfileId(null);
    } catch (error) {
      message.error(
        "Lỗi khi từ chối: " + (error.response?.data?.message || error.message),
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================================
  // 3. RENDER UI
  // =========================================================================

  return (
    <div className="flex h-full bg-white text-gray-800 font-sans">
      {/* CỘT TRÁI: DANH SÁCH HỒ SƠ */}
      <div className="w-[350px] border-r border-gray-200 flex flex-col shrink-0 bg-gray-50/30">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              Hồ sơ chờ duyệt
              <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                {profiles.length}
              </span>
            </h2>
            <Button type="link" className="text-gray-500">
              Lịch sử
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-4">
            <button
              className={`flex-1 pb-2 font-medium text-sm transition-colors ${activeTab === "personal" ? "text-[#0aa679] border-b-2 border-[#0aa679]" : "text-gray-400 hover:text-gray-600"}`}
              onClick={() => setActiveTab("personal")}
            >
              Cá nhân
            </button>
            <button
              className={`flex-1 pb-2 font-medium text-sm transition-colors ${activeTab === "business" ? "text-[#0aa679] border-b-2 border-[#0aa679]" : "text-gray-400 hover:text-gray-600"}`}
              onClick={() => setActiveTab("business")}
            >
              Doanh nghiệp
            </button>
          </div>

          <Input
            prefix={<SearchOutlined className="text-gray-400" />}
            placeholder="Nhập từ khóa tìm kiếm..."
            className="rounded-lg"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex justify-center p-10">
              <Spin />
            </div>
          ) : profiles.length === 0 ? (
            <Empty description="Không có hồ sơ chờ duyệt" className="mt-10" />
          ) : (
            <div className="divide-y divide-gray-100">
              {profiles.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProfileId(p.id)}
                  className={`p-4 cursor-pointer transition-colors hover:bg-gray-100 ${selectedProfileId === p.id ? "bg-green-50/50 border-l-4 border-[#0aa679]" : "border-l-4 border-transparent"}`}
                >
                  <h3 className="font-semibold text-[15px]">
                    {p.companyName || p.name || "Chưa cập nhật tên"}
                  </h3>
                  <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
                    <span className="truncate max-w-[150px]">Mã: {p.id}</span>
                    {/* Giả định có field createdAt */}
                    <span>
                      {p.createdAt
                        ? new Date(p.createdAt).toLocaleDateString("vi-VN")
                        : "N/A"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CỘT PHẢI: CHI TIẾT HỒ SƠ */}
      <div className="flex-1 flex flex-col relative bg-white">
        {!selectedProfileId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <UserOutlined className="text-6xl mb-4 text-gray-300" />
            <p className="text-base">
              Chọn một hồ sơ bên danh sách để bắt đầu đối chiếu dữ liệu
            </p>
          </div>
        ) : loadingDetail ? (
          <div className="flex-1 flex items-center justify-center">
            <Spin size="large" />
          </div>
        ) : profileDetail ? (
          <>
            <div className="flex-1 overflow-y-auto p-8">
              <div className="mb-6 flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    {profileDetail.companyName ||
                      profileDetail.name ||
                      "Hồ sơ Doanh nghiệp"}
                  </h1>
                  <p className="text-gray-500 mt-1">ID: {profileDetail.id}</p>
                </div>
                <Tag
                  color="processing"
                  className="px-3 py-1 text-sm border-none"
                >
                  Đang chờ duyệt
                </Tag>
              </div>

              {/* Thông tin chi tiết - Đổ data động */}
              <Descriptions
                bordered
                column={1}
                labelStyle={{
                  width: "220px",
                  fontWeight: "600",
                  backgroundColor: "#f9fafb",
                }}
                contentStyle={{ backgroundColor: "#fff" }}
              >
                <Descriptions.Item label="Mã số thuế">
                  {profileDetail.taxCode || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Email liên hệ">
                  {profileDetail.email || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Số điện thoại">
                  {profileDetail.phone || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Địa chỉ">
                  {profileDetail.address || "N/A"}
                </Descriptions.Item>

                {/* Lặp để render các field khác một cách an toàn */}
                {Object.entries(profileDetail).map(([key, value]) => {
                  if (
                    [
                      "id",
                      "companyName",
                      "name",
                      "taxCode",
                      "email",
                      "phone",
                      "address",
                      "status",
                    ].includes(key)
                  )
                    return null;
                  if (typeof value === "object" || typeof value === "boolean")
                    return null; // Tránh lỗi render object
                  return (
                    <Descriptions.Item
                      key={key}
                      label={key}
                      className="capitalize"
                    >
                      {String(value)}
                    </Descriptions.Item>
                  );
                })}
              </Descriptions>
            </div>

            {/* Thanh Actions */}
            <div className="bg-white border-t border-gray-200 p-4 px-8 flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
              <Button
                danger
                size="large"
                icon={<CloseCircleOutlined />}
                onClick={() => setIsRejectModalVisible(true)}
                className="w-[140px] font-medium"
              >
                Từ chối
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={handleApprove}
                loading={submitting}
                className="w-[140px] bg-[#0aa679] hover:bg-[#088c66] border-none font-medium shadow-md"
              >
                Duyệt hồ sơ
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-red-500">
            Dữ liệu hồ sơ bị lỗi hoặc không tồn tại.
          </div>
        )}
      </div>

      {/* MODAL TỪ CHỐI */}
      <Modal
        title="Từ chối hồ sơ"
        open={isRejectModalVisible}
        onOk={submitReject}
        confirmLoading={submitting}
        onCancel={() => {
          setIsRejectModalVisible(false);
          setRejectReason("");
        }}
        okText="Xác nhận từ chối"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
      >
        <div className="mt-4 mb-2">
          <p className="mb-2 font-medium">Vui lòng cung cấp lý do từ chối:</p>
          <Input.TextArea
            rows={4}
            placeholder="Ví dụ: Giấy phép kinh doanh mờ, không khớp mã số thuế..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};

export default VerificationPage;
