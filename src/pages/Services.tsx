import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
} from "react";

import ServiceImageUploader from "../components/services/ServiceImageUploader";
import ServiceVehiclePricingEditor from "../components/services/ServiceVehiclePricingEditor";
import { supabase } from "../lib/supabase";
import useCurrency from "../hooks/useCurrency";

type UploadImageType = "main" | "before" | "after";

type ProfitFilter =
  | "all"
  | "healthy"
  | "low"
  | "negative"
  | "no_cost";

type ServiceRecord = {
  id: number;

  service_name: string;
  service_name_en: string | null;

  description: string | null;
  description_en: string | null;

  category: string;

  price: number | string;
  cost_price: number | string | null;

  duration_minutes: number | null;

  is_active: boolean;
  is_popular: boolean | null;
  is_recommended: boolean | null;

  rating: number | string | null;
  review_count: number | null;

  image_url: string | null;
  before_image: string | null;
  after_image: string | null;

  created_at?: string | null;
};

type ServiceForm = {
  service_name: string;
  service_name_en: string;

  description: string;
  description_en: string;

  category: string;

  price: string;
  cost_price: string;
  duration_minutes: string;

  rating: string;
  review_count: string;

  is_active: boolean;
  is_popular: boolean;
  is_recommended: boolean;
};

const LOW_MARGIN_THRESHOLD = 30;

const emptyForm: ServiceForm = {
  service_name: "",
  service_name_en: "",

  description: "",
  description_en: "",

  category: "",

  price: "",
  cost_price: "0",
  duration_minutes: "",

  rating: "5.0",
  review_count: "0",

  is_active: true,
  is_popular: false,
  is_recommended: false,
};

