import type { ChangeEvent } from "react";

type Props = {
  title: string;
  imageUrl?: string;
  uploading?: boolean;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove?: () => void;
};

function ServiceImageUploader({
  title,
  imageUrl,
  uploading,
  onUpload,
  onRemove,
}: Props) {
  return (
    <div style={container}>
      <div style={preview}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            style={image}
          />
        ) : (
          <div style={placeholder}>
            📷
          </div>
        )}
      </div>

      <div style={footer}>
        <strong>{title}</strong>

        <label style={uploadButton}>
          {uploading
            ? "上传中..."
            : imageUrl
            ? "更换图片"
            : "上传图片"}

          <input
            type="file"
            accept="image/*"
            onChange={onUpload}
            style={{ display: "none" }}
          />
        </label>

        {imageUrl && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            style={removeButton}
          >
            删除
          </button>
        )}
      </div>
    </div>
  );
}

const container = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  overflow: "hidden",
  background: "#fff",
};

const preview = {
  height: 120,
  background: "#f3f4f6",
};

const image = {
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
};

const placeholder = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 38,
};

const footer = {
  padding: 12,
  display: "flex",
  flexDirection: "column" as const,
  gap: 8,
};

const uploadButton = {
  padding: "10px",
  background: "#2563eb",
  color: "#fff",
  textAlign: "center" as const,
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 700,
};

const removeButton = {
  padding: "10px",
  border: "none",
  background: "#ef4444",
  color: "#fff",
  borderRadius: 8,
  cursor: "pointer",
};

export default ServiceImageUploader;