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

  const isSimpleDateToggle =
    normalizedOptions.length === 2 &&
    normalizedOptions.some((option) => option.key === "newest") &&
    normalizedOptions.some((option) => option.key === "oldest");

  if (isSimpleDateToggle) {
    const nextKey = selected.key === "newest" ? "oldest" : "newest";
    const nextOption =
      normalizedOptions.find((option) => option.key === nextKey) ||
      normalizedOptions[0];

    return (
      <Button
        icon={getOptionIcon(selected.key) || <SortDescendingOutlined />}
        onClick={() => onChange?.(nextKey)}
        aria-label={`Đang sắp xếp ${scopeLabel}: ${selected.label}. Bấm để chuyển sang ${nextOption.label}.`}
        title={`${selected.label} — bấm để chuyển sang ${nextOption.label}`}
        className={className}
      />
    );
  }

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
