import { useEffect, useMemo, useState } from "react";

import type { Member, Service, Vehicle } from "../types/database";

import { PackageService, type Package } from "../services/packageService";

import { supabase } from "../lib/supabase";
import { MemberService } from "../services/memberService";
import { ServiceService } from "../services/serviceService";
import { VehicleService } from "../services/vehicleService";
import useCurrency from "../hooks/useCurrency";

import CustomerPanel from "../components/pos/CustomerPanel";
import ServiceCard from "../components/pos/ServiceCard";
import ServiceFilters from "../components/pos/ServiceFilters";

import ShoppingCart, { type PosCartItem } from "../components/pos/ShoppingCart";
import POSServiceOptionsModal, {
  type PosCoatingOption,
  type PosServiceSelection,
  type PosVehiclePrice,
} from "../components/pos/POSServiceOptionsModal";
import OrderDetailDrawer from "../components/orders/OrderDetailDrawer";

type Product = {
  id: number;
  sku: string | null;
  product_name: string;
  category: string | null;
  brand: string | null;
  cost_price: number | null;
  selling_price: number | null;
  stock_qty: number | null;
  min_stock: number | null;
  unit: string | null;
  barcode: string | null;
  is_active: boolean | null;
};

const PACKAGE_CATEGORY = "🔥 热门套餐";
const PRODUCT_CATEGORY = "🧴 产品销售";
const PRODUCT_CATEGORY_PREFIX = "产品 · ";

