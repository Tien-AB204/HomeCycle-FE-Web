import { DISPUTE_TARGET_TYPE } from "../../constants/disputes";
import ContentReportModal from "./ContentReportModal";

export default function OrderDisputeModal({
  open,
  orderId,
  productName,
  onClose,
  onCreated,
}) {
  return (
    <ContentReportModal
      open={open}
      targetType={DISPUTE_TARGET_TYPE.ORDER}
      targetId={orderId}
      targetLabel={productName || "Sản phẩm trong đơn hàng"}
      onClose={onClose}
      onSuccess={onCreated}
    />
  );
}
