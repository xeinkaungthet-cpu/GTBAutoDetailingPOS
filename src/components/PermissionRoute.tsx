import { useNavigate } from "react-router-dom";
import { hasPermission } from "../lib/permission";

type Props = {
  permission: string;
  children: React.ReactNode;
};

function PermissionRoute({ permission, children }: Props) {
  const user = JSON.parse(localStorage.getItem("gtb_user") || "{}");

  if (!hasPermission(user.role, permission)) {
    return (
      <div style={page}>
        <div style={card}>
          <div style={icon}>🚫</div>
          <h1>Access Denied</h1>
          <p>你没有权限访问这个页面。</p>
          <p style={{ color: "#6b7280" }}>
            Please contact administrator if you need access.
          </p>

          <NavigateButton />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function NavigateButton() {
  const navigate = useNavigate();

  return (
    <button onClick={() => navigate("/")} style={button}>
      Back to Dashboard
    </button>
  );
}

const page = {
  minHeight: "70vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const card = {
  background: "#fff",
  padding: 40,
  borderRadius: 24,
  boxShadow: "0 20px 60px rgba(0,0,0,.12)",
  textAlign: "center" as const,
  maxWidth: 460,
};

const icon = {
  fontSize: 54,
};

const button = {
  display: "inline-block",
  marginTop: 20,
  padding: "12px 20px",
  border: "none",
  borderRadius: 12,
  background: "#2563eb",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 700,
  cursor: "pointer",
};

export default PermissionRoute;