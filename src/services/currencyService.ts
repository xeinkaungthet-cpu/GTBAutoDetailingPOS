import { supabase } from "../lib/supabase";

export type CurrencyCode =
  | "USD"
  | "MMK"
  | "CNY";

export interface CurrencySettings {
  id: number;

  accounting_currency: CurrencyCode;
  display_currency: CurrencyCode;

  usd_rate: number;
  mmk_rate: number | null;
  cny_rate: number | null;

  updated_at?: string;
}

export type ManualCurrencyRatesPayload = {
  mmk_rate: number | null;
  cny_rate: number | null;
};

export type CurrencyOption = {
  code: CurrencyCode;
  name: string;
  nameEn: string;
  symbol: string;
  flag: string;
};

type CurrencySettingsListener = (
  settings: CurrencySettings
) => void;

const STORAGE_KEY =
  "gtb_currency_settings";

const CURRENCY_EVENT =
  "gtb-currency-settings-changed";

const currencySettingsSelect = `
  id,
  accounting_currency,
  display_currency,
  usd_rate,
  mmk_rate,
  cny_rate,
  updated_at
`;

export const CURRENCY_OPTIONS:
  CurrencyOption[] = [
    {
      code: "USD",
      name: "美元",
      nameEn: "US Dollar",
      symbol: "$",
      flag: "🇺🇸",
    },
    {
      code: "MMK",
      name: "缅甸元",
      nameEn: "Myanmar Kyat",
      symbol: "Ks",
      flag: "🇲🇲",
    },
    {
      code: "CNY",
      name: "人民币",
      nameEn: "Chinese Yuan",
      symbol: "¥",
      flag: "🇨🇳",
    },
  ];

const defaultSettings: CurrencySettings = {
  id: 1,

  accounting_currency: "USD",
  display_currency: "USD",

  usd_rate: 1,
  mmk_rate: null,
  cny_rate: null,
};

function isCurrencyCode(
  value: unknown
): value is CurrencyCode {
  return (
    value === "USD" ||
    value === "MMK" ||
    value === "CNY"
  );
}

function toNumber(
  value: unknown
): number {
  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : 0;
}

function normalizeRequiredRate(
  value: unknown,
  fallback: number
): number {
  const numberValue = toNumber(value);

  return numberValue > 0
    ? numberValue
    : fallback;
}

function normalizeOptionalRate(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numberValue = Number(value);

  if (
    !Number.isFinite(numberValue) ||
    numberValue <= 0
  ) {
    return null;
  }

  return numberValue;
}

function normalizeSettings(
  value: Partial<CurrencySettings> | null
): CurrencySettings {
  return {
    id:
      Number(value?.id) > 0
        ? Number(value?.id)
        : 1,

    accounting_currency:
      isCurrencyCode(
        value?.accounting_currency
      )
        ? value.accounting_currency
        : "USD",

    display_currency:
      isCurrencyCode(
        value?.display_currency
      )
        ? value.display_currency
        : "USD",

    usd_rate:
      normalizeRequiredRate(
        value?.usd_rate,
        1
      ),

    mmk_rate:
      normalizeOptionalRate(
        value?.mmk_rate
      ),

    cny_rate:
      normalizeOptionalRate(
        value?.cny_rate
      ),

    updated_at:
      value?.updated_at,
  };
}

function getRate(
  settings: CurrencySettings,
  currency: CurrencyCode
): number | null {
  if (currency === "USD") {
    return settings.usd_rate || 1;
  }

  if (currency === "MMK") {
    return settings.mmk_rate;
  }

  return settings.cny_rate;
}

function requireRate(
  settings: CurrencySettings,
  currency: CurrencyCode
): number {
  const rate = getRate(
    settings,
    currency
  );

  if (
    rate === null ||
    !Number.isFinite(rate) ||
    rate <= 0
  ) {
    const option =
      CURRENCY_OPTIONS.find(
        (item) =>
          item.code === currency
      );

    throw new Error(
      `${option?.name ?? currency}汇率尚未设置`
    );
  }

  return rate;
}

