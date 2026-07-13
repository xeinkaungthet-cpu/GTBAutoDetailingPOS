type Props = {
  selectedAreas: string[];
  onToggleArea: (area: string) => void;
};

const carAreas = [
  { id: "前保险杠 / Front Bumper", x: 200, y: 20, w: 200, h: 45 },
  { id: "引擎盖 / Bonnet", x: 210, y: 75, w: 180, h: 80 },
  { id: "前挡风玻璃 / Windshield", x: 220, y: 165, w: 160, h: 45 },
  { id: "车顶 / Roof", x: 220, y: 220, w: 160, h: 130 },
  { id: "后挡风玻璃 / Rear Windshield", x: 220, y: 360, w: 160, h: 45 },
  { id: "后备箱 / Trunk", x: 210, y: 415, w: 180, h: 70 },
  { id: "后保险杠 / Rear Bumper", x: 200, y: 495, w: 200, h: 45 },

  { id: "左前门 / Left Front Door", x: 70, y: 210, w: 120, h: 80 },
  { id: "左后门 / Left Rear Door", x: 70, y: 300, w: 120, h: 80 },
  { id: "右前门 / Right Front Door", x: 410, y: 210, w: 120, h: 80 },
  { id: "右后门 / Right Rear Door", x: 410, y: 300, w: 120, h: 80 },

  { id: "左前轮毂 / Left Front Wheel", x: 85, y: 125, w: 80, h: 80 },
  { id: "左后轮毂 / Left Rear Wheel", x: 85, y: 400, w: 80, h: 80 },
  { id: "右前轮毂 / Right Front Wheel", x: 435, y: 125, w: 80, h: 80 },
  { id: "右后轮毂 / Right Rear Wheel", x: 435, y: 400, w: 80, h: 80 },
];

function VehicleBodyMap({ selectedAreas, onToggleArea }: Props) {
  return (
    <div style={card}>
      <h2>车身损伤位置 / Vehicle Body Map</h2>
      <p style={{ color: "#6b7280" }}>
        点击车身部位标记损伤位置。红色代表已选择。
      </p>

      <div style={mapWrap}>
        <svg viewBox="0 0 600 580" style={svg}>
          <text x="300" y="15" textAnchor="middle" fontSize="18" fill="#374151">
            FRONT
          </text>

          <text x="300" y="565" textAnchor="middle" fontSize="18" fill="#374151">
            REAR
          </text>

          {carAreas.map((area) => {
            const active = selectedAreas.includes(area.id);

            const isWheel = area.id.includes("轮毂") || area.id.includes("Wheel");

            return isWheel ? (
              <g key={area.id} onClick={() => onToggleArea(area.id)} style={{ cursor: "pointer" }}>
                <circle
                  cx={area.x + area.w / 2}
                  cy={area.y + area.h / 2}
                  r="38"
                  fill={active ? "#fee2e2" : "#f8fafc"}
                  stroke={active ? "#ef4444" : "#cbd5e1"}
                  strokeWidth={active ? 4 : 2}
                />
                <text
                  x={area.x + area.w / 2}
                  y={area.y + area.h / 2 + 5}
                  textAnchor="middle"
                  fontSize="12"
                  fill={active ? "#991b1b" : "#111827"}
                >
                  {area.id.split(" / ")[0]}
                </text>
              </g>
            ) : (
              <g key={area.id} onClick={() => onToggleArea(area.id)} style={{ cursor: "pointer" }}>
                <rect
                  x={area.x}
                  y={area.y}
                  width={area.w}
                  height={area.h}
                  rx="14"
                  fill={active ? "#fee2e2" : "#f8fafc"}
                  stroke={active ? "#ef4444" : "#cbd5e1"}
                  strokeWidth={active ? 4 : 2}
                />
                <text
                  x={area.x + area.w / 2}
                  y={area.y + area.h / 2 + 5}
                  textAnchor="middle"
                  fontSize="13"
                  fill={active ? "#991b1b" : "#111827"}
                >
                  {area.id.split(" / ")[0]}
                </text>
              </g>
            );
          })}

          <line x1="200" y1="70" x2="70" y2="210" stroke="#cbd5e1" strokeWidth="3" />
          <line x1="400" y1="70" x2="530" y2="210" stroke="#cbd5e1" strokeWidth="3" />
          <line x1="200" y1="510" x2="70" y2="380" stroke="#cbd5e1" strokeWidth="3" />
          <line x1="400" y1="510" x2="530" y2="380" stroke="#cbd5e1" strokeWidth="3" />
        </svg>
      </div>

      {selectedAreas.length > 0 && (
        <div style={selectedBox}>
          <strong>已选择位置：</strong>
          <ul>
            {selectedAreas.map((area) => (
              <li key={area}>{area}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const card = {
  background: "#fff",
  padding: 24,
  borderRadius: 18,
  boxShadow: "0 10px 25px rgba(0,0,0,.08)",
  marginBottom: 20,
};

const mapWrap = {
  background: "#f8fafc",
  borderRadius: 18,
  padding: 20,
  marginTop: 20,
};

const svg = {
  width: "100%",
  maxWidth: 760,
  display: "block",
  margin: "0 auto",
};

const selectedBox = {
  marginTop: 20,
  background: "#fef2f2",
  border: "1px solid #fecaca",
  padding: 16,
  borderRadius: 14,
};

export default VehicleBodyMap;