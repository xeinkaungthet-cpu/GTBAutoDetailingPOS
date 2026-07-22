import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Certificate = {
  id: string;
  image: string;
  title: string;
  titleEn: string;
  issuer: string;
  year: string;
  category: string;
};

const certificates: Certificate[] = [
  {
    id: "gold-family-detailing",
    image:
      "/certificates/gold-family-detailing.webp",
    title: "专业汽车美容培训认证",
    titleEn: "Professional Auto Detailing",
    issuer: "Gold Family Training Center",
    year: "2025",
    category: "Detailing Training",
  },
  {
    id: "supcar-window-film",
    image:
      "/certificates/supcar-window-film.webp",
    title: "汽车隔热膜专业施工认证",
    titleEn: "Window Film Installation",
    issuer: "SupCar Auto Detailing",
    year: "2026",
    category: "Window Film Training",
  },
  {
    id: "ida-certified-detailer",
    image:
      "/certificates/ida-certified-detailer.webp",
    title: "国际认证汽车美容技师",
    titleEn: "IDA Certified Detailer",
    issuer:
      "International Detailing Association",
    year: "2024–2026",
    category: "International Certification",
  },
  {
    id: "supcar-ppf",
    image:
      "/certificates/supcar-ppf.webp",
    title: "汽车漆面保护膜施工认证",
    titleEn: "Paint Protection Film (PPF)",
    issuer: "SupCar Auto Detailing",
    year: "2026",
    category: "PPF Training",
  },
];

