import { DISPUTE_TARGET_TYPE } from "../../constants/disputes";
import ContentReportModal from "./ContentReportModal";

export default function OrderDisputeModal({
  open,
  orderId,
  productName,
  allowedCategories,
  onRefreshAllowedCategories,
  onClose,
  onCreated,
}) {
  return (
    <ContentReportModal
      open={open}
      targetType={DISPUTE_TARGET_TYPE.ORDER}
      targetId={orderId}
      targetLabel={productName || "Sản phẩm trong đơn hàng"}
      allowedCategories={allowedCategories}
      onRefreshAllowedCategories={onRefreshAllowedCategories}
      onClose={onClose}
      onSuccess={onCreated}
    />
  );
}
