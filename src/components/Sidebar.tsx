import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { supabase } from "../lib/supabase";
import { AuthService } from "../services/authService";
import { hasPermission } from "../lib/permission";
import LogoutDialog from "./LogoutDialog";
import CurrencySwitcher from "./CurrencySwitcher";
type BusinessBrand = {
  store_name: string;
  store_subtitle: string;
  logo_url: string;
};

type LocalUser = {
  full_name?: string;
  role?: string;
};

const defaultBrand: BusinessBrand = {
  store_name: "GTB POS",
  store_subtitle:
    "Auto Detailing ERP",
  logo_url: "",
};

const menuItems = [
  {
    to: "/",
    label: "Dashboard",
    icon: "🏠",
    permission: "dashboard",
  },
  {
  to: "/ai-business-assistant",
  label: "AI 经营助手",
  icon: "🧠",
  permission: "reports",
},
  {
    to: "/appointments",
    label: "预约管理",
    icon: "📅",
    permission: "appointments",
  },
  {
    to: "/pos",
    label: "POS 收银",
    icon: "💳",
    permission: "pos",
  },
  {
    to: "/members",
    label: "会员管理",
    icon: "👥",
    permission: "members",
  },
  {
    to: "/vehicles",
    label: "车辆管理",
    icon: "🚘",
    permission: "vehicles",
  },
  {
    to: "/services",
    label: "服务项目",
    icon: "🔧",
    permission: "services",
  },
  {
    to: "/packages",
    label: "套餐管理",
    icon: "🎁",
    permission: "packages",
  },
  {
  to: "/follow-up-automation",
  label: "售后自动化",
  icon: "🤖",
  permission: "reports",
},
  {
    to: "/products",
    label: "产品库存",
    icon: "📦",
    permission: "products",
  },
  {
    to: "/orders",
    label: "订单记录",
    icon: "📋",
    permission: "orders",
  },
  {
  to: "/refunds",
  label: "退款记录",
  icon: "↩️",
  permission: "orders",
},
  {
    to: "/reports",
    label: "报表",
    icon: "📈",
    permission: "reports",
  },
  {
  to: "/expenses",
  label: "费用管理",
  icon: "💸",
  permission: "reports",
},
  {
    to: "/inspection",
    label: "车辆验车",
    icon: "🔍",
    permission: "inspection",
  },
  {
    to: "/employees",
    label: "员工",
    icon: "👨‍💼",
    permission: "employees",
  },
  {
    to: "/customer-qr",
    label: "客户二维码",
    icon: "📱",
    permission: "settings",
  },
  {
    to: "/settings",
    label: "设置",
    icon: "⚙️",
    permission: "settings",
  },
];

