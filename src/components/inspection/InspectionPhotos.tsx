import { useEffect, useMemo, useState } from "react";

export type InspectionPhotoType = "before" | "after";

export type InspectionPhotoPosition =
  | "front"
  | "rear"
  | "left"
  | "right"
  | "interior"
  | "engine"
  | "general";

export type InspectionPhotoDraft = {
  id: string;
  file: File;
  previewUrl: string;
  photoType: InspectionPhotoType;
  photoPosition: InspectionPhotoPosition;
  description: string;
};

type Props = {
  photos: InspectionPhotoDraft[];
  onChange: (photos: InspectionPhotoDraft[]) => void;
};

const photoPositions: Array<{
  value: InspectionPhotoPosition;
  label: string;
  icon: string;
}> = [
  { value: "front", label: "车头 / Front", icon: "🚘" },
  { value: "rear", label: "车尾 / Rear", icon: "🚗" },
  { value: "left", label: "左侧 / Left", icon: "⬅️" },
  { value: "right", label: "右侧 / Right", icon: "➡️" },
  { value: "interior", label: "内饰 / Interior", icon: "🪑" },
  { value: "engine", label: "引擎舱 / Engine", icon: "⚙️" },
  { value: "general", label: "其他 / General", icon: "📷" },
];

function InspectionPhotos({ photos, onChange }: Props) {
  const [activeType, setActiveType] =
    useState<InspectionPhotoType>("before");

  const [selectedPosition, setSelectedPosition] =
    useState<InspectionPhotoPosition>("front");

  const [description, setDescription] = useState("");

  const visiblePhotos = useMemo(
    () =>
      photos.filter(
        (photo) => photo.photoType === activeType
      ),
    [photos, activeType]
  );

  const beforeCount = photos.filter(
    (photo) => photo.photoType === "before"
  ).length;

  const afterCount = photos.filter(
    (photo) => photo.photoType === "after"
  ).length;

  useEffect(() => {
    return () => {
      photos.forEach((photo) => {
        URL.revokeObjectURL(photo.previewUrl);
      });
    };
  }, []);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (validFiles.length !== files.length) {
      alert("只能选择图片文件");
    }

    const oversizedFile = validFiles.find(
      (file) => file.size > 8 * 1024 * 1024
    );

    if (oversizedFile) {
      alert(
        `图片 ${oversizedFile.name} 超过 8MB，请压缩后重新上传`
      );
      return;
    }

    const newPhotos: InspectionPhotoDraft[] =
      validFiles.map((file) => ({
        id: `${Date.now()}-${crypto.randomUUID()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        photoType: activeType,
        photoPosition: selectedPosition,
        description: description.trim(),
      }));

    onChange([...photos, ...newPhotos]);
    setDescription("");
  }

  function removePhoto(id: string) {
    const target = photos.find((photo) => photo.id === id);

    if (target) {
      URL.revokeObjectURL(target.previewUrl);
    }

    onChange(photos.filter((photo) => photo.id !== id));
  }

  function updatePhoto(
    id: string,
    changes: Partial<
      Pick<
        InspectionPhotoDraft,
        "photoPosition" | "description"
      >
    >
  ) {
    onChange(
      photos.map((photo) =>
        photo.id === id
          ? {
              ...photo,
              ...changes,
            }
          : photo
      )
    );
  }

  function clearCurrentType() {
    const currentTypePhotos = photos.filter(
      (photo) => photo.photoType === activeType
    );

    if (currentTypePhotos.length === 0) return;

    const confirmed = window.confirm(
      `确定清除全部 ${
        activeType === "before"
          ? "施工前"
          : "施工后"
      }照片吗？`
    );

    if (!confirmed) return;

    currentTypePhotos.forEach((photo) => {
      URL.revokeObjectURL(photo.previewUrl);
    });

    onChange(
      photos.filter(
        (photo) => photo.photoType !== activeType
      )
    );
  }

  return (
    <section style={card}>
      <div style={header}>
        <div>
          <p style={eyebrow}>
            VEHICLE PHOTO RECORD
          </p>

          <h2 style={title}>
            车辆照片 / Inspection Photos
          </h2>

          <p style={descriptionText}>
            分别记录施工前与施工后的车辆状态
          </p>
        </div>

        <div style={countSummary}>
          <span style={countItem}>
            Before {beforeCount}
          </span>

          <span style={countItem}>
            After {afterCount}
          </span>
        </div>
      </div>

      <div style={typeTabs}>
        <button
          type="button"
          onClick={() => setActiveType("before")}
          style={{
            ...typeTab,
            background:
              activeType === "before"
                ? "#2563eb"
                : "#f1f5f9",
            color:
              activeType === "before"
                ? "#fff"
                : "#475569",
          }}
        >
          📷 施工前 / Before
          {beforeCount > 0 && (
            <span style={tabBadge}>
              {beforeCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveType("after")}
          style={{
            ...typeTab,
            background:
              activeType === "after"
                ? "#16a34a"
                : "#f1f5f9",
            color:
              activeType === "after"
                ? "#fff"
                : "#475569",
          }}
        >
          ✨ 施工后 / After
          {afterCount > 0 && (
            <span style={tabBadge}>
              {afterCount}
            </span>
          )}
        </button>
      </div>

      <div style={uploadPanel}>
        <div>
          <p style={sectionLabel}>
            选择照片位置 / Position
          </p>

          <div style={positionGrid}>
            {photoPositions.map((position) => (
              <button
                key={position.value}
                type="button"
                onClick={() =>
                  setSelectedPosition(position.value)
                }
                style={{
                  ...positionButton,
                  border:
                    selectedPosition ===
                    position.value
                      ? "2px solid #2563eb"
                      : "1px solid #dbe3ee",
                  background:
                    selectedPosition ===
                    position.value
                      ? "#eff6ff"
                      : "#fff",
                  color:
                    selectedPosition ===
                    position.value
                      ? "#1d4ed8"
                      : "#475569",
                }}
              >
                <span style={{ fontSize: 20 }}>
                  {position.icon}
                </span>

                <span>{position.label}</span>
              </button>
            ))}
          </div>
        </div>

        <label style={field}>
          <span style={sectionLabel}>
            照片备注 / Description
          </span>

          <input
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            placeholder="例如：左前门划痕、后保险杠掉漆"
            style={input}
          />
        </label>

        <label style={uploadButton}>
          <span style={{ fontSize: 24 }}>＋</span>

          <span>
            上传
            {activeType === "before"
              ? "施工前"
              : "施工后"}
            照片
          </span>

          <small style={uploadHint}>
            支持多张图片，每张不超过 8MB
          </small>

          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(event) => {
              handleFiles(event.target.files);
              event.target.value = "";
            }}
            style={{ display: "none" }}
          />
        </label>
      </div>

      <div style={galleryHeader}>
        <div>
          <strong>
            {activeType === "before"
              ? "施工前照片 / Before Photos"
              : "施工后照片 / After Photos"}
          </strong>

          <p style={galleryDescription}>
            共 {visiblePhotos.length} 张照片
          </p>
        </div>

        {visiblePhotos.length > 0 && (
          <button
            type="button"
            onClick={clearCurrentType}
            style={clearButton}
          >
            清除全部
          </button>
        )}
      </div>

      {visiblePhotos.length === 0 ? (
        <div style={emptyState}>
          <div style={{ fontSize: 42 }}>📷</div>

          <strong>
            暂无
            {activeType === "before"
              ? "施工前"
              : "施工后"}
            照片
          </strong>

          <p style={emptyDescription}>
            选择车辆位置后上传照片，保存验车记录时会同步上传。
          </p>
        </div>
      ) : (
        <div style={photoGrid}>
          {visiblePhotos.map((photo) => (
            <article
              key={photo.id}
              style={photoCard}
            >
              <div style={imageWrapper}>
                <img
                  src={photo.previewUrl}
                  alt={photo.description || "车辆照片"}
                  style={image}
                />

                <span style={photoTypeBadge}>
                  {photo.photoType === "before"
                    ? "Before"
                    : "After"}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    removePhoto(photo.id)
                  }
                  style={removeButton}
                  aria-label="删除照片"
                >
                  ×
                </button>
              </div>

              <div style={photoContent}>
                <label style={photoField}>
                  <span style={photoFieldLabel}>
                    位置
                  </span>

                  <select
                    value={photo.photoPosition}
                    onChange={(event) =>
                      updatePhoto(photo.id, {
                        photoPosition:
                          event.target
                            .value as InspectionPhotoPosition,
                      })
                    }
                    style={select}
                  >
                    {photoPositions.map(
                      (position) => (
                        <option
                          key={position.value}
                          value={position.value}
                        >
                          {position.label}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label style={photoField}>
                  <span style={photoFieldLabel}>
                    备注
                  </span>

                  <input
                    value={photo.description}
                    onChange={(event) =>
                      updatePhoto(photo.id, {
                        description:
                          event.target.value,
                      })
                    }
                    placeholder="补充照片说明"
                    style={input}
                  />
                </label>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

const card = {
  marginBottom: 22,
  padding: 24,
  borderRadius: 20,
  background: "#fff",
  boxShadow:
    "0 10px 30px rgba(15,23,42,.08)",
};

const header = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
};

const eyebrow = {
  margin: 0,
  color: "#2563eb",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: 1.4,
};

const title = {
  margin: "5px 0 0",
  color: "#111827",
  fontSize: 24,
};

const descriptionText = {
  margin: "7px 0 0",
  color: "#64748b",
  fontSize: 13,
};

const countSummary = {
  display: "flex",
  flexWrap: "wrap" as const,
  justifyContent: "flex-end",
  gap: 8,
};

const countItem = {
  padding: "7px 10px",
  borderRadius: 999,
  background: "#f1f5f9",
  color: "#475569",
  fontSize: 11,
  fontWeight: 800,
};

const typeTabs = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: 12,
  marginTop: 22,
};

const typeTab = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: 13,
  border: "none",
  borderRadius: 13,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 800,
};

const tabBadge = {
  minWidth: 21,
  height: 21,
  padding: "0 6px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  background: "rgba(255,255,255,.22)",
  fontSize: 11,
};

const uploadPanel = {
  display: "grid",
  gap: 18,
  marginTop: 20,
  padding: 18,
  borderRadius: 16,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
};

const sectionLabel = {
  display: "block",
  margin: 0,
  color: "#334155",
  fontSize: 12,
  fontWeight: 800,
};

const positionGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(145px, 1fr))",
  gap: 10,
  marginTop: 10,
};

const positionButton = {
  minHeight: 68,
  padding: 11,
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  borderRadius: 12,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
};

const field = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 8,
};

const input = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "11px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  background: "#fff",
  fontSize: 13,
  outline: "none",
};

const select = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "10px 11px",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  background: "#fff",
  fontSize: 12,
};

const uploadButton = {
  minHeight: 115,
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  border: "2px dashed #93c5fd",
  borderRadius: 15,
  background: "#eff6ff",
  color: "#1d4ed8",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 900,
};

const uploadHint = {
  color: "#64748b",
  fontSize: 11,
  fontWeight: 500,
};

const galleryHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  marginTop: 22,
};

const galleryDescription = {
  margin: "5px 0 0",
  color: "#64748b",
  fontSize: 12,
};

const clearButton = {
  padding: "9px 12px",
  border: "none",
  borderRadius: 10,
  background: "#fee2e2",
  color: "#b91c1c",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 800,
};

const emptyState = {
  marginTop: 15,
  padding: 38,
  borderRadius: 15,
  background: "#f8fafc",
  textAlign: "center" as const,
  color: "#475569",
};

const emptyDescription = {
  maxWidth: 430,
  margin: "8px auto 0",
  color: "#94a3b8",
  fontSize: 12,
  lineHeight: 1.6,
};

const photoGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 16,
  marginTop: 15,
};

const photoCard = {
  overflow: "hidden",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  background: "#fff",
};

const imageWrapper = {
  position: "relative" as const,
  height: 165,
  background: "#e2e8f0",
};

const image = {
  width: "100%",
  height: "100%",
  display: "block",
  objectFit: "cover" as const,
};

const photoTypeBadge = {
  position: "absolute" as const,
  top: 10,
  left: 10,
  padding: "5px 9px",
  borderRadius: 999,
  background: "rgba(15,23,42,.82)",
  color: "#fff",
  fontSize: 10,
  fontWeight: 800,
};

const removeButton = {
  position: "absolute" as const,
  top: 9,
  right: 9,
  width: 30,
  height: 30,
  border: "none",
  borderRadius: 999,
  background: "rgba(185,28,28,.9)",
  color: "#fff",
  cursor: "pointer",
  fontSize: 20,
  lineHeight: 1,
};

const photoContent = {
  display: "grid",
  gap: 11,
  padding: 13,
};

const photoField = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 6,
};

const photoFieldLabel = {
  color: "#64748b",
  fontSize: 10,
  fontWeight: 800,
};

export default InspectionPhotos;