import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
} from "react";

import type { Service } from "../types/database";
import { ServiceService } from "../services/serviceService";

import {
  PackageService,
  type Package,
  type PackagePayload,
} from "../services/packageService";

import useCurrency from "../hooks/useCurrency";

type ServiceWithCost = Service & {
  cost_price?: number | string | null;
};

type PackageForm = {
  package_name: string;
  package_name_en: string;
  description: string;
  description_en: string;
  package_price: string;
  cost_price: string;
  is_active: boolean;
  is_popular: boolean;
};

type StatusFilter =
  | "all"
  | "active"
  | "inactive";

type ProfitFilter =
  | "all"
  | "healthy"
  | "low"
  | "negative"
  | "no_cost";

const LOW_MARGIN_THRESHOLD = 30;

const emptyForm: PackageForm = {
  package_name: "",
  package_name_en: "",
  description: "",
  description_en: "",
  package_price: "",
  cost_price: "0",
  is_active: true,
  is_popular: false,
};

function Packages() {
  const {
    formatMoney,
    formatAccountingMoney,
    displayCurrency,
    accountingCurrency,
    convertToDisplay,
    convertToAccounting,
  } = useCurrency();

  const [packages, setPackages] = useState<Package[]>([]);
  const [services, setServices] =
    useState<ServiceWithCost[]>([]);

  const [selectedServiceIds, setSelectedServiceIds] =
    useState<number[]>([]);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [profitFilter, setProfitFilter] =
    useState<ProfitFilter>("all");

  const [form, setForm] =
    useState<PackageForm>(emptyForm);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [formCurrency, setFormCurrency] =
    useState(displayCurrency);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [uploadingPackageId, setUploadingPackageId] =
    useState<number | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (formCurrency === displayCurrency) {
      return;
    }

    setForm((current) => {
      if (editingId !== null) {
        const editingPackage = packages.find(
          (packageItem) => packageItem.id === editingId
        );

        if (editingPackage) {
          return {
            ...current,
            package_price: formatCurrencyInput(
              convertToDisplay(
                toNumber(editingPackage.package_price)
              ),
              displayCurrency
            ),
            cost_price: formatCurrencyInput(
              convertToDisplay(
                toNumber(editingPackage.cost_price)
              ),
              displayCurrency
            ),
          };
        }
      }

      return {
        ...current,
        package_price: "",
        cost_price: "0",
      };
    });

    setFormCurrency(displayCurrency);
  }, [
    displayCurrency,
    editingId,
    packages,
    formCurrency,
    convertToDisplay,
  ]);

  async function loadData() {
    setLoading(true);

    try {
      const [packageData, serviceData] =
        await Promise.all([
          PackageService.getAll(),
          ServiceService.getAll(),
        ]);

      setPackages(packageData);
      setServices(
        serviceData as ServiceWithCost[]
      );
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function updateForm<K extends keyof PackageForm>(
    field: K,
    value: PackageForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  const selectedServices = useMemo(() => {
    return services.filter((service) =>
      selectedServiceIds.includes(service.id)
    );
  }, [services, selectedServiceIds]);

  const originalPrice = useMemo(() => {
    return selectedServices.reduce(
      (total, service) =>
        total + toNumber(service.price),
      0
    );
  }, [selectedServices]);

  const suggestedServiceCost = useMemo(() => {
    return selectedServices.reduce(
      (total, service) =>
        total + toNumber(service.cost_price),
      0
    );
  }, [selectedServices]);

  const estimatedMinutes = useMemo(() => {
    return selectedServices.reduce(
      (total, service) =>
        total +
        toNumber(service.duration_minutes),
      0
    );
  }, [selectedServices]);

  const formFinancials = useMemo(() => {
    const sellingPrice = convertToAccounting(
      toNumber(form.package_price)
    );

    const costPrice = convertToAccounting(
      toNumber(form.cost_price)
    );

    return calculateFinancials(
      sellingPrice,
      costPrice
    );
  }, [
    form.package_price,
    form.cost_price,
    convertToAccounting,
  ]);

  const savings = Math.max(
    originalPrice - formFinancials.sellingPrice,
    0
  );

  const discountPercentage =
    originalPrice > 0
      ? (savings / originalPrice) * 100
      : 0;

  const summary = useMemo(() => {
    const financialRows = packages.map(
      (packageItem) =>
        calculateFinancials(
          toNumber(packageItem.package_price),
          toNumber(packageItem.cost_price)
        )
    );

    const pricedRows = financialRows.filter(
      (row) => row.sellingPrice > 0
    );

    const averageMargin =
      pricedRows.length > 0
        ? pricedRows.reduce(
            (sum, row) => sum + row.margin,
            0
          ) / pricedRows.length
        : 0;

    const lowMarginCount = financialRows.filter(
      (row) =>
        row.sellingPrice > 0 &&
        row.profit >= 0 &&
        row.margin < LOW_MARGIN_THRESHOLD
    ).length;

    const negativeCount = financialRows.filter(
      (row) => row.profit < 0
    ).length;

    return {
      total: packages.length,
      active: packages.filter(
        (packageItem) => packageItem.is_active
      ).length,
      popular: packages.filter(
        (packageItem) => packageItem.is_popular
      ).length,
      averageMargin,
      lowMarginCount,
      negativeCount,
    };
  }, [packages]);

  const filteredPackages = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return packages.filter((packageItem) => {
      const financials = calculateFinancials(
        toNumber(packageItem.package_price),
        toNumber(packageItem.cost_price)
      );

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" &&
          packageItem.is_active) ||
        (statusFilter === "inactive" &&
          !packageItem.is_active);

      const matchesProfit =
        profitFilter === "all" ||
        (profitFilter === "healthy" &&
          financials.profit >= 0 &&
          financials.margin >=
            LOW_MARGIN_THRESHOLD) ||
        (profitFilter === "low" &&
          financials.sellingPrice > 0 &&
          financials.profit >= 0 &&
          financials.margin <
            LOW_MARGIN_THRESHOLD) ||
        (profitFilter === "negative" &&
          financials.profit < 0) ||
        (profitFilter === "no_cost" &&
          financials.costPrice === 0);

      const searchableText = [
        packageItem.package_name,
        packageItem.package_name_en,
        packageItem.description,
        packageItem.description_en,
        ...(packageItem.package_services ?? [])
          .map(
            (item) =>
              item.services?.service_name ?? ""
          ),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !keyword ||
        searchableText.includes(keyword);

      return (
        matchesStatus &&
        matchesProfit &&
        matchesSearch
      );
    });
  }, [
    packages,
    search,
    statusFilter,
    profitFilter,
  ]);

  function toggleService(serviceId: number) {
    setSelectedServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter(
            (id) => id !== serviceId
          )
        : [...current, serviceId]
    );
  }

  function resetForm() {
    setForm(emptyForm);
    setSelectedServiceIds([]);
    setEditingId(null);
    setFormCurrency(displayCurrency);
  }

  function startEditing(packageItem: Package) {
    setEditingId(packageItem.id);
    setFormCurrency(displayCurrency);

    setForm({
      package_name:
        packageItem.package_name || "",
      package_name_en:
        packageItem.package_name_en || "",
      description:
        packageItem.description || "",
      description_en:
        packageItem.description_en || "",
      package_price: formatCurrencyInput(
        convertToDisplay(
          toNumber(packageItem.package_price)
        ),
        displayCurrency
      ),
      cost_price: formatCurrencyInput(
        convertToDisplay(
          toNumber(packageItem.cost_price)
        ),
        displayCurrency
      ),
      is_active:
        packageItem.is_active !== false,
      is_popular:
        packageItem.is_popular ?? false,
    });

    const ids =
      packageItem.package_services?.map(
        (item) => item.service_id
      ) ?? [];

    setSelectedServiceIds(ids);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function savePackage(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const packageName =
      form.package_name.trim();

    const inputPrice = Number(
      form.package_price
    );

    const inputCostPrice = Number(
      form.cost_price
    );

    const price = roundAccountingAmount(
      convertToAccounting(inputPrice)
    );

    const costPrice = roundAccountingAmount(
      convertToAccounting(inputCostPrice)
    );

    if (!packageName) {
      alert("请输入套餐名称");
      return;
    }

    if (
      selectedServiceIds.length === 0
    ) {
      alert("请至少选择一个服务项目");
      return;
    }

    if (
      !Number.isFinite(inputPrice) ||
      inputPrice <= 0
    ) {
      alert(
        `请输入正确的套餐价格（${displayCurrency}）`
      );
      return;
    }

    if (
      !Number.isFinite(inputCostPrice) ||
      inputCostPrice < 0
    ) {
      alert(
        `请输入正确的套餐内部成本（${displayCurrency}）`
      );
      return;
    }

    if (
      !Number.isFinite(price) ||
      !Number.isFinite(costPrice)
    ) {
      alert(
        `无法把 ${displayCurrency} 换算成 ${accountingCurrency}，请检查汇率设置。`
      );
      return;
    }

    if (costPrice > price) {
      const confirmed = window.confirm(
        `当前套餐内部成本高于套餐售价，这个套餐会产生负利润。\n输入货币：${displayCurrency}\n账本保存货币：${accountingCurrency}\n仍然继续保存吗？`
      );

      if (!confirmed) {
        return;
      }
    }

    const payload: PackagePayload = {
      package_name: packageName,

      package_name_en:
        form.package_name_en.trim() || null,

      description:
        form.description.trim() || null,

      description_en:
        form.description_en.trim() || null,

      original_price: originalPrice,
      package_price: price,
      cost_price: costPrice,
      estimated_minutes:
        estimatedMinutes,

      is_active: form.is_active,
      is_popular: form.is_popular,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await PackageService.update(
          editingId,
          payload,
          selectedServiceIds
        );

        alert("套餐修改成功");
      } else {
        await PackageService.create(
          payload,
          selectedServiceIds
        );

        alert("套餐创建成功");
      }

      resetForm();
      await loadData();
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(
    packageItem: Package
  ) {
    try {
      await PackageService.updateStatus(
        packageItem.id,
        !packageItem.is_active
      );

      await loadData();
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    }
  }

  async function deletePackage(
    packageItem: Package
  ) {
    const confirmed = window.confirm(
      `确定删除套餐“${packageItem.package_name}”吗？`
    );

    if (!confirmed) {
      return;
    }

    try {
      await PackageService.delete(
        packageItem.id
      );

      if (
        editingId === packageItem.id
      ) {
        resetForm();
      }

      await loadData();
    } catch (error: unknown) {
      alert(
        `${getErrorMessage(
          error
        )}\n\n如果套餐已经被订单使用，请改为“停用”，不要直接删除。`
      );
    }
  }

  async function uploadPackageImage(
    packageItem: Package,
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    setUploadingPackageId(
      packageItem.id
    );

    try {
      const imageUrl =
        await PackageService.uploadImage(
          packageItem.id,
          file
        );

      await PackageService.saveImage(
        packageItem.id,
        imageUrl
      );

      await loadData();
      alert("套餐图片上传成功");
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    } finally {
      setUploadingPackageId(null);
    }
  }

  async function removePackageImage(
    packageItem: Package
  ) {
    if (!packageItem.image_url) {
      return;
    }

    const confirmed = window.confirm(
      `确定移除“${packageItem.package_name}”的套餐图片吗？`
    );

    if (!confirmed) {
      return;
    }

    try {
      await PackageService.saveImage(
        packageItem.id,
        null
      );

      await loadData();
      alert("套餐图片已移除");
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    }
  }

  return (
    <main style={styles.page}>
      <style>
        {`
          .package-summary-grid {
            display: grid;
            grid-template-columns: repeat(6, minmax(0, 1fr));
            gap: 14px;
          }

          .package-form-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }

          .package-toolbar-grid {
            display: grid;
            grid-template-columns: minmax(260px, 1fr) 210px 210px auto;
            gap: 12px;
          }

          .package-card-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
          }

          @media (max-width: 1280px) {
            .package-summary-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }

          @media (max-width: 850px) {
            .package-summary-grid,
            .package-form-grid,
            .package-toolbar-grid {
              grid-template-columns: 1fr;
            }

            .package-card-grid {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      <header style={styles.pageHeader}>
        <div>
          <p style={styles.eyebrow}>
            PACKAGE PROFIT MANAGEMENT
          </p>

          <h1 style={styles.pageTitle}>
            套餐管理 / Package Management
          </h1>

          <p style={styles.pageDescription}>
            管理套餐售价、内部成本、优惠、利润、毛利率和包含服务
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading}
          style={{
            ...styles.refreshButton,
            opacity: loading ? 0.65 : 1,
          }}
        >
          {loading
            ? "载入中..."
            : "↻ 刷新数据"}
        </button>
      </header>

      <section style={styles.currencyPanel}>
        <div style={styles.currencyItem}>
          <span style={styles.currencyLabel}>
            当前显示货币 / Display
          </span>

          <strong style={styles.currencyValue}>
            {displayCurrency}
          </strong>
        </div>

        <div style={styles.currencyDivider} />

        <div style={styles.currencyItem}>
          <span style={styles.currencyLabel}>
            当前价格输入 / Price Input
          </span>

          <strong style={styles.currencyValue}>
            {displayCurrency}
          </strong>
        </div>

        <div style={styles.currencyDivider} />

        <div style={styles.currencyItem}>
          <span style={styles.currencyLabel}>
            数据库记账货币 / Accounting
          </span>

          <strong style={styles.currencyValue}>
            {accountingCurrency}
          </strong>
        </div>

        <p style={styles.currencyNote}>
          现在可以直接使用 {displayCurrency} 输入套餐售价和内部成本。
          保存时系统会按照当前汇率自动换算成 {accountingCurrency}
          写入账本；切换左侧 USD、MMK 或 CNY 后，编辑框也会同步切换。
        </p>
      </section>

      <section
        className="package-summary-grid"
        style={styles.summarySection}
      >
        <SummaryCard
          icon="📦"
          title="全部套餐"
          value={`${summary.total}`}
          hint="Total Packages"
          accent="#2563eb"
        />

        <SummaryCard
          icon="✅"
          title="启用套餐"
          value={`${summary.active}`}
          hint="Active Packages"
          accent="#16a34a"
        />

        <SummaryCard
          icon="🔥"
          title="热门套餐"
          value={`${summary.popular}`}
          hint="Popular Packages"
          accent="#ea580c"
        />

        <SummaryCard
          icon="📈"
          title="平均毛利率"
          value={formatPercent(
            summary.averageMargin
          )}
          hint="Average Margin"
          accent="#7c3aed"
        />

        <SummaryCard
          icon="⚠️"
          title="低毛利套餐"
          value={`${summary.lowMarginCount}`}
          hint={`低于 ${LOW_MARGIN_THRESHOLD}%`}
          accent="#d97706"
        />

        <SummaryCard
          icon="🔻"
          title="负利润套餐"
          value={`${summary.negativeCount}`}
          hint="Negative Profit"
          accent="#dc2626"
        />
      </section>

      <form
        onSubmit={savePackage}
        style={styles.formCard}
      >
        <div style={styles.formHeader}>
          <div>
            <p style={styles.sectionEyebrow}>
              PACKAGE INFORMATION
            </p>

            <h2 style={styles.formTitle}>
              {editingId === null
                ? "新增套餐 / New Package"
                : "编辑套餐 / Edit Package"}
            </h2>

            <p style={styles.formDescription}>
              选择服务后系统会自动计算服务原价和预计时间
            </p>
          </div>

          {editingId !== null && (
            <button
              type="button"
              onClick={resetForm}
              style={styles.cancelButton}
            >
              取消编辑
            </button>
          )}
        </div>

        <div className="package-form-grid">
          <FormField
            label="套餐名称 / Package Name"
            value={form.package_name}
            placeholder="例如：尊享美容套餐"
            onChange={(value) =>
              updateForm(
                "package_name",
                value
              )
            }
          />

          <FormField
            label="英文名称 / English Name"
            value={form.package_name_en}
            placeholder="Premium Detailing Package"
            onChange={(value) =>
              updateForm(
                "package_name_en",
                value
              )
            }
          />
        </div>

        <section style={styles.financialSection}>
          <div style={styles.financialHeader}>
            <div>
              <p style={styles.sectionEyebrow}>
                PRICING & PROFIT
              </p>

              <h3 style={styles.financialTitle}>
                套餐价格与利润
              </h3>
            </div>

            <ProfitBadge
              sellingPrice={
                formFinancials.sellingPrice
              }
              profit={formFinancials.profit}
              margin={formFinancials.margin}
            />
          </div>

          <div className="package-form-grid">
            <FormField
              label={`套餐售价 / Package Price (${displayCurrency})`}
              value={form.package_price}
              placeholder={
                displayCurrency === "MMK"
                  ? "0"
                  : "0.00"
              }
              type="number"
              step={
                displayCurrency === "MMK"
                  ? "1"
                  : "0.01"
              }
              prefix={displayCurrency}
              hint={`保存到账本：${formatAccountingMoney(
                formFinancials.sellingPrice
              )}`}
              onChange={(value) =>
                updateForm(
                  "package_price",
                  value
                )
              }
            />

            <FormField
              label={`套餐内部成本 / Internal Cost (${displayCurrency})`}
              value={form.cost_price}
              placeholder={
                displayCurrency === "MMK"
                  ? "0"
                  : "0.00"
              }
              type="number"
              step={
                displayCurrency === "MMK"
                  ? "1"
                  : "0.01"
              }
              prefix={displayCurrency}
              hint={`保存到账本：${formatAccountingMoney(
                formFinancials.costPrice
              )}`}
              onChange={(value) =>
                updateForm(
                  "cost_price",
                  value
                )
              }
            />
          </div>

          <div style={styles.suggestedCostRow}>
            <div>
              <span style={styles.suggestedCostLabel}>
                已选服务成本合计
              </span>

              <strong
                style={styles.suggestedCostValue}
              >
                {formatMoney(
                  suggestedServiceCost
                )}
              </strong>
            </div>

            <button
              type="button"
              disabled={
                selectedServiceIds.length === 0
              }
              onClick={() =>
                updateForm(
                  "cost_price",
                  formatCurrencyInput(
                    convertToDisplay(
                      suggestedServiceCost
                    ),
                    displayCurrency
                  )
                )
              }
              style={{
                ...styles.useCostButton,
                opacity:
                  selectedServiceIds.length === 0
                    ? 0.5
                    : 1,
              }}
            >
              使用服务成本合计
            </button>
          </div>

          <div style={styles.financialPreviewGrid}>
            <FinancialPreview
              label="服务原价"
              value={formatMoney(
                originalPrice
              )}
              accent="#334155"
            />

            <FinancialPreview
              label="客户节省"
              value={formatMoney(savings)}
              accent="#15803d"
            />

            <FinancialPreview
              label="优惠比例"
              value={formatPercent(
                discountPercentage
              )}
              accent="#2563eb"
            />

            <FinancialPreview
              label="单套利润"
              value={formatMoney(
                formFinancials.profit
              )}
              accent={
                formFinancials.profit >= 0
                  ? "#15803d"
                  : "#dc2626"
              }
            />

            <FinancialPreview
              label="毛利率"
              value={formatPercent(
                formFinancials.margin
              )}
              accent={getMarginColor(
                formFinancials.margin,
                formFinancials.profit
              )}
            />

            <FinancialPreview
              label="预计时间"
              value={`${estimatedMinutes} 分钟`}
              accent="#7c3aed"
            />
          </div>

          {formFinancials.sellingPrice > 0 &&
            formFinancials.margin <
              LOW_MARGIN_THRESHOLD && (
              <div
                style={
                  formFinancials.profit < 0
                    ? styles.dangerNotice
                    : styles.warningNotice
                }
              >
                {formFinancials.profit < 0
                  ? "⚠ 套餐内部成本高于套餐售价，目前会产生负利润。"
                  : `⚠ 当前套餐毛利率低于 ${LOW_MARGIN_THRESHOLD}%，建议调整售价或内部成本。`}
              </div>
            )}
        </section>

        <div
          className="package-form-grid"
          style={styles.descriptionGrid}
        >
          <label style={styles.field}>
            <span style={styles.fieldLabel}>
              中文介绍 / Chinese Description
            </span>

            <textarea
              value={form.description}
              onChange={(event) =>
                updateForm(
                  "description",
                  event.target.value
                )
              }
              placeholder="介绍套餐内容和优势..."
              style={styles.textarea}
            />
          </label>

          <label style={styles.field}>
            <span style={styles.fieldLabel}>
              英文介绍 / English Description
            </span>

            <textarea
              value={form.description_en}
              onChange={(event) =>
                updateForm(
                  "description_en",
                  event.target.value
                )
              }
              placeholder="Describe the package benefits..."
              style={styles.textarea}
            />
          </label>
        </div>

        <section style={styles.servicePicker}>
          <div style={styles.pickerHeader}>
            <div>
              <h3 style={styles.pickerTitle}>
                套餐包含服务 / Included Services
              </h3>

              <p style={styles.pickerDescription}>
                已选择 {selectedServiceIds.length} 项 ·
                原价{" "}
                {formatMoney(originalPrice)} ·
                服务成本{" "}
                {formatMoney(
                  suggestedServiceCost
                )}
              </p>
            </div>

            {selectedServiceIds.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setSelectedServiceIds([])
                }
                style={styles.clearButton}
              >
                清空
              </button>
            )}
          </div>

          <div style={styles.serviceGrid}>
            {services.map((service) => {
              const selected =
                selectedServiceIds.includes(
                  service.id
                );

              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() =>
                    toggleService(service.id)
                  }
                  style={{
                    ...styles.serviceOption,
                    borderColor: selected
                      ? "#2563eb"
                      : "#e2e8f0",
                    background: selected
                      ? "#eff6ff"
                      : "#ffffff",
                  }}
                >
                  <span
                    style={{
                      ...styles.checkBox,
                      background: selected
                        ? "#2563eb"
                        : "#e2e8f0",
                      color: selected
                        ? "#ffffff"
                        : "#64748b",
                    }}
                  >
                    {selected ? "✓" : "+"}
                  </span>

                  <span
                    style={
                      styles.serviceInformation
                    }
                  >
                    <strong>
                      {service.service_name}
                    </strong>

                    <small
                      style={styles.serviceEnglish}
                    >
                      {service.service_name_en ||
                        service.category}
                    </small>

                    <small
                      style={styles.serviceCostText}
                    >
                      成本{" "}
                      {formatMoney(
                        toNumber(
                          service.cost_price
                        )
                      )}
                    </small>
                  </span>

                  <strong
                    style={styles.servicePrice}
                  >
                    {formatMoney(
                      service.price
                    )}
                  </strong>
                </button>
              );
            })}
          </div>
        </section>

        <div style={styles.optionsGrid}>
          <label style={styles.optionCard}>
            <input
              type="checkbox"
              checked={form.is_popular}
              onChange={(event) =>
                updateForm(
                  "is_popular",
                  event.target.checked
                )
              }
            />

            <span>
              <strong
                style={styles.optionTitle}
              >
                🔥 热门套餐
              </strong>

              <small
                style={styles.optionHint}
              >
                Best Seller
              </small>
            </span>
          </label>

          <label style={styles.optionCard}>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) =>
                updateForm(
                  "is_active",
                  event.target.checked
                )
              }
            />

            <span>
              <strong
                style={styles.optionTitle}
              >
                ✅ 启用套餐
              </strong>

              <small
                style={styles.optionHint}
              >
                Available
              </small>
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            ...styles.saveButton,
            opacity: saving ? 0.65 : 1,
            cursor: saving
              ? "not-allowed"
              : "pointer",
          }}
        >
          {saving
            ? "保存中..."
            : editingId === null
              ? "创建套餐 / Create Package"
              : "保存修改 / Save Changes"}
        </button>
      </form>

      <section
        className="package-toolbar-grid"
        style={styles.toolbar}
      >
        <input
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="🔍 搜索套餐、服务或介绍..."
          style={styles.input}
        />

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target
                .value as StatusFilter
            )
          }
          style={styles.input}
        >
          <option value="all">
            全部状态
          </option>

          <option value="active">
            已启用
          </option>

          <option value="inactive">
            已停用
          </option>
        </select>

        <select
          value={profitFilter}
          onChange={(event) =>
            setProfitFilter(
              event.target
                .value as ProfitFilter
            )
          }
          style={styles.input}
        >
          <option value="all">
            全部利润状态
          </option>

          <option value="healthy">
            健康毛利
          </option>

          <option value="low">
            低毛利
          </option>

          <option value="negative">
            负利润
          </option>

          <option value="no_cost">
            成本为 0
          </option>
        </select>

        <button
          type="button"
          onClick={() => void loadData()}
          style={styles.toolbarRefreshButton}
        >
          ↻ 刷新
        </button>
      </section>

      {loading ? (
        <div style={styles.emptyState}>
          正在读取套餐资料...
        </div>
      ) : filteredPackages.length === 0 ? (
        <div style={styles.emptyState}>
          没有找到符合条件的套餐
        </div>
      ) : (
        <section className="package-card-grid">
          {filteredPackages.map(
            (packageItem) => {
              const includedServices =
                packageItem.package_services
                  ?.map(
                    (item) =>
                      item.services as
                        | ServiceWithCost
                        | null
                        | undefined
                  )
                  .filter(
                    (
                      service
                    ): service is ServiceWithCost =>
                      Boolean(service)
                  ) ?? [];

              const sellingPrice = toNumber(
                packageItem.package_price
              );

              const originalPackagePrice =
                toNumber(
                  packageItem.original_price
                );

              const costPrice = toNumber(
                packageItem.cost_price
              );

              const financials =
                calculateFinancials(
                  sellingPrice,
                  costPrice
                );

              const packageSavings = Math.max(
                originalPackagePrice -
                  sellingPrice,
                0
              );

              const packageDiscount =
                originalPackagePrice > 0
                  ? (packageSavings /
                      originalPackagePrice) *
                    100
                  : 0;

              return (
                <article
                  key={packageItem.id}
                  style={styles.packageCard}
                >
                  <div style={styles.imageBox}>
                    {packageItem.image_url ? (
                      <img
                        src={
                          packageItem.image_url
                        }
                        alt={
                          packageItem.package_name
                        }
                        style={styles.packageImage}
                      />
                    ) : (
                      <div
                        style={
                          styles.imageFallback
                        }
                      >
                        🎁
                      </div>
                    )}

                    <div style={styles.badgeRow}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          color:
                            packageItem.is_active
                              ? "#15803d"
                              : "#b91c1c",
                          background:
                            packageItem.is_active
                              ? "#dcfce7"
                              : "#fee2e2",
                        }}
                      >
                        {packageItem.is_active
                          ? "ACTIVE"
                          : "DISABLED"}
                      </span>

                      {packageItem.is_popular && (
                        <span
                          style={
                            styles.popularBadge
                          }
                        >
                          🔥 BEST SELLER
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    style={styles.packageContent}
                  >
                    <div
                      style={
                        styles.packageTitleRow
                      }
                    >
                      <div>
                        <h2
                          style={
                            styles.packageTitle
                          }
                        >
                          {
                            packageItem.package_name
                          }
                        </h2>

                        {packageItem.package_name_en && (
                          <p
                            style={
                              styles.packageEnglishTitle
                            }
                          >
                            {
                              packageItem.package_name_en
                            }
                          </p>
                        )}
                      </div>

                      <ProfitBadge
                        sellingPrice={
                          financials.sellingPrice
                        }
                        profit={
                          financials.profit
                        }
                        margin={
                          financials.margin
                        }
                        compact
                      />
                    </div>

                    {packageItem.description && (
                      <p
                        style={
                          styles.packageDescription
                        }
                      >
                        {
                          packageItem.description
                        }
                      </p>
                    )}

                    <div
                      style={styles.includedBox}
                    >
                      <strong
                        style={
                          styles.includedTitle
                        }
                      >
                        套餐包含 / What's Included
                      </strong>

                      {includedServices.map(
                        (service) => (
                          <div
                            key={service.id}
                            style={
                              styles.includedRow
                            }
                          >
                            <span>
                              ✓{" "}
                              {
                                service.service_name
                              }
                            </span>

                            <small>
                              {formatMoney(
                                service.price
                              )}
                            </small>
                          </div>
                        )
                      )}
                    </div>

                    <div
                      style={
                        styles.packagePriceArea
                      }
                    >
                      <div>
                        <span
                          style={styles.oldPrice}
                        >
                          原价{" "}
                          {formatMoney(
                            originalPackagePrice
                          )}
                        </span>

                        <strong
                          style={styles.newPrice}
                        >
                          {formatMoney(
                            sellingPrice
                          )}
                        </strong>
                      </div>

                      <div
                        style={
                          styles.savingsColumn
                        }
                      >
                        <span
                          style={
                            styles.savingBadge
                          }
                        >
                          节省{" "}
                          {formatMoney(
                            packageSavings
                          )}
                        </span>

                        <span
                          style={
                            styles.discountBadge
                          }
                        >
                          优惠{" "}
                          {formatPercent(
                            packageDiscount
                          )}
                        </span>
                      </div>
                    </div>

                    <section
                      style={
                        styles.cardFinancialBox
                      }
                    >
                      <FinancialRow
                        label="套餐售价"
                        value={formatMoney(
                          sellingPrice
                        )}
                      />

                      <FinancialRow
                        label="内部成本"
                        value={formatMoney(
                          costPrice
                        )}
                      />

                      <FinancialRow
                        label="单套利润"
                        value={formatMoney(
                          financials.profit
                        )}
                        valueColor={
                          financials.profit >= 0
                            ? "#15803d"
                            : "#dc2626"
                        }
                        strong
                      />

                      <div
                        style={styles.marginRow}
                      >
                        <span>毛利率</span>

                        <ProfitBadge
                          sellingPrice={
                            financials.sellingPrice
                          }
                          profit={
                            financials.profit
                          }
                          margin={
                            financials.margin
                          }
                          compact
                        />
                      </div>
                    </section>

                    <p
                      style={styles.durationText}
                    >
                      ⏱ 预计{" "}
                      {
                        packageItem.estimated_minutes
                      }{" "}
                      分钟
                    </p>

                    <div
                      style={styles.imageActions}
                    >
                      <label
                        style={{
                          ...styles.uploadButton,
                          opacity:
                            uploadingPackageId ===
                            packageItem.id
                              ? 0.65
                              : 1,
                        }}
                      >
                        {uploadingPackageId ===
                        packageItem.id
                          ? "上传中..."
                          : packageItem.image_url
                            ? "更换图片"
                            : "上传图片"}

                        <input
                          type="file"
                          accept="image/*"
                          disabled={
                            uploadingPackageId ===
                            packageItem.id
                          }
                          onChange={(event) =>
                            void uploadPackageImage(
                              packageItem,
                              event
                            )
                          }
                          style={styles.hiddenInput}
                        />
                      </label>

                      {packageItem.image_url && (
                        <button
                          type="button"
                          onClick={() =>
                            void removePackageImage(
                              packageItem
                            )
                          }
                          style={
                            styles.removeImageButton
                          }
                        >
                          移除图片
                        </button>
                      )}
                    </div>

                    <div style={styles.actionGrid}>
                      <button
                        type="button"
                        onClick={() =>
                          startEditing(packageItem)
                        }
                        style={styles.editButton}
                      >
                        ✏ 编辑
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void toggleStatus(
                            packageItem
                          )
                        }
                        style={
                          styles.statusButton
                        }
                      >
                        {packageItem.is_active
                          ? "停用"
                          : "启用"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void deletePackage(
                            packageItem
                          )
                        }
                        style={
                          styles.deleteButton
                        }
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </article>
              );
            }
          )}
        </section>
      )}
    </main>
  );
}

type SummaryCardProps = {
  icon: string;
  title: string;
  value: string;
  hint: string;
  accent: string;
};

function SummaryCard({
  icon,
  title,
  value,
  hint,
  accent,
}: SummaryCardProps) {
  return (
    <article
      style={{
        ...styles.summaryCard,
        borderTop: `4px solid ${accent}`,
      }}
    >
      <span
        style={{
          ...styles.summaryIcon,
          color: accent,
          background: `${accent}16`,
        }}
      >
        {icon}
      </span>

      <div>
        <p style={styles.summaryTitle}>
          {title}
        </p>

        <strong style={styles.summaryNumber}>
          {value}
        </strong>

        <span style={styles.summaryHint}>
          {hint}
        </span>
      </div>
    </article>
  );
}

type FormFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  type?: "text" | "number";
  step?: string;
  prefix?: string;
  hint?: string;
  onChange: (value: string) => void;
};

function FormField({
  label,
  value,
  placeholder,
  type = "text",
  step,
  prefix,
  hint,
  onChange,
}: FormFieldProps) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>
        {label}
      </span>

      <div style={styles.inputWrapper}>
        {prefix && (
          <span style={styles.inputPrefix}>
            {prefix}
          </span>
        )}

        <input
          type={type}
          min={
            type === "number"
              ? "0"
              : undefined
          }
          step={
            type === "number"
              ? step ?? "0.01"
              : undefined
          }
          value={value}
          placeholder={placeholder}
          onChange={(event) =>
            onChange(event.target.value)
          }
          style={{
            ...styles.input,
            paddingLeft: prefix
              ? Math.max(52, prefix.length * 10 + 24)
              : 14,
          }}
        />
      </div>

      {hint && (
        <span style={styles.fieldHint}>
          {hint}
        </span>
      )}
    </label>
  );
}

type FinancialPreviewProps = {
  label: string;
  value: string;
  accent: string;
};

function FinancialPreview({
  label,
  value,
  accent,
}: FinancialPreviewProps) {
  return (
    <div style={styles.previewCard}>
      <span style={styles.previewLabel}>
        {label}
      </span>

      <strong
        style={{
          ...styles.previewValue,
          color: accent,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

type ProfitBadgeProps = {
  sellingPrice: number;
  profit: number;
  margin: number;
  compact?: boolean;
};

function ProfitBadge({
  sellingPrice,
  profit,
  margin,
  compact = false,
}: ProfitBadgeProps) {
  let label = "未设置售价";
  let background = "#f1f5f9";
  let color = "#64748b";

  if (sellingPrice > 0 && profit < 0) {
    label = `负利润 ${formatPercent(margin)}`;
    background = "#fee2e2";
    color = "#b91c1c";
  } else if (
    sellingPrice > 0 &&
    margin < LOW_MARGIN_THRESHOLD
  ) {
    label = `低毛利 ${formatPercent(margin)}`;
    background = "#fef3c7";
    color = "#92400e";
  } else if (sellingPrice > 0) {
    label = `健康 ${formatPercent(margin)}`;
    background = "#dcfce7";
    color = "#166534";
  }

  return (
    <span
      style={{
        ...styles.profitBadge,
        padding: compact
          ? "5px 9px"
          : "8px 12px",
        background,
        color,
      }}
    >
      {label}
    </span>
  );
}

type FinancialRowProps = {
  label: string;
  value: string;
  valueColor?: string;
  strong?: boolean;
};

function FinancialRow({
  label,
  value,
  valueColor,
  strong = false,
}: FinancialRowProps) {
  return (
    <div
      style={{
        ...styles.financialRow,
        ...(strong
          ? styles.financialStrongRow
          : {}),
      }}
    >
      <span>{label}</span>

      <strong
        style={{
          color: valueColor ?? "#0f172a",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function calculateFinancials(
  sellingPrice: number,
  costPrice: number
) {
  const profit =
    sellingPrice - costPrice;

  const margin =
    sellingPrice > 0
      ? (profit / sellingPrice) * 100
      : 0;

  const costRatio =
    sellingPrice > 0
      ? (costPrice / sellingPrice) * 100
      : 0;

  return {
    sellingPrice,
    costPrice,
    profit,
    margin,
    costRatio,
  };
}

function getMarginColor(
  margin: number,
  profit: number
) {
  if (profit < 0) {
    return "#dc2626";
  }

  if (margin < LOW_MARGIN_THRESHOLD) {
    return "#d97706";
  }

  return "#15803d";
}

function formatCurrencyInput(
  value: number,
  currency: string
) {
  if (!Number.isFinite(value)) {
    return "";
  }

  if (currency === "MMK") {
    return String(Math.round(value));
  }

  return value
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1");
}

function roundAccountingAmount(value: number) {
  if (!Number.isFinite(value)) {
    return Number.NaN;
  }

  return Number(value.toFixed(6));
}

function toNumber(
  value:
    | number
    | string
    | null
    | undefined
) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : 0;
}

function formatPercent(value: number) {
  const safeValue =
    Number.isFinite(value) ? value : 0;

  return `${safeValue.toFixed(1)}%`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (error as { message?: unknown })
        .message ?? "操作失败"
    );
  }

  return "操作失败，请稍后重试";
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 30,
    background:
      "linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)",
    color: "#0f172a",
    boxSizing: "border-box",
  },

  pageHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 20,
    marginBottom: 24,
  },

  eyebrow: {
    margin: "0 0 8px",
    color: "#2563eb",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 1.7,
  },

  pageTitle: {
    margin: 0,
    fontSize: 36,
    lineHeight: 1.15,
  },

  pageDescription: {
    margin: "9px 0 0",
    color: "#64748b",
    fontSize: 14,
  },

  refreshButton: {
    minHeight: 46,
    padding: "0 18px",
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    background: "#ffffff",
    color: "#334155",
    cursor: "pointer",
    fontWeight: 800,
  },

  currencyPanel: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 22,
    padding: "16px 19px",
    border: "1px solid #bfdbfe",
    borderRadius: 17,
    background:
      "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)",
    boxShadow:
      "0 8px 22px rgba(37,99,235,.06)",
  },

  currencyItem: {
    minWidth: 150,
  },

  currencyLabel: {
    display: "block",
    color: "#64748b",
    fontSize: 11,
    fontWeight: 800,
  },

  currencyValue: {
    display: "block",
    marginTop: 4,
    color: "#0f172a",
    fontSize: 17,
  },

  currencyDivider: {
    width: 1,
    height: 34,
    background: "#cbd5e1",
  },

  currencyNote: {
    flex: "1 1 300px",
    margin: 0,
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.6,
  },

  summarySection: {
    marginBottom: 22,
  },

  summaryCard: {
    minHeight: 118,
    padding: 17,
    display: "flex",
    alignItems: "flex-start",
    gap: 13,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 17,
    boxShadow:
      "0 10px 28px rgba(15,23,42,.05)",
  },

  summaryIcon: {
    width: 43,
    height: 43,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    borderRadius: 13,
    fontSize: 20,
  },

  summaryTitle: {
    margin: "0 0 6px",
    color: "#475569",
    fontSize: 12,
    fontWeight: 800,
  },

  summaryNumber: {
    display: "block",
    color: "#0f172a",
    fontSize: 24,
    lineHeight: 1.1,
  },

  summaryHint: {
    display: "block",
    marginTop: 6,
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
  },

  formCard: {
    padding: 24,
    border: "1px solid #e2e8f0",
    borderRadius: 21,
    background: "#ffffff",
    boxShadow:
      "0 14px 35px rgba(15,23,42,.07)",
  },

  formHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 15,
    marginBottom: 20,
  },

  sectionEyebrow: {
    margin: "0 0 5px",
    color: "#64748b",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.3,
  },

  formTitle: {
    margin: 0,
    fontSize: 23,
  },

  formDescription: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: 13,
  },

  cancelButton: {
    padding: "10px 13px",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    background: "#ffffff",
    color: "#334155",
    cursor: "pointer",
    fontWeight: 800,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  fieldLabel: {
    color: "#334155",
    fontSize: 13,
    fontWeight: 800,
  },

  fieldHint: {
    color: "#64748b",
    fontSize: 11,
    lineHeight: 1.5,
  },

  inputWrapper: {
    position: "relative",
  },

  inputPrefix: {
    position: "absolute",
    left: 14,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#64748b",
    fontWeight: 800,
    pointerEvents: "none",
  },

  input: {
    width: "100%",
    minHeight: 46,
    padding: "0 14px",
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    background: "#ffffff",
    color: "#0f172a",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  },

  textarea: {
    width: "100%",
    minHeight: 115,
    padding: "13px 14px",
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    background: "#ffffff",
    color: "#0f172a",
    fontSize: 14,
    lineHeight: 1.6,
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
  },

  financialSection: {
    margin: "22px 0",
    padding: 20,
    border: "1px solid #bfdbfe",
    borderRadius: 18,
    background:
      "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)",
  },

  financialHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 16,
  },

  financialTitle: {
    margin: 0,
    fontSize: 20,
  },

  suggestedCostRow: {
    marginTop: 14,
    padding: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 13,
    border: "1px solid #dbeafe",
    borderRadius: 13,
    background: "#ffffff",
  },

  suggestedCostLabel: {
    display: "block",
    color: "#64748b",
    fontSize: 11,
  },

  suggestedCostValue: {
    display: "block",
    marginTop: 4,
    color: "#0f172a",
    fontSize: 18,
  },

  useCostButton: {
    minHeight: 38,
    padding: "0 13px",
    border: "1px solid #93c5fd",
    borderRadius: 10,
    background: "#eff6ff",
    color: "#1d4ed8",
    cursor: "pointer",
    fontWeight: 800,
  },

  financialPreviewGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(145px, 1fr))",
    gap: 12,
    marginTop: 15,
  },

  previewCard: {
    padding: 14,
    border: "1px solid #dbeafe",
    borderRadius: 13,
    background: "#ffffff",
  },

  previewLabel: {
    display: "block",
    marginBottom: 6,
    color: "#64748b",
    fontSize: 11,
    fontWeight: 750,
  },

  previewValue: {
    fontSize: 18,
  },

  warningNotice: {
    marginTop: 14,
    padding: "11px 13px",
    border: "1px solid #fcd34d",
    borderRadius: 11,
    background: "#fffbeb",
    color: "#92400e",
    fontSize: 13,
    fontWeight: 750,
  },

  dangerNotice: {
    marginTop: 14,
    padding: "11px 13px",
    border: "1px solid #fca5a5",
    borderRadius: 11,
    background: "#fef2f2",
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: 750,
  },

  descriptionGrid: {
    marginBottom: 20,
  },

  servicePicker: {
    marginTop: 22,
    padding: 18,
    border: "1px solid #e2e8f0",
    borderRadius: 17,
    background: "#f8fafc",
  },

  pickerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 15,
    marginBottom: 14,
  },

  pickerTitle: {
    margin: 0,
    fontSize: 18,
  },

  pickerDescription: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: 12,
  },

  clearButton: {
    padding: "8px 11px",
    border: "none",
    borderRadius: 9,
    background: "#e2e8f0",
    color: "#334155",
    cursor: "pointer",
    fontWeight: 750,
  },

  serviceGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 10,
  },

  serviceOption: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 12,
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    cursor: "pointer",
    textAlign: "left",
  },

  checkBox: {
    width: 28,
    height: 28,
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    borderRadius: 8,
    fontWeight: 900,
  },

  serviceInformation: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    minWidth: 0,
    color: "#334155",
  },

  serviceEnglish: {
    marginTop: 3,
    color: "#94a3b8",
    fontSize: 10,
  },

  serviceCostText: {
    marginTop: 4,
    color: "#15803d",
    fontSize: 10,
    fontWeight: 750,
  },

  servicePrice: {
    color: "#2563eb",
    fontSize: 12,
    whiteSpace: "nowrap",
  },

  optionsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 13,
    marginTop: 18,
  },

  optionCard: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    padding: 14,
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    background: "#f8fafc",
    cursor: "pointer",
  },

  optionTitle: {
    display: "block",
    color: "#334155",
    fontSize: 13,
  },

  optionHint: {
    display: "block",
    marginTop: 3,
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: 600,
  },

  saveButton: {
    width: "100%",
    marginTop: 19,
    minHeight: 49,
    padding: "0 18px",
    border: "none",
    borderRadius: 12,
    background: "#2563eb",
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 900,
  },

  toolbar: {
    margin: "24px 0 18px",
    padding: 15,
    border: "1px solid #e2e8f0",
    borderRadius: 17,
    background: "#ffffff",
    boxShadow:
      "0 10px 25px rgba(15,23,42,.04)",
  },

  toolbarRefreshButton: {
    minHeight: 46,
    padding: "0 15px",
    border: "1px solid #cbd5e1",
    borderRadius: 11,
    background: "#ffffff",
    color: "#334155",
    cursor: "pointer",
    fontWeight: 800,
  },

  emptyState: {
    minHeight: 250,
    padding: 40,
    display: "grid",
    placeItems: "center",
    border: "1px solid #e2e8f0",
    borderRadius: 20,
    background: "#ffffff",
    color: "#64748b",
    boxShadow:
      "0 10px 28px rgba(15,23,42,.05)",
  },

  packageCard: {
    overflow: "hidden",
    border: "1px solid #e2e8f0",
    borderRadius: 20,
    background: "#ffffff",
    boxShadow:
      "0 12px 32px rgba(15,23,42,.07)",
  },

  imageBox: {
    position: "relative",
    height: 205,
    background: "#e2e8f0",
  },

  packageImage: {
    width: "100%",
    height: "100%",
    display: "block",
    objectFit: "cover",
  },

  imageFallback: {
    width: "100%",
    height: "100%",
    display: "grid",
    placeItems: "center",
    fontSize: 64,
    background:
      "linear-gradient(135deg,#dbeafe,#ede9fe)",
  },

  badgeRow: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },

  statusBadge: {
    padding: "6px 9px",
    borderRadius: 999,
    fontSize: 9,
    fontWeight: 900,
  },

  popularBadge: {
    padding: "6px 9px",
    borderRadius: 999,
    background: "rgba(254,226,226,.94)",
    color: "#b91c1c",
    fontSize: 9,
    fontWeight: 900,
  },

  packageContent: {
    padding: 19,
  },

  packageTitleRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  packageTitle: {
    margin: 0,
    color: "#111827",
    fontSize: 22,
  },

  packageEnglishTitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: 13,
  },

  packageDescription: {
    margin: "12px 0 0",
    color: "#475569",
    fontSize: 13,
    lineHeight: 1.6,
  },

  includedBox: {
    marginTop: 15,
    padding: 13,
    borderRadius: 12,
    background: "#f8fafc",
  },

  includedTitle: {
    display: "block",
    marginBottom: 8,
    color: "#2563eb",
    fontSize: 11,
  },

  includedRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    padding: "6px 0",
    color: "#334155",
    fontSize: 12,
  },

  packagePriceArea: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    marginTop: 17,
  },

  oldPrice: {
    display: "block",
    color: "#94a3b8",
    fontSize: 11,
    textDecoration: "line-through",
  },

  newPrice: {
    display: "block",
    marginTop: 4,
    color: "#2563eb",
    fontSize: 28,
  },

  savingsColumn: {
    display: "grid",
    justifyItems: "end",
    gap: 6,
  },

  savingBadge: {
    padding: "7px 10px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#15803d",
    fontSize: 10,
    fontWeight: 900,
  },

  discountBadge: {
    padding: "5px 8px",
    borderRadius: 999,
    background: "#dbeafe",
    color: "#1d4ed8",
    fontSize: 9,
    fontWeight: 850,
  },

  cardFinancialBox: {
    marginTop: 15,
    padding: 14,
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    background: "#f8fafc",
  },

  financialRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 15,
    padding: "7px 0",
    color: "#475569",
    fontSize: 12,
  },

  financialStrongRow: {
    marginTop: 4,
    paddingTop: 11,
    borderTop: "1px solid #e2e8f0",
  },

  marginRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 15,
    marginTop: 8,
    color: "#475569",
    fontSize: 12,
  },

  profitBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  durationText: {
    margin: "13px 0 0",
    color: "#64748b",
    fontSize: 11,
  },

  imageActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 14,
  },

  uploadButton: {
    minHeight: 38,
    padding: "0 13px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #93c5fd",
    borderRadius: 10,
    background: "#eff6ff",
    color: "#1d4ed8",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 800,
  },

  removeImageButton: {
    minHeight: 38,
    padding: "0 13px",
    border: "1px solid #fca5a5",
    borderRadius: 10,
    background: "#fef2f2",
    color: "#b91c1c",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 800,
  },

  hiddenInput: {
    display: "none",
  },

  actionGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: 9,
    marginTop: 14,
  },

  editButton: {
    minHeight: 40,
    padding: "0 8px",
    border: "none",
    borderRadius: 10,
    background: "#eff6ff",
    color: "#2563eb",
    cursor: "pointer",
    fontWeight: 800,
  },

  statusButton: {
    minHeight: 40,
    padding: "0 8px",
    border: "none",
    borderRadius: 10,
    background: "#f1f5f9",
    color: "#475569",
    cursor: "pointer",
    fontWeight: 800,
  },

  deleteButton: {
    minHeight: 40,
    padding: "0 8px",
    border: "none",
    borderRadius: 10,
    background: "#fee2e2",
    color: "#b91c1c",
    cursor: "pointer",
    fontWeight: 800,
  },
};

export default Packages;