export const HIGH_VALUE_THRESHOLD_VND = 3_000_000;

export const getContractTotal = (unitPrice, quantity) => {
  const price = Number(unitPrice);
  const qty = Number(quantity);

  if (!Number.isFinite(price) || !Number.isFinite(qty) || price <= 0 || qty <= 0) {
    return 0;
  }

  return price * qty;
};

/*
 * BR-49: hợp đồng không kiểm định có tổng tiền trên ngưỡng phải cảnh báo
 * hàng giá trị cao.
 */
export const isHighValueWithoutInspection = (unitPrice, quantity, isInspection) =>
  !isInspection &&
  getContractTotal(unitPrice, quantity) > HIGH_VALUE_THRESHOLD_VND;
