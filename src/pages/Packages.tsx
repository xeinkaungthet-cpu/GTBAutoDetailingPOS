import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type { FormEvent } from "react";
import type { Service } from "../types/database";
import { ServiceService } from "../services/serviceService";

import {
  PackageService,
  type Package,
  type PackagePayload,
} from "../services/packageService";

import { formatCurrency } from "../utils/currency";

type PackageForm = {
  package_name: string;
  package_name_en: string;
  description: string;
  description_en: string;
  package_price: string;
  is_active: boolean;
  is_popular: boolean;
};

const emptyForm: PackageForm = {
  package_name: "",
  package_name_en: "",
  description: "",
  description_en: "",
  package_price: "",
  is_active: true,
  is_popular: false,
};

function Packages() {
  const [selectedServiceIds, setSelectedServiceIds] =
    useState<number[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

const [packages, setPackages] = useState<Package[]>([]);
const [services, setServices] = useState<Service[]>([]);
const [search, setSearch] = useState("");
const [statusFilter, setStatusFilter] = useState<
  "all" | "active" | "inactive"
>("all");
const [form, setForm] =
  useState<PackageForm>(emptyForm);

const [editingId, setEditingId] =
  useState<number | null>(null);


  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    try {
      const [packageData, serviceData] =
        await Promise.all([
          PackageService.getAll(),
          ServiceService.getAll(),
        ]);

      setPackages(packageData);
      setServices(serviceData);
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function updateForm<K extends keyof PackageForm>(
    field: K,
    value: PackageForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  const selectedServices = useMemo(() => {
    return services.filter((service) =>
      selectedServiceIds.includes(service.id)
    );
  }, [services, selectedServiceIds]);

  const originalPrice = useMemo(() => {
    return selectedServices.reduce(
      (total, service) =>
        total + Number(service.price || 0),
      0
    );
  }, [selectedServices]);

  const estimatedMinutes = useMemo(() => {
    return selectedServices.reduce(
      (total, service) =>
        total +
        Number(service.duration_minutes || 0),
      0
    );
  }, [selectedServices]);

  const packagePrice =
    Number(form.package_price) || 0;

  const savings = Math.max(
    originalPrice - packagePrice,
    0
  );

  const discountPercentage =
    originalPrice > 0
      ? Math.round((savings / originalPrice) * 100)
      : 0;

  const filteredPackages = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return packages.filter((packageItem) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" &&
          packageItem.is_active) ||
        (statusFilter === "inactive" &&
          !packageItem.is_active);

      const searchableText = [
        packageItem.package_name,
        packageItem.package_name_en,
        packageItem.description,
        packageItem.description_en,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesStatus &&
        (!keyword ||
          searchableText.includes(keyword))
      );
    });
  }, [packages, search, statusFilter]);

  function toggleService(serviceId: number) {
    setSelectedServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId]
    );
  }

  function resetForm() {
    setForm(emptyForm);
    setSelectedServiceIds([]);
    setEditingId(null);
  }

  function startEditing(packageItem: Package) {
    setEditingId(packageItem.id);

    setForm({
      package_name: packageItem.package_name || "",
      package_name_en:
        packageItem.package_name_en || "",
      description: packageItem.description || "",
      description_en:
        packageItem.description_en || "",
      package_price: String(
        packageItem.package_price ?? ""
      ),
      is_active: packageItem.is_active !== false,
      is_popular: packageItem.is_popular ?? false,
    });

    const ids =
      packageItem.package_services?.map(
        (item) => item.service_id
      ) ?? [];

    setSelectedServiceIds(ids);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function savePackage(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const packageName = form.package_name.trim();
    const price = Number(form.package_price);

    if (!packageName) {
      alert("请输入套餐名称");
      return;
    }

    if (selectedServiceIds.length === 0) {
      alert("请至少选择一个服务项目");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      alert("请输入正确的套餐价格");
      return;
    }

    const payload: PackagePayload = {
      package_name: packageName,
      package_name_en:
        form.package_name_en.trim() || null,

      description:
        form.description.trim() || null,
      description_en:
        form.description_en.trim() || null,

      original_price: originalPrice,
      package_price: price,
      estimated_minutes: estimatedMinutes,

      image_url: null,

      is_active: form.is_active,
      is_popular: form.is_popular,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await PackageService.update(
          editingId,
          payload,
          selectedServiceIds
        );

        alert("套餐修改成功");
      } else {
        await PackageService.create(
          payload,
          selectedServiceIds
        );

        alert("套餐创建成功");
      }

      resetForm();
      await loadData();
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(
    packageItem: Package
  ) {
    try {
      await PackageService.updateStatus(
        packageItem.id,
        !packageItem.is_active
      );

      await loadData();
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    }
  }

  async function deletePackage(
    packageItem: Package
  ) {
    const confirmed = window.confirm(
      `确定删除套餐“${packageItem.package_name}”吗？`
    );

    if (!confirmed) return;

    try {
      await PackageService.delete(packageItem.id);

      if (editingId === packageItem.id) {
        resetForm();
      }

      await loadData();
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    }
  }

  return (
    <main>
      <div style={pageHeader}>
        <div>
          <p style={eyebrow}>
            GTB Auto Detailing & Window Film
          </p>

          <h1 style={pageTitle}>
            套餐管理 / Package Management
          </h1>

          <p style={pageDescription}>
            创建优惠服务组合并提升客户客单价
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          style={refreshButton}
        >
          ↻ 刷新
        </button>
      </div>

      <div style={summaryGrid}>
        <SummaryCard
          icon="📦"
          title="全部套餐 / Total"
          value={packages.length}
        />

        <SummaryCard
          icon="✅"
          title="启用套餐 / Active"
          value={
            packages.filter((item) => item.is_active)
              .length
          }
        />

        <SummaryCard
          icon="🔥"
          title="热门套餐 / Popular"
          value={
            packages.filter(
              (item) => item.is_popular
            ).length
          }
        />

        <SummaryCard
          icon="🧰"
          title="服务项目 / Services"
          value={services.length}
        />
      </div>

      <form
        onSubmit={savePackage}
        style={formCard}
      >
        <div style={formHeader}>
          <div>
            <h2 style={formTitle}>
              {editingId === null
                ? "新增套餐 / New Package"
                : "编辑套餐 / Edit Package"}
            </h2>

            <p style={formDescription}>
              选择服务后，系统会自动计算原价和时间
            </p>
          </div>

          {editingId !== null && (
            <button
              type="button"
              onClick={resetForm}
              style={cancelButton}
            >
              取消编辑
            </button>
          )}
        </div>

        <div style={formGrid}>
          <FormField
            label="套餐名称 / Package Name"
            value={form.package_name}
            placeholder="例如：尊享美容套餐"
            onChange={(value) =>
              updateForm("package_name", value)
            }
          />

          <FormField
            label="英文名称 / English Name"
            value={form.package_name_en}
            placeholder="Premium Detailing Package"
            onChange={(value) =>
              updateForm("package_name_en", value)
            }
          />

          <FormField
            label="套餐价格 / Package Price"
            value={form.package_price}
            placeholder="228.00"
            type="number"
            onChange={(value) =>
              updateForm("package_price", value)
            }
          />

          <div style={calculationCard}>
            <PriceItem
              label="服务原价 / Original"
              value={formatCurrency(originalPrice)}
            />

            <PriceItem
              label="客户节省 / Savings"
              value={formatCurrency(savings)}
              highlight
            />

            <PriceItem
              label="优惠比例 / Discount"
              value={`${discountPercentage}%`}
            />

            <PriceItem
              label="预计时间 / Duration"
              value={`${estimatedMinutes} 分钟`}
            />
          </div>

          <label style={wideField}>
            <span style={fieldLabel}>
              中文介绍 / Chinese Description
            </span>

            <textarea
              value={form.description}
              onChange={(event) =>
                updateForm(
                  "description",
                  event.target.value
                )
              }
              placeholder="介绍套餐内容和优势..."
              style={textarea}
            />
          </label>

          <label style={wideField}>
            <span style={fieldLabel}>
              英文介绍 / English Description
            </span>

            <textarea
              value={form.description_en}
              onChange={(event) =>
                updateForm(
                  "description_en",
                  event.target.value
                )
              }
              placeholder="Describe the package benefits..."
              style={textarea}
            />
          </label>
        </div>

        <div style={servicePicker}>
          <div style={pickerHeader}>
            <div>
              <h3 style={pickerTitle}>
                套餐包含服务 / Included Services
              </h3>

              <p style={pickerDescription}>
                已选择 {selectedServiceIds.length} 项
              </p>
            </div>

            {selectedServiceIds.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setSelectedServiceIds([])
                }
                style={clearButton}
              >
                清空
              </button>
            )}
          </div>

          <div style={serviceGrid}>
            {services.map((service) => {
              const selected =
                selectedServiceIds.includes(
                  service.id
                );

              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() =>
                    toggleService(service.id)
                  }
                  style={{
                    ...serviceOption,
                    borderColor: selected
                      ? "#2563eb"
                      : "#e2e8f0",
                    background: selected
                      ? "#eff6ff"
                      : "#fff",
                  }}
                >
                  <span style={checkBox}>
                    {selected ? "✓" : "+"}
                  </span>

                  <span style={serviceInformation}>
                    <strong>
                      {service.service_name}
                    </strong>

                    <small style={serviceEnglish}>
                      {service.service_name_en ||
                        service.category}
                    </small>
                  </span>

                  <strong style={servicePrice}>
                    {formatCurrency(service.price)}
                  </strong>
                </button>
              );
            })}
          </div>
        </div>

        <div style={optionsGrid}>
          <label style={optionCard}>
            <input
              type="checkbox"
              checked={form.is_popular}
              onChange={(event) =>
                updateForm(
                  "is_popular",
                  event.target.checked
                )
              }
            />

            <span>
              🔥 热门套餐
              <small style={optionHint}>
                Best Seller
              </small>
            </span>
          </label>

          <label style={optionCard}>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) =>
                updateForm(
                  "is_active",
                  event.target.checked
                )
              }
            />

            <span>
              ✅ 启用套餐
              <small style={optionHint}>
                Available
              </small>
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            ...saveButton,
            opacity: saving ? 0.65 : 1,
          }}
        >
          {saving
            ? "保存中..."
            : editingId === null
              ? "创建套餐 / Create Package"
              : "保存修改 / Save Changes"}
        </button>
      </form>

      <div style={toolbar}>
        <input
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="🔍 搜索套餐..."
          style={input}
        />

        <select
  value={statusFilter}
  onChange={(event) =>
    setStatusFilter(
      event.target.value as
        | "all"
        | "active"
        | "inactive"
    )
  }
  style={input}