function getStoredUser(): LocalUser {
  try {
    const savedUser =
      localStorage.getItem(
        "gtb_user"
      );

    if (!savedUser) {
      return {};
    }

    return JSON.parse(
      savedUser
    ) as LocalUser;
  } catch (error) {
    console.error(
      "读取员工资料失败：",
      error
    );

    return {};
  }
}

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [showLogout, setShowLogout] =
    useState(false);

  const [
    pendingAppointments,
    setPendingAppointments,
  ] = useState(0);

  const [
    businessBrand,
    setBusinessBrand,
  ] =
    useState<BusinessBrand>(
      defaultBrand
    );

  const [
    logoLoadFailed,
    setLogoLoadFailed,
  ] = useState(false);

  const user = getStoredUser();

  async function loadPendingAppointments() {
    const {
      count,
      error,
    } = await supabase
      .from("appointments")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "pending");

    if (error) {
      console.error(
        "读取待处理预约失败：",
        error
      );

      return;
    }

    setPendingAppointments(
      count || 0
    );
  }

  async function loadBusinessBrand() {
    const {
      data,
      error,
    } = await supabase
      .from("business_settings")
      .select(
        `
          store_name,
          store_subtitle,
          logo_url
        `
      )
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error(
        "读取店铺资料失败：",
        error
      );

      return;
    }

    if (!data) {
      return;
    }

    setBusinessBrand({
      store_name:
        data.store_name ||
        defaultBrand.store_name,

      store_subtitle:
        data.store_subtitle ||
        defaultBrand.store_subtitle,

      logo_url:
        data.logo_url || "",
    });

    setLogoLoadFailed(false);
  }

  useEffect(() => {
    void loadPendingAppointments();
    void loadBusinessBrand();

    const appointmentChannel =
      supabase
        .channel(
          "sidebar-appointment-notifications"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "appointments",
          },
          () => {
            void loadPendingAppointments();
          }
        )
        .subscribe();

    const settingsChannel =
      supabase
        .channel(
          "sidebar-business-settings"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "business_settings",
            filter: "id=eq.1",
          },
          () => {
            void loadBusinessBrand();
          }
        )
        .subscribe();

    function handleWindowFocus() {
      void loadBusinessBrand();
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void loadBusinessBrand();
      }
    }

    window.addEventListener(
      "focus",
      handleWindowFocus
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      void supabase.removeChannel(
        appointmentChannel
      );

      void supabase.removeChannel(
        settingsChannel
      );

      window.removeEventListener(
        "focus",
        handleWindowFocus
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, []);

  async function confirmLogout() {
    try {
      await AuthService.signOut();
    } catch (error) {
      console.error(
        "退出登录失败：",
        error
      );
    }

    localStorage.removeItem(
      "gtb_user"
    );

    setShowLogout(false);

    navigate("/login", {
      replace: true,
    });
  }

  return (
    <>
      <aside style={sidebar}>
        <div style={sidebarTop}>
          <Link
            to="/"
            style={brand}
            title="返回 Dashboard"
          >
            <div style={logo}>
              {businessBrand.logo_url &&
              !logoLoadFailed ? (
                <img
                  src={
                    businessBrand.logo_url
                  }
                  alt={`${businessBrand.store_name} Logo`}
                  style={logoImage}
                  onError={() => {
                    setLogoLoadFailed(
                      true
                    );
                  }}
                />
              ) : (
                <span
                  style={
                    defaultLogoIcon
                  }
                >
                  🚗
                </span>
              )}
            </div>

            <div style={brandInformation}>
              <h2 style={brandTitle}>
                {businessBrand.store_name}
              </h2>

              <p style={brandSubtitle}>
                {
                  businessBrand.store_subtitle
                }
              </p>
            </div>
          </Link>
<CurrencySwitcher />
          <nav style={nav}>
            {menuItems
              .filter((item) =>
                hasPermission(
                  user.role || "",
                  item.permission
                )
              )
              .map((item) => {
                const active =
                  location.pathname ===
                  item.to;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    style={{
                      ...navItem,
                      background: active
                        ? "#2563eb"
                        : "transparent",
                      color: active
                        ? "#ffffff"
                        : "#cbd5e1",
                    }}
                  >
                    <span
                      style={navIcon}
                    >
                      {item.icon}
                    </span>

                    <span
                      style={{
                        flex: 1,
                      }}
                    >
                      {item.label}
                    </span>

                    {item.to ===
                      "/appointments" &&
                      pendingAppointments >
                        0 && (
                        <span
                          style={
                            notificationBadge
                          }
                        >
                          {pendingAppointments >
                          99
                            ? "99+"
                            : pendingAppointments}
                        </span>
                      )}
                  </Link>
                );
              })}
          </nav>
        </div>

        <div style={bottom}>
          <div style={userCard}>
            <div style={avatar}>
              👤
            </div>

            <div style={userInformation}>
              <strong
                style={userName}
              >
                {user.full_name ||
                  "Administrator"}
              </strong>

              <p style={userRole}>
                {user.role || "Admin"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowLogout(true)
            }
            style={logoutBtn}
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      <LogoutDialog
        open={showLogout}
        userName={
          user.full_name ||
          "Administrator"
        }
        role={user.role || "Admin"}
        onCancel={() =>
          setShowLogout(false)
        }
        onConfirm={confirmLogout}
      />
    </>
  );
}

