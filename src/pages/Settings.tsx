import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabase";

type ThemeMode =
  | "light"
  | "dark"
  | "system";

type SettingsTab =
  | "business"
  | "operations"
  | "payments"
  | "notifications"
  | "system";

type BusinessSettings = {
  id: number;

store_name: string;
store_subtitle: string;
logo_url: string;
phone: string;
wechat: string;
telegram: string;
email: string;
address: string;

  currency: string;
  currency_symbol: string;
  tax_rate: number;
  order_prefix: string;
  receipt_footer: string;

  opening_time: string;
  closing_time: string;
  business_days: string[];

  cash_enabled: boolean;
  card_enabled: boolean;
  bank_transfer_enabled: boolean;
  mobile_payment_enabled: boolean;

  daily_report_enabled: boolean;
  daily_report_email: string;
  low_stock_alert_enabled: boolean;
  low_stock_threshold: number;

  appointment_notification_enabled: boolean;
  aftercare_notification_enabled: boolean;

  theme_mode: ThemeMode;

  updated_at?: string;
};

const defaultSettings: BusinessSettings = {
  id: 1,

 store_name: "GTB Auto Detailing",
store_subtitle:
  "Professional Auto Detailing & Car Wash",
  logo_url: "",
phone: "",
wechat: "",
telegram: "",
email: "",
address: "",

  currency: "USD",
  currency_symbol: "$",
  tax_rate: 0,
  order_prefix: "GTB",
  receipt_footer:
    "Thank you for choosing GTB Auto Detailing!",

  opening_time: "09:00",
  closing_time: "18:00",
  business_days: [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],

  cash_enabled: true,
  card_enabled: true,
  bank_transfer_enabled: true,
  mobile_payment_enabled: true,

  daily_report_enabled: false,
  daily_report_email: "",
  low_stock_alert_enabled: true,
  low_stock_threshold: 5,

  appointment_notification_enabled: true,
  aftercare_notification_enabled: true,

  theme_mode: "light",
};

const weekDays = [
  {
    value: "Monday",
    label: "星期一",
  },
  {
    value: "Tuesday",
    label: "星期二",
  },
  {
    value: "Wednesday",
    label: "星期三",
  },
  {
    value: "Thursday",
    label: "星期四",
  },
  {
    value: "Friday",
    label: "星期五",
  },
  {
    value: "Saturday",
    label: "星期六",
  },
  {
    value: "Sunday",
    label: "星期日",
  },
];

const tabs: Array<{
  id: SettingsTab;
  icon: string;
  title: string;
  subtitle: string;
}> = [
  {
    id: "business",
    icon: "🏢",
    title: "店铺资料",
    subtitle: "名称、联系方式与地址",
  },
  {
    id: "operations",
    icon: "🧾",
    title: "营业与订单",
    subtitle: "营业时间、税率和收据",
  },
  {
    id: "payments",
    icon: "💳",
    title: "付款方式",
    subtitle: "现金、银行卡与移动支付",
  },
  {
    id: "notifications",
    icon: "🔔",
    title: "通知设置",
    subtitle: "日报、库存和客户提醒",
  },
  {
    id: "system",
    icon: "⚙️",
    title: "系统设置",
    subtitle: "货币、主题和系统信息",
  },
];

function normalizeTime(
  value: string | null | undefined
) {
  if (!value) {
    return "";
  }

  return value.slice(0, 5);
}

function getErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    return String(error.message);
  }

  return "发生未知错误";
}

function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`settings-toggle ${
        checked
          ? "settings-toggle-active"
          : ""
      }`}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      aria-pressed={checked}
    >
      <span />
    </button>
  );
}

