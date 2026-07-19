import {
  useEffect,
  useState,
} from "react";

import heroImage from "../../assets/hero.png";
import gtbLogo from "../../assets/gtb-logo.jpg";
import { supabase } from "../../lib/supabase";

type PublicBusinessProfile = {
  store_name: string;
  store_subtitle: string;
  logo_url: string;
  phone: string;
  wechat: string;
  telegram: string;
  email: string;
  address: string;
  opening_time: string;
  closing_time: string;
};

const defaultProfile: PublicBusinessProfile = {
  store_name: "GTB Auto Detailing & Window Film",
  store_subtitle:
    "Professional Auto Detailing & Car Wash",
  logo_url: "",
  phone: "09443751188",
  wechat: "buyaowen9",
  telegram: "",
  email: "xeinkaungthet@gmail.com",
  address: "MUSE",
  opening_time: "08:00",
  closing_time: "19:00",
};

function Hero() {
  const [profile, setProfile] =
    useState<PublicBusinessProfile>(
      defaultProfile
    );

  const [logoLoadFailed, setLogoLoadFailed] =
    useState(false);

  const [wechatCopied, setWechatCopied] =
    useState(false);

    useEffect(() => {
    let mounted = true;

    async function loadBusinessProfile() {
      try {
        const { data, error } = await supabase.rpc(
          "get_public_business_profile"
        );

        if (error) {
          throw error;
        }

        const profileData = (
          Array.isArray(data) ? data[0] : data
        ) as Partial<PublicBusinessProfile> | null;

        if (!mounted || !profileData) {
          return;
        }

        setProfile({
          store_name:
            String(
              profileData.store_name ??
                defaultProfile.store_name
            ).trim() || defaultProfile.store_name,

          store_subtitle:
            String(
              profileData.store_subtitle ??
                defaultProfile.store_subtitle
            ).trim() || defaultProfile.store_subtitle,

          logo_url: String(
            profileData.logo_url ?? ""
          ).trim(),

          phone: String(
            profileData.phone ?? ""
          ).trim(),

          wechat: String(
            profileData.wechat ?? ""
          ).trim(),

          telegram: String(
            profileData.telegram ?? ""
          ).trim(),

          email: String(
            profileData.email ?? ""
          ).trim(),

          address: String(
            profileData.address ?? ""
          ).trim(),

          opening_time: String(
            profileData.opening_time ??
              defaultProfile.opening_time
          ).trim(),

          closing_time: String(
            profileData.closing_time ??
              defaultProfile.closing_time
          ).trim(),
        });

        setLogoLoadFailed(false);
      } catch (error) {
        console.error(
          "Hero 店铺资料加载失败：",
          error
        );
      }
    }

    void loadBusinessProfile();

    return () => {
      
      mounted = false;
    };
  }, []);

  const phoneLink = profile.phone
    ? `tel:${profile.phone.replace(/[^\d+]/g, "")}`
    : "";

  const emailLink = profile.email
    ? `mailto:${profile.email}`
    : "";

  const telegramLink = createTelegramLink(
    profile.telegram
  );

  const openingTime = formatBusinessTime(
    profile.opening_time
  );

  const closingTime = formatBusinessTime(
    profile.closing_time
  );

  const businessHours =
    openingTime && closingTime
      ? `${openingTime} – ${closingTime}`
      : openingTime || closingTime;

  const displayedLogo =
    profile.logo_url && !logoLoadFailed
      ? profile.logo_url
      : gtbLogo;

  async function copyWeChatId() {
    if (!profile.wechat) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        profile.wechat
      );

      setWechatCopied(true);

      window.setTimeout(() => {
        setWechatCopied(false);
      }, 2500);
    } catch {
      window.prompt(
        "请复制微信号 / Copy WeChat ID",
        profile.wechat
      );
    }
  }
       return (
    <header style={wrapper}>
      <style>
        {`
          @media (max-width: 760px) {
            .gtb-hero-contact-content {
              justify-content: flex-start !important;
              gap: 10px 18px !important;
            }

            .gtb-hero-main {
              min-height: 640px !important;
              padding: 45px 18px 55px !important;
            }

            .gtb-hero-logo-frame {
              width: 138px !important;
              height: 138px !important;
            }

            .gtb-hero-button-row {
              width: 100% !important;
              flex-direction: column !important;
              align-items: center !important;
            }

            .gtb-hero-button {
              width: min(360px, 100%) !important;
              min-width: 0 !important;
            }

            .gtb-hero-feature-row {
              gap: 10px 16px !important;
            }
          }

          @media (max-width: 480px) {
            .gtb-hero-contact-bar {
              padding: 10px 15px !important;
            }

            .gtb-hero-contact-content {
              font-size: 11px !important;
            }

            .gtb-hero-main {
              min-height: 590px !important;
            }

            .gtb-hero-logo-frame {
              width: 118px !important;
              height: 118px !important;
            }
          }
        `}
      </style>

      {/* 顶部联系方式 */}
      <div
        style={contactBar}
        className="gtb-hero-contact-bar"
      >
        <div
          style={contactContent}
          className="gtb-hero-contact-content"
        >
          {profile.phone && phoneLink && (
            <a
              href={phoneLink}
              style={contactLink}
              title="电话联系 / Call Us"
            >
              📞 {profile.phone}
            </a>
          )}

          {profile.email && emailLink && (
            <a
              href={emailLink}
              style={contactLink}
              title="发送邮件 / Send Email"
            >
              ✉️ {profile.email}
            </a>
          )}

          {profile.wechat && (
            <button
              type="button"
              onClick={() => {
                void copyWeChatId();
              }}
              style={contactButton}
              title="点击复制微信号"
            >
              {wechatCopied
                ? "✅ 微信号已复制"
                : `💬 WeChat: ${profile.wechat}`}
            </button>
          )}

          {profile.telegram &&
            telegramLink && (
              <a
                href={telegramLink}
                target="_blank"
                rel="noreferrer"
                style={contactLink}
                title="打开 Telegram"
              >
                ✈️ Telegram
              </a>
            )}

          {profile.address && (
            <span style={contactItem}>
              📍 {profile.address}
            </span>
          )}

          {businessHours && (
            <span style={contactItem}>
              🕘 {businessHours}
            </span>
          )}
        </div>
      </div>

      {/* Hero 主区域 */}
      <div
        style={hero}
        className="gtb-hero-main"
      >
        <div style={overlay} />

        <div style={heroGlow} />

        <div style={heroContent}>
          <div
            style={logoFrame}
            className="gtb-hero-logo-frame"
          >
            <img
              src={displayedLogo}
              alt={`${profile.store_name} Logo`}
              style={logo}
              onError={() =>
                setLogoLoadFailed(true)
              }
            />
          </div>

          <p style={eyebrow}>
            PREMIUM CAR WASH · DETAILING
          </p>

          <h1 style={goldTitle}>
            {profile.store_name}
          </h1>

          <p style={subtitle}>
            {profile.store_subtitle}
          </p>

          <p style={servicesText}>
            Ceramic Coating · Paint Correction ·
            Interior Detailing
          </p>

          <div style={rating}>
            <span style={stars}>
              ★★★★★
            </span>

            <span>
              Professional Auto Care
            </span>
          </div>

          <div
            style={buttonRow}
            className="gtb-hero-button-row"
          >
            <a
              href="#menu-content"
              style={primaryButtonLink}
              className="gtb-hero-button"
            >
              <span style={buttonMain}>
                📅 查看服务与预约
              </span>

              <span style={buttonSmall}>
                View Services & Book
              </span>
            </a>

            {profile.phone &&
              phoneLink && (
                <a
                  href={phoneLink}
                  style={secondaryButton}
                  className="gtb-hero-button"
                >
                  <span style={buttonMain}>
                    📞 电话联系
                  </span>

                  <span style={buttonSmall}>
                    {profile.phone}
                  </span>
                </a>
              )}
          </div>

          <div
            style={featureRow}
            className="gtb-hero-feature-row"
          >
            <span style={feature}>
              ✓ 专业施工
            </span>

            <span style={feature}>
              ✓ 高端产品
            </span>

            <span style={feature}>
              ✓ 品质保证
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

function createTelegramLink(
  value: string
) {
  const telegramValue = value.trim();

  if (!telegramValue) {
    return "";
  }

  if (
    telegramValue.startsWith(
      "https://"
    ) ||
    telegramValue.startsWith("http://")
  ) {
    return telegramValue;
  }

  const username = telegramValue
    .replace(/^@/, "")
    .replace(/^t\.me\//i, "")
    .replace(
      /^telegram\.me\//i,
      ""
    )
    .trim();

  return username
    ? `https://t.me/${username}`
    : "";
}

function formatBusinessTime(
  value: string
) {
  if (!value) {
    return "";
  }

  const timeParts = value
    .slice(0, 5)
    .split(":");

  const hours = Number(
    timeParts[0]
  );

  const minutes =
    timeParts[1] || "00";

  if (Number.isNaN(hours)) {
    return value;
  }

  const period =
    hours >= 12 ? "PM" : "AM";

  const twelveHour =
    hours % 12 || 12;

  return `${String(
    twelveHour
  ).padStart(
    2,
    "0"
  )}:${minutes} ${period}`;
}

const wrapper = {
  width: "100%",
  background: "#070b14",
};

const contactBar = {
  position: "relative" as const,
  zIndex: 5,
  padding: "11px 20px",
  borderBottom:
    "1px solid rgba(212,175,55,.35)",
  background: "#080b12",
};

const contactContent = {
  width: "min(1300px, 100%)",
  margin: "0 auto",

  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flexWrap: "wrap" as const,

  gap: "10px 25px",

  color: "#e5e7eb",
  fontSize: 12,
  fontWeight: 650,
};

const hero = {
  position: "relative" as const,
  minHeight: 720,

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  overflow: "hidden",

  padding: "55px 20px 70px",

  backgroundImage: `url(${heroImage})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
};

const overlay = {
  position: "absolute" as const,
  inset: 0,

  background:
    "linear-gradient(180deg,rgba(4,7,14,.74),rgba(4,7,14,.94))",
};

const heroGlow = {
  position: "absolute" as const,

  width: 600,
  height: 600,

  top: "50%",
  left: "50%",

  transform:
    "translate(-50%, -50%)",

  borderRadius: "50%",

  background:
    "radial-gradient(circle,rgba(212,175,55,.14),rgba(212,175,55,0) 68%)",

  pointerEvents:
    "none" as const,
};

const heroContent = {
  position: "relative" as const,
  zIndex: 2,

  width: "min(950px, 100%)",

  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",

  textAlign: "center" as const,
};

const logoFrame = {
  width: 174,
  height: 174,

  padding: 6,

  border:
    "1px solid rgba(244,211,108,.75)",
  borderRadius: "50%",

  background:
    "linear-gradient(145deg,rgba(255,255,255,.2),rgba(212,175,55,.12))",

  boxShadow:
    "0 0 45px rgba(212,175,55,.25), 0 18px 50px rgba(0,0,0,.45)",
};

const logo = {
  width: "100%",
  height: "100%",

  display: "block",

  objectFit: "cover" as const,
  borderRadius: "50%",

  background: "#ffffff",
};

const eyebrow = {
  margin: "25px 0 0",

  color: "#e6c565",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: 2.6,
};

const goldTitle = {
  margin: "10px 0 0",

  background:
    "linear-gradient(90deg,#fff3b0,#d4af37,#fff0a3,#9c6b00)",

  WebkitBackgroundClip: "text",
  WebkitTextFillColor:
    "transparent",
  backgroundClip: "text",

  fontSize:
    "clamp(40px, 7vw, 76px)",
  fontWeight: 950,
  lineHeight: 1.05,
  letterSpacing: "-1.5px",

  filter:
    "drop-shadow(0 4px 18px rgba(212,175,55,.18))",
};

const subtitle = {
  margin: "17px 0 0",

  color: "#f8fafc",

  fontSize:
    "clamp(18px, 2.5vw, 25px)",

  fontWeight: 750,
};

const servicesText = {
  margin: "9px 0 0",

  color: "#cbd5e1",
  fontSize: 14,
  lineHeight: 1.7,
};

const rating = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexWrap: "wrap" as const,

  gap: 10,
  marginTop: 20,

  color: "#e2e8f0",
  fontSize: 13,
  fontWeight: 700,
};

const stars = {
  color: "#f4c542",
  fontSize: 18,
  letterSpacing: 2,
};

const buttonRow = {
  display: "flex",
  justifyContent: "center",
  flexWrap: "wrap" as const,

  gap: 14,
  marginTop: 29,
};

const primaryButton = {
  minWidth: 210,

  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",

  padding: "13px 25px",

  border: "1px solid #f4d36c",
  borderRadius: 14,

  background:
    "linear-gradient(135deg,#d4af37,#9c6b00)",

  color: "#ffffff",

  boxShadow:
    "0 12px 30px rgba(212,175,55,.28)",
};

const primaryButtonLink = {
  ...primaryButton,

  boxSizing:
    "border-box" as const,

  textDecoration: "none",
};

const secondaryButton = {
  minWidth: 190,

  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",

  boxSizing:
    "border-box" as const,

  padding: "13px 25px",

  border:
    "1px solid rgba(255,255,255,.4)",

  borderRadius: 14,

  background:
    "rgba(15,23,42,.55)",

  color: "#ffffff",

  textDecoration: "none",

  backdropFilter: "blur(10px)",

  boxShadow:
    "0 12px 30px rgba(0,0,0,.25)",
};

const buttonMain = {
  fontSize: 15,
  fontWeight: 900,
};

const buttonSmall = {
  marginTop: 3,
  fontSize: 10,
  fontWeight: 700,
  opacity: 0.86,
};

const featureRow = {
  display: "flex",
  justifyContent: "center",
  flexWrap: "wrap" as const,

  gap: "10px 24px",
  marginTop: 29,
};

const feature = {
  color: "#dbe4ef",
  fontSize: 12,
  fontWeight: 750,
};

const contactLink = {
  color: "#e5e7eb",

  textDecoration: "none",

  fontWeight: 700,

  overflowWrap:
    "anywhere" as const,
};

const contactItem = {
  color: "#e5e7eb",
  fontWeight: 700,
};

const contactButton = {
  padding: 0,

  border: "none",

  background:
    "transparent",

  color: "#e5e7eb",

  cursor: "pointer",

  fontFamily: "inherit",
  fontSize: "inherit",
  fontWeight: 700,
};

export default Hero;