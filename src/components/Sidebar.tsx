import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthService } from "../services/authService";
import LogoutDialog from "./LogoutDialog";
import { hasPermission } from "../lib/permission";

const menuItems = [
  { to: "/", label: "Dashboard", icon: "🏠", permission: "dashboard" },
  { to: "/appointments", label: "预约管理", icon: "📅", permission: "appointments" },
  { to: "/pos", label: "POS 收银", icon: "💳", permission: "pos" },
  { to: "/members", label: "会员管理", icon: "👥", permission: "members" },
  { to: "/vehicles", label: "车辆管理", icon: "🚘", permission: "vehicles" },
  { to: "/services", label: "服务项目", icon: "🔧", permission: "services" },
  {to: "/packages",label: "套餐管理",icon: "🎁",permission: "services",},
  { to: "/products", label: "产品库存", icon: "📦", permission: "products" },
  { to: "/orders", label: "订单记录", icon: "📋", permission: "orders" },
  { to: "/reports", label: "报表", icon: "📈", permission: "reports" },
  { to: "/inspection", label: "车辆验车", icon: "🔍", permission: "inspection" },
  { to: "/employees", label: "员工", icon: "👨‍💼", permission: "employees" },
  { to: "/settings", label: "设置", icon: "⚙️", permission: "settings" },
];

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogout, setShowLogout] = useState(false);
  const [pendingAppointments, setPendingAppointments] = useState(0);

  const user = JSON.parse(localStorage.getItem("gtb_user") || "{}");

  async function loadPendingAppointments() {
  const { count, error } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) {
    console.error("读取待处理预约失败：", error);
    return;
  }

  setPendingAppointments(count || 0);
}

useEffect(() => {
  loadPendingAppointments();

  const channel = supabase
    .channel("sidebar-appointment-notifications")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "appointments",
      },
      () => {
        loadPendingAppointments();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
  async function confirmLogout() {
    try {
      await AuthService.signOut();
    } catch (error) {
      console.error(error);
    }

    localStorage.removeItem("gtb_user");
    setShowLogout(false);
    navigate("/login", { replace: true });
  }

  return (
    <>
      <aside style={sidebar}>
        <div>
          <div style={brand}>
            <div style={logo}>🚗</div>
            <div>
              <h2 style={{ margin: 0 }}>GTB POS</h2>
              <p style={subText}>Auto Detailing ERP</p>
            </div>
          </div>

          <nav style={nav}>
            {menuItems
  .filter((item) => hasPermission(user.role, item.permission))
  .map((item) => {
              const active = location.pathname === item.to;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  style={{
                    ...navItem,
                    background: active ? "#2563eb" : "transparent",
                    color: active ? "#fff" : "#cbd5e1",
                  }}
                >
                  <span>{item.icon}</span>

<span style={{ flex: 1 }}>
  {item.label}
</span>

{item.to === "/appointments" && pendingAppointments > 0 && (
  <span style={notificationBadge}>
    {pendingAppointments > 99 ? "99+" : pendingAppointments}
  </span>
)}
                </Link>
              );
            })}
          </nav>
        </div>

        <div style={bottom}>
          <div style={userCard}>
            <div style={avatar}>👤</div>

            <div>
              <strong>{user.full_name || "Administrator"}</strong>
              <p style={subText}>{user.role || "Admin"}</p>
            </div>
          </div>

          <button onClick={() => setShowLogout(true)} style={logoutBtn}>
            🚪 Logout
          </button>
        </div>
      </aside>

      <LogoutDialog
        open={showLogout}
        userName={user.full_name || "Administrator"}
        role={user.role || "Admin"}
        onCancel={() => setShowLogout(false)}
        onConfirm={confirmLogout}
      />
    </>
  );
}

const sidebar = {
  width: 260,
  height: "100vh",
  background: "#111827",
  color: "#fff",
  padding: 20,
  boxSizing: "border-box" as const,
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "space-between",
};

const brand = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 28,
};

const logo = {
  width: 44,
  height: 44,
  borderRadius: 14,
  background: "#2563eb",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 24,
};

const subText = {
  margin: 0,
  color: "#9ca3af",
  fontSize: 13,
};

const nav = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 8,
  maxHeight: "calc(100vh - 220px)",
  overflowY: "auto" as const,
  paddingRight: 4,
};

const navItem = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 14px",
  borderRadius: 12,
  textDecoration: "none",
  fontSize: 15,
};

const bottom = {
  borderTop: "1px solid #374151",
  paddingTop: 16,
};

const userCard = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 12,
};

const avatar = {
  width: 40,
  height: 40,
  borderRadius: 999,
  background: "#1f2937",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const logoutBtn = {
  width: "100%",
  padding: 12,
  border: "none",
  borderRadius: 12,
  background: "#dc2626",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const notificationBadge = {
  minWidth: 22,
  height: 22,
  padding: "0 6px",
  borderRadius: 999,
  background: "#ef4444",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 900,
  boxShadow: "0 4px 12px rgba(239,68,68,.35)",
};

export default Sidebar;