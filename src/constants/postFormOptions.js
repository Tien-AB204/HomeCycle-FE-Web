export const SPACE_USAGE_OPTIONS = Object.freeze([
  { value: "Living_room", label: "Phòng khách" },
  { value: "Bedroom", label: "Phòng ngủ" },
  { value: "Kitchen", label: "Nhà bếp" },
  { value: "Office", label: "Văn phòng" },
]);

export const FUNCTIONALITY_OPTIONS = Object.freeze([
  { value: "FullyFunctional", label: "Hoạt động đầy đủ" },
  {
    value: "PartiallyFunctional",
    label: "Hoạt động một phần",
  },
  { value: "NotFunctional", label: "Không hoạt động" },
]);

export const DAMAGE_LEVEL_OPTIONS = Object.freeze([
  { value: "None", label: "Không hư hỏng" },
  {
    value: "Cosmetic_Damage",
    label: "Trầy xước ngoại quan",
  },
  { value: "Minor_Damage", label: "Hư hỏng nhẹ" },
  { value: "Major_Damage", label: "Hư hỏng nặng" },
]);

export const DELIVERY_METHOD_OPTIONS = Object.freeze([
  { value: "GhnDelivery", label: "Giao hàng GHN" },
  { value: "SelfDelivery", label: "Tự vận chuyển" },
  { value: "Pickup", label: "Nhận tại địa chỉ" },
  { value: "Unknown", label: "Thỏa thuận vận chuyển" },
]);

export const PRIORITY_LEVEL_OPTIONS = Object.freeze([
  { value: "Low", label: "Thấp" },
  { value: "Medium", label: "Trung bình" },
  { value: "High", label: "Cao" },
]);
