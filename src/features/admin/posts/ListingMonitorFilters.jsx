import { Button, Input, Select } from "antd";
import { useEffect, useState } from "react";
import { categoryApi } from "../../../services/apis/categoryApi";
import {
  EMPTY_LISTING_FILTERS,
  LISTING_POST_TYPE_LABELS,
  LISTING_STATUS_OPTIONS,
  OWNER_ROLE_OPTIONS,
} from "./listingMonitorPresentation";

const REPORT_OPTIONS = [
  { value: "true", label: "Có báo cáo chưa xử lý" },
  { value: "false", label: "Không có báo cáo" },
];

const POST_TYPE_OPTIONS = Object.entries(LISTING_POST_TYPE_LABELS).map(
  ([value, label]) => ({ value, label: `Tin ${label.toLowerCase()}` }),
);

export default function ListingMonitorFilters({
  value,
  onChange,
  showPostType = false,
}) {
  const [keyword, setKeyword] = useState(value.Keyword);
  const [city, setCity] = useState(value.City);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    categoryApi
      .getAll({ pageNumber: 1, pageSize: 100, signal: controller.signal })
      .then((page) => setCategories(page.items))
      .catch(() => setCategories([]));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const nextKeyword = keyword.trim();
      const nextCity = city.trim();

      if (nextKeyword !== value.Keyword || nextCity !== value.City) {
        onChange({ ...value, Keyword: nextKeyword, City: nextCity });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [keyword, city, value, onChange]);

  const update = (key, nextValue) =>
    onChange({ ...value, [key]: nextValue || "" });

  const reset = () => {
    setKeyword("");
    setCity("");
    onChange({ ...EMPTY_LISTING_FILTERS });
  };

  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        <Input
          allowClear
          placeholder="Tên sản phẩm, người đăng hoặc mã bài"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        {showPostType && (
          <Select
            allowClear
            placeholder="Loại tin"
            value={value.PostType || undefined}
            onChange={(nextValue) => update("PostType", nextValue)}
            options={POST_TYPE_OPTIONS}
          />
        )}
        <Select
          allowClear
          placeholder="Trạng thái"
          value={value.Status || undefined}
          onChange={(nextValue) => update("Status", nextValue)}
          options={LISTING_STATUS_OPTIONS}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Danh mục"
          value={value.CategoryId || undefined}
          onChange={(nextValue) => update("CategoryId", nextValue)}
          options={categories.map((category) => ({
            value: category.categoryId,
            label: category.categoryName || category.name,
          }))}
        />
        <Input
          allowClear
          placeholder="Khu vực (tỉnh/thành)"
          value={city}
          onChange={(event) => setCity(event.target.value)}
        />
        <Select
          allowClear
          placeholder="Loại người đăng"
          value={value.OwnerRole || undefined}
          onChange={(nextValue) => update("OwnerRole", nextValue)}
          options={OWNER_ROLE_OPTIONS}
        />
        <Select
          allowClear
          placeholder="Báo cáo"
          value={value.HasOpenReports || undefined}
          onChange={(nextValue) => update("HasOpenReports", nextValue)}
          options={REPORT_OPTIONS}
        />
        <Button onClick={reset}>Xóa bộ lọc</Button>
      </div>
    </div>
  );
}
