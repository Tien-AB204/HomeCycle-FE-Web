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
  { value: "NonFunctional", label: "Không hoạt động" },
]);

export const DAMAGE_LEVEL_OPTIONS = Object.freeze([
  { value: "None", label: "Không hư hỏng" },
  {
    value: "Cosmetic_Damage",
    label: "Trầy xước ngoại quan",
  },
  { value: "Minor_Damage", label: "Hư hỏng nhẹ" },
  { value: "Severe_Damage", label: "Hư hỏng nặng" },
]);

export const FUNCTIONALITY_BY_DAMAGE_LEVEL = Object.freeze({
  None: "FullyFunctional",
  Cosmetic_Damage: "FullyFunctional",
  Minor_Damage: "PartiallyFunctional",
  Severe_Damage: "NonFunctional",
});

export const LEGACY_DAMAGE_LEVEL_ALIASES = Object.freeze({
  No_Damage: "None",
  Major_Damage: "Severe_Damage",
  Moderate_Damage: "Severe_Damage",
  Total_Loss: "Severe_Damage",
});

export const LEGACY_FUNCTIONALITY_ALIASES = Object.freeze({
  NotFunctional: "NonFunctional",
});

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
