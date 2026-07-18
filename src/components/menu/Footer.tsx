import {
  useEffect,
  useState,
} from "react";

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
  business_days: string[];
};

const defaultProfile: PublicBusinessProfile = {
  store_name: "GTB Auto Detailing",
  store_subtitle:
    "Professional Auto Detailing & Car Wash",
  logo_url: "",
  phone: "",
  wechat: "",
  telegram: "",
  email: "",
  address: "",
  opening_time: "08:00",
  closing_time: "19:00",
  business_days: [],
};

function Footer() {
  const [profile, setProfile] =
    useState<PublicBusinessProfile>(
      defaultProfile
    );

  const [logoLoadFailed, setLogoLoadFailed] =
    useState(false);

  const [wechatCopied, setWechatCopied] =
    useState(false);

  useEffect(() => {
    let active = true;

    async function loadBusinessProfile() {
      try {
        const { data, error } =
          await supabase.rpc(
            "get_public_business_profile"
          );

        if (error) {
          throw error;
        }

        const profileData = Array.isArray(data)
          ? data[0]
          : data;

        if (!active || !profileData) {
          return;
        }

        setProfile({
          ...defaultProfile,
          ...profileData,
          business_days: Array.isArray(
            profileData.business_days
          )
            ? profileData.business_days
            : [],
        });
      } catch (error) {
        console.error(
          "Footer 店铺资料加载失败：",
          error
        );
      }
    }

    void loadBusinessProfile();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setLogoLoadFailed(false);
  }, [profile.logo_url]);

  const phoneLink = profile.phone
    ? `tel:${profile.phone.replace(
        /[^\d+]/g,
        ""
      )}`
    : "";

  const emailLink = profile.email
    ? `mailto:${profile.email}`
    : "";

  const telegramLink =
    createTelegramLink(profile.telegram);

  const businessHours = formatBusinessHours(
    profile.opening_time,
    profile.closing_time
  );

  const businessDaysText =
    formatBusinessDays(
      profile.business_days
    );

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
      }, 2200);
    } catch {
      window.prompt(
        "请复制微信号 / Copy WeChat ID:",
        profile.wechat
      );
    }
  }

  return (
    <footer style={footer}>
      <style>
        {`
          @media (max-width: 760px) {
            .gtb-footer-container {
              grid-template-columns: 1fr !important;
              padding: 36px 20px !important;
              gap: 30px !important;
            }

            .gtb-footer-brand-row {
              align-items: flex-start !important;
            }

            .gtb-footer-logo {
              width: 64px !important;
              height: 64px !important;
            }

            .gtb-footer-contact-link,
            .gtb-footer-contact-button,
            .gtb-footer-information-item {
              width: 100% !important;
              box-sizing: border-box !important;
            }
          }
        `}
      </style>

      <div
        style={container}
        className="gtb-footer-container"
      >
        {/* 店铺品牌 */}
        <section style={section}>
          <div
            style={brandRow}
            className="gtb-footer-brand-row"
          >
            <div
              style={logoFrame}
              className="gtb-footer-logo"
            >
              {profile.logo_url &&
              !logoLoadFailed ? (
                <img
                  src={profile.logo_url}
                  alt={`${profile.store_name} Logo`}
                  style={logo}
                  onError={() =>
                    setLogoLoadFailed(true)
                  }
                />
              ) : (
                <span style={logoFallback}>
                  🚗
                </span>
              )}
            </div>

            <div style={brandInformation}>
              <p style={brandEyebrow}>
                PREMIUM AUTO CARE
              </p>

              <h2 style={brand}>
                {profile.store_name}
              </h2>
            </div>
          </div>

          <p style={description}>
            {profile.store_subtitle}
          </p>

          <p style={description}>
            专业洗车 · 汽车美容 · 抛光 ·
            镀膜护理
          </p>
        </section>

        {/* 联系方式 */}
        <section style={section}>
          <h3 style={title}>
            联系我们 / Contact
          </h3>

          {phoneLink && (
            <a
              href={phoneLink}
              style={contactLink}
              className="gtb-footer-contact-link"
            >
              <span style={contactIcon}>
                📞
              </span>

              <span>{profile.phone}</span>
            </a>
          )}

          {emailLink && (
            <a
              href={emailLink}
              style={contactLink}
              className="gtb-footer-contact-link"
            >
              <span style={contactIcon}>
                ✉️
              </span>

              <span>{profile.email}</span>
            </a>
          )}

          {profile.wechat && (
            <button
              type="button"
              onClick={() => {
                void copyWeChatId();
              }}
              style={contactButton}
              className="gtb-footer-contact-button"
              title="点击复制微信号"
            >
              <span style={contactIcon}>
                💬
              </span>

              <span>
                {wechatCopied
                  ? "微信号已复制"
                  : `WeChat: ${profile.wechat}`}
              </span>
            </button>
          )}

          {telegramLink && (
            <a
              href={telegramLink}
              target="_blank"
              rel="noreferrer"
              style={contactLink}
              className="gtb-footer-contact-link"
            >
              <span style={contactIcon}>
                ✈️
              </span>

              <span>
                Telegram:{" "}
                {formatTelegramName(
                  profile.telegram
                )}
              </span>
            </a>
          )}
        </section>

        {/* 店铺信息 */}
        <section style={section}>
          <h3 style={title}>
            店铺信息 / Information
          </h3>

          {profile.address && (
            <div
              style={informationItem}
              className="gtb-footer-information-item"
            >
              <span style={contactIcon}>
                📍
              </span>

              <span>{profile.address}</span>
            </div>
          )}

          {businessHours && (
            <div
              style={informationItem}
              className="gtb-footer-information-item"
            >
              <span style={contactIcon}>
                🕘
              </span>

              <span>{businessHours}</span>
            </div>
          )}

          <div
            style={informationItem}
            className="gtb-footer-information-item"
          >
            <span style={contactIcon}>
              📅
            </span>

            <span>{businessDaysText}</span>
          </div>

          <div style={serviceBadge}>
            <span>✓</span>
            <span>
              Professional Service
            </span>
          </div>
        </section>
      </div>

      <div style={bottom}>
        <span>
          © {new Date().getFullYear()}{" "}
          {profile.store_name}.
        </span>

        <span>
          All rights reserved.
        </span>
      </div>
    </footer>
  );
}