function SettingSwitchRow({
  icon,
  title,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  icon: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="settings-switch-row">
      <div className="settings-switch-icon">
        {icon}
      </div>

      <div className="settings-switch-content">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>

      <Toggle
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

function Settings() {
  const [activeTab, setActiveTab] =
    useState<SettingsTab>("business");

  const [settings, setSettings] =
    useState<BusinessSettings>(
      defaultSettings
    );

  const [originalSettings, setOriginalSettings] =
    useState<BusinessSettings>(
      defaultSettings
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);
const [uploadingLogo, setUploadingLogo] =
  useState(false);
  const [message, setMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const hasChanges = useMemo(() => {
    return (
      JSON.stringify(settings) !==
      JSON.stringify(originalSettings)
    );
  }, [settings, originalSettings]);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(() => {
      setMessage("");
    }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [message]);

  function updateField<
    K extends keyof BusinessSettings
  >(
    field: K,
    value: BusinessSettings[K]
  ) {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
  }
function getBusinessAssetPath(
  publicUrl: string
) {
  const marker =
    "/storage/v1/object/public/business-assets/";

  const markerIndex =
    publicUrl.indexOf(marker);

  if (markerIndex === -1) {
    return "";
  }

  const path = publicUrl.slice(
    markerIndex + marker.length
  );

  return decodeURIComponent(
    path.split("?")[0]
  );
}

async function uploadLogo(file: File) {
  let uploadedPath = "";

  try {
    setUploadingLogo(true);
    setMessage("");
    setErrorMessage("");

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        "Logo 只支持 PNG、JPG、JPEG 或 WebP 图片"
      );
    }

    const maximumSize =
      2 * 1024 * 1024;

    if (file.size > maximumSize) {
      throw new Error(
        "Logo 图片不能超过 2MB"
      );
    }

    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase() || "png";

    uploadedPath =
      `logos/gtb-logo-${Date.now()}.${extension}`;

    const oldLogoUrl =
      settings.logo_url;

    const {
      error: uploadError,
    } = await supabase.storage
      .from("business-assets")
      .upload(
        uploadedPath,
        file,
        {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        }
      );

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: publicUrlData,
    } = supabase.storage
      .from("business-assets")
      .getPublicUrl(uploadedPath);

    const logoUrl =
      publicUrlData.publicUrl;

    const {
      data,
      error: updateError,
    } = await supabase
      .from("business_settings")
      .update({
        logo_url: logoUrl,
      })
      .eq("id", 1)
      .select(
        "logo_url, updated_at"
      )
      .single();

    if (updateError) {
      throw updateError;
    }

    const updatedSettings = {
      ...settings,
      logo_url:
        data.logo_url || logoUrl,
      updated_at:
        data.updated_at,
    };

    setSettings(updatedSettings);
    setOriginalSettings(
      updatedSettings
    );

    if (oldLogoUrl) {
      const oldPath =
        getBusinessAssetPath(
          oldLogoUrl
        );

      if (
        oldPath &&
        oldPath !== uploadedPath
      ) {
        const {
          error: removeOldError,
        } = await supabase.storage
          .from("business-assets")
          .remove([oldPath]);

        if (removeOldError) {
          console.warn(
            "旧 Logo 删除失败：",
            removeOldError
          );
        }
      }
    }

    setMessage(
      "店铺 Logo 已成功上传"
    );
  } catch (error) {
    console.error(
      "上传 Logo 失败：",
      error
    );

    if (uploadedPath) {
      await supabase.storage
        .from("business-assets")
        .remove([uploadedPath]);
    }

    setErrorMessage(
      `Logo 上传失败：${getErrorMessage(
        error
      )}`
    );
  } finally {
    setUploadingLogo(false);
  }
}

async function removeLogo() {
  const confirmed =
    window.confirm(
      "确定要删除当前店铺 Logo 吗？"
    );

  if (!confirmed) {
    return;
  }

  try {
    setUploadingLogo(true);
    setMessage("");
    setErrorMessage("");

    const oldLogoUrl =
      settings.logo_url;

    const {
      data,
      error: updateError,
    } = await supabase
      .from("business_settings")
      .update({
        logo_url: "",
      })
      .eq("id", 1)
      .select(
        "logo_url, updated_at"
      )
      .single();

    if (updateError) {
      throw updateError;
    }

    const updatedSettings = {
      ...settings,
      logo_url: "",
      updated_at:
        data.updated_at,
    };

    setSettings(updatedSettings);
    setOriginalSettings(
      updatedSettings
    );

    const oldPath =
      getBusinessAssetPath(
        oldLogoUrl
      );

    if (oldPath) {
      const {
        error: removeError,
      } = await supabase.storage
        .from("business-assets")
        .remove([oldPath]);

      if (removeError) {
        console.warn(
          "Logo 文件删除失败：",
          removeError
        );
      }
    }

    setMessage(
      "店铺 Logo 已删除"
    );
  } catch (error) {
    console.error(
      "删除 Logo 失败：",
      error
    );

    setErrorMessage(
      `Logo 删除失败：${getErrorMessage(
        error
      )}`
    );
  } finally {
    setUploadingLogo(false);
  }
}
  async function loadSettings() {
    try {
      setLoading(true);
      setErrorMessage("");

      const { data, error } =
        await supabase
          .from("business_settings")
          .select("*")
          .eq("id", 1)
          .single();

      if (error) {
        throw error;
      }

      const loadedSettings: BusinessSettings =
        {
          ...defaultSettings,
          ...data,
          opening_time: normalizeTime(
            data.opening_time
          ),
          closing_time: normalizeTime(
            data.closing_time
          ),
          business_days: Array.isArray(
            data.business_days
          )
            ? data.business_days
            : defaultSettings.business_days,
          tax_rate: Number(
            data.tax_rate ?? 0
          ),
          low_stock_threshold: Number(
            data.low_stock_threshold ?? 5
          ),
        };

      setSettings(loadedSettings);
      setOriginalSettings(
        loadedSettings
      );
    } catch (error) {
      console.error(
        "加载设置失败：",
        error
      );

      setErrorMessage(
        `加载设置失败：${getErrorMessage(
          error
        )}`
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    try {
      setSaving(true);
      setMessage("");
      setErrorMessage("");

      if (!settings.store_name.trim()) {
        throw new Error(
          "请输入店铺名称"
        );
      }

      if (!settings.order_prefix.trim()) {
        throw new Error(
          "请输入订单编号前缀"
        );
      }

      if (
        settings.tax_rate < 0 ||
        settings.tax_rate > 100
      ) {
        throw new Error(
          "税率必须在 0 至 100 之间"
        );
      }

      if (
        settings.low_stock_threshold < 0
      ) {
        throw new Error(
          "低库存数量不能小于 0"
        );
      }

      if (
        settings.business_days.length ===
        0
      ) {
        throw new Error(
          "请至少选择一个营业日"
        );
      }

      if (
        settings.daily_report_enabled &&
        !settings.daily_report_email.trim()
      ) {
        throw new Error(
          "开启每日报告后，请填写接收邮箱"
        );
      }

      const payload = {
        store_name:
          settings.store_name.trim(),
        store_subtitle:
          settings.store_subtitle.trim(),
       phone: settings.phone.trim(),

wechat:
  settings.wechat.trim(),

telegram:
  settings.telegram.trim(),

email: settings.email.trim(),

address:
  settings.address.trim(),

        currency: settings.currency,
        currency_symbol:
          settings.currency_symbol.trim(),
        tax_rate: Number(
          settings.tax_rate
        ),
        order_prefix:
          settings.order_prefix
            .trim()
            .toUpperCase(),
        receipt_footer:
          settings.receipt_footer.trim(),

        opening_time:
          settings.opening_time,
        closing_time:
          settings.closing_time,
        business_days:
          settings.business_days,

        cash_enabled:
          settings.cash_enabled,
        card_enabled:
          settings.card_enabled,
        bank_transfer_enabled:
          settings.bank_transfer_enabled,
        mobile_payment_enabled:
          settings.mobile_payment_enabled,

        daily_report_enabled:
          settings.daily_report_enabled,
        daily_report_email:
          settings.daily_report_email.trim(),
        low_stock_alert_enabled:
          settings.low_stock_alert_enabled,
        low_stock_threshold: Number(
          settings.low_stock_threshold
        ),

        appointment_notification_enabled:
          settings.appointment_notification_enabled,
        aftercare_notification_enabled:
          settings.aftercare_notification_enabled,

        theme_mode:
          settings.theme_mode,
      };

      const { data, error } =
        await supabase
          .from("business_settings")
          .update(payload)
          .eq("id", 1)
          .select("*")
          .single();

      if (error) {
        throw error;
      }

      const savedSettings: BusinessSettings =
        {
          ...settings,
          ...data,
          opening_time: normalizeTime(
            data.opening_time
          ),
          closing_time: normalizeTime(
            data.closing_time
          ),
          business_days: Array.isArray(
            data.business_days
          )
            ? data.business_days
            : settings.business_days,
          tax_rate: Number(
            data.tax_rate ?? 0
          ),
          low_stock_threshold: Number(
            data.low_stock_threshold ?? 5
          ),
        };

      setSettings(savedSettings);
      setOriginalSettings(
        savedSettings
      );

      setMessage(
        "设置已成功保存"
      );
    } catch (error) {
      console.error(
        "保存设置失败：",
        error
      );

      setErrorMessage(
        `保存失败：${getErrorMessage(
          error
        )}`
      );
    } finally {
      setSaving(false);
    }
  }

  function resetChanges() {
    setSettings(originalSettings);
    setMessage("");
    setErrorMessage("");
  }

  function toggleBusinessDay(
    day: string
  ) {
    const selected =
      settings.business_days.includes(
        day
      );

    const nextDays = selected
      ? settings.business_days.filter(
          (item) => item !== day
        )
      : [
          ...settings.business_days,
          day,
        ];

    updateField(
      "business_days",
      nextDays
    );
  }

  function renderBusinessSettings() {
    return (
      <>
        <div className="settings-section-heading">
          <div>
            <span className="settings-section-label">
              BUSINESS PROFILE
            </span>
            <h2>店铺基本资料</h2>
            <p>
              这些资料可以显示在收据、客户菜单和预约页面。
            </p>
          </div>

          <div className="settings-section-badge">
            🏢 企业资料
          </div>
        </div>
<div className="settings-logo-card">
  <div className="settings-logo-preview">
    {settings.logo_url ? (
      <img
        src={settings.logo_url}
        alt="GTB 店铺 Logo"
      />
    ) : (
      <span>🚙</span>
    )}
  </div>

  <div className="settings-logo-information">
    <span className="settings-logo-label">
      BUSINESS LOGO
    </span>

    <h3>店铺 Logo</h3>

    <p>
      上传后将显示在后台左侧菜单、客户菜单和收据上。
      建议使用正方形透明背景图片。
    </p>

    <div className="settings-logo-requirements">
      <span>PNG / JPG / WebP</span>
      <span>最大 2MB</span>
      <span>建议 512 × 512</span>
    </div>

    <div className="settings-logo-actions">
      <label
        className={`settings-logo-upload-button ${
          uploadingLogo
            ? "settings-logo-button-disabled"
            : ""
        }`}
      >
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={uploadingLogo}
          onChange={(event) => {
            const input =
              event.currentTarget;

            const file =
              input.files?.[0];

            input.value = "";

            if (file) {
              void uploadLogo(file);
            }
          }}
        />

        {uploadingLogo
          ? "正在处理..."
          : settings.logo_url
            ? "更换 Logo"
            : "上传 Logo"}
      </label>

      {settings.logo_url && (
        <button
          type="button"
          className="settings-logo-remove-button"
          onClick={() => {
            void removeLogo();
          }}
          disabled={uploadingLogo}
        >
          删除 Logo
        </button>
      )}
    </div>
  </div>
</div>
        <div className="settings-form-grid">
          <label className="settings-field settings-field-wide">
            <span>
              店铺名称
              <em>*</em>
            </span>

            <input
              value={
                settings.store_name
              }
              onChange={(event) =>
                updateField(
                  "store_name",
                  event.target.value
                )
              }
              placeholder="GTB Auto Detailing"
            />
          </label>

          <label className="settings-field settings-field-wide">
            <span>店铺副标题</span>

            <input
              value={
                settings.store_subtitle
              }
              onChange={(event) =>
                updateField(
                  "store_subtitle",
                  event.target.value
                )
              }
              placeholder="Professional Auto Detailing & Car Wash"
            />
          </label>

         <label className="settings-field">
  <span>联系电话</span>

  <input
    value={settings.phone}
    onChange={(event) =>
      updateField(
        "phone",
        event.target.value
      )
    }
    placeholder="+95 9..."
  />

  <small>
    客户点击电话按钮时使用的联系电话。
  </small>
</label>

<label className="settings-field">
  <span>微信号 / WeChat ID</span>

  <input
    value={settings.wechat}
    onChange={(event) =>
      updateField(
        "wechat",
        event.target.value
      )
    }
    placeholder="例如：buyaowen9"
  />

  <small>
    填写微信号，不需要填写二维码链接。
  </small>
</label>

<label className="settings-field">
  <span>Telegram</span>

  <input
    value={settings.telegram}
    onChange={(event) =>
      updateField(
        "telegram",
        event.target.value
      )
    }
    placeholder="@username 或 https://t.me/username"
  />

  <small>
    支持 username、@username 或完整 Telegram 链接。
  </small>
</label>

<label className="settings-field">
  <span>店铺邮箱 / Email</span>

  <input
    type="email"
    value={settings.email}
    onChange={(event) =>
      updateField(
        "email",
        event.target.value
      )
    }
    placeholder="admin@gtb.com"
  />

  <small>
    用于客户联系、日报和系统通知。
  </small>
</label>

<label className="settings-field">
  <span>Telegram</span>

  <input
    value={settings.telegram}
    onChange={(event) =>
      updateField(
        "telegram",
        event.target.value
      )
    }
    placeholder="@username 或 https://t.me/username"
  />

  <small>
    支持 username、@username 或完整 Telegram 链接。
  </small>
</label>

<label className="settings-field">
  <span>店铺邮箱 / Email</span>

  <input
    type="email"
    value={settings.email}
    onChange={(event) =>
      updateField(
        "email",
        event.target.value
      )
    }
    placeholder="admin@gtb.com"
  />

  <small>
    用于客户联系、日报和系统通知。
  </small>
</label>
        </div>

        <div className="settings-preview-card">
          <div className="settings-preview-logo">
            🚙
          </div>

          <div>
            <span>客户看到的店铺资料</span>
            <h3>
              {settings.store_name ||
                "店铺名称"}
            </h3>
            <p>
              {settings.store_subtitle ||
                "店铺副标题"}
            </p>

           <div className="settings-preview-meta">
  <span>
    📞{" "}
    {settings.phone ||
      "尚未填写电话"}
  </span>

  <span>
    💬{" "}
    {settings.wechat ||
      "尚未填写微信号"}
  </span>

  <span>
    ✈️{" "}
    {settings.telegram ||
      "尚未填写 Telegram"}
  </span>

  <span>
    ✉️{" "}
    {settings.email ||
      "尚未填写邮箱"}
  </span>
</div>
          </div>
        </div>
      </>
    );
  }

  function renderOperationsSettings() {
    return (
      <>
        <div className="settings-section-heading">
          <div>
            <span className="settings-section-label">
              OPERATIONS
            </span>
            <h2>营业与订单设置</h2>
            <p>
              管理营业日期、营业时间、税率和收据信息。
            </p>
          </div>

          <div className="settings-section-badge">
            🧾 订单配置
          </div>
        </div>

        <div className="settings-subsection">
          <div className="settings-subsection-title">
            <div>
              <h3>营业时间</h3>
              <p>
                设置店铺每天开始和结束营业的时间。
              </p>
            </div>
          </div>

          <div className="settings-form-grid">
            <label className="settings-field">
              <span>开始营业</span>

              <input
                type="time"
                value={
                  settings.opening_time
                }
                onChange={(event) =>
                  updateField(
                    "opening_time",
                    event.target.value
                  )
                }
              />
            </label>

            <label className="settings-field">
              <span>结束营业</span>

              <input
                type="time"
                value={
                  settings.closing_time
                }
                onChange={(event) =>
                  updateField(
                    "closing_time",
                    event.target.value
                  )
                }
              />
            </label>
          </div>
        </div>

        <div className="settings-subsection">
          <div className="settings-subsection-title">
            <div>
              <h3>营业日期</h3>
              <p>
                选择店铺每周正常营业的日期。
              </p>
            </div>

            <span className="settings-counter">
              {
                settings.business_days
                  .length
              }{" "}
              天
            </span>
          </div>

          <div className="settings-days-grid">
            {weekDays.map((day) => {
              const selected =
                settings.business_days.includes(
                  day.value
                );

              return (
                <button
                  key={day.value}
                  type="button"
                  className={`settings-day-button ${
                    selected
                      ? "settings-day-button-active"
                      : ""
                  }`}
                  onClick={() =>
                    toggleBusinessDay(
                      day.value
                    )
                  }
                >
                  <span>
                    {selected
                      ? "✓"
                      : day.label.slice(
                          -1
                        )}
                  </span>

                  <strong>
                    {day.label}
                  </strong>

                  <small>
                    {day.value}
                  </small>
                </button>
              );
            })}
          </div>
        </div>

        <div className="settings-subsection">
          <div className="settings-subsection-title">
            <div>
              <h3>订单与收据</h3>
              <p>
                设置订单编号、税率和收据底部文字。
              </p>
            </div>
          </div>

          <div className="settings-form-grid">
            <label className="settings-field">
              <span>
                订单编号前缀
                <em>*</em>
              </span>

              <input
                value={
                  settings.order_prefix
                }
                onChange={(event) =>
                  updateField(
                    "order_prefix",
                    event.target.value
                      .toUpperCase()
                      .replace(
                        /[^A-Z0-9-]/g,
                        ""
                      )
                  )
                }
                maxLength={10}
                placeholder="GTB"
              />

              <small>
                示例：
                {settings.order_prefix ||
                  "GTB"}
                -20260718-001
              </small>
            </label>

            <label className="settings-field">
              <span>税率（%）</span>

              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={
                  settings.tax_rate
                }
                onChange={(event) =>
                  updateField(
                    "tax_rate",
                    Number(
                      event.target.value
                    )
                  )
                }
              />
            </label>

            <label className="settings-field settings-field-full">
              <span>收据底部文字</span>

              <textarea
                rows={4}
                value={
                  settings.receipt_footer
                }
                onChange={(event) =>
                  updateField(
                    "receipt_footer",
                    event.target.value
                  )
                }
                placeholder="感谢您的光临！"
              />
            </label>
          </div>
        </div>
      </>
    );
  }

  function renderPaymentsSettings() {
    const enabledPaymentCount = [
      settings.cash_enabled,
      settings.card_enabled,
      settings.bank_transfer_enabled,
      settings.mobile_payment_enabled,
    ].filter(Boolean).length;

    return (
      <>
        <div className="settings-section-heading">
          <div>
            <span className="settings-section-label">
              PAYMENT METHODS
            </span>
            <h2>付款方式管理</h2>
            <p>
              控制 POS 结账时允许员工选择的付款方式。
            </p>
          </div>

          <div className="settings-section-badge">
            {enabledPaymentCount} 种已启用
          </div>
        </div>

        <div className="settings-switch-list">
          <SettingSwitchRow
            icon="💵"
            title="现金付款"
            description="允许客户使用现金完成订单结账。"
            checked={
              settings.cash_enabled
            }
            onChange={(checked) =>
              updateField(
                "cash_enabled",
                checked
              )
            }
          />

          <SettingSwitchRow
            icon="💳"
            title="银行卡付款"
            description="允许使用信用卡、借记卡或刷卡机付款。"
            checked={
              settings.card_enabled
            }
            onChange={(checked) =>
              updateField(
                "card_enabled",
                checked
              )
            }
          />

          <SettingSwitchRow
            icon="🏦"
            title="银行转账"
            description="允许客户通过银行账户转账付款。"
            checked={
              settings.bank_transfer_enabled
            }
            onChange={(checked) =>
              updateField(
                "bank_transfer_enabled",
                checked
              )
            }
          />

          <SettingSwitchRow
            icon="📱"
            title="移动支付"
            description="允许使用二维码、电子钱包或手机支付。"
            checked={
              settings.mobile_payment_enabled
            }
            onChange={(checked) =>
              updateField(
                "mobile_payment_enabled",
                checked
              )
            }
          />
        </div>

        {enabledPaymentCount === 0 && (
          <div className="settings-warning">
            ⚠️ 至少需要启用一种付款方式，否则 POS
            无法完成结账。
          </div>
        )}

        <div className="settings-information-card">
          <div>🛡️</div>

          <div>
            <strong>
              付款安全提示
            </strong>

            <p>
              当前系统只保存付款方式和订单金额，不会保存客户银行卡号码或银行卡密码。
            </p>
          </div>
        </div>
      </>
    );
  }

  function renderNotificationSettings() {
    return (
      <>
        <div className="settings-section-heading">
          <div>
            <span className="settings-section-label">
              AUTOMATION
            </span>
            <h2>通知与自动化</h2>
            <p>
              配置营业报告、库存警报、预约和售后提醒。
            </p>
          </div>

          <div className="settings-section-badge">
            🤖 AI 自动化准备
          </div>
        </div>

        <div className="settings-switch-list">
          <SettingSwitchRow
            icon="📊"
            title="每日报告邮件"
            description="每天营业结束后，把营业额、订单数量和付款统计发送到邮箱。"
            checked={
              settings.daily_report_enabled
            }
            onChange={(checked) =>
              updateField(
                "daily_report_enabled",
                checked
              )
            }
          />

          {settings.daily_report_enabled && (
            <div className="settings-inline-panel">
              <label className="settings-field settings-field-full">
                <span>
                  日报接收邮箱
                  <em>*</em>
                </span>

                <input
                  type="email"
                  value={
                    settings.daily_report_email
                  }
                  onChange={(event) =>
                    updateField(
                      "daily_report_email",
                      event.target.value
                    )
                  }
                  placeholder="owner@gtb.com"
                />
              </label>
            </div>
          )}

          <SettingSwitchRow
            icon="📦"
            title="低库存警报"
            description="产品库存达到指定数量时，在系统中显示补货提醒。"
            checked={
              settings.low_stock_alert_enabled
            }
            onChange={(checked) =>
              updateField(
                "low_stock_alert_enabled",
                checked
              )
            }
          />

          {settings.low_stock_alert_enabled && (
            <div className="settings-inline-panel">
              <label className="settings-field settings-field-full">
                <span>
                  低库存提醒数量
                </span>

                <input
                  type="number"
                  min="0"
                  value={
                    settings.low_stock_threshold
                  }
                  onChange={(event) =>
                    updateField(
                      "low_stock_threshold",
                      Number(
                        event.target.value
                      )
                    )
                  }
                />

                <small>
                  当产品库存小于或等于这个数量时显示警报。
                </small>
              </label>
            </div>
          )}

          <SettingSwitchRow
            icon="📅"
            title="预约通知"
            description="有客户提交新预约时，向管理员发送提醒。"
            checked={
              settings.appointment_notification_enabled
            }
            onChange={(checked) =>
              updateField(
                "appointment_notification_enabled",
                checked
              )
            }
          />

          <SettingSwitchRow
            icon="✨"
            title="售后服务提醒"
            description="订单完成后，准备向客户发送保养建议和回访信息。"
            checked={
              settings.aftercare_notification_enabled
            }
            onChange={(checked) =>
              updateField(
                "aftercare_notification_enabled",
                checked
              )
            }
          />
        </div>

        <div className="settings-information-card">
          <div>ℹ️</div>

          <div>
            <strong>
              自动发送功能说明
            </strong>

            <p>
              当前页面负责保存通知设置。后续接入 Email、微信和
Telegram 消息服务后，系统将按照这些开关自动执行通知。
            </p>
          </div>
        </div>
      </>
    );
  }

  function renderSystemSettings() {
    return (
      <>
        <div className="settings-section-heading">
          <div>
            <span className="settings-section-label">
              SYSTEM
            </span>
            <h2>系统与显示设置</h2>
            <p>
              设置货币、金额符号和系统外观。
            </p>
          </div>

          <div className="settings-section-badge">
            ⚙️ 系统配置
          </div>
        </div>

        <div className="settings-form-grid">
          <label className="settings-field">
            <span>系统货币</span>

            <select
              value={settings.currency}
              onChange={(event) => {
                const currency =
                  event.target.value;

                updateField(
                  "currency",
                  currency
                );

                const symbolMap: Record<
                  string,
                  string
                > = {
                  USD: "$",
                  MMK: "Ks",
                  CNY: "¥",
                  THB: "฿",
                  SGD: "S$",
                  MYR: "RM",
                };

                updateField(
                  "currency_symbol",
                  symbolMap[currency] ||
                    ""
                );
              }}
            >
              <option value="USD">
                USD — US Dollar
              </option>
              <option value="MMK">
                MMK — Myanmar Kyat
              </option>
              <option value="CNY">
                CNY — Chinese Yuan
              </option>
              <option value="THB">
                THB — Thai Baht
              </option>
              <option value="SGD">
                SGD — Singapore Dollar
              </option>
              <option value="MYR">
                MYR — Malaysian Ringgit
              </option>
            </select>
          </label>

          <label className="settings-field">
            <span>货币符号</span>

            <input
              value={
                settings.currency_symbol
              }
              onChange={(event) =>
                updateField(
                  "currency_symbol",
                  event.target.value
                )
              }
              maxLength={6}
              placeholder="$"
            />
          </label>
        </div>

        <div className="settings-subsection">
          <div className="settings-subsection-title">
            <div>
              <h3>系统外观</h3>
              <p>
                选择后台管理系统的显示模式。
              </p>
            </div>
          </div>

          <div className="settings-theme-grid">
            {[
              {
                value: "light",
                icon: "☀️",
                title: "浅色模式",
                description:
                  "明亮、清晰，适合白天使用。",
              },
              {
                value: "dark",
                icon: "🌙",
                title: "深色模式",
                description:
                  "降低亮度，适合夜间使用。",
              },
              {
                value: "system",
                icon: "💻",
                title: "跟随系统",
                description:
                  "自动跟随电脑或手机设置。",
              },
            ].map((theme) => {
              const selected =
                settings.theme_mode ===
                theme.value;

              return (
                <button
                  type="button"
                  key={theme.value}
                  className={`settings-theme-card ${
                    selected
                      ? "settings-theme-card-active"
                      : ""
                  }`}
                  onClick={() =>
                    updateField(
                      "theme_mode",
                      theme.value as ThemeMode
                    )
                  }
                >
                  <span className="settings-theme-icon">
                    {theme.icon}
                  </span>

                  <strong>
                    {theme.title}
                  </strong>

                  <p>
                    {theme.description}
                  </p>

                  <span className="settings-theme-check">
                    {selected
                      ? "✓ 已选择"
                      : "选择"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="settings-system-info">
          <div>
            <span>系统名称</span>
            <strong>
              GTB Auto Detailing POS
            </strong>
          </div>

          <div>
            <span>系统版本</span>
            <strong>Version 1.0.0</strong>
          </div>

          <div>
            <span>数据库状态</span>
            <strong className="settings-online">
              ● Connected
            </strong>
          </div>

          <div>
            <span>最后保存</span>
            <strong>
              {settings.updated_at
                ? new Date(
                    settings.updated_at
                  ).toLocaleString()
                : "暂无记录"}
            </strong>
          </div>
        </div>
      </>
    );
  }

  function renderActiveTab() {
    switch (activeTab) {
      case "business":
        return renderBusinessSettings();

      case "operations":
        return renderOperationsSettings();

      case "payments":
        return renderPaymentsSettings();

      case "notifications":
        return renderNotificationSettings();

      case "system":
        return renderSystemSettings();

      default:
        return null;
    }
  }

  if (loading) {
    return (
      <div className="settings-loading-page">
        <div className="settings-spinner" />
        <h2>正在加载系统设置</h2>
        <p>
          正在从数据库读取店铺配置……
        </p>

        <style>
          {settingsStyles}
        </style>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <style>{settingsStyles}</style>

      <div className="settings-hero">
        <div>
          <span className="settings-hero-label">
            SYSTEM CONTROL CENTER
          </span>

          <h1>系统设置</h1>

          <p>
            集中管理店铺资料、营业规则、付款方式、通知和系统配置。
          </p>
        </div>

        <div className="settings-hero-status">
          <span className="settings-status-dot" />

          <div>
            <strong>系统运行正常</strong>
            <small>
              Supabase 已连接
            </small>
          </div>
        </div>
      </div>

      {message && (
        <div className="settings-success-message">
          <span>✓</span>
          <div>
            <strong>保存成功</strong>
            <p>{message}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="settings-error-message">
          <span>!</span>
          <div>
            <strong>操作失败</strong>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      <div className="settings-layout">
        <aside className="settings-navigation">
          <div className="settings-navigation-title">
            <span>设置菜单</span>
            <small>
              Configuration
            </small>
          </div>

          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              className={`settings-nav-button ${
                activeTab === tab.id
                  ? "settings-nav-button-active"
                  : ""
              }`}
              onClick={() =>
                setActiveTab(tab.id)
              }
            >
              <span className="settings-nav-icon">
                {tab.icon}
              </span>

              <span className="settings-nav-text">
                <strong>
                  {tab.title}
                </strong>
                <small>
                  {tab.subtitle}
                </small>
              </span>

              <span className="settings-nav-arrow">
                ›
              </span>
            </button>
          ))}

          <button
  type="button"
  className="settings-admin-card"
  onClick={() => {
    setActiveTab("system");

    window.setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }, 50);
  }}
>
  <div>🔐</div>

  <strong>
    管理员专用设置
  </strong>

  <p>
    点击进入管理员系统配置
  </p>

  <span className="settings-admin-link">
    打开管理员设置 →
  </span>
</button>
        </aside>

        <section className="settings-content-card">
          {renderActiveTab()}

          <div className="settings-save-bar">
            <div>
              <span
                className={
                  hasChanges
                    ? "settings-change-dot settings-change-dot-active"
                    : "settings-change-dot"
                }
              />

              <div>
                <strong>
                  {hasChanges
                    ? "存在未保存的修改"
                    : "所有设置已保存"}
                </strong>

                <small>
                  {hasChanges
                    ? "点击保存设置后，修改才会写入数据库。"
                    : "当前页面内容已与数据库同步。"}
                </small>
              </div>
            </div>

            <div className="settings-action-buttons">
              <button
                type="button"
                className="settings-secondary-button"
                onClick={resetChanges}
                disabled={
                  !hasChanges ||
                  saving
                }
              >
                取消修改
              </button>

              <button
                type="button"
                className="settings-primary-button"
                onClick={saveSettings}
                disabled={
                  !hasChanges ||
                  saving
                }
              >
                {saving
                  ? "正在保存..."
                  : "保存设置"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const settingsStyles = `
  * {
    box-sizing: border-box;
  }

  .settings-page {
    width: 100%;
    max-width: 1500px;
    margin: 0 auto;
    color: #172033;
  }

  .settings-hero {
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    padding: 32px 36px;
    margin-bottom: 24px;
    border-radius: 24px;
    color: white;
    background:
      radial-gradient(
        circle at 85% 15%,
        rgba(96, 165, 250, 0.5),
        transparent 32%
      ),
      linear-gradient(
        135deg,
        #0f172a 0%,
        #1d4ed8 55%,
        #2563eb 100%
      );
    box-shadow:
      0 20px 45px
      rgba(30, 64, 175, 0.22);
  }

  .settings-hero::after {
    content: "";
    position: absolute;
    right: -70px;
    bottom: -130px;
    width: 300px;
    height: 300px;
    border: 45px solid
      rgba(255, 255, 255, 0.08);
    border-radius: 50%;
  }

  .settings-hero > * {
    position: relative;
    z-index: 1;
  }

  .settings-hero-label {
    display: inline-block;
    margin-bottom: 10px;
    color: #bfdbfe;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 1.7px;
  }

  .settings-hero h1 {
    margin: 0 0 10px;
    font-size: clamp(
      34px,
      5vw,
      52px
    );
    line-height: 1;
  }

  .settings-hero p {
    max-width: 680px;
    margin: 0;
    color: #dbeafe;
    font-size: 15px;
    line-height: 1.7;
  }

  .settings-hero-status {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 210px;
    padding: 16px 18px;
    border: 1px solid
      rgba(255, 255, 255, 0.18);
    border-radius: 16px;
    background:
      rgba(15, 23, 42, 0.28);
    backdrop-filter: blur(12px);
  }

  .settings-hero-status strong,
  .settings-hero-status small {
    display: block;
  }

  .settings-hero-status strong {
    margin-bottom: 4px;
    font-size: 14px;
  }

  .settings-hero-status small {
    color: #bfdbfe;
  }

  .settings-status-dot {
    width: 13px;
    height: 13px;
    border: 3px solid
      rgba(255, 255, 255, 0.45);
    border-radius: 50%;
    background: #22c55e;
    box-shadow:
      0 0 0 5px
      rgba(34, 197, 94, 0.2);
  }

  .settings-success-message,
  .settings-error-message {
    display: flex;
    align-items: flex-start;
    gap: 13px;
    padding: 16px 18px;
    margin-bottom: 20px;
    border-radius: 15px;
  }

  .settings-success-message {
    color: #166534;
    border: 1px solid #bbf7d0;
    background: #f0fdf4;
  }

  .settings-error-message {
    color: #991b1b;
    border: 1px solid #fecaca;
    background: #fef2f2;
  }

  .settings-success-message > span,
  .settings-error-message > span {
    display: grid;
    flex: 0 0 30px;
    width: 30px;
    height: 30px;
    place-items: center;
    border-radius: 50%;
    color: white;
    font-weight: 900;
  }

  .settings-success-message > span {
    background: #22c55e;
  }

  .settings-error-message > span {
    background: #ef4444;
  }

  .settings-success-message strong,
  .settings-success-message p,
  .settings-error-message strong,
  .settings-error-message p {
    display: block;
    margin: 0;
  }

  .settings-success-message p,
  .settings-error-message p {
    margin-top: 3px;
    font-size: 13px;
  }

  .settings-layout {
    display: grid;
    grid-template-columns:
      minmax(245px, 285px)
      minmax(0, 1fr);
    gap: 22px;
    align-items: start;
  }

  .settings-navigation {
    position: sticky;
    top: 20px;
    padding: 16px;
    border: 1px solid #e5e7eb;
    border-radius: 22px;
    background: white;
    box-shadow:
      0 12px 35px
      rgba(15, 23, 42, 0.07);
  }

  .settings-navigation-title {
    padding: 7px 8px 15px;
    border-bottom: 1px solid #eef2f7;
    margin-bottom: 10px;
  }

  .settings-navigation-title span,
  .settings-navigation-title small {
    display: block;
  }

  .settings-navigation-title span {
    font-size: 15px;
    font-weight: 800;
  }

  .settings-navigation-title small {
    margin-top: 3px;
    color: #94a3b8;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.2px;
  }

  .settings-nav-button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 13px 12px;
    margin-bottom: 6px;
    border: 1px solid transparent;
    border-radius: 14px;
    color: #475569;
    text-align: left;
    cursor: pointer;
    background: transparent;
    transition:
      transform 0.2s ease,
      border-color 0.2s ease,
      background 0.2s ease;
  }

  .settings-nav-button:hover {
    transform: translateX(2px);
    border-color: #dbeafe;
    background: #eff6ff;
  }

  .settings-nav-button-active {
    color: #1d4ed8;
    border-color: #bfdbfe;
    background:
      linear-gradient(
        135deg,
        #eff6ff,
        #dbeafe
      );
  }

  .settings-nav-icon {
    display: grid;
    flex: 0 0 40px;
    width: 40px;
    height: 40px;
    place-items: center;
    border-radius: 12px;
    font-size: 19px;
    background: #f1f5f9;
  }

  .settings-nav-button-active
    .settings-nav-icon {
    background: white;
    box-shadow:
      0 6px 14px
      rgba(37, 99, 235, 0.12);
  }

  .settings-nav-text {
    min-width: 0;
    flex: 1;
  }

  .settings-nav-text strong,
  .settings-nav-text small {
    display: block;
  }

  .settings-nav-text strong {
    font-size: 13px;
  }

  .settings-nav-text small {
    overflow: hidden;
    margin-top: 3px;
    color: #94a3b8;
    font-size: 10px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .settings-nav-arrow {
    color: #94a3b8;
    font-size: 22px;
  }

  .settings-admin-card {
    padding: 16px;
    margin-top: 16px;
    border-radius: 16px;
    color: #dbeafe;
    background:
      linear-gradient(
        145deg,
        #0f172a,
        #1e293b
      );
  }

  .settings-admin-card > div {
    margin-bottom: 10px;
    font-size: 25px;
  }

  .settings-admin-card strong {
    display: block;
    margin-bottom: 6px;
    color: white;
    font-size: 13px;
  }

  .settings-admin-card p {
    margin: 0;
    font-size: 11px;
    line-height: 1.6;
  }
width: 100%;
border: none;
text-align: left;
cursor: pointer;
font-family: inherit;
transition:
  transform 0.2s ease,
  box-shadow 0.2s ease;
  .settings-content-card {
    overflow: hidden;
    min-width: 0;
    border: 1px solid #e5e7eb;
    border-radius: 22px;
    background: white;
    box-shadow:
      0 12px 35px
      rgba(15, 23, 42, 0.07);
  }

  .settings-content-card
    > :not(.settings-save-bar) {
    padding-left: 30px;
    padding-right: 30px;
  }

  .settings-section-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    padding-top: 30px;
    padding-bottom: 26px;
    border-bottom: 1px solid #eef2f7;
  }

  .settings-section-label {
    display: block;
    margin-bottom: 8px;
    color: #2563eb;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 1.5px;
  }

  .settings-section-heading h2 {
    margin: 0 0 8px;
    font-size: 25px;
  }

  .settings-section-heading p {
    max-width: 620px;
    margin: 0;
    color: #64748b;
    font-size: 13px;
    line-height: 1.7;
  }

  .settings-section-badge {
    padding: 9px 13px;
    border: 1px solid #dbeafe;
    border-radius: 999px;
    color: #1d4ed8;
    font-size: 11px;
    font-weight: 800;
    white-space: nowrap;
    background: #eff6ff;
  }

  .settings-form-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 18px;
    padding-top: 26px;
    padding-bottom: 26px;
  }

  .settings-field {
    display: block;
    min-width: 0;
  }

  .settings-field-wide {
    grid-column: span 1;
  }

  .settings-field-full {
    grid-column: 1 / -1;
  }

  .settings-field > span {
    display: block;
    margin-bottom: 8px;
    color: #334155;
    font-size: 12px;
    font-weight: 800;
  }

  .settings-field em {
    margin-left: 4px;
    color: #ef4444;
    font-style: normal;
  }

  .settings-field input,
  .settings-field select,
  .settings-field textarea {
    width: 100%;
    padding: 12px 13px;
    border: 1px solid #dbe2ea;
    border-radius: 11px;
    outline: none;
    color: #172033;
    font: inherit;
    font-size: 13px;
    background: #fbfdff;
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      background 0.2s ease;
  }

  .settings-field textarea {
    resize: vertical;
    line-height: 1.6;
  }

  .settings-field input:focus,
  .settings-field select:focus,
  .settings-field textarea:focus {
    border-color: #3b82f6;
    background: white;
    box-shadow:
      0 0 0 4px
      rgba(59, 130, 246, 0.1);
  }

  .settings-field small {
    display: block;
    margin-top: 7px;
    color: #94a3b8;
    font-size: 10px;
    line-height: 1.5;
  }
.settings-logo-card {
  display: flex;
  align-items: center;
  gap: 22px;
  padding: 22px;
  margin-top: 26px;
  border: 1px solid #dbeafe;
  border-radius: 18px;
  background:
    linear-gradient(
      135deg,
      #f8fbff,
      #eff6ff
    );
}

.settings-logo-preview {
  display: grid;
  flex: 0 0 116px;
  width: 116px;
  height: 116px;
  place-items: center;
  overflow: hidden;
  border: 1px solid #bfdbfe;
  border-radius: 24px;
  background: white;
  box-shadow:
    0 12px 28px
    rgba(37, 99, 235, 0.15);
}

.settings-logo-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 7px;
}

.settings-logo-preview span {
  font-size: 48px;
}

.settings-logo-information {
  min-width: 0;
  flex: 1;
}

.settings-logo-label {
  display: block;
  margin-bottom: 6px;
  color: #2563eb;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1.3px;
}

.settings-logo-information h3 {
  margin: 0 0 7px;
  color: #172033;
  font-size: 19px;
}

.settings-logo-information p {
  max-width: 650px;
  margin: 0;
  color: #64748b;
  font-size: 11px;
  line-height: 1.7;
}

.settings-logo-requirements {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 13px;
}

.settings-logo-requirements span {
  padding: 5px 9px;
  border: 1px solid #dbeafe;
  border-radius: 999px;
  color: #1d4ed8;
  font-size: 9px;
  font-weight: 800;
  background: white;
}

.settings-logo-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.settings-logo-upload-button,
.settings-logo-remove-button {
  min-width: 112px;
  padding: 10px 15px;
  border-radius: 10px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 800;
  text-align: center;
  cursor: pointer;
}

.settings-logo-upload-button {
  color: white;
  border: 1px solid #2563eb;
  background:
    linear-gradient(
      135deg,
      #2563eb,
      #1d4ed8
    );
  box-shadow:
    0 8px 18px
    rgba(37, 99, 235, 0.2);
}

.settings-logo-upload-button input {
  display: none;
}

.settings-logo-remove-button {
  color: #b91c1c;
  border: 1px solid #fecaca;
  background: #fff;
}

.settings-logo-button-disabled,
.settings-logo-remove-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
  .settings-preview-card {
    display: flex;
    align-items: center;
    gap: 17px;
    padding: 20px;
    margin-bottom: 30px;
    border: 1px solid #dbeafe;
    border-radius: 17px;
    background:
      linear-gradient(
        135deg,
        #f8fbff,
        #eff6ff
      );
  }

  .settings-preview-logo {
    display: grid;
    flex: 0 0 60px;
    width: 60px;
    height: 60px;
    place-items: center;
    border-radius: 17px;
    font-size: 28px;
    background: white;
    box-shadow:
      0 9px 20px
      rgba(37, 99, 235, 0.13);
  }

  .settings-preview-card span {
    color: #64748b;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.6px;
  }

  .settings-preview-card h3 {
    margin: 5px 0 4px;
    font-size: 18px;
  }

  .settings-preview-card p {
    margin: 0;
    color: #64748b;
    font-size: 12px;
  }

  .settings-preview-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 13px;
    margin-top: 9px;
  }

  .settings-preview-meta span {
    color: #334155;
    letter-spacing: 0;
  }

  .settings-subsection {
    padding-top: 25px;
    padding-bottom: 25px;
    border-bottom: 1px solid #eef2f7;
  }

  .settings-subsection:last-of-type {
    border-bottom: none;
  }

  .settings-subsection-title {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 18px;
  }

  .settings-subsection-title h3 {
    margin: 0 0 5px;
    font-size: 15px;
  }

  .settings-subsection-title p {
    margin: 0;
    color: #64748b;
    font-size: 11px;
  }

  .settings-counter {
    padding: 6px 10px;
    border-radius: 999px;
    color: #1d4ed8;
    font-size: 10px;
    font-weight: 800;
    background: #eff6ff;
  }

  .settings-subsection
    .settings-form-grid {
    padding-top: 0;
    padding-bottom: 0;
  }

  .settings-days-grid {
    display: grid;
    grid-template-columns:
      repeat(7, minmax(80px, 1fr));
    gap: 10px;
  }

  .settings-day-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    padding: 13px 8px;
    border: 1px solid #e2e8f0;
    border-radius: 13px;
    cursor: pointer;
    color: #64748b;
    background: #f8fafc;
  }

  .settings-day-button:hover {
    border-color: #93c5fd;
  }

  .settings-day-button > span {
    display: grid;
    width: 28px;
    height: 28px;
    place-items: center;
    border-radius: 50%;
    background: white;
  }

  .settings-day-button strong {
    font-size: 11px;
  }

  .settings-day-button small {
    font-size: 8px;
  }

  .settings-day-button-active {
    color: #1d4ed8;
    border-color: #93c5fd;
    background: #eff6ff;
  }

  .settings-day-button-active
    > span {
    color: white;
    background: #2563eb;
  }

  .settings-switch-list {
    padding-top: 24px;
    padding-bottom: 24px;
  }

  .settings-switch-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 17px;
    margin-bottom: 11px;
    border: 1px solid #e5e7eb;
    border-radius: 15px;
    background: #fbfdff;
  }

  .settings-switch-icon {
    display: grid;
    flex: 0 0 44px;
    width: 44px;
    height: 44px;
    place-items: center;
    border-radius: 13px;
    font-size: 20px;
    background: #eff6ff;
  }

  .settings-switch-content {
    min-width: 0;
    flex: 1;
  }

  .settings-switch-content strong {
    display: block;
    margin-bottom: 4px;
    font-size: 13px;
  }

  .settings-switch-content p {
    margin: 0;
    color: #64748b;
    font-size: 11px;
    line-height: 1.6;
  }

  .settings-toggle {
    position: relative;
    flex: 0 0 47px;
    width: 47px;
    height: 26px;
    padding: 0;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    background: #cbd5e1;
    transition:
      background 0.2s ease;
  }

  .settings-toggle span {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    box-shadow:
      0 2px 5px
      rgba(15, 23, 42, 0.22);
    transition:
      transform 0.2s ease;
  }

  .settings-toggle-active {
    background: #2563eb;
  }

  .settings-toggle-active span {
    transform:
      translateX(21px);
  }

  .settings-toggle:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .settings-inline-panel {
    padding: 15px 17px;
    margin: -4px 0 12px 58px;
    border: 1px dashed #bfdbfe;
    border-radius: 14px;
    background: #f8fbff;
  }

  .settings-warning,
  .settings-information-card {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    margin-bottom: 25px;
    border-radius: 14px;
    font-size: 11px;
    line-height: 1.6;
  }

  .settings-warning {
    color: #92400e;
    border: 1px solid #fde68a;
    background: #fffbeb;
  }

  .settings-information-card {
    color: #1e40af;
    border: 1px solid #bfdbfe;
    background: #eff6ff;
  }

  .settings-information-card
    > div:first-child {
    font-size: 22px;
  }

  .settings-information-card strong {
    display: block;
    margin-bottom: 4px;
  }

  .settings-information-card p {
    margin: 0;
  }

  .settings-theme-grid {
    display: grid;
    grid-template-columns:
      repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .settings-theme-card {
    padding: 20px;
    border: 1px solid #e2e8f0;
    border-radius: 17px;
    text-align: left;
    cursor: pointer;
    color: #334155;
    background: #f8fafc;
  }

  .settings-theme-card:hover {
    border-color: #93c5fd;
  }

  .settings-theme-card-active {
    color: #1d4ed8;
    border-color: #60a5fa;
    background: #eff6ff;
    box-shadow:
      0 9px 24px
      rgba(37, 99, 235, 0.1);
  }

  .settings-theme-icon {
    display: block;
    margin-bottom: 14px;
    font-size: 30px;
  }

  .settings-theme-card strong {
    display: block;
    font-size: 13px;
  }

  .settings-theme-card p {
    min-height: 38px;
    margin: 7px 0 14px;
    color: #64748b;
    font-size: 10px;
    line-height: 1.6;
  }

  .settings-theme-check {
    font-size: 10px;
    font-weight: 800;
  }

  .settings-system-info {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 1px;
    padding: 1px;
    margin: 0 30px 30px;
    overflow: hidden;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    background: #e5e7eb;
  }

  .settings-system-info > div {
    padding: 17px;
    background: white;
  }

  .settings-system-info span,
  .settings-system-info strong {
    display: block;
  }

  .settings-system-info span {
    margin-bottom: 5px;
    color: #94a3b8;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.7px;
    text-transform: uppercase;
  }

  .settings-system-info strong {
    font-size: 12px;
  }

  .settings-online {
    color: #16a34a;
  }

  .settings-save-bar {
    position: sticky;
    bottom: 0;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 17px;
    padding: 18px 30px;
    border-top: 1px solid #e5e7eb;
    background:
      rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(10px);
  }

  .settings-save-bar > div:first-child {
    display: flex;
    align-items: center;
    gap: 11px;
  }

  .settings-change-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #22c55e;
  }

  .settings-change-dot-active {
    background: #f59e0b;
    box-shadow:
      0 0 0 5px
      rgba(245, 158, 11, 0.15);
  }

  .settings-save-bar strong,
  .settings-save-bar small {
    display: block;
  }

  .settings-save-bar strong {
    margin-bottom: 3px;
    font-size: 12px;
  }

  .settings-save-bar small {
    color: #64748b;
    font-size: 9px;
  }

  .settings-action-buttons {
    display: flex;
    gap: 10px;
  }

  .settings-primary-button,
  .settings-secondary-button {
    min-width: 110px;
    padding: 11px 16px;
    border-radius: 11px;
    font-size: 11px;
    font-weight: 800;
    cursor: pointer;
  }

  .settings-secondary-button {
    color: #475569;
    border: 1px solid #dbe2ea;
    background: white;
  }

  .settings-primary-button {
    color: white;
    border: 1px solid #2563eb;
    background:
      linear-gradient(
        135deg,
        #2563eb,
        #1d4ed8
      );
    box-shadow:
      0 8px 18px
      rgba(37, 99, 235, 0.2);
  }

  .settings-primary-button:disabled,
  .settings-secondary-button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
  }

  .settings-loading-page {
    min-height: 500px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #334155;
  }

  .settings-loading-page h2 {
    margin: 18px 0 7px;
  }

  .settings-loading-page p {
    margin: 0;
    color: #64748b;
  }

  .settings-spinner {
    width: 45px;
    height: 45px;
    border: 4px solid #dbeafe;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation:
      settings-spin 0.75s
      linear infinite;
  }

  @keyframes settings-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 1150px) {
    .settings-layout {
      grid-template-columns: 1fr;
    }

    .settings-navigation {
      position: static;
      display: grid;
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .settings-navigation-title,
    .settings-admin-card {
      grid-column: 1 / -1;
    }
.settings-admin-card:hover {
  transform: translateY(-2px);
  box-shadow:
    0 12px 25px
    rgba(15, 23, 42, 0.22);
}

.settings-admin-link {
  display: block;
  margin-top: 12px;
  color: #93c5fd;
  font-size: 11px;
  font-weight: 800;
}
    .settings-nav-button {
      margin-bottom: 0;
    }

    .settings-days-grid {
      grid-template-columns:
        repeat(
          4,
          minmax(80px, 1fr)
        );
    }
  }

  @media (max-width: 760px) {
  .settings-logo-card {
  align-items: flex-start;
  flex-direction: column;
}

.settings-logo-preview {
  width: 96px;
  height: 96px;
  flex-basis: 96px;
}
    .settings-hero {
      align-items: flex-start;
      flex-direction: column;
      padding: 25px;
    }

    .settings-hero-status {
      width: 100%;
    }

    .settings-navigation {
      grid-template-columns: 1fr;
    }

    .settings-form-grid,
    .settings-theme-grid,
    .settings-system-info {
      grid-template-columns: 1fr;
    }

    .settings-field-wide,
    .settings-field-full {
      grid-column: auto;
    }

    .settings-days-grid {
      grid-template-columns:
        repeat(
          2,
          minmax(80px, 1fr)
        );
    }

    .settings-section-heading,
    .settings-save-bar {
      align-items: flex-start;
      flex-direction: column;
    }

    .settings-section-badge {
      white-space: normal;
    }

    .settings-content-card
      > :not(.settings-save-bar) {
      padding-left: 20px;
      padding-right: 20px;
    }

    .settings-save-bar {
      padding: 17px 20px;
    }

    .settings-action-buttons {
      width: 100%;
    }

    .settings-primary-button,
    .settings-secondary-button {
      flex: 1;
    }

    .settings-inline-panel {
      margin-left: 0;
    }

    .settings-system-info {
      margin-left: 20px;
      margin-right: 20px;
    }
  }
`;

export default Settings;