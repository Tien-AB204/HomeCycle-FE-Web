import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";
import {
  IdcardOutlined,
  ProfileOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../hooks/useAuth";

const MODERATOR_NAV_ITEMS = [
  {
    name: "Duyệt hồ sơ",
    path: "/mod/verification",
    icon: IdcardOutlined,
  },
  {
    name: "Kiểm duyệt bài đăng",
    path: "/mod/posts",
    icon: ProfileOutlined,
  },
];

const ModLayout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();

    navigate("/auth/login", {
      replace: true,
    });
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans">
      <aside className="z-20 flex w-[250px] shrink-0 flex-col bg-[#1a202c] text-white shadow-lg">
        <div className="flex h-20 shrink-0 items-center px-8">
          <h1 className="text-2xl font-bold tracking-wide">
            HomeCycle{" "}
            <span className="text-[#0aa679]">
              MOD
            </span>
          </h1>
        </div>

        <nav
          aria-label="Điều hướng kiểm duyệt"
          className="flex-1 space-y-2 overflow-y-auto px-4 py-2"
        >
          {MODERATOR_NAV_ITEMS.map(
            (item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end
                  className={({
                    isActive,
                  }) =>
                    [
                      "flex items-center gap-3 rounded-lg px-4 py-3 text-[15px] transition-all",
                      isActive
                        ? "bg-[#0aa679] font-medium text-white shadow-md"
                        : "text-gray-400 hover:bg-white/5 hover:text-gray-200",
                    ].join(" ")
                  }
                >
                  <Icon
                    aria-hidden="true"
                    className="text-lg"
                  />

                  <span>{item.name}</span>
                </NavLink>
              );
            },
          )}
        </nav>

        <div className="mt-auto border-t border-gray-800 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-lg border border-gray-600/50 bg-[#2d3748] py-3 text-sm font-medium text-gray-200 transition-colors hover:border-red-500 hover:bg-red-600 hover:text-white"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="relative flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default ModLayout;