import { useEffect, useState } from "react";
import type { Member } from "../types/database";
import { MemberService } from "../services/memberService";

function Members() {
  const [members, setMembers] = useState<Member[]>([]);

  async function loadMembers() {
    try {
      const data = await MemberService.getAll();
      setMembers(data);
    } catch (error: any) {
      alert(error.message);
    }
  }

  async function addMember() {
    const name = prompt("请输入会员姓名");
    if (!name) return;

    const phone = prompt("请输入电话号码");
    if (!phone) return;

    try {
      await MemberService.create({
        name,
        phone,
        points: 0,
        balance: 0,
      });

      loadMembers();
    } catch (error: any) {
      alert(error.message);
    }
  }

  useEffect(() => {
    loadMembers();
  }, []);

  return (
    <>
      <h1>会员管理</h1>

      <div style={card}>
        <button onClick={addMember} style={button}>
          + 新会员
        </button>

        <table style={table}>
          <thead>
            <tr>
              <th>姓名</th>
              <th>电话</th>
              <th>积分</th>
              <th>余额</th>
            </tr>
          </thead>

          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={4}>暂无数据</td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id}>
                  <td>{member.name}</td>
                  <td>{member.phone}</td>
                  <td>{member.points ?? 0}</td>
                  <td>${member.balance ?? 0}</td>
                </tr>
              ))
            )}
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

const button = {
  padding: "12px 20px",
  marginBottom: 20,
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
};

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
};

export default Members;