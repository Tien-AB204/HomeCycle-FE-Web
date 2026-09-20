import {
  SortAscendingOutlined,
  SortDescendingOutlined,
} from "@ant-design/icons";
import { Button, Dropdown } from "antd";

const DEFAULT_OPTIONS = [
  { key: "newest", label: "Mới nhất" },
  { key: "oldest", label: "Cũ nhất" },
];

const getOptionIcon = (key) => {
  if (key === "newest") return <SortDescendingOutlined />;
  if (key === "oldest") return <SortAscendingOutlined />;
  return undefined;
};

export default function ListSortDropdown({
  value = "newest",
  onChange,
  options = DEFAULT_OPTIONS,
  compact = false,
  className = "",
  scopeLabel = "kết quả đang hiển thị",
}) {
  const normalizedOptions =
    Array.isArray(options) && options.length > 0
      ? options
      : DEFAULT_OPTIONS;

  const selected =
    normalizedOptions.find((option) => option.key === value) ||
    normalizedOptions[0];

  return (
    <Dropdown
      trigger={["click"]}
      menu={{
        items: normalizedOptions.map((option) => ({
          key: option.key,
          label: option.label,
          icon: getOptionIcon(option.key),
        })),
        selectable: true,
        selectedKeys: [selected.key],
        onClick: ({ key }) => onChange?.(key),
      }}
    >
      <Button
        icon={getOptionIcon(selected.key) || <SortDescendingOutlined />}
        aria-label={`Sắp xếp ${scopeLabel}: ${selected.label}`}
        title={`Sắp xếp ${scopeLabel}`}
        className={className}
      >
        {compact ? null : selected.label}
      </Button>
    </Dropdown>
  );
}