function CertificatesSection() {
  const [selectedIndex, setSelectedIndex] =
    useState<number | null>(null);

  const selectedCertificate = useMemo(
    () =>
      selectedIndex === null
        ? null
        : certificates[selectedIndex],
    [selectedIndex]
  );

  useEffect(() => {
    if (selectedIndex === null) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedIndex(null);
      }

      if (event.key === "ArrowLeft") {
        setSelectedIndex((current) => {
          if (current === null) {
            return null;
          }

          return (
            current -
            1 +
            certificates.length
          ) % certificates.length;
        });
      }

      if (event.key === "ArrowRight") {
        setSelectedIndex((current) => {
          if (current === null) {
            return null;
          }

          return (
            current + 1
          ) % certificates.length;
        });
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [selectedIndex]);

  function showPrevious() {
    setSelectedIndex((current) => {
      if (current === null) {
        return null;
      }

      return (
        current -
        1 +
        certificates.length
      ) % certificates.length;
    });
  }

  function showNext() {
    setSelectedIndex((current) => {
      if (current === null) {
        return null;
      }

      return (
        current + 1
      ) % certificates.length;
    });
  }

  return (
    <>
      <section
        style={section}
        aria-labelledby="certificate-title"
      >
        <style>
          {`
            @media (max-width: 900px) {
              .certificate-grid {
                grid-template-columns: 1fr 1fr !important;
              }

              .certificate-heading {
                align-items: flex-start !important;
                flex-direction: column !important;
              }

              .certificate-proof-grid {
                grid-template-columns: 1fr !important;
              }
            }

            @media (max-width: 640px) {
              .certificate-section {
                padding: 64px 16px !important;
              }

              .certificate-panel {
                padding: 24px 16px 18px !important;
                border-radius: 26px !important;
              }

              .certificate-grid {
                grid-template-columns: 1fr !important;
              }

              .certificate-title {
                font-size: 34px !important;
              }

              .certificate-card-image {
                aspect-ratio: 4 / 3 !important;
              }

              .certificate-lightbox {
                padding: 12px !important;
              }

              .certificate-lightbox-content {
                padding: 12px !important;
                border-radius: 20px !important;
              }

              .certificate-lightbox-controls {
                position: static !important;
                margin-top: 12px !important;
              }
            }
          `}
        </style>

        <div style={glowOne} />
        <div style={glowTwo} />

        <div
          style={panel}
          className="certificate-panel"
        >
          <div
            style={heading}
            className="certificate-heading"
          >
            <div style={headingCopy}>
              <div style={eyebrowRow}>
                <span style={goldLine} />
                <span style={eyebrow}>
                  TRAINED · CERTIFIED · TRUSTED
                </span>
              </div>

              <h2
                id="certificate-title"
                style={title}
                className="certificate-title"
              >
                专业认证与培训资历
                <span style={titleAccent}>
                  {" "}
                  / Certifications
                </span>
              </h2>

              <p style={description}>
                每一项服务都建立在系统培训、专业施工标准与持续学习之上。
                <br />
                Professional training and recognized
                certifications behind every service.
              </p>
            </div>

            <div style={trustSeal}>
              <span style={trustSealIcon}>✓</span>

              <div>
                <strong style={trustSealTitle}>
                  VERIFIED SKILLS
                </strong>

                <span style={trustSealText}>
                  Professional Credentials
                </span>
              </div>
            </div>
          </div>

          <div
            style={proofGrid}
            className="certificate-proof-grid"
          >
            <ProofItem
              number="04"
              label="专业证书"
              english="Professional Certificates"
            />

            <ProofItem
              number="03"
              label="专业领域"
              english="Specialized Disciplines"
            />

            <ProofItem
              number="01"
              label="国际认证"
              english="International Credential"
            />
          </div>

          <div
            style={certificateGrid}
            className="certificate-grid"
          >
            {certificates.map(
              (certificate, index) => (
                <button
                  key={certificate.id}
                  type="button"
                  onClick={() =>
                    setSelectedIndex(index)
                  }
                  style={cardButton}
                  aria-label={`查看证书：${certificate.title}`}
                >
                  <article style={card}>
                    <div style={imageFrame}>
                      <img
                        src={certificate.image}
                        alt={`${certificate.title} / ${certificate.titleEn}`}
                        style={certificateImage}
                        className="certificate-card-image"
                        loading="lazy"
                      />

                      <div style={imageShade} />

                      <span style={categoryBadge}>
                        {certificate.category}
                      </span>

                      <span style={viewBadge}>
                        <span style={viewIcon}>⌕</span>
                        查看证书 / View
                      </span>
                    </div>

                    <div style={cardContent}>
                      <div style={cardTopRow}>
                        <span style={cardIndex}>
                          0{index + 1}
                        </span>

                        <span style={yearBadge}>
                          {certificate.year}
                        </span>
                      </div>

                      <h3 style={cardTitle}>
                        {certificate.title}
                      </h3>

                      <p style={cardTitleEn}>
                        {certificate.titleEn}
                      </p>

                      <div style={issuerRow}>
                        <span style={issuerMark}>
                          ◆
                        </span>

                        <span>
                          {certificate.issuer}
                        </span>
                      </div>
                    </div>
                  </article>
                </button>
              )
            )}
          </div>

          <div style={bottomNote}>
            <span style={bottomNoteIcon}>✦</span>

            <p style={bottomNoteText}>
              点击任意证书即可全屏查看原图
              <span style={bottomNoteDivider}>
                /
              </span>
              Click any certificate to view the
              full-size credential
            </p>
          </div>
        </div>
      </section>

      {selectedCertificate &&
        selectedIndex !== null && (
          <div
            style={lightbox}
            className="certificate-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="证书大图查看"
            onClick={() =>
              setSelectedIndex(null)
            }
          >
            <div
              style={lightboxContent}
              className="certificate-lightbox-content"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <button
                type="button"
                style={closeButton}
                onClick={() =>
                  setSelectedIndex(null)
                }
                aria-label="关闭证书"
              >
                ×
              </button>

              <div style={lightboxHeader}>
                <div>
                  <span style={lightboxEyebrow}>
                    CERTIFICATE{" "}
                    {String(
                      selectedIndex + 1
                    ).padStart(2, "0")}
                  </span>

                  <h3 style={lightboxTitle}>
                    {selectedCertificate.title}
                  </h3>

                  <p style={lightboxSubtitle}>
                    {
                      selectedCertificate.titleEn
                    }{" "}
                    · {selectedCertificate.issuer}
                  </p>
                </div>

                <span style={lightboxYear}>
                  {selectedCertificate.year}
                </span>
              </div>

              <div style={lightboxImageFrame}>
                <img
                  src={selectedCertificate.image}
                  alt={`${selectedCertificate.title} / ${selectedCertificate.titleEn}`}
                  style={lightboxImage}
                />
              </div>

              <div
                style={lightboxControls}
                className="certificate-lightbox-controls"
              >
                <button
                  type="button"
                  onClick={showPrevious}
                  style={navigationButton}
                >
                  ← 上一张 / Previous
                </button>

                <span style={imageCounter}>
                  {selectedIndex + 1} /{" "}
                  {certificates.length}
                </span>

                <button
                  type="button"
                  onClick={showNext}
                  style={navigationButton}
                >
                  下一张 / Next →
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
}

function ProofItem({
  number,
  label,
  english,
}: {
  number: string;
  label: string;
  english: string;
}) {
  return (
    <div style={proofItem}>
      <strong style={proofNumber}>
        {number}
      </strong>

      <div>
        <span style={proofLabel}>
          {label}
        </span>

        <span style={proofEnglish}>
          {english}
        </span>
      </div>
    </div>
  );
}

const section = {
  position: "relative" as const,
  overflow: "hidden",
  margin: "56px -24px 0",
  padding: "84px 24px",
  background:
    "radial-gradient(circle at 15% 15%,rgba(214,175,74,.17),transparent 34%), linear-gradient(145deg,#05070b 0%,#0b1018 52%,#111827 100%)",
};

const glowOne = {
  position: "absolute" as const,
  top: -140,
  left: -100,
  width: 360,
  height: 360,
  borderRadius: "50%",
  background:
    "rgba(212,175,55,.13)",
  filter: "blur(70px)",
  pointerEvents: "none" as const,
};

const glowTwo = {
  position: "absolute" as const,
  right: -120,
  bottom: -170,
  width: 420,
  height: 420,
  borderRadius: "50%",
  background:
    "rgba(37,99,235,.14)",
  filter: "blur(80px)",
  pointerEvents: "none" as const,
};

const panel = {
  position: "relative" as const,
  zIndex: 1,
  maxWidth: 1160,
  margin: "0 auto",
  padding: "42px 38px 30px",
  border:
    "1px solid rgba(255,255,255,.12)",
  borderRadius: 34,
  background:
    "linear-gradient(145deg,rgba(255,255,255,.085),rgba(255,255,255,.025))",
  boxShadow:
    "0 40px 100px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.08)",
  backdropFilter: "blur(16px)",
};

const heading = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 28,
};

const headingCopy = {
  maxWidth: 760,
};

const eyebrowRow = {
  display: "flex",
  alignItems: "center",
  gap: 11,
};

const goldLine = {
  width: 44,
  height: 1,
  background:
    "linear-gradient(90deg,#f4d27a,#b8860b)",
};

const eyebrow = {
  color: "#f4d27a",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "2.2px",
};

const title = {
  margin: "13px 0 0",
  color: "#ffffff",
  fontSize: 44,
  lineHeight: 1.12,
  letterSpacing: "-1.3px",
};

const titleAccent = {
  color: "#f4d27a",
};

const description = {
  margin: "17px 0 0",
  color: "#aeb8c8",
  fontSize: 15,
  lineHeight: 1.85,
};

const trustSeal = {
  minWidth: 218,
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "14px 16px",
  border:
    "1px solid rgba(244,210,122,.28)",
  borderRadius: 18,
  background:
    "rgba(244,210,122,.07)",
};

const trustSealIcon = {
  width: 38,
  height: 38,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  background:
    "linear-gradient(135deg,#f4d27a,#b8860b)",
  color: "#111827",
  fontSize: 19,
  fontWeight: 1000,
  boxShadow:
    "0 8px 25px rgba(212,175,55,.24)",
};

const trustSealTitle = {
  display: "block",
  color: "#ffffff",
  fontSize: 11,
  letterSpacing: "1.3px",
};

const trustSealText = {
  display: "block",
  marginTop: 4,
  color: "#9da8b9",
  fontSize: 10,
};

const proofGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3,minmax(0,1fr))",
  gap: 12,
  marginTop: 32,
  padding: 12,
  borderRadius: 20,
  background: "rgba(0,0,0,.18)",
};

const proofItem = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "13px 16px",
  border:
    "1px solid rgba(255,255,255,.07)",
  borderRadius: 15,
  background:
    "rgba(255,255,255,.035)",
};

