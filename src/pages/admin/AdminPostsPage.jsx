import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import "../../features/admin/redesign/hc-admin.css";
import "../../features/admin/redesign/hc-posts.css";
import AdminPostDetailModal from "../../features/admin/posts/AdminPostDetailModal";
import PostsListTab from "../../features/admin/posts/PostsListTab";
import PostsOverviewTab from "../../features/admin/posts/PostsOverviewTab";
import PostsReportsTab from "../../features/admin/posts/PostsReportsTab";

const TABS = [
  ["overview", "Tổng quan"],
  ["list", "Danh sách bài đăng"],
  ["reports", "Bài đăng bị báo cáo"],
];

export default function AdminPostsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const tab = TABS.some(([key]) => key === requested) ? requested : "overview";
  const [listPreset, setListPreset] = useState({ version: 0, filters: {} });
  const [selectedPost, setSelectedPost] = useState(null);

  const openTab = (key) => setSearchParams(key === "overview" ? {} : { tab: key });
  const openList = (filters) => {
    setListPreset((current) => ({ version: current.version + 1, filters }));
    openTab("list");
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const openPost = (item) =>
    setSelectedPost({ postId: item.postId, productName: item.productName, ownerId: item.ownerId, status: item.status });

  return (
    <>
      <div className="hc-admin hc-posts">
        <main className="content">
          <nav className="tabs" role="tablist" aria-label="Quản lý bài đăng">
            {TABS.map(([key, label]) => (
              <button type="button" role="tab" key={key} aria-selected={tab === key} onClick={() => openTab(key)}>
                {label}
              </button>
            ))}
          </nav>
          {tab === "overview" && <PostsOverviewTab onOpenList={openList} onOpenPost={openPost} />}
          {tab === "list" && <PostsListTab key={listPreset.version} preset={listPreset.filters} onOpenPost={openPost} />}
          {tab === "reports" && <PostsReportsTab onOpenPost={openPost} />}
        </main>
      </div>
      {/* Hộp chi tiết dùng Tailwind riêng, đặt ngoài .hc-admin để không bị style của trang ghi đè. */}
      {selectedPost && <AdminPostDetailModal postSummary={selectedPost} onClose={() => setSelectedPost(null)} />}
    </>
  );
}