function POS() {
  const {
    formatMoney,
    currentOption,
    accountingOption,
  } = useCurrency();

  const [members, setMembers] = useState<Member[]>([]);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [services, setServices] = useState<Service[]>([]);

  const [packages, setPackages] = useState<Package[]>([]);

  const [products, setProducts] = useState<Product[]>([]);

  const [serviceVehiclePrices, setServiceVehiclePrices] = useState<
    PosVehiclePrice[]
  >([]);

  const [coatingOptions, setCoatingOptions] = useState<PosCoatingOption[]>([]);

  const [configuringService, setConfiguringService] =
    useState<Service | null>(null);

  const [cart, setCart] = useState<PosCartItem[]>([]);

  const [selectedMemberId, setSelectedMemberId] = useState("");

  const [selectedVehicleId, setSelectedVehicleId] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [discount, setDiscount] = useState(0);

  const [search, setSearch] = useState("");

  const [category, setCategory] = useState("全部");

  const [loading, setLoading] = useState(true);

  const [checkingOut, setCheckingOut] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);

  const [completedItems, setCompletedItems] = useState<any[]>([]);
  const subtotal = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0,
    );
  }, [cart]);

  const safeDiscount = Math.max(0, Math.min(Number(discount) || 0, subtotal));

  const total = Math.max(subtotal - safeDiscount, 0);

  const categories = useMemo(() => {
    const serviceCategories = services
      .map((service) => service.category)
      .filter((value): value is string => Boolean(value?.trim()));

    const productCategories = products
      .map((product) => product.category)
      .filter((value): value is string => Boolean(value?.trim()))
      .map((value) => `${PRODUCT_CATEGORY_PREFIX}${value}`);

    const allCategories: string[] = ["全部"];

    if (packages.length > 0) {
      allCategories.push(PACKAGE_CATEGORY);
    }

    if (products.length > 0) {
      allCategories.push(PRODUCT_CATEGORY);
      productCategories.forEach((value: string) => {
        if (!allCategories.includes(value)) {
          allCategories.push(value);
        }
      });
    }

    serviceCategories.forEach((value: string) => {
      if (!allCategories.includes(value)) {
        allCategories.push(value);
      }
    });

    return allCategories;
  }, [services, packages, products]);

  const filteredServices = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const isProductCategory =
      category === PRODUCT_CATEGORY ||
      category.startsWith(PRODUCT_CATEGORY_PREFIX);

    if (category === PACKAGE_CATEGORY || isProductCategory) {
      return [];
    }

    return services.filter((service) => {
      const serviceName = service.service_name?.toLowerCase() || "";
      const serviceNameEn =
        String((service as Service & { service_name_en?: string | null }).service_name_en ?? "")
          .toLowerCase();
      const serviceCategory = service.category?.toLowerCase() || "";

      const matchSearch =
        !keyword ||
        serviceName.includes(keyword) ||
        serviceNameEn.includes(keyword) ||
        serviceCategory.includes(keyword);

      const matchCategory =
        category === "全部" || service.category === category;

      const isAvailable = service.is_active !== false;

      return matchSearch && matchCategory && isAvailable;
    });
  }, [services, search, category]);

  const filteredPackages = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const showPackages = category === "全部" || category === PACKAGE_CATEGORY;

    if (!showPackages) {
      return [];
    }

    return packages.filter((packageItem) => {
      const searchText = [
        packageItem.package_name,
        packageItem.package_name_en,
        packageItem.description,
        packageItem.description_en,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchSearch = !keyword || searchText.includes(keyword);

      return packageItem.is_active !== false && matchSearch;
    });
  }, [packages, search, category]);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const selectedProductCategory = category.startsWith(PRODUCT_CATEGORY_PREFIX)
      ? category.slice(PRODUCT_CATEGORY_PREFIX.length)
      : null;

    const showProducts =
      category === "全部" ||
      category === PRODUCT_CATEGORY ||
      selectedProductCategory !== null;

    if (!showProducts) {
      return [];
    }

    return products.filter((product) => {
      const searchText = [
        product.product_name,
        product.sku,
        product.category,
        product.brand,
        product.barcode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !keyword || searchText.includes(keyword);
      const matchesCategory =
        selectedProductCategory === null ||
        product.category === selectedProductCategory;

      return product.is_active !== false && matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  async function loadData() {
    setLoading(true);

    try {
      const [
        memberData,
        serviceData,
        packageData,
        productResult,
        vehiclePriceResult,
        coatingOptionResult,
      ] = await Promise.all([
        MemberService.getAll(),
        ServiceService.getAll(),
        PackageService.getActive(),
        supabase
          .from("products")
          .select(
            "id, sku, product_name, category, brand, cost_price, selling_price, stock_qty, min_stock, unit, barcode, is_active",
          )
          .eq("is_active", true)
          .order("product_name"),
        supabase
          .from("service_vehicle_prices")
          .select(
            "service_id, vehicle_size_code, price, cost_price, duration_minutes, is_active",
          ),
        supabase
          .from("service_coating_options")
          .select(
            "id, service_id, option_name, duration_years, duration_unit, price, description, product_name, is_recommended, is_active, sort_order",
          )
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
      ]);

      if (productResult.error) {
        throw productResult.error;
      }

      if (vehiclePriceResult.error) {
        throw vehiclePriceResult.error;
      }

      if (coatingOptionResult.error) {
        throw coatingOptionResult.error;
      }

      setMembers(memberData);
      setServices(serviceData);
      setPackages(packageData);
      setProducts((productResult.data ?? []) as Product[]);
      setServiceVehiclePrices(
        (vehiclePriceResult.data ?? []) as PosVehiclePrice[],
      );
      setCoatingOptions(
        (coatingOptionResult.data ?? []) as PosCoatingOption[],
      );
    } catch (error: unknown) {
      alert(getErrorMessage(error));

      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function loadVehicles(memberId: string) {
    if (!memberId) {
      setVehicles([]);
      return;
    }

    try {
      const vehicleData = await VehicleService.getByMemberId(Number(memberId));

      setVehicles(vehicleData);
    } catch (error: unknown) {
      alert(getErrorMessage(error));

      console.error(error);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function handleMemberChange(memberId: string) {
    setSelectedMemberId(memberId);

    setSelectedVehicleId("");
    setCart([]);
    setDiscount(0);

    void loadVehicles(memberId);
  }

  function addCartItem(newItem: Omit<PosCartItem, "quantity">) {
    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.key === newItem.key);
      const maximum = normalizeStockLimit(newItem.maxQuantity);

      if (existingItem) {
        if (maximum !== null && existingItem.quantity >= maximum) {
          return currentCart;
        }

        return currentCart.map((item) =>
          item.key === newItem.key
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item,
        );
      }

      if (maximum !== null && maximum <= 0) {
        return currentCart;
      }

      return [
        ...currentCart,
        {
          ...newItem,
          quantity: 1,
        },
      ];
    });
  }

  function addServiceToCart(service: Service) {
    setConfiguringService(service);
  }

  function confirmServiceOptions(selection: PosServiceSelection) {
    const { service, coatingOption } = selection;
    const serviceNameEn = String(
      (service as Service & { service_name_en?: string | null })
        .service_name_en ?? "",
    );

    addCartItem({
      key: [
        "service",
        service.id,
        selection.vehicleSizeCode,
        coatingOption?.id ?? "standard",
      ].join("-"),
      itemType: "service",
      serviceId: service.id,
      packageId: null,
      productId: null,
      name: service.service_name,
      nameEn: serviceNameEn || null,
      price: selection.finalPrice,
      originalPrice: null,
      includedServices: [],
      sku: null,
      unit: null,
      stockQty: null,
      maxQuantity: null,

      vehicleSizeCode: selection.vehicleSizeCode,
      vehicleSizeName: selection.vehicleSizeName,
      vehicleSizeNameEn: selection.vehicleSizeNameEn,
      vehicleSizeIcon: selection.vehicleSizeIcon,

      coatingOptionId: coatingOption?.id ?? null,
      coatingOptionName: coatingOption?.option_name ?? null,
      coatingDurationYears: coatingOption?.duration_years ?? null,
      coatingDurationUnit: coatingOption?.duration_unit ?? null,
      coatingProductName: coatingOption?.product_name ?? null,
      coatingPrice: coatingOption ? Number(coatingOption.price) : null,
    });

    setConfiguringService(null);
  }

  function addPackageToCart(packageItem: Package) {
    addCartItem({
      key: `package-${packageItem.id}`,
      itemType: "package",
      serviceId: null,
      packageId: packageItem.id,
      productId: null,
      name: packageItem.package_name,
      nameEn: packageItem.package_name_en,
      price: Number(packageItem.package_price),
      originalPrice: Number(packageItem.original_price),
      includedServices:
        packageItem.package_services
          ?.map((packageService) => packageService.services?.service_name)
          .filter((serviceName): serviceName is string =>
            Boolean(serviceName),
          ) ?? [],
      sku: null,
      unit: null,
      stockQty: null,
      maxQuantity: null,
    });
  }

  function addProductToCart(product: Product) {
    const stockQuantity = normalizeStockLimit(product.stock_qty) ?? 0;
    const currentQuantity =
      cart.find((item) => item.key === `product-${product.id}`)?.quantity ?? 0;

    if (stockQuantity <= 0) {
      alert(`产品「${product.product_name}」目前没有库存`);
      return;
    }

    if (currentQuantity >= stockQuantity) {
      alert(
        `产品「${product.product_name}」库存不足，目前最多只能加入 ${stockQuantity} 件`,
      );
      return;
    }

    addCartItem({
      key: `product-${product.id}`,
      itemType: "product",
      serviceId: null,
      packageId: null,
      productId: product.id,
      name: product.product_name,
      nameEn: null,
      price: Number(product.selling_price ?? 0),
      originalPrice: null,
      includedServices: [],
      sku: product.sku,
      unit: product.unit,
      stockQty: stockQuantity,
      maxQuantity: stockQuantity,
    });
  }

  function removeFromCart(itemKey: string) {
    setCart((currentCart) =>
      currentCart.filter((item) => item.key !== itemKey),
    );
  }

  function updateQuantity(itemKey: string, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(itemKey);

      return;
    }

    const currentItem = cart.find((item) => item.key === itemKey);
    const maximum = normalizeStockLimit(currentItem?.maxQuantity);

    if (currentItem && maximum !== null && quantity > maximum) {
      alert(
        `产品「${currentItem.name}」库存不足，目前最多只能选择 ${maximum} 件`,
      );

      return;
    }

    setCart((currentCart) =>
      currentCart.map((item) =>
        item.key === itemKey
          ? {
              ...item,
              quantity,
            }
          : item,
      ),
    );
  }

  function updateDiscount(value: number) {
    const nextValue = Number(value);

    if (!Number.isFinite(nextValue)) {
      setDiscount(0);
      return;
    }

    setDiscount(Math.max(0, nextValue));
  }

  async function checkout() {
    if (checkingOut) {
      return;
    }

    if (!selectedMemberId) {
      alert("请选择会员");
      return;
    }

    if (!selectedVehicleId) {
      alert("请选择车辆");
      return;
    }

    if (cart.length === 0) {
      alert("请加入服务、套餐或产品到购物车");
      return;
    }

    const selectedMember =
      members.find(
        (member) => Number(member.id) === Number(selectedMemberId),
      ) ?? null;

    const selectedVehicle =
      vehicles.find(
        (vehicle) => Number(vehicle.id) === Number(selectedVehicleId),
      ) ?? null;

    const cartSnapshot = cart.map((item) => ({
      ...item,
    }));

    const checkoutItems = cartSnapshot.map((item) => {
      const itemId =
        item.itemType === "service"
          ? item.serviceId
          : item.itemType === "package"
            ? item.packageId
            : item.productId;

      if (!itemId) {
        throw new Error(`购物车项目「${item.name}」缺少项目编号`);
      }

      return {
        type: item.itemType,
        id: Number(itemId),
        quantity: item.quantity,
        discount: 0,
        vehicle_size_code:
          item.itemType === "service"
            ? item.vehicleSizeCode ?? null
            : null,
        coating_option_id:
          item.itemType === "service"
            ? item.coatingOptionId ?? null
            : null,
      };
    });

    setCheckingOut(true);

    try {
      const checkoutResult = await callPosCheckoutRpc({
        memberId: Number(selectedMemberId),
        vehicleId: Number(selectedVehicleId),
        items: checkoutItems,
        orderDiscount: safeDiscount,
        tax: 0,
        paymentMethod,
        receivedAmount: total,
        notes: "",
      });

      const orderId = Number(checkoutResult.order_id);

      if (!Number.isFinite(orderId) || orderId <= 0) {
        throw new Error(
          "结账已经执行，但系统没有返回订单 ID。请先到订单记录检查，避免重复结账。",
        );
      }

      const { data: savedOrder, error: orderReadError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderReadError) {
        console.warn("订单已完成，但读取订单详情失败：", orderReadError);
      }

      const completedOrderData = {
        ...(savedOrder ?? {}),
        id: orderId,
        order_no:
          savedOrder?.order_no ?? checkoutResult.order_no ?? `GTB1N-${orderId}`,
        members: selectedMember,
        vehicles: selectedVehicle,
        subtotal: savedOrder?.subtotal ?? subtotal,
        discount: savedOrder?.discount ?? safeDiscount,
        total: savedOrder?.total ?? total,
        payment_method: savedOrder?.payment_method ?? paymentMethod,
        payment_status: savedOrder?.payment_status ?? "Paid",
        status: savedOrder?.status ?? "Completed",
        payment_id: checkoutResult.payment_id ?? null,
        employee_id:
          checkoutResult.employee_id ?? savedOrder?.employee_id ?? null,
        received_amount: checkoutResult.received_amount ?? total,
        change_amount: checkoutResult.change_amount ?? 0,
        points_earned: checkoutResult.points_earned ?? 0,
      };

      const receiptItems = cartSnapshot.map((item, index) => ({
        id: `${orderId}-${index}`,
        order_id: orderId,
        item_type: item.itemType,
        item_name: item.name,
        item_code: item.sku ?? null,
        service_id: item.itemType === "service" ? item.serviceId : null,
        package_id: item.itemType === "package" ? item.packageId : null,
        product_id: item.itemType === "product" ? item.productId : null,
        quantity: item.quantity,
        unit_price: Number(item.price),
        discount: 0,
        total: Number(item.price) * item.quantity,
        vehicle_size_code: item.vehicleSizeCode ?? null,
        vehicle_size_name: item.vehicleSizeName ?? null,
        vehicle_size_name_en: item.vehicleSizeNameEn ?? null,
        coating_option_id: item.coatingOptionId ?? null,
        coating_option_name: item.coatingOptionName ?? null,
        coating_duration_years: item.coatingDurationYears ?? null,
        coating_duration_unit: item.coatingDurationUnit ?? null,
        coating_product_name: item.coatingProductName ?? null,
        coating_price: item.coatingPrice ?? null,
        item_name_snapshot: item.name,
        item_name_en_snapshot: item.nameEn ?? null,
        services:
          item.itemType === "service"
            ? {
                service_name: item.name,
              }
            : null,
        packages:
          item.itemType === "package"
            ? {
                package_name: item.name,
                package_name_en: item.nameEn ?? null,
                package_services: (item.includedServices ?? []).map(
                  (serviceName, serviceIndex) => ({
                    sort_order: serviceIndex,
                    services: {
                      service_name: serviceName,
                    },
                  }),
                ),
              }
            : null,
        products:
          item.itemType === "product"
            ? {
                product_name: item.name,
                sku: item.sku ?? null,
                unit: item.unit ?? null,
              }
            : null,
      }));

      setCompletedOrder(completedOrderData);
      setCompletedItems(receiptItems);

      resetOrder();
      void loadData();
    } catch (error: unknown) {
      alert(getErrorMessage(error));
      console.error(error);
    } finally {
      setCheckingOut(false);
    }
  }

  function resetOrder() {
    setCart([]);

    setSelectedMemberId("");

    setSelectedVehicleId("");

    setVehicles([]);
    setDiscount(0);

    setPaymentMethod("cash");

    setSearch("");
    setCategory("全部");
  }

  const noResults =
    filteredPackages.length === 0 &&
    filteredProducts.length === 0 &&
    filteredServices.length === 0;

  return (
    <div>
      <div style={pageHeader}>
        <div>
          <h1 style={pageTitle}>POS 收银 / Point of Sale</h1>

          <p style={pageDescription}>
            选择客户、车辆、服务、套餐或产品，然后完成收款
          </p>

          <div style={currencyStatusRow}>
            <span style={accountingCurrencyBadge}>
              账本基础：{accountingOption.flag} {accountingOption.code}
            </span>
            <span style={currencyArrow}>→</span>
            <span style={displayCurrencyBadge}>
              收银显示：{currentOption.flag} {currentOption.code}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            void loadData();
          }}
          style={refreshButton}
          disabled={loading}
        >
          {loading ? "载入中..." : "↻ 刷新资料"}
        </button>
      </div>

      <div style={layout}>
        <section style={card}>
          <CustomerPanel
            members={members}
            vehicles={vehicles}
            selectedMemberId={selectedMemberId}
            selectedVehicleId={selectedVehicleId}
            onMemberChange={handleMemberChange}
            onVehicleChange={setSelectedVehicleId}
          />

          <ServiceFilters
            search={search}
            category={category}
            categories={categories}
            onSearchChange={setSearch}
            onCategoryChange={setCategory}
          />

          {loading ? (
            <div style={emptyState}>正在载入服务、套餐和产品...</div>
          ) : noResults ? (
            <div style={emptyState}>没有找到符合条件的服务、套餐或产品</div>
          ) : (
            <>
              {filteredPackages.length > 0 && (
                <section style={packageSection}>
                  <div style={sectionHeader}>
                    <div>
                      <p style={packageEyebrow}>BEST VALUE</p>

                      <h2 style={sectionTitle}>🔥 热门套餐</h2>
                    </div>

                    <span style={packageCount}>
                      {filteredPackages.length} Packages
                    </span>
                  </div>

                  <div style={packageGrid}>
                    {filteredPackages.map((packageItem) => {
                      const cartItem = cart.find(
                        (item) => item.key === `package-${packageItem.id}`,
                      );

                      const sortedServices = [
                        ...(packageItem.package_services || []),
                      ].sort(
                        (first, second) =>
                          Number(first.sort_order) - Number(second.sort_order),
                      );

                      return (
                        <article key={packageItem.id} style={packageCard}>
                          <div style={packageImageBox}>
                            {packageItem.image_url ? (
                              <img
                                src={packageItem.image_url}
                                alt={packageItem.package_name}
                                style={packageImage}
                              />
                            ) : (
                              <div style={packageImageFallback}>🎁</div>
                            )}

                            {packageItem.is_popular && (
                              <span style={hotBadge}>HOT</span>
                            )}
                          </div>

                          <div style={packageContent}>
                            <h3 style={packageName}>
                              {packageItem.package_name}
                            </h3>

                            {packageItem.package_name_en && (
                              <p style={packageNameEn}>
                                {packageItem.package_name_en}
                              </p>
                            )}

                            {packageItem.description && (
                              <p style={packageDescription}>
                                {packageItem.description}
                              </p>
                            )}

                            <div style={packageMeta}>
                              <span>
                                ⏱ {packageItem.estimated_minutes} min
                              </span>

                              <span>✓ {sortedServices.length} 项服务</span>
                            </div>

                            {sortedServices.length > 0 && (
                              <div style={includedServices}>
                                {sortedServices
                                  .slice(0, 4)
                                  .map((packageService) => (
                                    <span key={packageService.id}>
                                      ✓{" "}
                                      {packageService.services?.service_name ||
                                        "服务项目"}
                                    </span>
                                  ))}
                              </div>
                            )}

                            <div style={packageBottom}>
                              <div>
                                {Number(packageItem.original_price) >
                                  Number(packageItem.package_price) && (
                                  <span style={packageOriginalPrice}>
                                    {formatMoney(
                                      Number(packageItem.original_price),
                                    )}
                                  </span>
                                )}

                                <strong style={packagePrice}>
                                  {formatMoney(
                                    Number(packageItem.package_price),
                                  )}
                                </strong>
                              </div>

                              <button
                                type="button"
                                onClick={() => addPackageToCart(packageItem)}
                                style={addPackageButton}
                              >
                                {cartItem
                                  ? `+ Add (${cartItem.quantity})`
                                  : "+ Add"}
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}

              {filteredProducts.length > 0 && (
                <section style={productSection}>
                  <div style={sectionHeader}>
                    <div>
                      <p style={productEyebrow}>RETAIL PRODUCTS</p>
                      <h2 style={sectionTitle}>🧴 产品销售</h2>
                    </div>

                    <span style={productCount}>
                      {filteredProducts.length} Products
                    </span>
                  </div>

                  <div style={productGrid}>
                    {filteredProducts.map((product) => {
                      const stockQuantity =
                        normalizeStockLimit(product.stock_qty) ?? 0;
                      const minimumStock =
                        normalizeStockLimit(product.min_stock) ?? 0;
                      const cartItem = cart.find(
                        (item) => item.key === `product-${product.id}`,
                      );
                      const cartQuantity = cartItem?.quantity ?? 0;
                      const soldOut = stockQuantity <= 0;
                      const reachedLimit =
                        !soldOut && cartQuantity >= stockQuantity;
                      const lowStock =
                        !soldOut &&
                        minimumStock > 0 &&
                        stockQuantity <= minimumStock;

                      return (
                        <article key={product.id} style={productCard}>
                          <div style={productIconBox}>
                            <span style={productIcon}>🧴</span>

                            {lowStock && (
                              <span style={lowStockBadge}>LOW STOCK</span>
                            )}

                            {soldOut && (
                              <span style={soldOutBadge}>SOLD OUT</span>
                            )}
                          </div>

                          <div style={productContent}>
                            <div style={productTitleRow}>
                              <h3 style={productName}>
                                {product.product_name}
                              </h3>

                              {product.brand && (
                                <span style={brandBadge}>{product.brand}</span>
                              )}
                            </div>

                            <div style={productInformation}>
                              {product.sku && <span>SKU: {product.sku}</span>}
                              {product.category && (
                                <span>{product.category}</span>
                              )}
                            </div>

                            <div style={stockRow}>
                              <span
                                style={
                                  soldOut
                                    ? stockEmpty
                                    : lowStock
                                      ? stockLow
                                      : stockAvailable
                                }
                              >
                                库存：{stockQuantity}
                                {product.unit ? ` ${product.unit}` : ""}
                              </span>

                              {minimumStock > 0 && (
                                <span style={minimumStockText}>
                                  最低库存：{minimumStock}
                                </span>
                              )}
                            </div>

                            <div style={productBottom}>
                              <strong style={productPrice}>
                                {formatMoney(
                                  Number(product.selling_price ?? 0),
                                )}
                              </strong>

                              <button
                                type="button"
                                onClick={() => addProductToCart(product)}
                                disabled={soldOut || reachedLimit}
                                style={{
                                  ...addProductButton,
                                  opacity: soldOut || reachedLimit ? 0.5 : 1,
                                  cursor:
                                    soldOut || reachedLimit
                                      ? "not-allowed"
                                      : "pointer",
                                }}
                              >
                                {soldOut
                                  ? "无库存"
                                  : reachedLimit
                                    ? "库存上限"
                                    : cartItem
                                      ? `+ Add (${cartQuantity})`
                                      : "+ Add"}
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}

              {filteredServices.length > 0 && (
                <section style={serviceSection}>
                  {(filteredPackages.length > 0 ||
                    filteredProducts.length > 0) && (
                    <div style={sectionHeader}>
                      <div>
                        <p style={serviceEyebrow}>INDIVIDUAL SERVICES</p>

                        <h2 style={sectionTitle}>服务项目</h2>
                      </div>
                    </div>
                  )}

                  <div style={serviceGrid}>
                    {filteredServices.map((service) => {
                      const serviceQuantity = cart
                        .filter(
                          (item) =>
                            item.itemType === "service" &&
                            item.serviceId === service.id,
                        )
                        .reduce((sum, item) => sum + item.quantity, 0);

                      return (
                        <ServiceCard
                          key={service.id}
                          service={service}
                          quantity={serviceQuantity}
                          onClick={() => addServiceToCart(service)}
                        />
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </section>

        <ShoppingCart
          cart={cart}
          discount={safeDiscount}
          paymentMethod={paymentMethod}
          subtotal={subtotal}
          total={total}
          checkingOut={checkingOut}
          onDiscountChange={updateDiscount}
          onPaymentMethodChange={setPaymentMethod}
          onUpdateQuantity={updateQuantity}
          onRemove={removeFromCart}
          onCheckout={checkout}
        />
      </div>


      <POSServiceOptionsModal
        service={configuringService}
        vehiclePrices={serviceVehiclePrices.filter(
          (row) => row.service_id === configuringService?.id,
        )}
        coatingOptions={coatingOptions.filter(
          (row) => row.service_id === configuringService?.id,
        )}
        onClose={() => setConfiguringService(null)}
        onConfirm={confirmServiceOptions}
      />
      {checkingOut && (
        <div style={checkoutOverlay}>
          <div style={checkoutMessage}>正在建立订单，请稍候...</div>
        </div>
      )}
      <OrderDetailDrawer
        open={Boolean(completedOrder)}
        order={completedOrder}
        items={completedItems}
        onClose={() => {
          setCompletedOrder(null);

          setCompletedItems([]);
        }}
      />
    </div>
  );
}

type CheckoutItemPayload = {
  type: "service" | "package" | "product";
  id: number;
  quantity: number;
  discount: number;
  vehicle_size_code?: "small" | "medium" | "suv" | "large" | null;
  coating_option_id?: number | null;
};

type CheckoutRpcResult = {
  order_id: number;
  order_no?: string;
  payment_id?: number;
  employee_id?: number | null;
  member_id?: number | null;
  vehicle_id?: number | null;
  received_amount?: number;
  change_amount?: number;
  points_earned?: number;
};

type CheckoutRpcInput = {
  memberId: number;
  vehicleId: number;
  items: CheckoutItemPayload[];
  orderDiscount: number;
  tax: number;
  paymentMethod: string;
  receivedAmount: number;
  notes: string;
};

async function callPosCheckoutRpc(
  input: CheckoutRpcInput,
): Promise<CheckoutRpcResult> {
  const payloads: Array<Record<string, unknown>> = [
    {
      p_member_id: input.memberId,
      p_vehicle_id: input.vehicleId,
      p_items: input.items,
      p_order_discount: input.orderDiscount,
      p_tax: input.tax,
      p_payment_method: input.paymentMethod,
      p_received_amount: input.receivedAmount,
      p_notes: input.notes,
    },
    {
      p_member_id: input.memberId,
      p_vehicle_id: input.vehicleId,
      p_items: input.items,
      p_order_discount: input.orderDiscount,
      p_payment_method: input.paymentMethod,
      p_received_amount: input.receivedAmount,
      p_notes: input.notes,
    },
  ];

  let latestSignatureError: unknown | null = null;

  for (const payload of payloads) {
    const { data, error } = await supabase.rpc(
      "pos_checkout",
      payload as never,
    );

    if (!error) {
      return normalizeCheckoutResult(data);
    }

    if (!isRpcSignatureError(error)) {
      throw error;
    }

    latestSignatureError = error;
  }

  throw (
    latestSignatureError ??
    new Error("找不到 pos_checkout RPC，请确认数据库函数已经建立。")
  );
}

function normalizeCheckoutResult(data: unknown): CheckoutRpcResult {
  let value = data;

  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      throw new Error("结账成功返回的数据格式无法识别");
    }
  }

  if (Array.isArray(value)) {
    value = value[0];
  }

  if (!value || typeof value !== "object") {
    throw new Error("结账函数没有返回订单资料");
  }

  const record = value as Record<string, unknown>;

  return {
    order_id: Number(record.order_id ?? record.id),
    order_no: typeof record.order_no === "string" ? record.order_no : undefined,
    payment_id: toOptionalNumber(record.payment_id),
    employee_id: toOptionalNumber(record.employee_id),
    member_id: toOptionalNumber(record.member_id),
    vehicle_id: toOptionalNumber(record.vehicle_id),
    received_amount: toOptionalNumber(record.received_amount),
    change_amount: toOptionalNumber(record.change_amount),
    points_earned: toOptionalNumber(record.points_earned),
  };
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function isRpcSignatureError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as Record<string, unknown>;

  const code = String(record.code ?? "");
  const message = String(record.message ?? "").toLowerCase();

  return (
    code === "PGRST202" ||
    code === "42883" ||
    message.includes("could not find the function") ||
    message.includes("function public.pos_checkout")
  );
}

function normalizeStockLimit(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return Math.max(0, Math.floor(numberValue));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "操作失败，请稍后重试";
}

const pageHeader = {
  display: "flex",

  alignItems: "center",

  justifyContent: "space-between",

  flexWrap: "wrap" as const,

  gap: 18,
  marginBottom: 24,
};

const pageTitle = {
  margin: 0,

  color: "#111827",
  fontSize: 36,
};

const pageDescription = {
  margin: "7px 0 0",
  color: "#6b7280",
};

const currencyStatusRow = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap" as const,
  gap: 8,
  marginTop: 12,
};

const accountingCurrencyBadge = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 29,
  padding: "5px 10px",
  border: "1px solid #cbd5e1",
  borderRadius: 999,
  background: "#f8fafc",
  color: "#475569",
  fontSize: 11,
  fontWeight: 850,
};

const displayCurrencyBadge = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 29,
  padding: "5px 10px",
  border: "1px solid #bfdbfe",
  borderRadius: 999,
  background: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 11,
  fontWeight: 900,
};

const currencyArrow = {
  color: "#94a3b8",
  fontSize: 12,
  fontWeight: 900,
};

const refreshButton = {
  padding: "11px 16px",

  border: "1px solid #d1d5db",

  borderRadius: 11,

  background: "#ffffff",
  color: "#374151",

  cursor: "pointer",
  fontWeight: 800,
};

const layout = {
  display: "grid",

  gridTemplateColumns: "minmax(0, 1.3fr) minmax(340px, .9fr)",

  alignItems: "start",
  gap: 24,
};

const card = {
  minWidth: 0,
  padding: 24,

  borderRadius: 20,
  background: "#ffffff",

  boxShadow: "0 10px 30px rgba(15,23,42,.08)",
};

const packageSection = {
  marginBottom: 32,
};

const serviceSection = {
  marginTop: 6,
};

const sectionHeader = {
  display: "flex",

  alignItems: "center",

  justifyContent: "space-between",

  gap: 14,

  margin: "22px 0 14px",
};

const packageEyebrow = {
  margin: "0 0 4px",

  color: "#ea580c",

  fontSize: 11,
  fontWeight: 900,

  letterSpacing: "1.4px",
};

const serviceEyebrow = {
  margin: "0 0 4px",

  color: "#2563eb",

  fontSize: 11,
  fontWeight: 900,

  letterSpacing: "1.4px",
};

const sectionTitle = {
  margin: 0,

  color: "#111827",
  fontSize: 25,
};

const packageCount = {
  padding: "6px 10px",

  borderRadius: 999,

  color: "#9a3412",
  background: "#ffedd5",

  fontSize: 12,
  fontWeight: 900,
};

const packageGrid = {
  display: "grid",

  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",

  gap: 16,
};

const packageCard = {
  minWidth: 0,

  overflow: "hidden",

  borderRadius: 18,

  border: "1px solid #fed7aa",

  background: "linear-gradient(180deg, #fff7ed 0%, #ffffff 55%)",

  boxShadow: "0 10px 24px rgba(234,88,12,.10)",
};

const packageImageBox = {
  position: "relative" as const,

  height: 155,

  overflow: "hidden",
  background: "#ffedd5",
};

const packageImage = {
  width: "100%",
  height: "100%",

  display: "block",

  objectFit: "cover" as const,
};

const packageImageFallback = {
  width: "100%",
  height: "100%",

  display: "flex",

  alignItems: "center",
  justifyContent: "center",

  fontSize: 54,
};

const hotBadge = {
  position: "absolute" as const,

  top: 12,
  left: 12,

  padding: "6px 10px",

  borderRadius: 999,

  color: "#ffffff",
  background: "#ea580c",

  fontSize: 11,
  fontWeight: 900,

  boxShadow: "0 6px 16px rgba(234,88,12,.3)",
};

const packageContent = {
  padding: 16,
};

const packageName = {
  margin: 0,

  color: "#111827",
  fontSize: 19,
};

const packageNameEn = {
  margin: "4px 0 0",

  color: "#6b7280",
  fontSize: 12,
};

const packageDescription = {
  margin: "10px 0 0",

  color: "#475569",

  fontSize: 13,
  lineHeight: 1.55,
};

const packageMeta = {
  display: "flex",

  flexWrap: "wrap" as const,

  gap: 8,

  marginTop: 12,

  color: "#7c2d12",

  fontSize: 12,
  fontWeight: 800,
};

const includedServices = {
  display: "flex",

  flexDirection: "column" as const,

  gap: 5,

  marginTop: 12,
  padding: 10,

  borderRadius: 11,

  color: "#475569",

  background: "rgba(255,255,255,.78)",

  fontSize: 12,
};

const packageBottom = {
  display: "flex",

  alignItems: "flex-end",

  justifyContent: "space-between",

  gap: 12,

  marginTop: 15,
};

const packageOriginalPrice = {
  display: "block",

  color: "#9ca3af",

  fontSize: 12,

  textDecoration: "line-through",
};

const packagePrice = {
  display: "block",

  color: "#111827",
  fontSize: 23,
};

const addPackageButton = {
  padding: "10px 13px",

  border: "none",
  borderRadius: 11,

  color: "#ffffff",
  background: "#ea580c",

  cursor: "pointer",
  fontWeight: 900,
};

const productSection = {
  marginBottom: 32,
};

const productEyebrow = {
  margin: "0 0 4px",
  color: "#059669",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "1.4px",
};

const productCount = {
  padding: "6px 10px",
  borderRadius: 999,
  color: "#065f46",
  background: "#d1fae5",
  fontSize: 12,
  fontWeight: 900,
};

const productGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const productCard = {
  minWidth: 0,
  overflow: "hidden",
  borderRadius: 16,
  border: "1px solid #a7f3d0",
  background: "linear-gradient(180deg, #ecfdf5 0%, #ffffff 58%)",
  boxShadow: "0 8px 22px rgba(5,150,105,.09)",
};

const productIconBox = {
  position: "relative" as const,
  height: 112,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#d1fae5",
};

const productIcon = {
  fontSize: 44,
};

const lowStockBadge = {
  position: "absolute" as const,
  top: 10,
  left: 10,
  padding: "5px 8px",
  borderRadius: 999,
  color: "#92400e",
  background: "#fef3c7",
  fontSize: 10,
  fontWeight: 900,
};

const soldOutBadge = {
  position: "absolute" as const,
  top: 10,
  left: 10,
  padding: "5px 8px",
  borderRadius: 999,
  color: "#991b1b",
  background: "#fee2e2",
  fontSize: 10,
  fontWeight: 900,
};

const productContent = {
  padding: 14,
};

const productTitleRow = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
};

const productName = {
  margin: 0,
  color: "#111827",
  fontSize: 17,
};

const brandBadge = {
  flexShrink: 0,
  padding: "4px 7px",
  borderRadius: 999,
  color: "#065f46",
  background: "#d1fae5",
  fontSize: 10,
  fontWeight: 800,
};

const productInformation = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 8,
  marginTop: 8,
  color: "#64748b",
  fontSize: 11,
};

const stockRow = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 4,
  marginTop: 12,
};

const stockAvailable = {
  color: "#047857",
  fontSize: 12,
  fontWeight: 900,
};

const stockLow = {
  color: "#d97706",
  fontSize: 12,
  fontWeight: 900,
};

const stockEmpty = {
  color: "#dc2626",
  fontSize: 12,
  fontWeight: 900,
};

const minimumStockText = {
  color: "#94a3b8",
  fontSize: 10,
};

const productBottom = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 10,
  marginTop: 14,
};

const productPrice = {
  color: "#111827",
  fontSize: 21,
};

const addProductButton = {
  padding: "9px 12px",
  border: "none",
  borderRadius: 10,
  color: "#ffffff",
  background: "#059669",
  fontWeight: 900,
};

const serviceGrid = {
  display: "grid",

  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",

  gap: 14,
};

const emptyState = {
  padding: 40,

  borderRadius: 16,

  background: "#f8fafc",
  color: "#64748b",

  textAlign: "center" as const,
};

const checkoutOverlay = {
  position: "fixed" as const,

  inset: 0,
  zIndex: 9999,

  display: "flex",

  alignItems: "center",
  justifyContent: "center",

  background: "rgba(15,23,42,.48)",

  backdropFilter: "blur(4px)",
};

const checkoutMessage = {
  padding: "20px 26px",

  borderRadius: 16,

  background: "#ffffff",
  color: "#111827",

  boxShadow: "0 20px 60px rgba(0,0,0,.2)",

  fontWeight: 800,
};

export default POS;