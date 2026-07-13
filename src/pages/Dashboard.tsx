import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function Dashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  async function loadDashboard() {
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .order("id", { ascending: false });

    const { data: membersData } = await supabase.from("members").select("*");
    const { data: vehiclesData } = await supabase.from("vehicles").select("*");

    const { data: itemsData } = await supabase
      .from("order_items")
      .select("*, services(*)");

    if (ordersData) setOrders(ordersData);
    if (membersData) setMembers(membersData);
    if (vehiclesData) setVehicles(vehiclesData);
    if (itemsData) setItems(itemsData);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const today = new Date().toDateString();

  const todayOrders = orders.filter(
    (order) => new Date(order.created_at).toDateString() === today
  );

  const todaySales = todayOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  const monthSales = orders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  const avgOrder = orders.length > 0 ? monthSales / orders.length : 0;

  const serviceCount: Record<string, number> = {};

  items.forEach((item) => {
    const name = item.services?.service_name || "未知服务";
    serviceCount[name] = (serviceCount[name] || 0) + Number(item.quantity || 1);
  });

  const topServices = Object.entries(serviceCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <>
      <div style={header}>
        <div>
          <h1 style={{ margin: 0 }}>Dashboard</h1>
          <p style={{ color: "#6b7280", marginTop: 6 }}>
            GTB Auto Detailing POS 营业总览
          </p>
        </div>

        <div style={aiBox}>🤖 AI Assistant Ready</div>
      </div>

      <div style={grid4}>
        <StatCard
          title="今日营业额"
          value={`$${todaySales.toFixed(2)}`}
          icon="💰"
          bg="#dcfce7"
          border="#16a34a"
        />

        <StatCard
          title="今日订单"
          value={`${todayOrders.length} 单`}
          icon="🧾"
          bg="#dbeafe"
          border="#2563eb"
        />

        <StatCard
          title="总会员"
          value={`${members.length} 人`}
          icon="👤"
          bg="#ede9fe"
          border="#7c3aed"
        />

        <StatCard
          title="车辆数量"
          value={`${vehicles.length} 台`}
          icon="🚗"
          bg="#ffedd5"
          border="#ea580c"
        />
      </div>

      <div style={grid2}>
        <StatCard
          title="本月营业额"
          value={`$${monthSales.toFixed(2)}`}
          icon="📈"
          bg="#fef9c3"
          border="#ca8a04"
        />

        <StatCard
          title="平均客单价"
          value={`$${avgOrder.toFixed(2)}`}
          icon="📊"
          bg="#e0f2fe"
          border="#0284c7"
        />
      </div>

      <div style={sectionGrid}>
        <div style={card}>
          <h2>最近订单</h2>

          {orders.slice(0, 5).map((order) => (
            <div key={order.id} style={orderRow}>
              <div>
                <strong>{order.order_no}</strong>
                <p style={{ margin: "6px 0 0", color: "#6b7280" }}>
                  会员ID：{order.member_id} · 车辆ID：{order.vehicle_id}
                </p>
              </div>

              <div style={{ textAlign: "right" }}>
                <span style={badge}>{order.status}</span>
                <h3 style={{ margin: "8px 0 0" }}>
                  ${Number(order.total).toFixed(2)}
                </h3>
              </div>
            </div>
          ))}

          {orders.length === 0 && <p>暂无订单</p>}
        </div>

        <div style={card}>
          <h2>热门服务</h2>

          {topServices.map(([name, count], index) => (
            <div key={name} style={serviceRow}>
              <span>
                {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "⭐"}{" "}
                {name}
              </span>
              <strong>{count} 次</strong>
            </div>
          ))}

          {topServices.length === 0 && <p>暂无数据</p>}
        </div>
      </div>

      <div style={aiPanel}>
        <h2>🤖 AI 店长提醒</h2>
        <p>今日营业数据已准备好。后续这里会自动显示：</p>
        <ul>
          <li>每日营业额分析</li>
          <li>热门服务建议</li>
          <li>库存不足提醒</li>
          <li>Email 自动日报</li>
        </ul>
      </div>
    </>
  );
}

function StatCard({
  title,
  value,
  icon,
  bg,
  border,
}: {
  title: string;
  value: string;
  icon: string;
  bg: string;
  border: string;
}) {
  return (
    <div
      style={{
        ...statCard,
        background: bg,
        borderLeft: `6px solid ${border}`,
      }}
    >
      <div style={{ fontSize: 34 }}>{icon}</div>
      <p style={{ margin: "10px 0 0", color: "#374151" }}>{title}</p>
      <h1 style={{ margin: "8px 0 0", fontSize: 34 }}>{value}</h1>
    </div>
  );
}

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 24,
};

const aiBox = {
  background: "#111827",
  color: "#fff",
  padding: "12px 18px",
  borderRadius: 999,
};

const grid4 = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 20,
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 20,
  marginTop: 20,
};

const sectionGrid = {
  display: "grid",
  gridTemplateColumns: "1.2fr 1fr",
  gap: 20,
  marginTop: 20,
};

const statCard = {
  padding: 22,
  borderRadius: 16,
  boxShadow: "0 10px 25px rgba(0,0,0,.08)",
};

const card = {
  background: "#fff",
  padding: 22,
  borderRadius: 16,
  boxShadow: "0 10px 25px rgba(0,0,0,.08)",
};

const orderRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "14px 0",
  borderBottom: "1px solid #e5e7eb",
};

const serviceRow = {
  display: "flex",
  justifyContent: "space-between",
  padding: "14px 0",
  borderBottom: "1px solid #e5e7eb",
};

const badge = {
  background: "#dcfce7",
  color: "#166534",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  textTransform: "capitalize" as const,
};

const aiPanel = {
  marginTop: 20,
  background: "linear-gradient(135deg, #111827, #2563eb)",
  color: "#fff",
  padding: 24,
  borderRadius: 18,
};

export default Dashboard;