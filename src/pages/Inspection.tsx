import { useEffect, useState } from "react";
import type { Inspection as InspectionType, Member, Vehicle } from "../types/database";
import { MemberService } from "../services/memberService";
import { VehicleService } from "../services/vehicleService";
import { InspectionService } from "../services/inspectionService";
import VehicleBodyMap from "../components/inspection/VehicleBodyMap";
import SignaturePad from "../components/inspection/SignaturePad";
import InspectionReport from "../components/inspection/InspectionReport";
import InspectionPhotos, {
  type InspectionPhotoDraft,
} from "../components/inspection/InspectionPhotos";
import { supabase } from "../lib/supabase";

function Inspection() {
  const [members, setMembers] = useState<Member[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");

  const [notes, setNotes] = useState("");
  const [mileage, setMileage] = useState("");

const [fuelLevel, setFuelLevel] = useState("Half");

const [keysCount, setKeysCount] = useState("1");

const [valuableItems, setValuableItems] = useState("");

const [technician, setTechnician] =
  useState("Administrator");

const [estimatedFinish, setEstimatedFinish] =
  useState("");
  const [damages, setDamages] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [photos, setPhotos] = useState<InspectionPhotoDraft[]>([]);
  const [signature, setSignature] = useState("");
  const [savedInspection, setSavedInspection] = useState<InspectionType | null>(null);

  const damageOptions = [
    "刮伤 Scratch",
    "凹陷 Dent",
    "掉漆 Paint Damage",
    "裂纹 Crack",
    "轮毂刮伤 Wheel Scratch",
    "内饰污渍 Interior Stain",
  ];

  async function loadMembers() {
    try {
      const data = await MemberService.getAll();
      setMembers(data);
    } catch (error: any) {
      alert(error.message);
    }
  }

  async function loadVehicles(memberId: string) {
    try {
      const data = await VehicleService.getByMemberId(Number(memberId));
      setVehicles(data);
    } catch (error: any) {
      alert(error.message);
    }
  }

  useEffect(() => {
    loadMembers();
  }, []);

  function handleMemberChange(memberId: string) {
    setSelectedMemberId(memberId);
    setSelectedVehicleId("");
    setVehicles([]);

    if (memberId) {
      loadVehicles(memberId);
    }
  }

  function toggleDamage(damage: string) {
    setDamages((prev) =>
      prev.includes(damage)
        ? prev.filter((d) => d !== damage)
        : [...prev, damage]
    );
  }

  function toggleArea(area: string) {
    setSelectedAreas((prev) =>
      prev.includes(area)
        ? prev.filter((a) => a !== area)
        : [...prev, area]
    );
  }

  async function saveInspection() {
    if (!selectedMemberId) return alert("请选择会员");
    if (!selectedVehicleId) return alert("请选择车辆");
    if (!signature) return alert("请客户先签名");

    const member = members.find((m) => String(m.id) === selectedMemberId);
    const vehicle = vehicles.find((v) => String(v.id) === selectedVehicleId);

    const inspectionNo = "INS-" + Date.now();

    let inspection: InspectionType;

    try {
      inspection = await InspectionService.createInspection({
    
        inspection_no: inspectionNo,
        member_id: Number(selectedMemberId),
        vehicle_id: Number(selectedVehicleId),
        customer_name: member?.name || "",
        phone: member?.phone || "",
        plate_number: vehicle?.plate_number || "",
        vehicle_model: `${vehicle?.brand || ""} ${vehicle?.model || ""}`,
        inspection_type: "before",
        condition_notes: notes,
        damage_summary: [...selectedAreas, ...damages].join(", "),
        status: "completed",
        customer_signature: signature,
mileage: mileage ? Number(mileage) : null,

fuel_level: fuelLevel,

keys_count: Number(keysCount),

valuable_items: valuableItems,

technician: technician,

estimated_finish: estimatedFinish || null,

      });
    } catch (error: any) {
      alert(error.message);
      return;
    }

    for (const area of selectedAreas) {
      for (const damage of damages.length ? damages : ["未指定损伤类型"]) {
        const { error } = await supabase.from("inspection_damages").insert([
          {
            inspection_id: inspection.id,
            area,
            damage_type: damage,
            severity: 1,
            notes,
          },
        ]);

        if (error) {
          alert(error.message);
          return;
        }
      }
    }

    for (const photo of photos) {
  try {
    const url =
      await InspectionService.uploadPhoto(
        photo.file,
        inspection.id,
        photo.photoType,
        photo.photoPosition
      );

    await InspectionService.savePhoto({
      inspectionId: inspection.id,
      photoUrl: url,
      photoType: photo.photoType,
      photoPosition: photo.photoPosition,
      description: photo.description,
    });
  } catch (error: any) {
    alert(error.message);
    return;
  }
}

    setSavedInspection(inspection);
    alert("验车记录保存成功：" + inspectionNo);

    setSelectedMemberId("");
    setSelectedVehicleId("");
    setVehicles([]);
    setNotes("");
    setDamages([]);
    setSelectedAreas([]);
    setPhotos([]);
    setSignature("");
  }

  return (
    <>
      <h1>车辆验车 / Vehicle Inspection</h1>

      <div style={card}>
        <h2>客户与车辆</h2>

        <select
        
          value={selectedMemberId}
          onChange={(e) => handleMemberChange(e.target.value)}
          style={input}
        >
          <option value="">请选择会员</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name} - {member.phone}
            </option>
          ))}
        </select>

        <select
          value={selectedVehicleId}
          onChange={(e) => setSelectedVehicleId(e.target.value)}
          style={input}
          disabled={!selectedMemberId}
        >
          <option value="">请选择车辆</option>
          {vehicles.map((car) => (
            <option key={car.id} value={car.id}>
              {car.plate_number} - {car.brand} {car.model}
            </option>
          ))}
        </select><input
  style={input}
  placeholder="公里数 / Mileage"
  value={mileage}
  onChange={(e) => setMileage(e.target.value)}
