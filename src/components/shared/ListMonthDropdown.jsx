import { CalendarOutlined } from "@ant-design/icons";
import { Button, Dropdown } from "antd";
import { useEffect } from "react";
import { getAvailableMonthOptions } from "../../utils/sortListItems";

const ALL_MONTHS_KEY = "__all_months__";

export default function ListMonthDropdown({
  items,
  value = "",
  onChange,
  getValue = (item) => item?.createdAt,
  compact = false,
  className = "",
  scopeLabel = "kết quả đang hiển thị",
}) {
  const monthOptions = getAvailableMonthOptions(items, getValue);
  const selected =
    monthOptions.find((option) => option.key === value) || null;
  const hasSelectedMonth =
    !value || monthOptions.some((option) => option.key === value);

  useEffect(() => {
    if (value && !hasSelectedMonth) {
      onChange?.("");
    }
  }, [hasSelectedMonth, onChange, value]);

  return (
    <Dropdown
      trigger={["click"]}
      menu={{
        items: [
          {
            key: ALL_MONTHS_KEY,
            label: "Tất cả tháng",
          },
          ...monthOptions,
        ],
        selectable: true,
        selectedKeys: [value || ALL_MONTHS_KEY],
        onClick: ({ key }) =>
          onChange?.(key === ALL_MONTHS_KEY ? "" : key),
      }}
    >
      <Button
        icon={<CalendarOutlined />}
        type={value ? "primary" : "default"}
        aria-label={`Lọc ${scopeLabel} theo tháng`}
        title={selected ? selected.label : "Lọc theo tháng"}
        className={className}
      >
        {compact ? null : selected?.label || "Theo tháng"}
      </Button>
    </Dropdown>
  );
}
