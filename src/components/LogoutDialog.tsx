type Props = {
  open: boolean;
  userName: string;
  role: string;
  onCancel: () => void;
  onConfirm: () => void;
};

function LogoutDialog({
  open,
  userName,
  role,
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          background: "#fff",
          borderRadius: 22,
          padding: 28,
          boxShadow: "0 30px 80px rgba(0,0,0,.25)",
          animation: "fadeIn .18s ease",
        }}
      >
        <div style={{ fontSize: 42, textAlign: "center" }}>🚪</div>

        <h2
          style={{
            textAlign: "center",
            marginTop: 10,
            marginBottom: 8,
          }}
        >
          Logout
        </h2>

        <p
          style={{
            textAlign: "center",
            color: "#6b7280",
            marginBottom: 24,
            lineHeight: 1.6,
          }}
        >
          Are you sure you want to sign out of GTB POS?
        </p>

        <div
          style={{
            background: "#f8fafc",
            borderRadius: 14,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <div style={{ fontWeight: 600 }}>{userName}</div>

          <div
            style={{
              color: "#6b7280",
              marginTop: 6,
            }}
          >
            {role}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
          }}
        >
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 12,
              border: "1px solid #d1d5db",
              background: "#fff",
              cursor: "pointer",
              fontSize: 15,
            }}
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 12,
              border: "none",
              background: "#dc2626",
              color: "#fff",
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default LogoutDialog;