/>

<select
  style={input}
  value={fuelLevel}
  onChange={(e) => setFuelLevel(e.target.value)}
>
  <option>Empty</option>
  <option>1/4</option>
  <option>Half</option>
  <option>3/4</option>
  <option>Full</option>
</select>

<input
  style={input}
  placeholder="钥匙数量"
  value={keysCount}
  onChange={(e) => setKeysCount(e.target.value)}
/>

<input
  style={input}
  placeholder="贵重物品"
  value={valuableItems}
  onChange={(e) => setValuableItems(e.target.value)}
/>

<input
  style={input}
  placeholder="施工负责人"
  value={technician}
  onChange={(e) => setTechnician(e.target.value)}
/>

<input
  type="datetime-local"
  style={input}
  value={estimatedFinish}
  onChange={(e) =>
    setEstimatedFinish(e.target.value)
  }
/>
      </div>

      <VehicleBodyMap selectedAreas={selectedAreas} onToggleArea={toggleArea} />
<InspectionPhotos
  photos={photos}
  onChange={setPhotos}
/>
      <div style={card}>
        <h2>损伤类型 / Damage Type</h2>

        <div style={damageGrid}>
          {damageOptions.map((damage) => (
            <button
              key={damage}
              onClick={() => toggleDamage(damage)}
              style={{
                ...damageBtn,
                background: damages.includes(damage) ? "#fee2e2" : "#f3f4f6",
                border: damages.includes(damage)
                  ? "2px solid #ef4444"
                  : "1px solid #d1d5db",
              }}
            >
              {damages.includes(damage) ? "✓ " : ""}
              {damage}
            </button>
          ))}
        </div>
      </div>

      <div style={card}>
        <h2>检查备注</h2>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="例如：左前门有 15cm 划痕，后保险杠轻微掉漆..."
          style={textarea}
        />
      </div>

    
      <SignaturePad
        onSave={(dataUrl) => {
          setSignature(dataUrl);
        }}
      />

      <button onClick={saveInspection} style={saveBtn}>
        保存验车记录
      </button>

      {savedInspection && (
        <div style={{ marginTop: 30 }}>
          <InspectionReport inspection={savedInspection} />
        </div>
      )}
    </>
  );
}

const card = {
  background: "#fff",
  padding: 24,
  borderRadius: 18,
  boxShadow: "0 10px 25px rgba(0,0,0,.08)",
  marginBottom: 20,
};

const input = {
  width: "100%",
  padding: 14,
  marginTop: 12,
  borderRadius: 12,
  border: "1px solid #d1d5db",
  fontSize: 16,
};

const damageGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const damageBtn = {
  padding: 14,
  borderRadius: 12,
  cursor: "pointer",
  fontSize: 16,
};

const textarea = {
  width: "100%",
  minHeight: 130,
  padding: 14,
  borderRadius: 12,
  border: "1px solid #d1d5db",
  fontSize: 16,
};

const saveBtn = {
  width: "100%",
  padding: 18,
  border: "none",
  borderRadius: 14,
  background: "#2563eb",
  color: "#fff",
  fontSize: 20,
  cursor: "pointer",
};

export default Inspection;