function saveCache(
  settings: CurrencySettings
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(settings)
    );
  } catch (error) {
    console.error(
      "保存货币缓存失败：",
      error
    );
  }
}

function readCache():
  CurrencySettings | null {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  try {
    const saved =
      window.localStorage.getItem(
        STORAGE_KEY
      );

    if (!saved) {
      return null;
    }

    return normalizeSettings(
      JSON.parse(saved) as
        Partial<CurrencySettings>
    );
  } catch (error) {
    console.error(
      "读取货币缓存失败：",
      error
    );

    return null;
  }
}

function emitSettingsChanged(
  settings: CurrencySettings
) {
  saveCache(settings);

  if (
    typeof window === "undefined"
  ) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<CurrencySettings>(
      CURRENCY_EVENT,
      {
        detail: settings,
      }
    )
  );
}

function validateManualRate(
  value: number | null,
  currencyName: string
) {
  if (value === null) {
    return;
  }

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw new Error(
      `${currencyName}汇率必须大于 0`
    );
  }
}

function getCurrencyOption(
  currency: CurrencyCode
): CurrencyOption {
  return (
    CURRENCY_OPTIONS.find(
      (item) =>
        item.code === currency
    ) ??
    CURRENCY_OPTIONS[0]
  );
}

function formatNumber(
  amount: number,
  maximumFractionDigits: number
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      minimumFractionDigits:
        maximumFractionDigits,

      maximumFractionDigits,
    }
  ).format(amount);
}

