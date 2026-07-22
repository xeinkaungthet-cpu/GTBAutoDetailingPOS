import {
  useEffect,
  useState,
} from "react";

import useCurrency from "../hooks/useCurrency";

function CurrencySwitcher() {
  const {
    settings,
    options,
    currentOption,

    loading,
    saving,
    error,

    changeDisplayCurrency,
    saveManualRates,
  } = useCurrency();

  const [
    showRateSettings,
    setShowRateSettings,
  ] = useState(false);

  const [mmkRate, setMmkRate] =
    useState("");

  const [cnyRate, setCnyRate] =
    useState("");

  const [
    localMessage,
    setLocalMessage,
  ] = useState("");

  const [
    localError,
    setLocalError,
  ] = useState("");

  useEffect(() => {
    setMmkRate(
      settings.mmk_rate !== null
        ? String(settings.mmk_rate)
        : ""
    );

    setCnyRate(
      settings.cny_rate !== null
        ? String(settings.cny_rate)
        : ""
    );
  }, [
    settings.mmk_rate,
    settings.cny_rate,
  ]);

  async function handleCurrencyChange(
    value: string
  ) {
    try {
      setLocalError("");
      setLocalMessage("");

      if (
        value !== "USD" &&
        value !== "MMK" &&
        value !== "CNY"
      ) {
        return;
      }

      await changeDisplayCurrency(value);

      const selectedOption =
        options.find(
          (item) => item.code === value
        );

      setLocalMessage(
        `已切换为 ${
          selectedOption?.name ??
          value
        }`
      );
    } catch (changeError: unknown) {
      const message =
        getErrorMessage(changeError);

      setLocalError(message);

      if (
        message.includes(
          "汇率尚未设置"
        )
      ) {
        setShowRateSettings(true);
      }
    }
  }

  async function handleSaveRates() {
    try {
      setLocalError("");
      setLocalMessage("");

      const normalizedMmkRate =
        normalizeRateInput(mmkRate);

      const normalizedCnyRate =
        normalizeRateInput(cnyRate);

      await saveManualRates({
        mmk_rate:
          normalizedMmkRate,

        cny_rate:
          normalizedCnyRate,
      });

      setLocalMessage(
        "手动汇率保存成功"
      );
    } catch (saveError: unknown) {
      setLocalError(
        getErrorMessage(saveError)
      );
    }
  }

  return (
    <section
      style={containerStyle}
      aria-label="货币切换器"
    >
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>
            DISPLAY CURRENCY
          </p>

          <strong style={titleStyle}>
            {currentOption.flag}{" "}
            {currentOption.code}
          </strong>
        </div>

        <button
          type="button"
          onClick={() =>
            setShowRateSettings(
              (current) => !current
            )
          }
          style={settingsButtonStyle}
          title="设置手动汇率"
        >
          ⚙
        </button>
      </div>

      <label style={labelStyle}>
        显示货币
      </label>

      <select
        value={
          settings.display_currency
        }
        onChange={(event) =>
          void handleCurrencyChange(
            event.target.value
          )
        }
        disabled={loading || saving}
        style={selectStyle}
      >
        {options.map((option) => (
          <option
            key={option.code}
            value={option.code}
          >
            {option.flag}{" "}
            {option.code} ·{" "}
            {option.name}
          </option>
        ))}
      </select>

      <p style={baseCurrencyStyle}>
        账本基础货币：
        <strong>
          {" "}
          USD 美元
        </strong>
      </p>

      {showRateSettings && (
        <div style={ratePanelStyle}>
          <div style={rateTitleRowStyle}>
            <div>
              <strong
                style={rateTitleStyle}
              >
                手动汇率
              </strong>

              <p
                style={
                  rateDescriptionStyle
                }
              >
                以 1 USD 为换算基础
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowRateSettings(
                  false
                )
              }
              style={closeButtonStyle}
              title="关闭"
            >
              ×
            </button>
          </div>

          <label style={rateLabelStyle}>
            🇲🇲 1 USD = MMK
          </label>

          <div style={inputWrapperStyle}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={mmkRate}
              onChange={(event) =>
                setMmkRate(
                  event.target.value
                )
              }
              placeholder="例如：4500"
              style={inputStyle}
            />

            <span style={inputSuffixStyle}>
              Ks
            </span>
          </div>

          <label style={rateLabelStyle}>
            🇨🇳 1 USD = CNY
          </label>

          <div style={inputWrapperStyle}>
            <input
              type="number"
              min="0"
              step="0.0001"
              value={cnyRate}
              onChange={(event) =>
                setCnyRate(
                  event.target.value
                )
              }
              placeholder="例如：7.20"
              style={inputStyle}
            />

            <span style={inputSuffixStyle}>
              ¥
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              void handleSaveRates()
            }
            disabled={saving}
            style={{
              ...saveButtonStyle,

              opacity: saving
                ? 0.65
                : 1,

              cursor: saving
                ? "not-allowed"
                : "pointer",
            }}
          >
            {saving
              ? "保存中..."
              : "保存手动汇率"}
          </button>

          <p style={rateHintStyle}>
            修改汇率只会改变页面显示，
            不会修改订单、费用和历史账目的原始金额。
          </p>
        </div>
      )}

      {(localError || error) && (
        <div style={errorStyle}>
          ⚠ {localError || error}
        </div>
      )}

      {localMessage && (
        <div style={successStyle}>
          ✓ {localMessage}
        </div>
      )}

      {(loading || saving) && (
        <div style={loadingStyle}>
          {saving
            ? "正在保存货币设置..."
            : "正在读取货币设置..."}
        </div>
      )}
    </section>
  );
}

