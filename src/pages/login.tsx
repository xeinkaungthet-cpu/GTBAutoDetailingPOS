import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthService } from "../services/authService";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("admin@gtb.com");
  const [password, setPassword] = useState("aa123123");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      alert("请输入 Email 和密码");
      return;
    }

    setLoading(true);

    try {
      const user = await AuthService.signIn(email, password);

      if (!user) {
        alert("登录失败");
        return;
      }

      const profile = await AuthService.getProfile(user.id);

      if (!profile?.is_active) {
        alert("账号已停用");
        return;
      }

      localStorage.setItem("gtb_user", JSON.stringify(profile));

      alert(`登录成功：${profile.role}`);
      navigate("/");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={page}>
      <div style={card}>
        <h1>GTB POS Login</h1>
        <p style={{ color: "#6b7280" }}>Staff Management System</p>

        <input
          style={input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />

        <input
          style={input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
        />

        <button onClick={handleLogin} style={button} disabled={loading}>
          {loading ? "登录中..." : "登录"}
        </button>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "linear-gradient(135deg,#0f172a,#2563eb)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const card = {
  width: 420,
  background: "#fff",
  padding: 32,
  borderRadius: 24,
  boxShadow: "0 20px 60px rgba(0,0,0,.25)",
};

const input = {
  width: "100%",
  padding: 14,
  marginTop: 14,
  borderRadius: 12,
  border: "1px solid #d1d5db",
  fontSize: 16,
};

const button = {
  width: "100%",
  marginTop: 22,
  padding: 16,
  border: "none",
  borderRadius: 14,
  background: "#2563eb",
  color: "#fff",
  fontSize: 18,
  cursor: "pointer",
};

export default Login;