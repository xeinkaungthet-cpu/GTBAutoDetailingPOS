import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Service } from "../types/database";
import { ServiceService } from "../services/serviceService";
import type { Package } from "../services/packageService";
import { PackageService } from "../services/packageService";
import Hero from "../components/menu/Hero";
import CategorySection from "../components/menu/CategorySection";
import BookingModal from "../components/menu/BookingModal";
import Footer from "../components/menu/Footer";
import PackageCard from "../components/menu/PackageCard";
import ItemDetailModal from "../components/menu/ItemDetailModal";
type ViewMode =
  | "all"
  | "packages"
  | "services";

function CustomerMenu() {
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);

  const [selectedService, setSelectedService] =
    useState<Service | null>(null);

  const [selectedPackage, setSelectedPackage] =
    useState<Package | null>(null);
const [detailService, setDetailService] =
  useState<Service | null>(null);

const [detailPackage, setDetailPackage] =
  useState<Package | null>(null);
  const [searchQuery, setSearchQuery] =
    useState("");

  const [viewMode, setViewMode] =
    useState<ViewMode>("all");

  const [selectedCategory, setSelectedCategory] =
    useState("全部");

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  async function loadMenu() {
    setLoading(true);
    setErrorMessage("");

    try {
      const [servicesData, packagesData] =
        await Promise.all([
          ServiceService.getAll(),
          PackageService.getActive(),
        ]);

      setServices(servicesData);
      setPackages(packagesData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "客户菜单加载失败";

      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMenu();
  }, []);

  const activeServices = useMemo(
    () =>
      services.filter(
        (service) =>
          service.is_active !== false
      ),
    [services]
  );

  const categories = useMemo(() => {
    const categoryList = activeServices.map(
      (service) =>
        service.category?.trim() || "其他"
    );

    return Array.from(new Set(categoryList));
  }, [activeServices]);

  const normalizedQuery =
    searchQuery.trim().toLowerCase();

  const filteredPackages = useMemo(
    () =>
      packages.filter((packageItem) =>
        getPackageSearchText(
          packageItem
        ).includes(normalizedQuery)
      ),
    [packages, normalizedQuery]
  );

  const filteredServices = useMemo(
    () =>
      activeServices.filter((service) => {
        const category =
          service.category?.trim() ||
          "其他";

        const matchesCategory =
          selectedCategory === "全部" ||
          category === selectedCategory;

        const matchesSearch =
          getServiceSearchText(
            service
          ).includes(normalizedQuery);

        return (
          matchesCategory && matchesSearch
        );
      }),
    [
      activeServices,
      normalizedQuery,
      selectedCategory,
    ]
  );

  const visiblePackages =
    viewMode === "services"
      ? []
      : filteredPackages;

  const visibleServices =
    viewMode === "packages"
      ? []
      : filteredServices;

  const visibleCategories = useMemo(
    () =>
      Array.from(
        new Set(
          visibleServices.map(
            (service) =>
              service.category?.trim() ||
              "其他"
          )
        )
      ),
    [visibleServices]
  );

  const resultCount =
    visiblePackages.length +
    visibleServices.length;

  function changeViewMode(mode: ViewMode) {
    setViewMode(mode);

    if (mode === "packages") {
      setSelectedCategory("全部");
    }
  }

  function clearSearch() {
    setSearchQuery("");
    setSelectedCategory("全部");
    setViewMode("all");
  }
async function copyWeChatId() {
  try {
    await navigator.clipboard.writeText("buyaowen9");
    alert("微信号已复制 / WeChat ID Copied");
  } catch {
    window.prompt(
      "请复制微信号 / Copy WeChat ID:",
      "buyaowen9"
    );
  }
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}
  function handleSearchSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    document
      .getElementById("menu-results")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  return (
    <div style={page}>
      <style>
        {`
          @media (max-width: 720px) {
            .menu-search-form {
              flex-direction: column;
            }

            .menu-search-button {
              width: 100%;
            }

            .menu-heading-row {
              align-items: flex-start !important;
              flex-direction: column;
            }

            .customer-package-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>

      <Hero />

      <section
        id="menu-content"
        style={content}
      >
        <div
  style={headingRow}
  className="menu-heading-row"
>
  <div>
    <p style={eyebrow}>
      GTB SERVICE DIRECTORY
    </p>

    <h1 style={mainTitle}>
      服务与套餐 / Services & Packages
    </h1>

    <p style={mainDescription}>
      搜索并浏览我们的专业汽车美容服务、套餐价格和预约信息
      <br />
      Search and browse professional detailing services,
      packages, prices and booking information
    </p>
  </div>

  <div style={totalBadge}>
    共 {packages.length + activeServices.length} 个项目
    {" / "}
    {packages.length + activeServices.length} Items
  </div>
</div>

<div style={searchPanel}>
          <form
            onSubmit={handleSearchSubmit}
            style={searchForm}
            className="menu-search-form"
          >
            <div style={searchInputWrapper}>
              <span style={searchIcon}>
                🔍
              </span>

              <input
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
                placeholder="搜索套餐、服务或分类 / Search packages, services or categories..."
                aria-label="搜索服务和套餐"
                style={searchInput}
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchQuery("")
                  }
                  style={clearButton}
                  aria-label="清除搜索"
                >
                  ×
                </button>
              )}
            </div>

            <button
              type="submit"
              style={searchButton}
              className="menu-search-button"
            >
              搜索 / Search
            </button>
          </form>

          <div style={filterHeader}>
            <div>
              <strong style={filterTitle}>
                浏览项目 / Browse
              </strong>

<p style={filterDescription}>
  选择套餐、服务项目或具体分类
  <br />
  Choose packages, services or categories
</p>
            </div>

<span style={resultBadge}>
  找到 {resultCount} 个结果 / {resultCount} Results
</span>
          </div>

          <div style={viewTabs}>
            <FilterButton
              active={viewMode === "all"}
              onClick={() =>
                changeViewMode("all")
              }
              icon="✨"
            >
              全部项目 / All
            </FilterButton>

            <FilterButton
              active={
                viewMode === "packages"
              }
              onClick={() =>
                changeViewMode("packages")
              }
              icon="🎁"
            >
              套餐 / Packages
            </FilterButton>

            <FilterButton
              active={
                viewMode === "services"
              }
              onClick={() =>
                changeViewMode("services")
              }
              icon="🚗"
            >
              服务项目 / Services
            </FilterButton>
          </div>

          {viewMode !== "packages" && (
            <div style={categoryArea}>
              <span style={categoryLabel}>
  服务分类 / Categories：
</span>

              <div style={categoryButtons}>
                <CategoryButton
                  active={
                    selectedCategory ===
                    "全部"
                  }
                  onClick={() =>
                    setSelectedCategory(
                      "全部"
                    )
                  }
                >
                  全部分类 / All Categories
                </CategoryButton>

                {categories.map(
                  (category) => (
                    <CategoryButton
                      key={category}
                      active={
                        selectedCategory ===
                        category
                      }
                      onClick={() =>
                        setSelectedCategory(
                          category
                        )
                      }
                    >
                      {getCategoryIcon(
                        category
                      )}{" "}
                      {category}
                    </CategoryButton>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        <div id="menu-results">
          {loading && (
            <div style={loadingBox}>
              <div style={loadingIcon}>
                ⏳
              </div>

              <strong>
  正在加载客户菜单…… / Loading Menu...
</strong>
            </div>
          )}

          {errorMessage && (
            <div style={errorBox}>
              <div style={{ fontSize: 34 }}>
                ⚠️
              </div>

              <div>
                <strong>
  菜单加载失败 / Failed to Load Menu
</strong>

                <p style={messageText}>
                  {errorMessage}
                </p>

                <button
                  type="button"
                  onClick={loadMenu}
                  style={retryButton}
                >
                  重新加载 / Retry
                </button>
              </div>
            </div>
          )}

          {!loading &&
            !errorMessage &&
            resultCount === 0 && (
              <div style={emptyBox}>
                <div style={emptyIcon}>
                  🔎
                </div>

                <h2 style={emptyTitle}>
  没有找到相关项目 / No Results Found
</h2>

<p style={emptyDescription}>
  请尝试其他名称或服务分类
  <br />
  Try another name, keyword or category
</p>

                <button
                  type="button"
                  onClick={clearSearch}
                  style={resetButton}
                >
                  查看全部项目 / View All
                </button>
              </div>
            )}

          {!loading &&
            !errorMessage &&
            visiblePackages.length >
              0 && (
              <section style={resultSection}>
                <div style={sectionHeading}>
                  <div>
                    <p style={sectionEyebrow}>
                      VALUE PACKAGES
                    </p>

                    <h2 style={sectionTitle}>
                      🎁 热门套餐 / Packages
                    </h2>
                  </div>

                  <span style={sectionCount}>
                    {visiblePackages.length} 个套餐 / Packages
                  </span>
                </div>

                <div
                  style={packageGrid}
                  className="customer-package-grid"
                >
                  {visiblePackages.map(
                    (item) => (
                      <PackageCard
  key={item.id}
  packageItem={item}
  onBook={(packageItem) =>
    setDetailPackage(packageItem)
  }
/>
                    )
                  )}
                </div>
              </section>
            )}

          {!loading &&
            !errorMessage &&
            visibleServices.length >
              0 && (
              <section style={resultSection}>
                <div style={sectionHeading}>
                  <div>
                    <p style={sectionEyebrow}>
                      PROFESSIONAL SERVICES
                    </p>

                    <h2 style={sectionTitle}>
                      🚗 服务菜单 / Service
                      Menu
                    </h2>

                    <p
                      style={
                        sectionDescription
                      }
                    >
                      浏览项目价格、施工效果和预约信息
                    </p>
                  </div>

                  <span style={sectionCount}>
                    {visibleServices.length} 个服务 / Services
                  </span>
                </div>

                {visibleCategories.map(
                  (category) => (
                    <CategorySection
                      key={category}
                      title={category}
                      services={visibleServices.filter(
                        (service) =>
                          (service.category?.trim() ||
                            "其他") ===
                          category
                      )}
                      onBook={(service) =>
  setDetailService(service)
}
                    />
                  )
                )}
              </section>
            )}
        </div>

        <Footer />
      </section>
{detailService && (
  <ItemDetailModal
    service={detailService}
    onClose={() =>
      setDetailService(null)
    }
    onBook={() => {
      setSelectedService(detailService);
      setDetailService(null);
    }}
  />
)}

{detailPackage && (
  <ItemDetailModal
    packageItem={detailPackage}
    onClose={() =>
      setDetailPackage(null)
    }
    onBook={() => {
      setSelectedPackage(detailPackage);
      setDetailPackage(null);
    }}
  />
)}
      {selectedService && (
        <BookingModal
          service={selectedService}
          onClose={() =>
            setSelectedService(null)
          }
        />
      )}

      {selectedPackage && (
        <BookingModal
          packageItem={selectedPackage}
          onClose={() =>
            setSelectedPackage(null)
          }
        />
      )}
      <div style={floatingActions}>
  <a
    href="tel:09443751188"
    style={floatingPrimaryButton}
    aria-label="电话联系"
    title="电话联系 / Call Us"
  >
    📞
    <span style={floatingButtonText}>
      电话 / Call
    </span>
  </a>

  <button
    type="button"
    onClick={copyWeChatId}
    style={floatingSecondaryButton}
    aria-label="复制微信号"
    title="微信联系 / WeChat"
  >
    💬
    <span style={floatingButtonText}>
      微信 / WeChat
    </span>
  </button>

  <button
    type="button"
    onClick={scrollToTop}
    style={floatingTopButton}
    aria-label="返回顶部"
    title="返回顶部 / Back to Top"
  >
    ↑
  </button>
</div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...filterButton,
        background: active
          ? "#111827"
          : "#ffffff",
        color: active
          ? "#ffffff"
          : "#334155",
        borderColor: active
          ? "#111827"
          : "#dbe2ea",
      }}
    >
      <span>{icon}</span>
      <span>{children}</span>
    </button>
  );
}

function CategoryButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...categoryButton,
        background: active
          ? "#2563eb"
          : "#eff6ff",
        color: active
          ? "#ffffff"
          : "#1d4ed8",
        borderColor: active
          ? "#2563eb"
          : "#bfdbfe",
      }}
    >
      {children}
    </button>
  );
}

function getServiceSearchText(
  service: Service
) {
  return [
    service.service_name,
    service.service_name_en,
    service.description,
    service.description_en,
    service.category,
  ]
    .map((value) =>
      String(value ?? "").toLowerCase()
    )
    .join(" ");
}

function getPackageSearchText(
  packageItem: Package
) {
  const includedServices =
    packageItem.package_services
      ?.map((item) =>
        [
          item.services?.service_name,
          item.services?.service_name_en,
        ]
          .filter(Boolean)
          .join(" ")
      )
      .join(" ") ?? "";

  return [
    packageItem.package_name,
    packageItem.package_name_en,
    packageItem.description,
    packageItem.description_en,
    includedServices,
  ]
    .map((value) =>
      String(value ?? "").toLowerCase()
    )
    .join(" ");
}

function getCategoryIcon(
  category: string
) {
  switch (category) {
    case "洗车":
      return "🚗";

    case "美容":
      return "✨";

    case "镀膜":
    case "镀晶":
      return "🛡️";

    case "清洁":
      return "🧽";

    default:
      return "⭐";
  }
}

const page = {
  minHeight: "100vh",
  background: "#f3f4f6",
};

const content = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "32px 24px",
};

const headingRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 20,
  marginTop: 22,
};

const eyebrow = {
  margin: 0,
  color: "#2563eb",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "1.5px",
};

const mainTitle = {
  margin: "7px 0 0",
  color: "#111827",
  fontSize: 38,
  lineHeight: 1.15,
};

const mainDescription = {
  margin: "10px 0 0",
  color: "#64748b",
  lineHeight: 1.7,
};

const totalBadge = {
  padding: "10px 15px",
  borderRadius: 999,
  background: "#111827",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 900,
  whiteSpace: "nowrap" as const,
};

const searchPanel = {
  marginTop: 25,
  padding: 22,
  border: "1px solid #e2e8f0",
  borderRadius: 22,
  background: "#ffffff",
  boxShadow:
    "0 15px 40px rgba(15,23,42,.08)",
};

const searchForm = {
  display: "flex",
  gap: 12,
};

const searchInputWrapper = {
  position: "relative" as const,
  flex: 1,
  minWidth: 0,
};

const searchIcon = {
  position: "absolute" as const,
  top: "50%",
  left: 17,
  transform: "translateY(-50%)",
  fontSize: 18,
  pointerEvents: "none" as const,
};

const searchInput = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "15px 48px",
  border: "1px solid #cbd5e1",
  borderRadius: 15,
  outline: "none",
  background: "#f8fafc",
  color: "#111827",
  fontSize: 15,
};

const clearButton = {
  position: "absolute" as const,
  top: "50%",
  right: 14,
  width: 28,
  height: 28,
  transform: "translateY(-50%)",
  border: "none",
  borderRadius: 999,
  background: "#e2e8f0",
  color: "#475569",
  cursor: "pointer",
  fontSize: 18,
};

const searchButton = {
  minWidth: 150,
  padding: "14px 22px",
  border: "none",
  borderRadius: 15,
  background:
    "linear-gradient(135deg,#2563eb,#1d4ed8)",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 900,
  boxShadow:
    "0 9px 20px rgba(37,99,235,.22)",
};

const filterHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap" as const,
  gap: 14,
  marginTop: 22,
  paddingTop: 20,
  borderTop: "1px solid #e2e8f0",
};

const filterTitle = {
  color: "#111827",
  fontSize: 16,
};

const filterDescription = {
  margin: "4px 0 0",
  color: "#94a3b8",
  fontSize: 12,
};

const resultBadge = {
  padding: "7px 11px",
  borderRadius: 999,
  background: "#ecfdf5",
  color: "#15803d",
  fontSize: 11,
  fontWeight: 900,
};

const viewTabs = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 10,
  marginTop: 16,
};

const filterButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  padding: "10px 15px",
  border: "1px solid",
  borderRadius: 12,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 850,
};

const categoryArea = {
  marginTop: 18,
};

const categoryLabel = {
  display: "block",
  marginBottom: 9,
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
};

const categoryButtons = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 8,
};

const categoryButton = {
  padding: "8px 12px",
  border: "1px solid",
  borderRadius: 999,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 800,
};

const loadingBox = {
  marginTop: 30,
  padding: 35,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  borderRadius: 18,
  background: "#ffffff",
  color: "#334155",
};

const loadingIcon = {
  fontSize: 28,
};

const errorBox = {
  marginTop: 30,
  padding: 25,
  display: "flex",
  gap: 16,
  border: "1px solid #fecaca",
  borderRadius: 18,
  background: "#fef2f2",
  color: "#991b1b",
};

const messageText = {
  margin: "7px 0 0",
};

const retryButton = {
  marginTop: 12,
  padding: "9px 14px",
  border: "none",
  borderRadius: 10,
  background: "#dc2626",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 800,
};

const emptyBox = {
  marginTop: 30,
  padding: "60px 25px",
  textAlign: "center" as const,
  border: "1px dashed #cbd5e1",
  borderRadius: 22,
  background: "#ffffff",
};

const emptyIcon = {
  fontSize: 52,
};

const emptyTitle = {
  margin: "15px 0 0",
  color: "#111827",
};

const emptyDescription = {
  margin: "8px 0 0",
  color: "#64748b",
};

const resetButton = {
  marginTop: 18,
  padding: "11px 17px",
  border: "none",
  borderRadius: 12,
  background: "#2563eb",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 850,
};

const resultSection = {
  marginTop: 42,
};

const sectionHeading = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  flexWrap: "wrap" as const,
  gap: 15,
  marginBottom: 20,
};

const sectionEyebrow = {
  margin: 0,
  color: "#2563eb",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "1.3px",
};

const sectionTitle = {
  margin: "6px 0 0",
  color: "#111827",
  fontSize: 30,
};

const sectionDescription = {
  margin: "7px 0 0",
  color: "#64748b",
};

const sectionCount = {
  padding: "7px 11px",
  borderRadius: 999,
  background: "#e0e7ff",
  color: "#4338ca",
  fontSize: 11,
  fontWeight: 900,
};

const packageGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fill,minmax(300px,1fr))",
  gap: 24,
  marginBottom: 50,
};
const floatingActions = {
  position: "fixed" as const,
  right: 18,
  bottom: 20,
  zIndex: 900,
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "flex-end",
  gap: 10,
};

const floatingButtonBase = {
  minHeight: 46,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  padding: "0 15px",
  border: "none",
  borderRadius: 999,
  color: "#ffffff",
  cursor: "pointer",
  textDecoration: "none",
  fontSize: 17,
  fontWeight: 900,
  boxShadow: "0 12px 28px rgba(15,23,42,.24)",
};

const floatingPrimaryButton = {
  ...floatingButtonBase,
  background: "linear-gradient(135deg,#16a34a,#15803d)",
};

const floatingSecondaryButton = {
  ...floatingButtonBase,
  background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
};

const floatingTopButton = {
  width: 46,
  height: 46,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  borderRadius: "50%",
  background: "#111827",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: 22,
  fontWeight: 900,
  boxShadow: "0 12px 28px rgba(15,23,42,.24)",
};

const floatingButtonText = {
  fontSize: 12,
  whiteSpace: "nowrap" as const,
};
export default CustomerMenu;