function formatBusinessHours(
  openingTime: string,
  closingTime: string
) {
  const opening =
    normalizeTime(openingTime);
  const closing =
    normalizeTime(closingTime);

  if (!opening && !closing) {
    return "";
  }

  if (opening && closing) {
    return `${opening} – ${closing}`;
  }

  return opening || closing;
}

function normalizeTime(
  value: string | undefined
) {
  if (!value) {
    return "";
  }

  return value.slice(0, 5);
}

function formatBusinessDays(
  days: string[]
) {
  if (!Array.isArray(days) || days.length === 0) {
    return "营业日期请联系门店";
  }

  if (days.length >= 7) {
    return "每日营业 / Open Daily";
  }

  const dayMap: Record<string, string> = {
    monday: "周一",
    tuesday: "周二",
    wednesday: "周三",
    thursday: "周四",
    friday: "周五",
    saturday: "周六",
    sunday: "周日",
  };

  return days
    .map((day) => {
      const normalizedDay = String(day)
        .trim()
        .toLowerCase();

      return dayMap[normalizedDay] || day;
    })
    .join(" · ");
}

function createTelegramLink(
  telegram: string
) {
  const value = telegram.trim();

  if (!value) {
    return "";
  }

  if (
    value.startsWith("https://") ||
    value.startsWith("http://")
  ) {
    return value;
  }

  const username = value
    .replace(/^@/, "")
    .replace(/^t\.me\//, "")
    .replace(/^telegram\.me\//, "");

  return username
    ? `https://t.me/${username}`
    : "";
}

function formatTelegramName(
  telegram: string
) {
  const value = telegram.trim();

  if (!value) {
    return "";
  }

  if (
    value.startsWith("https://t.me/")
  ) {
    return `@${value
      .replace("https://t.me/", "")
      .replace(/\/$/, "")}`;
  }

  if (value.startsWith("@")) {
    return value;
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return "打开 Telegram";
  }

  return `@${value}`;
}

const footer = {
  marginTop: 70,
  overflow: "hidden",
  background:
    "linear-gradient(135deg,#111827 0%,#030712 100%)",
  color: "#ffffff",
  borderTop:
    "1px solid rgba(212,175,55,0.35)",
};

const container = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "50px 24px",
  display: "grid",
  gridTemplateColumns:
    "repeat(3,minmax(0,1fr))",
  gap: 42,
};

const section = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "flex-start",
  gap: 12,
};

