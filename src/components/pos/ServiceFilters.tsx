type Props = {
  search: string;
  category: string;
  categories: string[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
};

function ServiceFilters({
  search,
  category,
  categories,
  onSearchChange,
  onCategoryChange,
}: Props) {
  return (
    <>
      <h2 style={{ marginTop: 24 }}>服务项目</h2>

      <input
        placeholder="🔍 搜索服务..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        style={input}
      />

      <div style={categoryBar}>
        {categories.map((item) => (
          <button
            key={item}
            onClick={() => onCategoryChange(item)}
            style={{
              ...categoryBtn,
              background: category === item ? "#2563eb" : "#f3f4f6",
              color: category === item ? "#fff" : "#374151",
            }}
          >
            {item}
          </button>
        ))}
      </div>
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

const categoryBar = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 10,
  marginTop: 15,
  marginBottom: 20,
};

const categoryBtn = {
  border: "none",
  borderRadius: 999,
  padding: "10px 18px",
  fontWeight: 700,
  cursor: "pointer",
};

export default ServiceFilters;