const proofNumber = {
  color: "#f4d27a",
  fontSize: 27,
  lineHeight: 1,
};

const proofLabel = {
  display: "block",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 850,
};

const proofEnglish = {
  display: "block",
  marginTop: 3,
  color: "#7f8b9d",
  fontSize: 10,
};

const certificateGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2,minmax(0,1fr))",
  gap: 22,
  marginTop: 28,
};

const cardButton = {
  width: "100%",
  padding: 0,
  border: "none",
  borderRadius: 23,
  background: "transparent",
  textAlign: "left" as const,
  cursor: "pointer",
};

const card = {
  height: "100%",
  overflow: "hidden",
  border:
    "1px solid rgba(255,255,255,.12)",
  borderRadius: 23,
  background:
    "linear-gradient(145deg,rgba(255,255,255,.09),rgba(255,255,255,.035))",
  boxShadow:
    "0 22px 50px rgba(0,0,0,.24)",
  transition:
    "transform .25s ease, border-color .25s ease, box-shadow .25s ease",
};

const imageFrame = {
  position: "relative" as const,
  overflow: "hidden",
  padding: 10,
  background: "#05070a",
};

const certificateImage = {
  width: "100%",
  aspectRatio: "16 / 10",
  display: "block",
  objectFit: "contain" as const,
  borderRadius: 14,
  background: "#111827",
};

const imageShade = {
  position: "absolute" as const,
  inset: 10,
  borderRadius: 14,
  background:
    "linear-gradient(180deg,transparent 55%,rgba(0,0,0,.56))",
  pointerEvents: "none" as const,
};