const brandRow = {
  display: "flex",
  alignItems: "center",
  gap: 15,
};

const logoFrame = {
  width: 74,
  height: 74,
  flexShrink: 0,
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 18,
  background:
    "linear-gradient(145deg,#ffffff,#e5e7eb)",
  border:
    "1px solid rgba(212,175,55,0.6)",
  boxShadow:
    "0 12px 28px rgba(0,0,0,0.3)",
};

const logo = {
  width: "100%",
  height: "100%",
  display: "block",
  objectFit: "cover" as const,
};

const logoFallback = {
  fontSize: 38,
};

const brandInformation = {
  minWidth: 0,
};

const brandEyebrow = {
  margin: "0 0 5px",
  color: "#d4af37",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "1.5px",
};

const brand = {
  margin: 0,
  color: "#d4af37",
  fontSize: 25,
  lineHeight: 1.2,
  fontWeight: 900,
  wordBreak: "break-word" as const,
};

const title = {
  margin: "0 0 7px",
  color: "#d4af37",
  fontSize: 18,
  fontWeight: 900,
};

const description = {
  margin: 0,
  color: "#d1d5db",
  lineHeight: 1.75,
};

const contactLink = {
  maxWidth: "100%",
  display: "inline-flex",
  alignItems: "flex-start",
  gap: 10,
  padding: "8px 11px",
  borderRadius: 10,
  color: "#e5e7eb",
  background:
    "rgba(255,255,255,0.04)",
  textDecoration: "none",
  lineHeight: 1.5,
  wordBreak: "break-word" as const,
};

const contactButton = {
  maxWidth: "100%",
  display: "inline-flex",
  alignItems: "flex-start",
  gap: 10,
  padding: "8px 11px",
  border: "none",
  borderRadius: 10,
  color: "#e5e7eb",
  background:
    "rgba(255,255,255,0.04)",
  cursor: "pointer",
  font: "inherit",
  textAlign: "left" as const,
  lineHeight: 1.5,
  wordBreak: "break-word" as const,
};

const informationItem = {
  maxWidth: "100%",
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  padding: "8px 11px",
  borderRadius: 10,
  color: "#e5e7eb",
  background:
    "rgba(255,255,255,0.04)",
  lineHeight: 1.6,
  wordBreak: "break-word" as const,
};

const contactIcon = {
  flexShrink: 0,
};

const serviceBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  marginTop: 5,
  padding: "7px 12px",
  borderRadius: 999,
  color: "#fef3c7",
  background:
    "rgba(212,175,55,0.12)",
  border:
    "1px solid rgba(212,175,55,0.25)",
  fontSize: 12,
  fontWeight: 800,
};

const bottom = {
  minHeight: 56,
  padding: "14px 20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexWrap: "wrap" as const,
  gap: 6,
  color: "#9ca3af",
  borderTop:
    "1px solid rgba(255,255,255,0.08)",
  fontSize: 13,
  textAlign: "center" as const,
};

export default Footer;