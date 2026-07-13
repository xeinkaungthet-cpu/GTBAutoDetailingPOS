import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import ServiceImageUploader from "../components/services/ServiceImageUploader";
import type { Service } from "../types/database";
import { ServiceService } from "../services/serviceService";
import { supabase } from "../lib/supabase";

type ServiceForm = {
rating: string;
review_count: string;

  service_name: string;
  service_name_en: string;

  description: string;
  description_en: string;

  category: string;

  price: string;
  duration_minutes: string;

  is_active: boolean;
  is_popular: boolean;
  is_recommended: boolean;

  image_url: string;
  before_image_url: string;
  after_image_url: string;
};

const emptyForm: ServiceForm = {
rating: "5.0",
review_count: "0",

  service_name: "",
  service_name_en: "",

  description: "",
  description_en: "",

  category: "",

  price: "",
  duration_minutes: "",

  is_active: true,
  is_popular: false,
  is_recommended: false,

  image_url: "",
  before_image_url: "",
  after_image_url: "",
};

function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  type UploadImageType = "main" | "before" | "after";


const [uploadingTarget, setUploadingTarget] = useState<{
  serviceId: number;
  imageType: UploadImageType;
} | null>(null);

  const filteredServices = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return services;

    return services.filter((service) => {
      return (
        service.service_name.toLowerCase().includes(keyword) ||
        service.category.toLowerCase().includes(keyword)
      );
    });
  }, [search, services]);

  async function loadServices() {
    setLoading(true);

    try {
      const data = await ServiceService.getAll();
      setServices(data);
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServices();
  }, []);

  function updateForm<K extends keyof ServiceForm>(
    field: K,
    value: ServiceForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function startEditing(service: Service) {
  setEditingId(service.id);

  setForm({
rating: String(service.rating ?? 5),
review_count: String(service.review_count ?? 0),

  service_name: service.service_name,
  service_name_en: service.service_name_en ?? "",

  description: service.description ?? "",
  description_en: service.description_en ?? "",

  category: service.category,

  price: String(service.price),
  duration_minutes: String(service.duration_minutes),

  is_active: service.is_active,
  is_popular: service.is_popular ?? false,
  is_recommended: service.is_recommended ?? false,

  image_url: service.image_url ?? "",
  before_image_url: service.before_image ?? "",
  after_image_url: service.after_image ?? "",
});

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

  function cancelEditing() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const serviceName = form.service_name.trim();
    const category = form.category.trim();
    const price = Number(form.price);
    const durationMinutes = Number(form.duration_minutes);
const rating = Number(form.rating);
const reviewCount = Number(form.review_count);

if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
  alert("评分必须在 0 到 5 之间");
  return;
}

if (!Number.isInteger(reviewCount) || reviewCount < 0) {
  alert("评价数量必须是 0 或以上的整数");
  return;
}

    if (!serviceName) {
      alert("请输入服务名称");
      return;
    }

    if (!category) {
      alert("请输入服务分类");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      alert("请输入正确的服务价格");
      return;
    }

    if (!Number.isFinite(durationMinutes) || durationMinutes < 0) {
      alert("请输入正确的施工时间");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        rating,
review_count: reviewCount,
  service_name: serviceName,
  service_name_en: form.service_name_en.trim() || undefined,

  description: form.description.trim() || undefined,
  description_en: form.description_en.trim() || undefined,

  category,
  price,
  duration_minutes: durationMinutes,

  is_active: form.is_active,
  is_popular: form.is_popular,
  is_recommended: form.is_recommended,

  image_url: form.image_url || undefined,
  before_image: form.before_image_url || undefined,
  after_image: form.after_image_url || undefined,
};

      if (editingId !== null) {
        await ServiceService.update(editingId, payload);
      } else {
        await ServiceService.create(payload);
      }

      cancelEditing();
      await loadServices();

      alert(editingId !== null ? "服务修改成功" : "服务新增成功");
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function toggleServiceStatus(service: Service) {
    try {
      await ServiceService.update(service.id, {
        is_active: !service.is_active,
      });

      await loadServices();
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    }
  }

  async function uploadServiceImage(
  service: Service,
  imageType: "main" | "before" | "after",
  event: ChangeEvent<HTMLInputElement>
) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("请选择图片文件");
      return;
    }

    const maximumSize = 5 * 1024 * 1024;

    if (file.size > maximumSize) {
      alert("图片不能超过 5MB");
      return;
    }

    setUploadingTarget({
  serviceId: service.id,
  imageType,
});

    try {
      const extension =
        file.name.split(".").pop()?.toLowerCase() || "jpg";

      const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "jpg";

      const filePath =
  `${service.id}/${imageType}-${Date.now()}.${safeExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("service-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("service-images")
        .getPublicUrl(filePath);

      const imageUrl = publicUrlData.publicUrl;

      const imageField =
  imageType === "main"
    ? "image_url"
    : imageType === "before"
      ? "before_image"
      : "after_image";

await ServiceService.update(service.id, {
  [imageField]: imageUrl,
});

      await loadServices();
      const successMessage =
  imageType === "main"
    ? "主图上传成功"
    : imageType === "before"
      ? "施工前图片上传成功"
      : "施工后图片上传成功";

alert(successMessage);
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    } finally {
      setUploadingTarget(null);
    }
  }

  async function removeServiceImage(
  service: Service,
  imageType: UploadImageType = "main"
) {
  const imageUrl =
    imageType === "main"
      ? service.image_url
      : imageType === "before"
        ? service.before_image
        : service.after_image;

  if (!imageUrl) return;

  const imageLabel =
    imageType === "main"
      ? "主图"
      : imageType === "before"
        ? "施工前图片"
        : "施工后图片";

  const confirmed = window.confirm(
    `确定移除“${service.service_name}”的${imageLabel}吗？`
  );

  if (!confirmed) return;

  try {
    const imageField =
      imageType === "main"
        ? "image_url"
        : imageType === "before"
          ? "before_image"
          : "after_image";

    await ServiceService.update(service.id, {
      [imageField]: null,
    });

    await loadServices();

    alert(`${imageLabel}已移除`);
  } catch (error: unknown) {
    alert(getErrorMessage(error));
  }
}

  async function deleteService(service: Service) {
    const confirmed = window.confirm(
      `确定删除服务“${service.service_name}”吗？\n删除后无法恢复。`
    );

    if (!confirmed) return;

    try {
      await ServiceService.delete(service.id);

      if (editingId === service.id) {
        cancelEditing();
      }

      await loadServices();
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    }
  }

  return (
    <div>
      <div style={pageHeader}>
        <div>
          <h1 style={pageTitle}>服务管理 / Service Management</h1>

          <p style={pageDescription}>
            管理服务价格、分类、施工时间、状态和展示图片
          </p>
        </div>

        <div style={countBadge}>
          共 {services.length} 个服务
        </div>
      </div>

      <form onSubmit={saveService} style={formCard}>
        <div style={formHeader}>
          <div>
            <h2 style={{ margin: 0 }}>
              {editingId === null ? "新增服务" : "编辑服务"}
            </h2>

            <p style={formDescription}>
              {editingId === null
                ? "填写资料后建立新的服务项目"
                : "修改当前服务的资料"}
            </p>
          </div>

          {editingId !== null && (
            <button
              type="button"
              onClick={cancelEditing}
              style={cancelButton}
            >
              取消编辑
            </button>
          )}
        </div>

        <div style={formGrid}>
          <label style={field}>
            <span style={fieldLabel}>服务名称</span>

            <input
              value={form.service_name}
              onChange={(event) =>
                updateForm("service_name", event.target.value)
              }
              placeholder="例如：精致洗车"
              style={input}
            />
            
          </label>

          <label style={field}>
            <span style={fieldLabel}>服务分类</span>

            <input
              value={form.category}
              onChange={(event) =>
                updateForm("category", event.target.value)
              }
              
              placeholder="例如：洗车、美容、镀膜"
              style={input}
            />
            <div style={field}>
  <label style={fieldLabel}>
    英文名称 / English Name
    
  </label>
  <div
  style={{
    display: "flex",
    gap: 30,
    marginTop: 20,
    marginBottom: 20,
  }}
>
  <label
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      cursor: "pointer",
      fontWeight: 600,
    }}
  >
    <input
      type="checkbox"
      checked={form.is_popular}
      onChange={(e) =>
        updateForm("is_popular", e.target.checked)
      }
    />

    🔥 热门服务 / Best Seller
  </label>

  <label
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      cursor: "pointer",
      fontWeight: 600,
    }}
  >
    <input
      type="checkbox"
      checked={form.is_recommended}
      onChange={(e) =>
        updateForm("is_recommended", e.target.checked)
      }
    />

    ⭐ 推荐服务 / Recommended
  </label>
</div>
<label style={field}>
  <span style={fieldLabel}>
    中文介绍 / Chinese Description
  </span>

  <textarea
    value={form.description}
    onChange={(event) =>
      updateForm("description", event.target.value)
    }
    placeholder="例如：高压冲洗、泡沫清洁、擦干车身"
    style={textareaInput}
  />
</label>

<label style={field}>
  <span style={fieldLabel}>
    英文介绍 / English Description
  </span>

  <textarea
    value={form.description_en}
    onChange={(event) =>
      updateForm("description_en", event.target.value)
    }
    placeholder="High Pressure Wash, Foam Pre-Wash, Hand Dry Finish"
    style={textareaInput}
  />
</label>
  <input
    value={form.service_name_en}
    onChange={(e) =>
      updateForm("service_name_en", e.target.value)
    }
    placeholder="Basic Wash"
    style={input}
  />
</div>
          </label>

          <label style={field}>
            <span style={fieldLabel}>价格</span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(event) =>
                updateForm("price", event.target.value)
              }
              placeholder="0.00"
              style={input}
            />
          </label>

          <label style={field}>
            <span style={fieldLabel}>施工时间（分钟）</span>

            <input
              type="number"
              min="0"
              step="1"
              value={form.duration_minutes}
              onChange={(event) =>
                updateForm("duration_minutes", event.target.value)
              }
              placeholder="30"
              style={input}
            />
          </label>
          <label style={field}>
  <span style={fieldLabel}>
    评分 / Rating
  </span>

  <input
    type="number"
    min="0"
    max="5"
    step="0.1"
    value={form.rating}
    onChange={(event) =>
      updateForm("rating", event.target.value)
    }
    placeholder="5.0"
    style={input}
  />
</label>

<label style={field}>
  <span style={fieldLabel}>
    评价数量 / Review Count
  </span>

  <input
    type="number"
    min="0"
    step="1"
    value={form.review_count}
    onChange={(event) =>
      updateForm("review_count", event.target.value)
    }
    placeholder="0"
    style={input}
  />
</label>
        </div>
<div style={featureOptions}>
  <label style={featureOption}>
    <input
      type="checkbox"
      checked={form.is_popular}
      onChange={(event) =>
        updateForm("is_popular", event.target.checked)
      }
    />

    <span>
      🔥 热门服务
      <small style={featureHint}>
        Best Seller
      </small>
    </span>
  </label>

  <label style={featureOption}>
    <input
      type="checkbox"
      checked={form.is_recommended}
      onChange={(event) =>
        updateForm("is_recommended", event.target.checked)
      }
    />

    <span>
      ⭐ 推荐服务
      <small style={featureHint}>
        Recommended
      </small>
    </span>
  </label>
</div>
        <div style={formFooter}>
          <label style={statusSwitch}>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) =>
                updateForm("is_active", event.target.checked)
              }
            />

            <span>建立后立即启用</span>
          </label>

          <button
            type="submit"
            disabled={saving}
            style={{
              ...saveButton,
              opacity: saving ? 0.65 : 1,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving
              ? "保存中..."
              : editingId === null
                ? "+ 新增服务"
                : "保存修改"}
          </button>
        </div>
      </form>

      <div style={toolbar}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="🔍 搜索服务名称或分类..."
          style={searchInput}
        />

        <button
          type="button"
          onClick={loadServices}
          style={refreshButton}
        >
          ↻ 刷新
        </button>
      </div>

      {loading ? (
        <div style={emptyCard}>正在载入服务...</div>
      ) : filteredServices.length === 0 ? (
        <div style={emptyCard}>没有找到服务项目</div>
      ) : (
        <div style={serviceGrid}>
          {filteredServices.map((service) => (
            <article key={service.id} style={serviceCard}>
              <div style={imageContainer}>
                {service.image_url ? (
                  <img
                    src={service.image_url}
                    alt={service.service_name}
                    style={serviceImage}
                  />
                ) : (
                  <div style={imagePlaceholder}>🚗</div>
                )}

                <span
                  style={{
                    ...statusBadge,
                    background: service.is_active
                      ? "rgba(22,163,74,.92)"
                      : "rgba(107,114,128,.92)",
                  }}
                >
                  {service.is_active ? "Active" : "Disabled"}
                </span>
              </div>

              <div style={serviceContent}>
                <div style={serviceTitleRow}>
                  <h3 style={serviceTitle}>
                    {service.service_name}
                  </h3>

                  <strong style={price}>
                    ${Number(service.price).toFixed(2)}
                  </strong>
                </div>

                <div style={imageUploaderGrid}>
  <ServiceImageUploader
  title="主图 / Main Image"
  imageUrl={service.image_url}
  uploading={
    uploadingTarget?.serviceId === service.id &&
    uploadingTarget.imageType === "main"
  }
  onUpload={(event) =>
    uploadServiceImage(service, "main", event)
  }
  onRemove={() =>
    removeServiceImage(service)
  }
/>
<ServiceImageUploader
  title="施工前 / Before"
  imageUrl={service.before_image}
  uploading={
    uploadingTarget?.serviceId === service.id &&
    uploadingTarget.imageType === "before"
  }
  onUpload={(event) =>
    uploadServiceImage(service, "before", event)
  }
  onRemove={() =>
    removeServiceImage(service, "before")
  }
/>
<ServiceImageUploader
  title="施工后 / After"
  imageUrl={service.after_image}
  uploading={
    uploadingTarget?.serviceId === service.id &&
    uploadingTarget.imageType === "after"
  }
  onUpload={(event) =>
    uploadServiceImage(service, "after", event)
  }
  onRemove={() =>
    removeServiceImage(service, "after")
  }
/>

</div>

                <div style={actionGrid}>
                  <button
                    type="button"
                    onClick={() => startEditing(service)}
                    style={editButton}
                  >
                    ✏ 编辑
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleServiceStatus(service)}
                    style={
                      service.is_active
                        ? disableButton
                        : enableButton
                    }
                  >
                    {service.is_active ? "停用" : "启用"}
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteService(service)}
                    style={deleteButton}
                  >
                    🗑 删除
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "操作失败，请稍后重试";
}

const pageHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 20,
  marginBottom: 24,
};

const pageTitle = {
  margin: 0,
  fontSize: 36,
};

const pageDescription = {
  margin: "8px 0 0",
  color: "#6b7280",
};

const countBadge = {
  padding: "10px 16px",
  borderRadius: 999,
  background: "#eff6ff",
  color: "#1d4ed8",
  fontWeight: 800,
};

const formCard = {
  background: "#fff",
  padding: 24,
  borderRadius: 20,
  boxShadow: "0 10px 30px rgba(15,23,42,.08)",
  marginBottom: 24,
};

const formHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 20,
};

const formDescription = {
  margin: "6px 0 0",
  color: "#6b7280",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
};

const field = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 8,
};

const fieldLabel = {
  fontWeight: 700,
  color: "#374151",
};

const textareaInput = {
  width: "100%",
  minHeight: 110,
  boxSizing: "border-box" as const,
  padding: "13px 14px",
  border: "1px solid #d1d5db",
  borderRadius: 12,
  fontSize: 15,
  lineHeight: 1.6,
  outline: "none",
  resize: "vertical" as const,
};

const input = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "13px 14px",
  border: "1px solid #d1d5db",
  borderRadius: 12,
  fontSize: 15,
  outline: "none",
};

const formFooter = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  marginTop: 20,
};

const statusSwitch = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  color: "#374151",
  fontWeight: 700,
};

const saveButton = {
  border: "none",
  borderRadius: 12,
  padding: "13px 22px",
  background: "#2563eb",
  color: "#fff",
  fontSize: 15,
  fontWeight: 800,
};

const cancelButton = {
  border: "1px solid #d1d5db",
  borderRadius: 10,
  padding: "10px 14px",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const toolbar = {
  display: "flex",
  gap: 12,
  marginBottom: 20,
};

const searchInput = {
  flex: 1,
  padding: "13px 15px",
  border: "1px solid #d1d5db",
  borderRadius: 12,
  fontSize: 15,
};

const refreshButton = {
  padding: "12px 18px",
  border: "1px solid #d1d5db",
  borderRadius: 12,
  background: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const serviceGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(290px, 1fr))",
  gap: 20,
};

const serviceCard = {
  overflow: "hidden",
  background: "#fff",
  borderRadius: 20,
  border: "1px solid #e5e7eb",
  boxShadow: "0 10px 30px rgba(15,23,42,.08)",
};

const imageContainer = {
  position: "relative" as const,
  height: 180,
  background: "#e5e7eb",
};

const serviceImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
  display: "block",
};

const imagePlaceholder = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 64,
  background: "linear-gradient(135deg,#dbeafe,#e0e7ff)",
};

const statusBadge = {
  position: "absolute" as const,
  top: 12,
  right: 12,
  color: "#fff",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 800,
};

const serviceContent = {
  padding: 18,
};

const serviceTitleRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 14,
};

const serviceTitle = {
  margin: 0,
  fontSize: 19,
};

const price = {
  whiteSpace: "nowrap" as const,
  color: "#111827",
  fontSize: 20,
};



const actionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 9,
  marginTop: 12,
};

const editButton = {
  padding: "10px 8px",
  border: "none",
  borderRadius: 10,
  background: "#f3f4f6",
  color: "#374151",
  cursor: "pointer",
  fontWeight: 700,
};

const disableButton = {
  padding: "10px 8px",
  border: "none",
  borderRadius: 10,
  background: "#fef3c7",
  color: "#92400e",
  cursor: "pointer",
  fontWeight: 700,
};

const enableButton = {
  padding: "10px 8px",
  border: "none",
  borderRadius: 10,
  background: "#dcfce7",
  color: "#166534",
  cursor: "pointer",
  fontWeight: 700,
};

const deleteButton = {
  padding: "10px 8px",
  border: "none",
  borderRadius: 10,
  background: "#fee2e2",
  color: "#b91c1c",
  cursor: "pointer",
  fontWeight: 700,
};

const emptyCard = {
  background: "#fff",
  padding: 50,
  borderRadius: 20,
  textAlign: "center" as const,
  color: "#6b7280",
  boxShadow: "0 10px 30px rgba(15,23,42,.06)",
};

const featureOptions = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
  marginTop: 20,
};

const featureOption = {
  display: "flex",
  alignItems: "center",
  gap: 11,
  padding: 14,
  border: "1px solid #e2e8f0",
  borderRadius: 13,
  background: "#f8fafc",
  color: "#334155",
  cursor: "pointer",
  fontWeight: 800,
};

const featureHint = {
  display: "block",
  marginTop: 3,
  color: "#94a3b8",
  fontSize: 10,
  fontWeight: 600,
};

const imageUploaderGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
  marginTop: 18,
};

export default Services;