const categoryBadge = {
  position: "absolute" as const,
  top: 24,
  left: 24,
  padding: "6px 9px",
  border:
    "1px solid rgba(255,255,255,.18)",
  borderRadius: 999,
  background: "rgba(5,7,10,.72)",
  color: "#f5f7fa",
  fontSize: 9,
  fontWeight: 850,
  letterSpacing: ".7px",
  backdropFilter: "blur(7px)",
};

const viewBadge = {
  position: "absolute" as const,
  right: 24,
  bottom: 22,
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "8px 11px",
  borderRadius: 999,
  background:
    "linear-gradient(135deg,#f4d27a,#b8860b)",
  color: "#111827",
  fontSize: 10,
  fontWeight: 950,
  boxShadow:
    "0 9px 24px rgba(0,0,0,.25)",
};

const viewIcon = {
  fontSize: 15,
  lineHeight: 1,
};

const cardContent = {
  padding: "20px 21px 22px",
};

const cardTopRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const cardIndex = {
  color: "#f4d27a",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "1px",
};

const yearBadge = {
  padding: "5px 8px",
  borderRadius: 999,
  background:
    "rgba(255,255,255,.06)",
  color: "#aab4c3",
  fontSize: 9,
  fontWeight: 800,
};

const cardTitle = {
  margin: "13px 0 0",
  color: "#ffffff",
  fontSize: 18,
  lineHeight: 1.35,
};

const cardTitleEn = {
  margin: "5px 0 0",
  color: "#a2adbd",
  fontSize: 12,
};

const issuerRow = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 16,
  paddingTop: 14,
  borderTop:
    "1px solid rgba(255,255,255,.08)",
  color: "#c4ccd7",
  fontSize: 11,
};

const issuerMark = {
  color: "#f4d27a",
  fontSize: 8,
};

const bottomNote = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 9,
  marginTop: 26,
  paddingTop: 22,
  borderTop:
    "1px solid rgba(255,255,255,.08)",
};

const bottomNoteIcon = {
  color: "#f4d27a",
};

const bottomNoteText = {
  margin: 0,
  color: "#8591a2",
  fontSize: 11,
  textAlign: "center" as const,
};

const bottomNoteDivider = {
  margin: "0 8px",
  color: "#4b5563",
};

const lightbox = {
  position: "fixed" as const,
  inset: 0,
  zIndex: 12000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  background: "rgba(2,6,12,.94)",
  backdropFilter: "blur(14px)",
};

const lightboxContent = {
  position: "relative" as const,
  width: "min(1180px,100%)",
  maxHeight: "95vh",
  overflowY: "auto" as const,
  padding: 20,
  border:
    "1px solid rgba(255,255,255,.14)",
  borderRadius: 28,
  background:
    "linear-gradient(145deg,#101722,#080c12)",
  boxShadow:
    "0 40px 110px rgba(0,0,0,.55)",
};

const closeButton = {
  position: "absolute" as const,
  top: 15,
  right: 15,
  zIndex: 4,
  width: 42,
  height: 42,
  border:
    "1px solid rgba(255,255,255,.16)",
  borderRadius: "50%",
  background: "rgba(0,0,0,.68)",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: 26,
  lineHeight: 1,
};

const lightboxHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 20,
  padding: "7px 54px 18px 6px",
};

const lightboxEyebrow = {
  color: "#f4d27a",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: "1.7px",
};

const lightboxTitle = {
  margin: "7px 0 0",
  color: "#ffffff",
  fontSize: 22,
};

const lightboxSubtitle = {
  margin: "5px 0 0",
  color: "#8f9cad",
  fontSize: 11,
};

const lightboxYear = {
  marginRight: 28,
  padding: "6px 9px",
  borderRadius: 999,
  background:
    "rgba(244,210,122,.08)",
  color: "#f4d27a",
  fontSize: 10,
  fontWeight: 850,
};

const lightboxImageFrame = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 260,
  maxHeight: "72vh",
  overflow: "auto",
  padding: 10,
  borderRadius: 18,
  background: "#030508",
};

const lightboxImage = {
  maxWidth: "100%",
  maxHeight: "68vh",
  display: "block",
  objectFit: "contain" as const,
};

const lightboxControls = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginTop: 14,
};

const navigationButton = {
  minHeight: 42,
  padding: "0 15px",
  border:
    "1px solid rgba(255,255,255,.13)",
  borderRadius: 12,
  background:
    "rgba(255,255,255,.055)",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 800,
};

const imageCounter = {
  color: "#f4d27a",
  fontSize: 11,
  fontWeight: 900,
};

export default CertificatesSection;