function Services() {
  const {
    formatMoney,
    formatAccountingMoney,
    currentOption,
    accountingOption,
    displayCurrency,
    convertToDisplay,
    convertToAccounting,
  } = useCurrency();

  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [search, setSearch] = useState("");
  const [profitFilter, setProfitFilter] =
    useState<ProfitFilter>("all");

  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [editingId, setEditingId] =
    useState<number | null>(null);
  const [formCurrency, setFormCurrency] =
    useState(displayCurrency);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [uploadingTarget, setUploadingTarget] =
    useState<{
      serviceId: number;
      imageType: UploadImageType;
    } | null>(null);

  const formFinancials = useMemo(() => {
    const sellingPrice = convertToAccounting(
      toNumber(form.price)
    );
    const costPrice = convertToAccounting(
      toNumber(form.cost_price)
    );

    return calculateFinancials(sellingPrice, costPrice);
  }, [
    form.price,
    form.cost_price,
    convertToAccounting,
  ]);

  const summary = useMemo(() => {
    const activeCount = services.filter(
      (service) => service.is_active !== false
    ).length;

    const financialRows = services.map((service) =>
      calculateFinancials(
        toNumber(service.price),
        toNumber(service.cost_price)
      )
    );

    const servicesWithPrice = financialRows.filter(
      (row) => row.sellingPrice > 0
    );

    const averageMargin =
      servicesWithPrice.length > 0
        ? servicesWithPrice.reduce(
            (sum, row) => sum + row.margin,
            0
          ) / servicesWithPrice.length
        : 0;

    const lowMarginCount = financialRows.filter(
      (row) =>
        row.sellingPrice > 0 &&
        row.profit >= 0 &&
        row.margin < LOW_MARGIN_THRESHOLD
    ).length;

    const negativeProfitCount = financialRows.filter(
      (row) => row.profit < 0
    ).length;

    return {
      total: services.length,
      activeCount,
      averageMargin,
      lowMarginCount,
      negativeProfitCount,
    };
  }, [services]);

  const filteredServices = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return services.filter((service) => {
      const financials = calculateFinancials(
        toNumber(service.price),
        toNumber(service.cost_price)
      );

      const searchText = [
        service.service_name,
        service.service_name_en,
        service.category,
        service.description,
        service.description_en,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !keyword || searchText.includes(keyword);

      const matchesProfit =
        profitFilter === "all" ||
        (profitFilter === "healthy" &&
          financials.profit >= 0 &&
          financials.margin >= LOW_MARGIN_THRESHOLD) ||
        (profitFilter === "low" &&
          financials.profit >= 0 &&
          financials.sellingPrice > 0 &&
          financials.margin < LOW_MARGIN_THRESHOLD) ||
        (profitFilter === "negative" &&
          financials.profit < 0) ||
        (profitFilter === "no_cost" &&
          financials.costPrice === 0);

      return matchesSearch && matchesProfit;
    });
  }, [services, search, profitFilter]);

  useEffect(() => {
    void loadServices();
  }, []);

  useEffect(() => {
    if (formCurrency === displayCurrency) {
      return;
    }

    setForm((current) => {
      if (editingId !== null) {
        const editingService = services.find(
          (service) => service.id === editingId
        );

        if (editingService) {
          return {
            ...current,
            price: formatCurrencyInput(
              convertToDisplay(
                toNumber(editingService.price)
              ),
              displayCurrency
            ),
            cost_price: formatCurrencyInput(
              convertToDisplay(
                toNumber(editingService.cost_price)
              ),
              displayCurrency
            ),
          };
        }
      }

      return {
        ...current,
        price: "",
        cost_price: "0",
      };
    });

    setFormCurrency(displayCurrency);
  }, [
    displayCurrency,
    editingId,
    services,
    formCurrency,
    convertToDisplay,
  ]);

  async function loadServices() {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setServices((data ?? []) as ServiceRecord[]);
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function updateForm<K extends keyof ServiceForm>(
    field: K,
    value: ServiceForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function startEditing(service: ServiceRecord) {
    setEditingId(service.id);
    setFormCurrency(displayCurrency);

    setForm({
      service_name: service.service_name ?? "",
      service_name_en: service.service_name_en ?? "",

      description: service.description ?? "",
      description_en: service.description_en ?? "",

      category: service.category ?? "",

      price: formatCurrencyInput(
        convertToDisplay(toNumber(service.price)),
        displayCurrency
      ),
      cost_price: formatCurrencyInput(
        convertToDisplay(
          toNumber(service.cost_price)
        ),
        displayCurrency
      ),
      duration_minutes: String(
        service.duration_minutes ?? 0
      ),

      rating: String(service.rating ?? 5),
      review_count: String(service.review_count ?? 0),

      is_active: service.is_active !== false,
      is_popular: service.is_popular === true,
      is_recommended:
        service.is_recommended === true,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(emptyForm);
    setFormCurrency(displayCurrency);
  }

  async function saveService(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const serviceName = form.service_name.trim();
    const category = form.category.trim();

    const inputPrice = Number(form.price);
    const inputCostPrice = Number(form.cost_price);
    const price = roundAccountingAmount(
      convertToAccounting(inputPrice)
    );
    const costPrice = roundAccountingAmount(
      convertToAccounting(inputCostPrice)
    );
    const durationMinutes = Number(
      form.duration_minutes
    );

    const rating = Number(form.rating);
    const reviewCount = Number(form.review_count);

    if (!serviceName) {
      alert("请输入服务名称");
      return;
    }

    if (!category) {
      alert("请输入服务分类");
      return;
    }

    if (
      !Number.isFinite(inputPrice) ||
      inputPrice < 0
    ) {
      alert("请输入正确的销售价格");
      return;
    }

    if (
      !Number.isFinite(inputCostPrice) ||
      inputCostPrice < 0
    ) {
      alert("请输入正确的内部成本");
      return;
    }

    if (
      !Number.isFinite(durationMinutes) ||
      durationMinutes < 0
    ) {
      alert("请输入正确的施工时间");
      return;
    }

    if (
      !Number.isFinite(rating) ||
      rating < 0 ||
      rating > 5
    ) {
      alert("评分必须在 0 到 5 之间");
      return;
    }

    if (
      !Number.isInteger(reviewCount) ||
      reviewCount < 0
    ) {
      alert("评价数量必须是 0 或以上的整数");
      return;
    }

    if (costPrice > price) {
      const confirmed = window.confirm(
        "当前内部成本高于销售价格，这个服务会产生负利润。\n仍然继续保存吗？"
      );

      if (!confirmed) {
        return;
      }
    }

    setSaving(true);

    try {
      const payload = {
        service_name: serviceName,
        service_name_en:
          form.service_name_en.trim() || null,

        description:
          form.description.trim() || null,
        description_en:
          form.description_en.trim() || null,

        category,

        price,
        cost_price: costPrice,
        duration_minutes: Math.round(
          durationMinutes
        ),

        rating,
        review_count: reviewCount,

        is_active: form.is_active,
        is_popular: form.is_popular,
        is_recommended: form.is_recommended,
      };

      if (editingId !== null) {
        const { error } = await supabase
          .from("services")
          .update(payload)
          .eq("id", editingId);

        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase
          .from("services")
          .insert(payload);

        if (error) {
          throw error;
        }
      }

      const successMessage =
        editingId !== null
          ? "服务修改成功"
          : "服务新增成功";

      cancelEditing();
      await loadServices();

      alert(successMessage);
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function toggleServiceStatus(
    service: ServiceRecord
  ) {
    try {
      const { error } = await supabase
        .from("services")
        .update({
          is_active: !service.is_active,
        })
        .eq("id", service.id);

      if (error) {
        throw error;
      }

      await loadServices();
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    }
  }

  async function uploadServiceImage(
    service: ServiceRecord,
    imageType: UploadImageType,
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("请选择图片文件");
      return;
    }

    const maximumSize = 5 * 1024 * 1024;

    if (file.size > maximumSize) {
      alert("图片不能超过 5MB");
      return;
    }

    setUploadingTarget({
      serviceId: service.id,
      imageType,
    });

    try {
      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() || "jpg";

      const safeExtension =
        extension.replace(/[^a-z0-9]/g, "") ||
        "jpg";

      const filePath = `${
        service.id
      }/${imageType}-${Date.now()}.${safeExtension}`;

      const { error: uploadError } =
        await supabase.storage
          .from("service-images")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } =
        supabase.storage
          .from("service-images")
          .getPublicUrl(filePath);

      const imageField =
        getImageDatabaseField(imageType);

      const { error: updateError } =
        await supabase
          .from("services")
          .update({
            [imageField]:
              publicUrlData.publicUrl,
          })
          .eq("id", service.id);

      if (updateError) {
        throw updateError;
      }

      await loadServices();

      alert(
        imageType === "main"
          ? "主图上传成功"
          : imageType === "before"
            ? "施工前图片上传成功"
            : "施工后图片上传成功"
      );
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    } finally {
      setUploadingTarget(null);
    }
  }

  async function removeServiceImage(
    service: ServiceRecord,
    imageType: UploadImageType
  ) {
    const imageUrl =
      getServiceImageUrl(service, imageType);

    if (!imageUrl) {
      return;
    }

    const imageLabel =
      imageType === "main"
        ? "主图"
        : imageType === "before"
          ? "施工前图片"
          : "施工后图片";

    const confirmed = window.confirm(
      `确定移除“${service.service_name}”的${imageLabel}吗？`
    );

    if (!confirmed) {
      return;
    }

    try {
      const imageField =
        getImageDatabaseField(imageType);

      const { error } = await supabase
        .from("services")
        .update({
          [imageField]: null,
        })
        .eq("id", service.id);

      if (error) {
        throw error;
      }

      await loadServices();
      alert(`${imageLabel}已移除`);
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    }
  }

  async function deleteService(
    service: ServiceRecord
  ) {
    const confirmed = window.confirm(
      `确定删除服务“${service.service_name}”吗？\n删除后无法恢复。`
    );

    if (!confirmed) {
      return;
    }

    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", service.id);

      if (error) {
        throw error;
      }

      if (editingId === service.id) {
        cancelEditing();
      }

      await loadServices();
    } catch (error: unknown) {
      alert(
        `${getErrorMessage(
          error
        )}\n\n如果这个服务已经被订单或套餐使用，请改为“停用”，不要直接删除。`
      );
    }
  }

  return (
    <main style={styles.page}>
      <style>
        {`
          .service-summary-grid {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 14px;
          }

          .service-form-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }

          .service-card-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
            gap: 20px;
          }

          .service-image-upload-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
          }

          @media (max-width: 1200px) {
            .service-summary-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }

          @media (max-width: 850px) {
            .service-summary-grid,
            .service-form-grid {
              grid-template-columns: 1fr;
            }

            .service-card-grid {
              grid-template-columns: 1fr;
            }

            .service-image-upload-grid {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      <header style={styles.pageHeader}>
        <div>
          <p style={styles.eyebrow}>
            SERVICE PROFIT MANAGEMENT
          </p>

          <h1 style={styles.pageTitle}>
            服务管理 / Service Management
          </h1>

          <p style={styles.pageDescription}>
            管理销售价格、内部成本、预计利润、毛利率、图片与启用状态
          </p>
        </div>

        <div style={styles.countBadge}>
          共 {services.length} 个服务
        </div>
      </header>

      <section
        className="service-summary-grid"
        style={styles.summarySection}
      >
        <SummaryCard
          icon="🧰"
          label="全部服务"
          value={`${summary.total}`}
          hint="Total Services"
          accent="#2563eb"
        />

        <SummaryCard
          icon="✅"
          label="启用服务"
          value={`${summary.activeCount}`}
          hint="Active Services"
          accent="#16a34a"
        />

        <SummaryCard
          icon="📈"
          label="平均毛利率"
          value={formatPercent(
            summary.averageMargin
          )}
          hint="Average Margin"
          accent="#7c3aed"
        />

        <SummaryCard
          icon="⚠️"
          label="低毛利服务"
          value={`${summary.lowMarginCount}`}
          hint={`低于 ${LOW_MARGIN_THRESHOLD}%`}
          accent="#d97706"
        />

        <SummaryCard
          icon="🔻"
          label="负利润服务"
          value={`${summary.negativeProfitCount}`}
          hint="Negative Profit"
          accent="#dc2626"
        />
      </section>

      <form
        onSubmit={saveService}
        style={styles.formCard}
      >
        <div style={styles.formHeader}>
          <div>
            <p style={styles.sectionEyebrow}>
              SERVICE INFORMATION
            </p>

            <h2 style={styles.sectionTitle}>
              {editingId === null
                ? "新增服务"
                : "编辑服务"}
            </h2>

            <p style={styles.formDescription}>
              {editingId === null
                ? "填写服务资料、价格和内部成本"
                : `正在编辑服务 ID：${editingId}`}
            </p>

            <p style={styles.currencyHint}>
              输入货币：{currentOption.flag} {currentOption.code}
              {" · "}
              账本货币：{accountingOption.flag} {accountingOption.code}
            </p>
          </div>

          {editingId !== null && (
            <button
              type="button"
              onClick={cancelEditing}
              style={styles.cancelButton}
            >
              取消编辑
            </button>
          )}
        </div>

        <div
          className="service-form-grid"
          style={styles.formGridSection}
        >
          <FormField
            label="中文名称 / Chinese Name"
            value={form.service_name}
            placeholder="例如：精致洗车"
            onChange={(value) =>
              updateForm("service_name", value)
            }
          />

          <FormField
            label="英文名称 / English Name"
            value={form.service_name_en}
            placeholder="例如：Premium Car Wash"
            onChange={(value) =>
              updateForm(
                "service_name_en",
                value
              )
            }
          />

          <FormField
            label="服务分类 / Category"
            value={form.category}
            placeholder="例如：洗车、美容、镀膜"
            onChange={(value) =>
              updateForm("category", value)
            }
          />

          <FormField
            label="施工时间（分钟）"
            type="number"
            min="0"
            step="1"
            value={form.duration_minutes}
            placeholder="30"
            onChange={(value) =>
              updateForm(
                "duration_minutes",
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
                价格与利润
              </h3>
            </div>

            <ProfitBadge
              profit={formFinancials.profit}
              margin={formFinancials.margin}
              sellingPrice={
                formFinancials.sellingPrice
              }
            />
          </div>

          <div className="service-form-grid">
            <FormField
              label={`销售价格 / Selling Price (${displayCurrency})`}
              type="number"
              min="0"
              step={
                displayCurrency === "MMK"
                  ? "1"
                  : "0.01"
              }
              value={form.price}
              placeholder={
                displayCurrency === "MMK"
                  ? "0"
                  : "0.00"
              }
              onChange={(value) =>
                updateForm("price", value)
              }
              prefix={currentOption.symbol}
              hint={`保存到账本：${formatAccountingMoney(
                formFinancials.sellingPrice
              )}`}
            />

            <FormField
              label={`内部成本 / Internal Cost (${displayCurrency})`}
              type="number"
              min="0"
              step={
                displayCurrency === "MMK"
                  ? "1"
                  : "0.01"
              }
              value={form.cost_price}
              placeholder={
                displayCurrency === "MMK"
                  ? "0"
                  : "0.00"
              }
              onChange={(value) =>
                updateForm(
                  "cost_price",
                  value
                )
              }
              prefix={currentOption.symbol}
              hint={`保存到账本：${formatAccountingMoney(
                formFinancials.costPrice
              )}`}
            />
          </div>

          <div style={styles.profitPreviewGrid}>
            <FinancialPreview
              label="预计单项利润"
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
              label="预计毛利率"
              value={formatPercent(
                formFinancials.margin
              )}
              accent={getMarginColor(
                formFinancials.margin,
                formFinancials.profit
              )}
            />

            <FinancialPreview
              label="成本占比"
              value={formatPercent(
                formFinancials.costRatio
              )}
              accent="#475569"
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
                  ? "⚠ 当前成本高于销售价格，这个服务会产生负利润。"
                  : `⚠ 当前毛利率低于 ${LOW_MARGIN_THRESHOLD}%，建议检查价格或成本。`}
              </div>
            )}
              </section>

        {editingId !== null && (
          <ServiceVehiclePricingEditor
            serviceId={editingId}
          />
        )}

        <div
          className="service-form-grid"
          style={styles.formGridSection}
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
              placeholder="例如：高压冲洗、泡沫清洁、擦干车身"
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
              placeholder="High pressure wash, foam cleaning and hand dry"
              style={styles.textarea}
            />
          </label>

          <FormField
            label="评分 / Rating"
            type="number"
            min="0"
            max="5"
            step="0.1"
            value={form.rating}
            placeholder="5.0"
            onChange={(value) =>
              updateForm("rating", value)
            }
          />

          <FormField
            label="评价数量 / Review Count"
            type="number"
            min="0"
            step="1"
            value={form.review_count}
            placeholder="0"
            onChange={(value) =>
              updateForm(
                "review_count",
                value
              )
            }
          />
        </div>

        <div style={styles.featureOptions}>
          <FeatureOption
            checked={form.is_popular}
            title="🔥 热门服务"
            subtitle="Best Seller"
            onChange={(checked) =>
              updateForm(
                "is_popular",
                checked
              )
            }
          />

          <FeatureOption
            checked={form.is_recommended}
            title="⭐ 推荐服务"
            subtitle="Recommended"
            onChange={(checked) =>
              updateForm(
                "is_recommended",
                checked
              )
            }
          />

          <FeatureOption
            checked={form.is_active}
            title="✅ 立即启用"
            subtitle="Active Service"
            onChange={(checked) =>
              updateForm(
                "is_active",
                checked
              )
            }
          />
        </div>

        <div style={styles.formFooter}>
          <span style={styles.formHint}>
            利润 = 销售价格 − 内部成本
          </span>

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
                ? "+ 新增服务"
                : "保存修改"}
          </button>
        </div>
      </form>

      <section style={styles.toolbar}>
        <input
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="🔍 搜索名称、英文名、分类或介绍..."
          style={styles.searchInput}
        />

        <select
          value={profitFilter}
          onChange={(event) =>
            setProfitFilter(
              event.target
                .value as ProfitFilter
            )
          }
          style={styles.filterSelect}
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
          onClick={() => void loadServices()}
          style={styles.refreshButton}
        >
          ↻ 刷新
        </button>
      </section>

      {loading ? (
        <div style={styles.emptyCard}>
          正在载入服务...
        </div>
      ) : filteredServices.length === 0 ? (
        <div style={styles.emptyCard}>
          没有找到符合条件的服务项目
        </div>
      ) : (
        <section className="service-card-grid">
          {filteredServices.map((service) => {
            const financials =
              calculateFinancials(
                toNumber(service.price),
                toNumber(service.cost_price)
              );

            return (
              <article
                key={service.id}
                style={styles.serviceCard}
              >
                <div style={styles.imageContainer}>
                  {service.image_url ? (
                    <img
                      src={service.image_url}
                      alt={service.service_name}
                      style={styles.serviceImage}
                    />
                  ) : (
                    <div
                      style={
                        styles.imagePlaceholder
                      }
                    >
                      🚗
                    </div>
                  )}

                  <span
                    style={{
                      ...styles.statusBadge,
                      background:
                        service.is_active
                          ? "rgba(22,163,74,.93)"
                          : "rgba(71,85,105,.93)",
                    }}
                  >
                    {service.is_active
                      ? "ACTIVE"
                      : "DISABLED"}
                  </span>
                </div>

                <div style={styles.serviceContent}>
                  <div
                    style={styles.serviceTitleRow}
                  >
                    <div>
                      <p
                        style={
                          styles.serviceCategory
                        }
                      >
                        {service.category ||
                          "其他"}
                      </p>

                      <h3
                        style={styles.serviceTitle}
                      >
                        {service.service_name}
                      </h3>

                      {service.service_name_en && (
                        <p
                          style={
                            styles.serviceEnglishName
                          }
                        >
                          {
                            service.service_name_en
                          }
                        </p>
                      )}
                    </div>

                    <strong
                      style={styles.priceText}
                    >
                      {formatMoney(
                        financials.sellingPrice
                      )}
                    </strong>
                  </div>

                  <div style={styles.metaRow}>
                    <span style={styles.metaBadge}>
                      ⏱{" "}
                      {service.duration_minutes ??
                        0}{" "}
                      分钟
                    </span>

                    <span style={styles.metaBadge}>
                      ⭐{" "}
                      {Number(
                        service.rating ?? 5
                      ).toFixed(1)}
                    </span>

                    {service.is_popular && (
                      <span
                        style={
                          styles.popularBadge
                        }
                      >
                        🔥 热门
                      </span>
                    )}

                    {service.is_recommended && (
                      <span
                        style={
                          styles.recommendedBadge
                        }
                      >
                        ⭐ 推荐
                      </span>
                    )}
                  </div>

                  <section
                    style={styles.cardFinancialBox}
                  >
                    <div
                      style={
                        styles.cardFinancialRow
                      }
                    >
                      <span>销售价格</span>

                      <strong>
                        {formatMoney(
                          financials.sellingPrice
                        )}
                      </strong>
                    </div>

                    <div
                      style={
                        styles.cardFinancialRow
                      }
                    >
                      <span>内部成本</span>

                      <strong>
                        {formatMoney(
                          financials.costPrice
                        )}
                      </strong>
                    </div>

                    <div
                      style={{
                        ...styles.cardFinancialRow,
                        ...styles.cardProfitRow,
                      }}
                    >
                      <span>单项利润</span>

                      <strong
                        style={{
                          color:
                            financials.profit >= 0
                              ? "#15803d"
                              : "#dc2626",
                        }}
                      >
                        {formatMoney(
                          financials.profit
                        )}
                      </strong>
                    </div>

                    <div
                      style={styles.marginRow}
                    >
                      <span>毛利率</span>

                      <ProfitBadge
                        profit={
                          financials.profit
                        }
                        margin={
                          financials.margin
                        }
                        sellingPrice={
                          financials.sellingPrice
                        }
                        compact
                      />
                    </div>
                  </section>

                  {(service.description ||
                    service.description_en) && (
                    <div
                      style={
                        styles.descriptionBox
                      }
                    >
                      {service.description && (
                        <p
                          style={
                            styles.descriptionText
                          }
                        >
                          {service.description}
                        </p>
                      )}

                      {service.description_en && (
                        <p
                          style={
                            styles.descriptionEnglish
                          }
                        >
                          {
                            service.description_en
                          }
                        </p>
                      )}
                    </div>
                  )}

                  <div
                    className="service-image-upload-grid"
                    style={
                      styles.imageUploaderSection
                    }
                  >
                    <ServiceImageUploader
                      title="主图 / Main"
                      imageUrl={
  service.image_url ?? undefined
}
                      uploading={
                        uploadingTarget?.serviceId ===
                          service.id &&
                        uploadingTarget.imageType ===
                          "main"
                      }
                      onUpload={(event) =>
                        uploadServiceImage(
                          service,
                          "main",
                          event
                        )
                      }
                      onRemove={() =>
                        removeServiceImage(
                          service,
                          "main"
                        )
                      }
                    />

                    <ServiceImageUploader
                      title="施工前 / Before"
                     imageUrl={
  service.before_image ?? undefined
}
                      uploading={
                        uploadingTarget?.serviceId ===
                          service.id &&
                        uploadingTarget.imageType ===
                          "before"
                      }
                      onUpload={(event) =>
                        uploadServiceImage(
                          service,
                          "before",
                          event
                        )
                      }
                      onRemove={() =>
                        removeServiceImage(
                          service,
                          "before"
                        )
                      }
                    />

                    <ServiceImageUploader
                      title="施工后 / After"
                      imageUrl={
  service.after_image ?? undefined
}
                      uploading={
                        uploadingTarget?.serviceId ===
                          service.id &&
                        uploadingTarget.imageType ===
                          "after"
                      }
                      onUpload={(event) =>
                        uploadServiceImage(
                          service,
                          "after",
                          event
                        )
                      }
                      onRemove={() =>
                        removeServiceImage(
                          service,
                          "after"
                        )
                      }
                    />
                  </div>

                  <div style={styles.actionGrid}>
                    <button
                      type="button"
                      onClick={() =>
                        startEditing(service)
                      }
                      style={styles.editButton}
                    >
                      ✏ 编辑
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void toggleServiceStatus(
                          service
                        )
                      }
                      style={
                        service.is_active
                          ? styles.disableButton
                          : styles.enableButton
                      }
                    >
                      {service.is_active
                        ? "停用"
                        : "启用"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void deleteService(service)
                      }
                      style={styles.deleteButton}
                    >
                      🗑 删除
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

type FormFieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  type?: "text" | "number";
  min?: string;
  max?: string;
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
  min,
  max,
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
          min={min}
          max={max}
          step={step}
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
        <small style={styles.fieldHint}>
          {hint}
        </small>
      )}
    </label>
  );
}

type FeatureOptionProps = {
  checked: boolean;
  title: string;
  subtitle: string;
  onChange: (checked: boolean) => void;
};

function FeatureOption({
  checked,
  title,
  subtitle,
  onChange,
}: FeatureOptionProps) {
  return (
    <label style={styles.featureOption}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
      />

      <span>
        <strong style={styles.featureTitle}>
          {title}
        </strong>

        <small style={styles.featureHint}>
          {subtitle}
        </small>
      </span>
    </label>
  );
}

type SummaryCardProps = {
  icon: string;
  label: string;
  value: string;
  hint: string;
  accent: string;
};

function SummaryCard({
  icon,
  label,
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
      <div
        style={{
          ...styles.summaryIcon,
          background: `${accent}16`,
          color: accent,
        }}
      >
        {icon}
      </div>

      <div>
        <p style={styles.summaryLabel}>
          {label}
        </p>

        <strong style={styles.summaryValue}>
          {value}
        </strong>

        <span style={styles.summaryHint}>
          {hint}
        </span>
      </div>
    </article>
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
    <div style={styles.financialPreviewCard}>
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
  let label = "未设置价格";
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

function calculateFinancials(
  sellingPrice: number,
  costPrice: number
) {
  const profit = sellingPrice - costPrice;

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

function getImageDatabaseField(
  imageType: UploadImageType
) {
  if (imageType === "main") {
    return "image_url";
  }

  if (imageType === "before") {
    return "before_image";
  }

  return "after_image";
}

function getServiceImageUrl(
  service: ServiceRecord,
  imageType: UploadImageType
) {
  if (imageType === "main") {
    return service.image_url;
  }

  if (imageType === "before") {
    return service.before_image;
  }

  return service.after_image;
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

function formatCurrencyInput(
  value: number,
  currency: string
) {
  if (!Number.isFinite(value)) {
    return "";
  }

  const digits = currency === "MMK" ? 0 : 2;

  return value.toFixed(digits);
}

function roundAccountingAmount(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function formatPercent(value: number) {
  const safeValue = Number.isFinite(value)
    ? value
    : 0;

  return `${safeValue.toFixed(1)}%`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    return String(
      (error as { message?: unknown }).message ??
        "操作失败"
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

  countBadge: {
    padding: "10px 16px",
    borderRadius: 999,
    background: "#dbeafe",
    color: "#1d4ed8",
    fontWeight: 850,
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

  summaryLabel: {
    margin: "0 0 6px",
    color: "#475569",
    fontSize: 12,
    fontWeight: 800,
  },

  summaryValue: {
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
    marginBottom: 24,
    padding: 24,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 21,
    boxShadow:
      "0 14px 35px rgba(15,23,42,.07)",
  },

  formHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 20,
  },

  sectionEyebrow: {
    margin: "0 0 5px",
    color: "#64748b",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.3,
  },

  sectionTitle: {
    margin: 0,
    fontSize: 23,
  },

  formDescription: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: 13,
  },

  currencyHint: {
    margin: "7px 0 0",
    color: "#2563eb",
    fontSize: 12,
    fontWeight: 800,
  },

  cancelButton: {
    padding: "10px 14px",
    border: "1px solid #cbd5e1",
    borderRadius: 11,
    background: "#ffffff",
    color: "#334155",
    cursor: "pointer",
    fontWeight: 800,
  },

  formGridSection: {
    marginBottom: 20,
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

  profitPreviewGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
    marginTop: 15,
  },

  financialPreviewCard: {
    padding: 15,
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
    fontSize: 20,
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

  profitBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  featureOptions: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 12,
    marginTop: 20,
  },

  featureOption: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    minHeight: 62,
    padding: 13,
    border: "1px solid #e2e8f0",
    borderRadius: 13,
    background: "#f8fafc",
    color: "#334155",
    cursor: "pointer",
  },

  featureTitle: {
    display: "block",
    fontSize: 13,
  },

  featureHint: {
    display: "block",
    marginTop: 3,
    color: "#94a3b8",
    fontSize: 10,
  },

  formFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 21,
    paddingTop: 18,
    borderTop: "1px solid #e2e8f0",
  },

  formHint: {
    color: "#64748b",
    fontSize: 12,
  },

  saveButton: {
    minWidth: 145,
    minHeight: 45,
    padding: "0 20px",
    border: "none",
    borderRadius: 12,
    background: "#2563eb",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 850,
  },

  toolbar: {
    display: "grid",
    gridTemplateColumns:
      "minmax(240px, 1fr) 210px auto",
    gap: 12,
    marginBottom: 20,
    padding: 16,
    border: "1px solid #e2e8f0",
    borderRadius: 17,
    background: "#ffffff",
    boxShadow:
      "0 10px 25px rgba(15,23,42,.04)",
  },

  searchInput: {
    width: "100%",
    minHeight: 45,
    padding: "0 14px",
    border: "1px solid #cbd5e1",
    borderRadius: 11,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  },

  filterSelect: {
    width: "100%",
    minHeight: 45,
    padding: "0 13px",
    border: "1px solid #cbd5e1",
    borderRadius: 11,
    background: "#ffffff",
    color: "#334155",
    fontSize: 13,
    fontWeight: 750,
    outline: "none",
  },

  refreshButton: {
    minHeight: 45,
    padding: "0 17px",
    border: "1px solid #cbd5e1",
    borderRadius: 11,
    background: "#ffffff",
    color: "#334155",
    cursor: "pointer",
    fontWeight: 800,
  },

  serviceCard: {
    overflow: "hidden",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 20,
    boxShadow:
      "0 12px 32px rgba(15,23,42,.07)",
  },

  imageContainer: {
    position: "relative",
    height: 200,
    background: "#e2e8f0",
  },

  serviceImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  imagePlaceholder: {
    width: "100%",
    height: "100%",
    display: "grid",
    placeItems: "center",
    fontSize: 64,
    background:
      "linear-gradient(135deg,#dbeafe,#ede9fe)",
  },

  statusBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: "6px 10px",
    borderRadius: 999,
    color: "#ffffff",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 0.6,
  },

  serviceContent: {
    padding: 18,
  },

  serviceTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 15,
  },

  serviceCategory: {
    margin: "0 0 5px",
    color: "#2563eb",
    fontSize: 11,
    fontWeight: 850,
    textTransform: "uppercase",
  },

  serviceTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: 19,
  },

  serviceEnglishName: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: 12,
  },

  priceText: {
    color: "#0f172a",
    fontSize: 21,
    whiteSpace: "nowrap",
  },

  metaRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 13,
  },

  metaBadge: {
    padding: "5px 8px",
    borderRadius: 999,
    background: "#f1f5f9",
    color: "#475569",
    fontSize: 10,
    fontWeight: 750,
  },

  popularBadge: {
    padding: "5px 8px",
    borderRadius: 999,
    background: "#fff7ed",
    color: "#c2410c",
    fontSize: 10,
    fontWeight: 850,
  },

  recommendedBadge: {
    padding: "5px 8px",
    borderRadius: 999,
    background: "#fefce8",
    color: "#a16207",
    fontSize: 10,
    fontWeight: 850,
  },

  cardFinancialBox: {
    marginTop: 15,
    padding: 14,
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    background: "#f8fafc",
  },

  cardFinancialRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 15,
    padding: "7px 0",
    color: "#475569",
    fontSize: 12,
  },

  cardProfitRow: {
    borderTop: "1px solid #e2e8f0",
    marginTop: 4,
    paddingTop: 11,
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

  descriptionBox: {
    marginTop: 14,
    padding: 12,
    borderLeft: "3px solid #93c5fd",
    background: "#f8fafc",
    borderRadius: "0 10px 10px 0",
  },

  descriptionText: {
    margin: 0,
    color: "#334155",
    fontSize: 12,
    lineHeight: 1.6,
  },

  descriptionEnglish: {
    margin: "6px 0 0",
    color: "#94a3b8",
    fontSize: 11,
    lineHeight: 1.5,
  },

  imageUploaderSection: {
    marginTop: 17,
  },

  actionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 9,
    marginTop: 14,
  },

  editButton: {
    minHeight: 40,
    padding: "0 8px",
    border: "none",
    borderRadius: 10,
    background: "#f1f5f9",
    color: "#334155",
    cursor: "pointer",
    fontWeight: 800,
  },

  disableButton: {
    minHeight: 40,
    padding: "0 8px",
    border: "none",
    borderRadius: 10,
    background: "#fef3c7",
    color: "#92400e",
    cursor: "pointer",
    fontWeight: 800,
  },

  enableButton: {
    minHeight: 40,
    padding: "0 8px",
    border: "none",
    borderRadius: 10,
    background: "#dcfce7",
    color: "#166534",
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

  emptyCard: {
    minHeight: 250,
    display: "grid",
    placeItems: "center",
    padding: 40,
    border: "1px solid #e2e8f0",
    borderRadius: 20,
    background: "#ffffff",
    color: "#64748b",
    boxShadow:
      "0 10px 28px rgba(15,23,42,.05)",
  },
};

export default Services;