import { useEffect, useState } from "react";
import { UserService } from "../services/userService";

function Employees() {
  const [users, setUsers] = useState<any[]>([]);

  async function loadUsers() {
    try {
      const data = await UserService.getAll();
      setUsers(data);
    } catch (error: any) {
      alert(error.message);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function changeRole(id: number, role: string) {
    try {
      await UserService.updateRole(id, role);
      loadUsers();
    } catch (error: any) {
      alert(error.message);
    }
  }

  async function toggleStatus(id: number, active: boolean) {
    try {
      await UserService.updateStatus(id, !active);
      loadUsers();
    } catch (error: any) {
      alert(error.message);
    }
  }

  return (
    <>
      <h1>员工管理 / Employee Management</h1>

      <div style={card}>
        <table style={table}>
          <thead>
            <tr>
              <th>姓名</th>
              <th>Email</th>
              <th>角色</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.full_name}</td>
                <td>{user.email}</td>

                <td>
                  <select
                    value={user.role}
                    onChange={(e) =>
                      changeRole(user.id, e.target.value)
                    }
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="staff">Staff</option>
                    <option value="reception">Reception</option>
                  </select>
                </td>

                <td>
                  {user.is_active ? (
                    <span style={{ color: "green" }}>🟢 Active</span>
                  ) : (
                    <span style={{ color: "red" }}>🔴 Disabled</span>
                  )}
                </td>

                <td>
                  <button
                    onClick={() =>
                      toggleStatus(user.id, user.is_active)
                    }
                  >
                    {user.is_active ? "停用" : "启用"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const card = {
  background: "#fff",
  padding: 24,
  borderRadius: 18,
  boxShadow: "0 10px 25px rgba(0,0,0,.08)",
};

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
};

export default Employees;