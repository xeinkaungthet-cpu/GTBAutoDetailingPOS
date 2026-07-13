type Member = {
  id: number;
  name: string;
  phone: string;
};

type Vehicle = {
  id: number;
  plate_number: string;
  brand: string;
  model: string;
};

type Props = {
  members: Member[];
  vehicles: Vehicle[];
  selectedMemberId: string;
  selectedVehicleId: string;
  onMemberChange: (value: string) => void;
  onVehicleChange: (value: string) => void;
};

function CustomerPanel({
  members,
  vehicles,
  selectedMemberId,
  selectedVehicleId,
  onMemberChange,
  onVehicleChange,
}: Props) {
  return (
    <>
      <h2>客户信息</h2>

      <select
        value={selectedMemberId}
        onChange={(e) => onMemberChange(e.target.value)}
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
        onChange={(e) => onVehicleChange(e.target.value)}
        style={input}
        disabled={!selectedMemberId}
      >
        <option value="">请选择车辆</option>

        {vehicles.map((car) => (
          <option key={car.id} value={car.id}>
            {car.plate_number} - {car.brand} {car.model}
          </option>
        ))}
      </select>
    </>
  );
}

const input = {
  width: "100%",
  padding: 14,
  marginTop: 10,
  marginBottom: 12,
  borderRadius: 12,
  border: "1px solid #d1d5db",
  fontSize: 16,
};

export default CustomerPanel;