>
          <option value="all">
            全部状态 / All
          </option>

          <option value="active">
            已启用 / Active
          </option>

          <option value="inactive">
            已停用 / Inactive
          </option>
        </select>
      </div>

      {loading ? (
        <div style={emptyState}>
          正在读取套餐资料...
        </div>
      ) : filteredPackages.length === 0 ? (
        <div style={emptyState}>
          暂无套餐，请先创建第一个套餐。
        </div>
      ) : (
        <div style={packageGrid}>
          {filteredPackages.map((packageItem) => {
            const includedServices =
              packageItem.package_services
                ?.map((item) => item.services)
                .filter(
                  (
                    service
                  ): service is Service =>
                    Boolean(service)
                ) ?? [];

            const packageSavings = Math.max(
              Number(
                packageItem.original_price || 0
              ) -
                Number(
                  packageItem.package_price || 0
                ),
              0
            );

            return (
              <article
                key={packageItem.id}
                style={packageCard}
              >
                <div style={badgeRow}>
                  <span
                    style={{
                      ...statusBadge,
                      color: packageItem.is_active
                        ? "#15803d"
                        : "#b91c1c",
                      background:
                        packageItem.is_active
                          ? "#dcfce7"
                          : "#fee2e2",
                    }}
                  >
                    {packageItem.is_active
                      ? "可预约 / Active"
                      : "已停用 / Inactive"}
                  </span>

                  {packageItem.is_popular && (
                    <span style={popularBadge}>
                      🔥 BEST SELLER
                    </span>
                  )}
                </div>

                <h2 style={packageTitle}>
                  {packageItem.package_name}
                </h2>

                {packageItem.package_name_en && (
                  <p style={packageEnglishTitle}>
                    {packageItem.package_name_en}
                  </p>
                )}

                {packageItem.description && (
                  <p style={packageDescription}>
                    {packageItem.description}
                  </p>
                )}

                <div style={includedBox}>
                  <strong style={includedTitle}>
                    套餐包含 / What's Included
                  </strong>

                  {includedServices.map((service) => (
                    <div
                      key={service.id}
                      style={includedRow}
                    >
                      <span>
                        ✓ {service.service_name}
                      </span>

                      <small>
                        {formatCurrency(
                          service.price
                        )}
                      </small>
                    </div>
                  ))}
                </div>

                <div style={packagePriceArea}>
                  <div>
                    <span style={oldPrice}>
                      原价{" "}
                      {formatCurrency(
                        packageItem.original_price
                      )}
                    </span>

                    <strong style={newPrice}>
                      {formatCurrency(
                        packageItem.package_price
                      )}
                    </strong>
                  </div>

                  <span style={savingBadge}>
                    节省{" "}
                    {formatCurrency(packageSavings)}
                  </span>
                </div>

                <p style={durationText}>
                  ⏱ 预计{" "}
                  {packageItem.estimated_minutes} 分钟
                </p>

                <div style={actionGrid}>
                  <button
                    type="button"
                    onClick={() =>
                      startEditing(packageItem)
                    }
                    style={editButton}
                  >
                    ✏ 编辑
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      toggleStatus(packageItem)
                    }
                    style={statusButton}
                  >
                    {packageItem.is_active
                      ? "停用"
                      : "启用"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      deletePackage(packageItem)
                    }
                    style={deleteButton}
                  >
                    删除
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}

function SummaryCard({
  icon,
  title,
  value,
}: {
  icon: string;
  title: string;
  value: number;
}) {
  return (
    <div style={summaryCard}>
      <span style={summaryIcon}>{icon}</span>

      <div>
        <p style={summaryTitle}>{title}</p>
        <strong style={summaryNumber}>
          {value}
        </strong>
      </div>
    </div>
  );
}

function FormField({
  label,
  value,
  placeholder,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label style={field}>
      <span style={fieldLabel}>{label}</span>

      <input
        type={type}
        min={type === "number" ? "0" : undefined}
        step={
          type === "number" ? "0.01" : undefined
        }
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        style={input}
      />
    </label>
  );
}

function PriceItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <span style={calculationLabel}>
        {label}
      </span>

      <strong
        style={{
          ...calculationValue,
          color: highlight
            ? "#15803d"
            : "#334155",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (error as { message?: unknown }).message
    );
  }

  return "操作失败，请稍后重试";
}

const pageHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  flexWrap: "wrap" as const,
  gap: 20,
  marginBottom: 24,
};

const eyebrow = {
  margin: 0,
  color: "#2563eb",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: 1.5,
};

const pageTitle = {
  margin: "6px 0 0",
  color: "#111827",
  fontSize: 36,
};

const pageDescription = {
  margin: "8px 0 0",
  color: "#64748b",
};

const refreshButton = {
  padding: "12px 18px",
  border: "1px solid #d1d5db",
  borderRadius: 12,
  background: "#fff",
  cursor: "pointer",
  fontWeight: 800,
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 15,
  marginBottom: 22,
};

const summaryCard = {
  display: "flex",
  alignItems: "center",
  gap: 13,
  padding: 18,
  borderRadius: 17,
  background: "#fff",
  boxShadow:
    "0 8px 24px rgba(15,23,42,.06)",
};

const summaryIcon = {
  width: 45,
  height: 45,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 13,
  background: "#eff6ff",
  fontSize: 22,
};

const summaryTitle = {
  margin: 0,
  color: "#64748b",
  fontSize: 11,
};

const summaryNumber = {
  display: "block",
  marginTop: 4,
  color: "#111827",
  fontSize: 25,
};

const formCard = {
  padding: 24,
  borderRadius: 21,
  background: "#fff",
  boxShadow:
    "0 12px 32px rgba(15,23,42,.07)",
};

const formHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 15,
  marginBottom: 20,
};

const formTitle = {
  margin: 0,
  color: "#111827",
};

const formDescription = {
  margin: "6px 0 0",
  color: "#64748b",
};

const cancelButton = {
  padding: "10px 13px",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  background: "#fff",
  cursor: "pointer",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: 16,
};

const field = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 7,
};

