import { useRef } from "react";
import SignatureCanvas from "react-signature-canvas";

type Props = {
  onSave: (signatureDataUrl: string) => void;
};

function SignaturePad({ onSave }: Props) {
  const sigRef = useRef<SignatureCanvas | null>(null);

  function clearSignature() {
    sigRef.current?.clear();
  }

  function saveSignature() {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      alert("请先签名");
      return;
    }

    const dataUrl = sigRef.current.toDataURL("image/png");
    onSave(dataUrl);
    alert("签名已保存");
  }

  return (
    <div style={card}>
      <h2>客户签名 / Customer Signature</h2>

      <div style={signatureBox}>
        <SignatureCanvas
          ref={sigRef}
          penColor="black"
          canvasProps={{
            width: 700,
            height: 220,
            style: {
              width: "100%",
              height: 220,
              background: "#fff",
              borderRadius: 12,
            },
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <button onClick={clearSignature} style={clearBtn}>
          清除
        </button>

        <button onClick={saveSignature} style={saveBtn}>
          保存签名
        </button>
      </div>
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

const signatureBox = {
  border: "2px dashed #cbd5e1",
  borderRadius: 14,
  padding: 10,
  background: "#f8fafc",
};

const clearBtn = {
  flex: 1,
  padding: 14,
  border: "none",
  borderRadius: 12,
  background: "#e5e7eb",
  cursor: "pointer",
};

const saveBtn = {
  flex: 1,
  padding: 14,
  border: "none",
  borderRadius: 12,
  background: "#22c55e",
  color: "#fff",
  cursor: "pointer",
};

export default SignaturePad;