export const CurrencyService = {
  getOptions(): CurrencyOption[] {
    return CURRENCY_OPTIONS;
  },

  getDefaultSettings():
    CurrencySettings {
    return {
      ...defaultSettings,
    };
  },

  getCachedSettings():
    CurrencySettings {
    return (
      readCache() ?? {
        ...defaultSettings,
      }
    );
  },

  async getSettings(
    forceRefresh = false
  ): Promise<CurrencySettings> {
    if (!forceRefresh) {
      const cached = readCache();

      if (cached) {
        return cached;
      }
    }

    const {
      data,
      error,
    } = await supabase
      .from("business_settings")
      .select(currencySettingsSelect)
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const settings =
      normalizeSettings(
        data as
          | Partial<CurrencySettings>
          | null
      );

    saveCache(settings);

    return settings;
  },

  async refresh():
    Promise<CurrencySettings> {
    return this.getSettings(true);
  },

  async setDisplayCurrency(
    currency: CurrencyCode
  ): Promise<CurrencySettings> {
    if (!isCurrencyCode(currency)) {
      throw new Error(
        "不支持这个货币代码"
      );
    }

    const current =
      await this.getSettings(true);

    requireRate(
      current,
      currency
    );

    const {
      data,
      error,
    } = await supabase
      .from("business_settings")
      .update({
        display_currency:
          currency,
      })
      .eq("id", 1)
      .select(currencySettingsSelect)
      .single();

    if (error) {
      throw error;
    }

    const settings =
      normalizeSettings(
        data as
          Partial<CurrencySettings>
      );

    emitSettingsChanged(settings);

    return settings;
  },

  async saveManualRates(
    payload: ManualCurrencyRatesPayload
  ): Promise<CurrencySettings> {
    const mmkRate =
      normalizeOptionalRate(
        payload.mmk_rate
      );

    const cnyRate =
      normalizeOptionalRate(
        payload.cny_rate
      );

    validateManualRate(
      mmkRate,
      "缅甸元"
    );

    validateManualRate(
      cnyRate,
      "人民币"
    );

    const current =
      await this.getSettings(true);

    const nextSettings:
      CurrencySettings = {
        ...current,

        usd_rate: 1,
        mmk_rate: mmkRate,
        cny_rate: cnyRate,
      };

    requireRate(
      nextSettings,
      nextSettings.accounting_currency
    );

    requireRate(
      nextSettings,
      nextSettings.display_currency
    );

    const {
      data,
      error,
    } = await supabase
      .from("business_settings")
      .update({
        usd_rate: 1,
        mmk_rate: mmkRate,
        cny_rate: cnyRate,
      })
      .eq("id", 1)
      .select(currencySettingsSelect)
      .single();

    if (error) {
      throw error;
    }

    const settings =
      normalizeSettings(
        data as
          Partial<CurrencySettings>
      );

    emitSettingsChanged(settings);

    return settings;
  },

  convert(
    amount: number,
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode,
    settings: CurrencySettings
  ): number {
    const normalizedAmount =
      toNumber(amount);

    if (
      fromCurrency === toCurrency
    ) {
      return normalizedAmount;
    }

    const fromRate =
      requireRate(
        settings,
        fromCurrency
      );

    const toRate =
      requireRate(
        settings,
        toCurrency
      );

    const amountInUsd =
      normalizedAmount /
      fromRate;

    return amountInUsd * toRate;
  },

  convertAccountingToDisplay(
    amount: number,
    settings: CurrencySettings
  ): number {
    return this.convert(
      amount,
      settings.accounting_currency,
      settings.display_currency,
      settings
    );
  },

  convertDisplayToAccounting(
    amount: number,
    settings: CurrencySettings
  ): number {
    return this.convert(
      amount,
      settings.display_currency,
      settings.accounting_currency,
      settings
    );
  },

  format(
    amount: number,
    currency: CurrencyCode
  ): string {
    const safeAmount =
      toNumber(amount);

    const negative =
      safeAmount < 0;

    const absoluteAmount =
      Math.abs(safeAmount);

    const option =
      getCurrencyOption(currency);

    const decimals =
      currency === "MMK"
        ? 0
        : 2;

    const formatted =
      formatNumber(
        absoluteAmount,
        decimals
      );

    const sign =
      negative ? "-" : "";

    if (currency === "MMK") {
      return `${sign}${option.symbol} ${formatted}`;
    }

    return `${sign}${option.symbol}${formatted}`;
  },

  formatWithCode(
    amount: number,
    currency: CurrencyCode
  ): string {
    return `${this.format(
      amount,
      currency
    )} ${currency}`;
  },

  formatAccountingAmount(
    amount: number,
    settings: CurrencySettings
  ): string {
    return this.format(
      amount,
      settings.accounting_currency
    );
  },

  formatDisplayAmount(
    accountingAmount: number,
    settings: CurrencySettings
  ): string {
    const converted =
      this.convertAccountingToDisplay(
        accountingAmount,
        settings
      );

    return this.format(
      converted,
      settings.display_currency
    );
  },

  hasRate(
    settings: CurrencySettings,
    currency: CurrencyCode
  ): boolean {
    const rate = getRate(
      settings,
      currency
    );

    return (
      rate !== null &&
      Number.isFinite(rate) &&
      rate > 0
    );
  },

  getRate(
    settings: CurrencySettings,
    currency: CurrencyCode
  ): number | null {
    return getRate(
      settings,
      currency
    );
  },

  getOption(
    currency: CurrencyCode
  ): CurrencyOption {
    return getCurrencyOption(
      currency
    );
  },

  subscribe(
    listener:
      CurrencySettingsListener
  ): () => void {
    if (
      typeof window === "undefined"
    ) {
      return () => undefined;
    }

    function handleChange(
      event: Event
    ) {
      const customEvent =
        event as
          CustomEvent<CurrencySettings>;

      listener(
        normalizeSettings(
          customEvent.detail
        )
      );
    }

    window.addEventListener(
      CURRENCY_EVENT,
      handleChange
    );

    return () => {
      window.removeEventListener(
        CURRENCY_EVENT,
        handleChange
      );
    };
  },
};