const wideField = {
  ...field,
  gridColumn: "1 / -1",
};

const fieldLabel = {
  color: "#334155",
  fontSize: 13,
  fontWeight: 800,
};

const input = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "13px 14px",
  border: "1px solid #cbd5e1",
  borderRadius: 11,
  background: "#fff",
  fontSize: 14,
};

const textarea = {
  ...input,
  minHeight: 100,
  resize: "vertical" as const,
  lineHeight: 1.6,
};

const calculationCard = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: 12,
  padding: 13,
  borderRadius: 13,
  background: "#f8fafc",
};

const calculationLabel = {
  display: "block",
  color: "#94a3b8",
  fontSize: 10,
};

const calculationValue = {
  display: "block",
  marginTop: 4,
  fontSize: 13,
};

const servicePicker = {
  marginTop: 22,
  padding: 18,
  borderRadius: 17,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const pickerHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 15,
  marginBottom: 14,
};

const pickerTitle = {
  margin: 0,
};

const pickerDescription = {
  margin: "5px 0 0",
  color: "#64748b",
  fontSize: 12,
};

const clearButton = {
  padding: "8px 11px",
  border: "none",
  borderRadius: 9,
  background: "#e2e8f0",
  cursor: "pointer",
};

const serviceGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(230px, 1fr))",
  gap: 10,
};