function normalizeRateInput(
  value: string
): number | null {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const numberValue =
    Number(normalized);

  if (
    !Number.isFinite(numberValue) ||
    numberValue <= 0
  ) {
    throw new Error(
      "汇率必须填写大于 0 的数字"
    );
  }

  return numberValue;
}

function getErrorMessage(
  error: unknown
) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (
        error as {
          message?: unknown;
        }
      ).message ??
        "货币设置操作失败"
    );
  }

  return "货币设置操作失败";
}

const containerStyle = {
  marginBottom: 16,
  padding: 13,
  border:
    "1px solid rgba(148, 163, 184, 0.2)",
  borderRadius: 15,
  background:
    "rgba(30, 41, 59, 0.78)",
  boxShadow:
    "0 10px 24px rgba(2, 6, 23, 0.18)",
};

const headerStyle = {
  marginBottom: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const eyebrowStyle = {
  margin: "0 0 3px",
  color: "#60a5fa",
  fontSize: 8,
  fontWeight: 900,
  letterSpacing: 1.2,
};

const titleStyle = {
  color: "#ffffff",
  fontSize: 15,
};

const settingsButtonStyle = {
  width: 31,
  height: 31,
  border:
    "1px solid rgba(148, 163, 184, 0.25)",
  borderRadius: 9,
  background:
    "rgba(15, 23, 42, 0.65)",
  color: "#cbd5e1",
  cursor: "pointer",
  fontSize: 15,
};

const labelStyle = {
  display: "block",
  marginBottom: 6,
  color: "#94a3b8",
  fontSize: 10,
  fontWeight: 800,
};

const selectStyle = {
  width: "100%",
  height: 39,
  padding: "0 10px",
  border: "1px solid #475569",
  borderRadius: 10,
  outline: "none",
  background: "#0f172a",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
};

const baseCurrencyStyle = {
  margin: "8px 0 0",
  color: "#94a3b8",
  fontSize: 9,
  lineHeight: 1.5,
};

const ratePanelStyle = {
  marginTop: 12,
  paddingTop: 12,
  borderTop:
    "1px solid rgba(148, 163, 184, 0.2)",
};

const rateTitleRowStyle = {
  marginBottom: 10,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
};

const rateTitleStyle = {
  color: "#ffffff",
  fontSize: 12,
};

const rateDescriptionStyle = {
  margin: "3px 0 0",
  color: "#94a3b8",
  fontSize: 9,
};

const closeButtonStyle = {
  border: "none",
  background: "transparent",
  color: "#94a3b8",
  cursor: "pointer",
  fontSize: 18,
  lineHeight: 1,
};

const rateLabelStyle = {
  display: "block",
  margin: "9px 0 5px",
  color: "#cbd5e1",
  fontSize: 10,
  fontWeight: 750,
};

const inputWrapperStyle = {
  position: "relative" as const,
};

const inputStyle = {
  width: "100%",
  height: 38,
  padding: "0 44px 0 10px",
  border: "1px solid #475569",
  borderRadius: 9,
  outline: "none",
  boxSizing: "border-box" as const,
  background: "#0f172a",
  color: "#ffffff",
  fontSize: 12,
};

const inputSuffixStyle = {
  position: "absolute" as const,
  top: "50%",
  right: 11,
  transform: "translateY(-50%)",
  color: "#94a3b8",
  fontSize: 10,
  fontWeight: 850,
};

const saveButtonStyle = {
  width: "100%",
  minHeight: 39,
  marginTop: 12,
  border: "none",
  borderRadius: 10,
  background:
    "linear-gradient(135deg, #16a34a, #15803d)",
  color: "#ffffff",
  fontSize: 11,
  fontWeight: 850,
};

const rateHintStyle = {
  margin: "9px 0 0",
  color: "#94a3b8",
  fontSize: 8,
  lineHeight: 1.6,
};

const errorStyle = {
  marginTop: 10,
  padding: 9,
  border: "1px solid #7f1d1d",
  borderRadius: 9,
  background:
    "rgba(127, 29, 29, 0.35)",
  color: "#fecaca",
  fontSize: 9,
  lineHeight: 1.5,
};

const successStyle = {
  marginTop: 10,
  padding: 9,
  border: "1px solid #166534",
  borderRadius: 9,
  background:
    "rgba(22, 101, 52, 0.32)",
  color: "#bbf7d0",
  fontSize: 9,
  lineHeight: 1.5,
};

const loadingStyle = {
  marginTop: 8,
  color: "#93c5fd",
  fontSize: 9,
};

export default CurrencySwitcher;