const sidebar = {
  width: 260,
  minWidth: 260,
  height: "100vh",
  position: "sticky" as const,
  top: 0,
  overflow: "hidden",
  background:
    "linear-gradient(180deg, #111827 0%, #0f172a 100%)",
  color: "#ffffff",
  padding: 20,
  boxSizing: "border-box" as const,
  display: "flex",
  flexDirection: "column" as const,
  justifyContent:
    "space-between",
  boxShadow:
    "8px 0 30px rgba(15, 23, 42, 0.08)",
};

const sidebarTop = {
  display: "flex",
  minHeight: 0,
  flex: 1,
  flexDirection: "column" as const,
};

const brand = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  minHeight: 58,
  marginBottom: 24,
  padding: "5px 2px",
  color: "#ffffff",
  textDecoration: "none",
};

const logo = {
  width: 52,
  height: 52,
  minWidth: 52,
  overflow: "hidden",
  borderRadius: 16,
  border:
    "1px solid rgba(255,255,255,0.16)",
  background:
    "linear-gradient(135deg, #2563eb, #1d4ed8)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow:
    "0 10px 24px rgba(37, 99, 235, 0.28)",
};

const logoImage = {
  width: "100%",
  height: "100%",
  display: "block",
  objectFit: "contain" as const,
  padding: 4,
  background: "#ffffff",
};

const defaultLogoIcon = {
  fontSize: 26,
  lineHeight: 1,
};

const brandInformation = {
  minWidth: 0,
  flex: 1,
};

const brandTitle = {
  overflow: "hidden",
  margin: 0,
  color: "#ffffff",
  fontSize: 17,
  fontWeight: 800,
  lineHeight: 1.25,
  whiteSpace: "nowrap" as const,
  textOverflow: "ellipsis",
};

const brandSubtitle = {
  overflow: "hidden",
  margin: "5px 0 0",
  color: "#94a3b8",
  fontSize: 10,
  lineHeight: 1.3,
  whiteSpace: "nowrap" as const,
  textOverflow: "ellipsis",
};

const nav = {
  display: "flex",
  minHeight: 0,
  flex: 1,
  flexDirection: "column" as const,
  gap: 7,
  overflowY: "auto" as const,
  paddingRight: 5,
  paddingBottom: 10,
};

const navItem = {
  display: "flex",
  alignItems: "center",
  gap: 11,
  padding: "11px 13px",
  borderRadius: 12,
  textDecoration: "none",
  fontSize: 14,
  fontWeight: 600,
  transition:
    "background 0.2s ease, color 0.2s ease, transform 0.2s ease",
};

const navIcon = {
  width: 20,
  textAlign: "center" as const,
};

const bottom = {
  borderTop:
    "1px solid #374151",
  paddingTop: 15,
  background: "#0f172a",
};

const userCard = {
  display: "flex",
  alignItems: "center",
  gap: 11,
  marginBottom: 12,
};

const avatar = {
  width: 40,
  height: 40,
  minWidth: 40,
  borderRadius: 999,
  background: "#1f2937",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const userInformation = {
  minWidth: 0,
  flex: 1,
};

const userName = {
  display: "block",
  overflow: "hidden",
  color: "#ffffff",
  fontSize: 14,
  whiteSpace: "nowrap" as const,
  textOverflow: "ellipsis",
};

const userRole = {
  margin: "4px 0 0",
  color: "#9ca3af",
  fontSize: 11,
  textTransform:
    "capitalize" as const,
};

const logoutBtn = {
  width: "100%",
  padding: 12,
  border: "none",
  borderRadius: 12,
  background: "#dc2626",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 700,
};

const notificationBadge = {
  minWidth: 22,
  height: 22,
  padding: "0 6px",
  borderRadius: 999,
  background: "#ef4444",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 900,
  boxShadow:
    "0 4px 12px rgba(239, 68, 68, 0.35)",
};

export default Sidebar;