const serviceOption = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 12,
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  cursor: "pointer",
  textAlign: "left" as const,
};

const checkBox = {
  width: 28,
  height: 28,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
  background: "#2563eb",
  color: "#fff",
  fontWeight: 900,
};

const serviceInformation = {
  display: "flex",
  flex: 1,
  flexDirection: "column" as const,
  minWidth: 0,
  color: "#334155",
};

const serviceEnglish = {
  marginTop: 3,
  color: "#94a3b8",
};

const servicePrice = {
  color: "#2563eb",
  fontSize: 12,
};

const optionsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: 13,
  marginTop: 18,
};

const optionCard = {
  display: "flex",
  alignItems: "center",
  gap: 11,
  padding: 14,
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  background: "#f8fafc",
  cursor: "pointer",
  fontWeight: 800,
};

const optionHint = {
  display: "block",
  marginTop: 3,
  color: "#94a3b8",
  fontSize: 10,
  fontWeight: 600,
};

const saveButton = {
  width: "100%",
  marginTop: 19,
  padding: 15,
  border: "none",
  borderRadius: 12,
  background: "#2563eb",
  color: "#fff",
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 900,
};

const toolbar = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1fr) minmax(180px, 230px)",
  gap: 12,
  margin: "24px 0 18px",
};

const emptyState = {
  padding: 45,
  borderRadius: 18,
  background: "#fff",
  color: "#64748b",
  textAlign: "center" as const,
};

const packageGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(330px, 1fr))",
  gap: 19,
};

const packageCard = {
  padding: 20,
  borderRadius: 19,
  background: "#fff",
  boxShadow:
    "0 10px 28px rgba(15,23,42,.07)",
};

const badgeRow = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 8,
  marginBottom: 14,
};

const statusBadge = {
  padding: "6px 9px",
  borderRadius: 999,
  fontSize: 9,
  fontWeight: 900,
};

const popularBadge = {
  padding: "6px 9px",
  borderRadius: 999,
  background: "#fee2e2",
  color: "#b91c1c",
  fontSize: 9,
  fontWeight: 900,
};

const packageTitle = {
  margin: 0,
  color: "#111827",
  fontSize: 23,
};

const packageEnglishTitle = {
  margin: "5px 0 0",
  color: "#64748b",
  fontSize: 14,
};

const packageDescription = {
  color: "#475569",
  fontSize: 13,
  lineHeight: 1.6,
};

const includedBox = {
  marginTop: 15,
  padding: 13,
  borderRadius: 12,
  background: "#f8fafc",
};

const includedTitle = {
  display: "block",
  marginBottom: 8,
  color: "#2563eb",
  fontSize: 11,
};

const includedRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  padding: "6px 0",
  color: "#334155",
  fontSize: 12,
};

const packagePriceArea = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 12,
  marginTop: 17,
};

const oldPrice = {
  display: "block",
  color: "#94a3b8",
  fontSize: 11,
  textDecoration: "line-through",
};

const newPrice = {
  display: "block",
  marginTop: 4,
  color: "#2563eb",
  fontSize: 28,
};

const savingBadge = {
  padding: "7px 10px",
  borderRadius: 999,
  background: "#dcfce7",
  color: "#15803d",
  fontSize: 10,
  fontWeight: 900,
};

const durationText = {
  color: "#64748b",
  fontSize: 11,
};

const actionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 9,
  marginTop: 15,
};

const editButton = {
  padding: "10px",
  border: "none",
  borderRadius: 9,
  background: "#eff6ff",
  color: "#2563eb",
  cursor: "pointer",
  fontWeight: 800,
};

const statusButton = {
  ...editButton,
  background: "#f1f5f9",
  color: "#475569",
};

const deleteButton = {
  ...editButton,
  background: "#fee2e2",
  color: "#b91c1c",
};

export default Packages;