import { useEffect, useState } from "react";
import type { Member, Vehicle } from "../types/database";
import { MemberService } from "../services/memberService";
import { VehicleService } from "../services/vehicleService";

function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  async function loadVehicles() {
    try {
      const data = await VehicleService.getAll();
      setVehicles(data);
    } catch (error: any) {
      alert(error.message);
    }
  }

  async function loadMembers() {
    try {
      const data = await MemberService.getAll();
      setMembers(data);
    } catch (error: any) {
      alert(error.message);
    }
  }

  useEffect(() => {
    loadVehicles();
    loadMembers();
  }, []);

  async function addVehicle() {
    if (members.length === 0) {
      alert("请先新增会员，再添加车辆");
      return;
    }

    const memberList = members
      .map((m) => `${m.id}: ${m.name} (${m.phone})`)
      .join("\n");

    const memberIdText = prompt("请选择会员ID：\n" + memberList);
    if (!memberIdText) return;

    const memberId = Number(memberIdText);

    const plateNumber = prompt("请输入车牌号码");
    if (!plateNumber) return;

    const brand = prompt("请输入品牌");
    if (!brand) return;

    const model = prompt("请输入型号");
    if (!model) return;

    const color = prompt("请输入颜色");
    if (!color) return;

    try {
      await VehicleService.create({
        member_id: memberId,
        plate_number: plateNumber,
        brand,
        model,
        color,
      });

      loadVehicles();
    } catch (error: any) {
      alert(error.message);
    }
  }

  return (
    <>
      <h1>车辆管理</h1>

      <div style={card}>
        <button onClick={addVehicle} style={button}>
          + 新车辆
        </button>

        <table style={table}>
          <thead>
            <tr>
              <th>会员ID</th>
              <th>车牌</th>
              <th>品牌</th>
              <th>型号</th>
              <th>颜色</th>
            </tr>
          </thead>

          <tbody>
            {vehicles.length === 0 ? (
              <tr>
                <td colSpan={5}>暂无数据</td>
              </tr>
            ) : (
              vehicles.map((car) => (
                <tr key={car.id}>
                  <td>{car.member_id}</td>
                  <td>{car.plate_number}</td>
                  <td>{car.brand}</td>
                  <td>{car.model}</td>
                  <td>{car.color}</td>
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
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  marginBottom: 20,
};

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
};

export default Vehicles;