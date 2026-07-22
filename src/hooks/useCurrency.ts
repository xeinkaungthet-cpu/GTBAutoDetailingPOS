import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CurrencyService,
  type CurrencyCode,
  type CurrencySettings,
  type ManualCurrencyRatesPayload,
} from "../services/currencyService";

export function useCurrency() {
  const [
    settings,
    setSettings,
  ] = useState<CurrencySettings>(
    CurrencyService.getCachedSettings()
  );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const refresh = useCallback(
    async () => {
      try {
        setLoading(true);
        setError("");

        const latestSettings =
          await CurrencyService.refresh();

        setSettings(latestSettings);

        return latestSettings;
      } catch (loadError: unknown) {
        const message =
          getErrorMessage(loadError);

        setError(message);

        throw loadError;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void refresh().catch(
      (loadError) => {
        console.error(
          "读取货币设置失败：",
          loadError
        );
      }
    );

    const unsubscribe =
      CurrencyService.subscribe(
        (nextSettings) => {
          setSettings(nextSettings);
          setError("");
        }
      );

    return unsubscribe;
  }, [refresh]);

  const changeDisplayCurrency =
    useCallback(
      async (
        currency: CurrencyCode
      ) => {
        try {
          setSaving(true);
          setError("");

          const nextSettings =
            await CurrencyService
              .setDisplayCurrency(
                currency
              );

          setSettings(nextSettings);

          return nextSettings;
        } catch (
          changeError: unknown
        ) {
          const message =
            getErrorMessage(
              changeError
            );

          setError(message);

          throw changeError;
        } finally {
          setSaving(false);
        }
      },
      []
    );

  const saveManualRates =
    useCallback(
      async (
        payload:
          ManualCurrencyRatesPayload
      ) => {
        try {
          setSaving(true);
          setError("");

          const nextSettings =
            await CurrencyService
              .saveManualRates(
                payload
              );

          setSettings(nextSettings);

          return nextSettings;
        } catch (
          saveError: unknown
        ) {
          const message =
            getErrorMessage(
              saveError
            );

          setError(message);

          throw saveError;
        } finally {
          setSaving(false);
        }
      },
      []
    );

  const convertToDisplay =
    useCallback(
      (accountingAmount: number) =>
        CurrencyService
          .convertAccountingToDisplay(
            accountingAmount,
            settings
          ),
      [settings]
    );

  const convertToAccounting =
    useCallback(
      (displayAmount: number) =>
        CurrencyService
          .convertDisplayToAccounting(
            displayAmount,
            settings
          ),
      [settings]
    );

  const formatMoney =
    useCallback(
      (accountingAmount: number) =>
        CurrencyService
          .formatDisplayAmount(
            accountingAmount,
            settings
          ),
      [settings]
    );

  const formatAccountingMoney =
    useCallback(
      (accountingAmount: number) =>
        CurrencyService
          .formatAccountingAmount(
            accountingAmount,
            settings
          ),
      [settings]
    );

  const options = useMemo(
    () =>
      CurrencyService.getOptions(),
    []
  );

  const currentOption =
    useMemo(
      () =>
        CurrencyService.getOption(
          settings.display_currency
        ),
      [settings.display_currency]
    );

  const accountingOption =
    useMemo(
      () =>
        CurrencyService.getOption(
          settings.accounting_currency
        ),
      [
        settings.accounting_currency,
      ]
    );

  return {
    settings,
    loading,
    saving,
    error,

    options,
    currentOption,
    accountingOption,

    displayCurrency:
      settings.display_currency,

    accountingCurrency:
      settings.accounting_currency,

    refresh,
    changeDisplayCurrency,
    saveManualRates,

    convertToDisplay,
    convertToAccounting,

    formatMoney,
    formatAccountingMoney,

    hasRate: (
      currency: CurrencyCode
    ) =>
      CurrencyService.hasRate(
        settings,
        currency
      ),
  };
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

export default useCurrency;