import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  Member,
  Service,
  Vehicle,
} from "../types/database";

import {
  PackageService,
  type Package,
} from "../services/packageService";

import { supabase } from "../lib/supabase";
import { MemberService } from "../services/memberService";
import { ServiceService } from "../services/serviceService";
import { VehicleService } from "../services/vehicleService";

import CustomerPanel from "../components/pos/CustomerPanel";
import ServiceCard from "../components/pos/ServiceCard";
import ServiceFilters from "../components/pos/ServiceFilters";

import ShoppingCart, {
  type PosCartItem,
} from "../components/pos/ShoppingCart";

const PACKAGE_CATEGORY = "🔥 热门套餐";

function POS() {
  const [members, setMembers] =
    useState<Member[]>([]);

  const [vehicles, setVehicles] =
    useState<Vehicle[]>([]);

  const [services, setServices] =
    useState<Service[]>([]);

  const [packages, setPackages] =
    useState<Package[]>([]);

  const [cart, setCart] =
    useState<PosCartItem[]>([]);

  const [
    selectedMemberId,
    setSelectedMemberId,
  ] = useState("");

  const [
    selectedVehicleId,
    setSelectedVehicleId,
  ] = useState("");

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState("cash");

  const [discount, setDiscount] =
    useState(0);

  const [search, setSearch] =
    useState("");

  const [category, setCategory] =
    useState("全部");

  const [loading, setLoading] =
    useState(true);

  const [
    checkingOut,
    setCheckingOut,
  ] = useState(false);

  const subtotal = useMemo(() => {
    return cart.reduce(
      (sum, item) =>
        sum +
        Number(item.price) *
          item.quantity,
      0
    );
  }, [cart]);

  const safeDiscount = Math.max(
    0,
    Math.min(
      Number(discount) || 0,
      subtotal
    )
  );

  const total = Math.max(
    subtotal - safeDiscount,
    0
  );

  const categories = useMemo(() => {
    const serviceCategories =
      services
        .map(
          (service) =>
            service.category
        )
        .filter(
          (
            value
          ): value is string =>
            Boolean(value?.trim())
        );

    const allCategories = [
      "全部",
    ];

    if (packages.length > 0) {
      allCategories.push(
        PACKAGE_CATEGORY
      );
    }

    allCategories.push(
      ...Array.from(
        new Set(
          serviceCategories
        )
      )
    );

    return allCategories;
  }, [services, packages]);

  const filteredServices =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (
        category ===
        PACKAGE_CATEGORY
      ) {
        return [];
      }

      return services.filter(
        (service) => {
          const serviceName =
            service.service_name
              ?.toLowerCase() ||
            "";

          const serviceCategory =
            service.category
              ?.toLowerCase() ||
            "";

          const matchSearch =
            !keyword ||
            serviceName.includes(
              keyword
            ) ||
            serviceCategory.includes(
              keyword
            );

          const matchCategory =
            category === "全部" ||
            service.category ===
              category;

          const isAvailable =
            service.is_active !==
            false;

          return (
            matchSearch &&
            matchCategory &&
            isAvailable
          );
        }
      );
    }, [
      services,
      search,
      category,
    ]);

  const filteredPackages =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      const showPackages =
        category === "全部" ||
        category ===
          PACKAGE_CATEGORY;

      if (!showPackages) {
        return [];
      }

      return packages.filter(
        (packageItem) => {
          const searchText = [
            packageItem.package_name,
            packageItem.package_name_en,
            packageItem.description,
            packageItem.description_en,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchSearch =
            !keyword ||
            searchText.includes(
              keyword
            );

          return (
            packageItem.is_active !==
              false &&
            matchSearch
          );
        }
      );
    }, [
      packages,
      search,
      category,
    ]);

  async function loadData() {
    setLoading(true);

    try {
      const [
        memberData,
        serviceData,
        packageData,
      ] = await Promise.all([
        MemberService.getAll(),
        ServiceService.getAll(),
        PackageService.getActive(),
      ]);

      setMembers(memberData);
      setServices(serviceData);
      setPackages(packageData);
    } catch (error: unknown) {
      alert(
        getErrorMessage(error)
      );

      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function loadVehicles(
    memberId: string
  ) {
    if (!memberId) {
      setVehicles([]);
      return;
    }

    try {
      const vehicleData =
        await VehicleService.getByMemberId(
          Number(memberId)
        );

      setVehicles(vehicleData);
    } catch (error: unknown) {
      alert(
        getErrorMessage(error)
      );

      console.error(error);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function handleMemberChange(
    memberId: string
  ) {
    setSelectedMemberId(
      memberId
    );

    setSelectedVehicleId("");
    setCart([]);
    setDiscount(0);

    void loadVehicles(
      memberId
    );
  }

  function addCartItem(
    newItem: Omit<
      PosCartItem,
      "quantity"
    >
  ) {
    setCart(
      (currentCart) => {
        const existingItem =
          currentCart.find(
            (item) =>
              item.key ===
              newItem.key
          );

        if (existingItem) {
          return currentCart.map(
            (item) =>
              item.key ===
              newItem.key
                ? {
                    ...item,

                    quantity:
                      item.quantity +
                      1,
                  }
                : item
          );
        }

        return [
          ...currentCart,

          {
            ...newItem,
            quantity: 1,
          },
        ];
      }
    );
  }

  function addServiceToCart(
    service: Service
  ) {
    addCartItem({
      key: `service-${service.id}`,

      itemType: "service",

      serviceId: service.id,
      packageId: null,

      name:
        service.service_name,

      nameEn: null,

      price: Number(
        service.price
      ),

      originalPrice: null,
    });
  }

  function addPackageToCart(
    packageItem: Package
  ) {
    addCartItem({
      key:
        `package-${packageItem.id}`,

      itemType: "package",

      serviceId: null,

      packageId:
        packageItem.id,

      name:
        packageItem.package_name,

      nameEn:
        packageItem.package_name_en,

      price: Number(
        packageItem.package_price
      ),

      originalPrice: Number(
        packageItem.original_price
      ),
    });
  }

  function removeFromCart(
    itemKey: string
  ) {
    setCart(
      (currentCart) =>
        currentCart.filter(
          (item) =>
            item.key !==
            itemKey
        )
    );
  }

  function updateQuantity(
    itemKey: string,
    quantity: number
  ) {
    if (quantity <= 0) {
      removeFromCart(
        itemKey
      );

      return;
    }

    setCart(
      (currentCart) =>
        currentCart.map(
          (item) =>
            item.key ===
            itemKey
              ? {
                  ...item,
                  quantity,
                }
              : item
        )
    );
  }

  function updateDiscount(
    value: number
  ) {
    const nextValue =
      Number(value);

    if (
      !Number.isFinite(
        nextValue
      )
    ) {
      setDiscount(0);
      return;
    }

    setDiscount(
      Math.max(
        0,
        nextValue
      )
    );
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
      alert(
        "请加入服务或套餐到购物车"
      );

      return;
    }

    setCheckingOut(true);

    const orderNo =
      `GTB-${Date.now()}`;

    try {
      const {
        data: order,
        error: orderError,
      } = await supabase
        .from("orders")
        .insert([
          {
            order_no: orderNo,

            member_id: Number(
              selectedMemberId
            ),

            vehicle_id: Number(
              selectedVehicleId
            ),

            subtotal,

            discount:
              safeDiscount,

            total,

            payment_method:
              paymentMethod,

            payment_status:
              "paid",

            status:
              "completed",

            notes: "",
          },
        ])
        .select()
        .single();

      if (orderError) {
        throw orderError;
      }

      if (!order?.id) {
        throw new Error(
          "订单创建成功，但没有返回订单 ID"
        );
      }

      const orderItems =
        cart.map(
          (item) => ({
            order_id:
              order.id,

            service_id:
              item.itemType ===
              "service"
                ? item.serviceId
                : null,

            package_id:
              item.itemType ===
              "package"
                ? item.packageId
                : null,

            product_id: null,

            quantity:
              item.quantity,

            unit_price:
              Number(
                item.price
              ),

            discount: 0,

            total:
              Number(
                item.price
              ) *
              item.quantity,
          })
        );

      const {
        error: itemError,
      } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemError) {
        throw itemError;
      }

      alert(
        `结账成功！订单号：${orderNo}`
      );

      resetOrder();
    } catch (error: unknown) {
      alert(
        getErrorMessage(error)
      );

      console.error(error);
    } finally {
      setCheckingOut(false);
    }
  }

  function resetOrder() {
    setCart([]);

    setSelectedMemberId(
      ""
    );

    setSelectedVehicleId(
      ""
    );

    setVehicles([]);
    setDiscount(0);

    setPaymentMethod(
      "cash"
    );

    setSearch("");
    setCategory("全部");
  }

  const noResults =
    filteredPackages.length ===
      0 &&
    filteredServices.length ===
      0;

  return (
    <div>
      <div style={pageHeader}>
        <div>
          <h1 style={pageTitle}>
            POS 收银 / Point of
            Sale
          </h1>

          <p
            style={
              pageDescription
            }
          >
            选择客户、车辆、服务或套餐，然后完成收款
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void loadData();
          }}
          style={refreshButton}
          disabled={loading}
        >
          {loading
            ? "载入中..."
            : "↻ 刷新资料"}
        </button>
      </div>

      <div style={layout}>
        <section style={card}>
          <CustomerPanel
            members={members}
            vehicles={vehicles}
            selectedMemberId={
              selectedMemberId
            }
            selectedVehicleId={
              selectedVehicleId
            }
            onMemberChange={
              handleMemberChange
            }
            onVehicleChange={
              setSelectedVehicleId
            }
          />

          <ServiceFilters
            search={search}
            category={category}
            categories={
              categories
            }
            onSearchChange={
              setSearch
            }
            onCategoryChange={
              setCategory
            }
          />

          {loading ? (
            <div
              style={
                emptyState
              }
            >
              正在载入服务和套餐...
            </div>
          ) : noResults ? (
            <div
              style={
                emptyState
              }
            >
              没有找到符合条件的服务或套餐
            </div>
          ) : (
            <>
              {filteredPackages.length >
                0 && (
                <section
                  style={
                    packageSection
                  }
                >
                  <div
                    style={
                      sectionHeader
                    }
                  >
                    <div>
                      <p
                        style={
                          packageEyebrow
                        }
                      >
                        BEST VALUE
                      </p>

                      <h2
                        style={
                          sectionTitle
                        }
                      >
                        🔥 热门套餐
                      </h2>
                    </div>

                    <span
                      style={
                        packageCount
                      }
                    >
                      {
                        filteredPackages.length
                      }{" "}
                      Packages
                    </span>
                  </div>

                  <div
                    style={
                      packageGrid
                    }
                  >
                    {filteredPackages.map(
                      (
                        packageItem
                      ) => {
                        const cartItem =
                          cart.find(
                            (
                              item
                            ) =>
                              item.key ===
                              `package-${packageItem.id}`
                          );

                        const sortedServices =
                          [
                            ...(packageItem.package_services ||
                              []),
                          ].sort(
                            (
                              first,
                              second
                            ) =>
                              Number(
                                first.sort_order
                              ) -
                              Number(
                                second.sort_order
                              )
                          );

                        return (
                          <article
                            key={
                              packageItem.id
                            }
                            style={
                              packageCard
                            }
                          >
                            <div
                              style={
                                packageImageBox
                              }
                            >
                              {packageItem.image_url ? (
                                <img
                                  src={
                                    packageItem.image_url
                                  }
                                  alt={
                                    packageItem.package_name
                                  }
                                  style={
                                    packageImage
                                  }
                                />
                              ) : (
                                <div
                                  style={
                                    packageImageFallback
                                  }
                                >
                                  🎁
                                </div>
                              )}

                              {packageItem.is_popular && (
                                <span
                                  style={
                                    hotBadge
                                  }
                                >
                                  HOT
                                </span>
                              )}
                            </div>

                            <div
                              style={
                                packageContent
                              }
                            >
                              <h3
                                style={
                                  packageName
                                }
                              >
                                {
                                  packageItem.package_name
                                }
                              </h3>

                              {packageItem.package_name_en && (
                                <p
                                  style={
                                    packageNameEn
                                  }
                                >
                                  {
                                    packageItem.package_name_en
                                  }
                                </p>
                              )}

                              {packageItem.description && (
                                <p
                                  style={
                                    packageDescription
                                  }
                                >
                                  {
                                    packageItem.description
                                  }
                                </p>
                              )}

                              <div
                                style={
                                  packageMeta
                                }
                              >
                                <span>
                                  ⏱{" "}
                                  {
                                    packageItem.estimated_minutes
                                  }{" "}
                                  min
                                </span>

                                <span>
                                  ✓{" "}
                                  {
                                    sortedServices.length
                                  }{" "}
                                  项服务
                                </span>
                              </div>

                              {sortedServices.length >
                                0 && (
                                <div
                                  style={
                                    includedServices
                                  }
                                >
                                  {sortedServices
                                    .slice(
                                      0,
                                      4
                                    )
                                    .map(
                                      (
                                        packageService
                                      ) => (
                                        <span
                                          key={
                                            packageService.id
                                          }
                                        >
                                          ✓{" "}
                                          {packageService
                                            .services
                                            ?.service_name ||
                                            "服务项目"}
                                        </span>
                                      )
                                    )}
                                </div>
                              )}

                              <div
                                style={
                                  packageBottom
                                }
                              >
                                <div>
                                  {Number(
                                    packageItem.original_price
                                  ) >
                                    Number(
                                      packageItem.package_price
                                    ) && (
                                    <span
                                      style={
                                        packageOriginalPrice
                                      }
                                    >
                                      $
                                      {Number(
                                        packageItem.original_price
                                      ).toFixed(
                                        2
                                      )}
                                    </span>
                                  )}

                                  <strong
                                    style={
                                      packagePrice
                                    }
                                  >
                                    $
                                    {Number(
                                      packageItem.package_price
                                    ).toFixed(
                                      2
                                    )}
                                  </strong>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    addPackageToCart(
                                      packageItem
                                    )
                                  }
                                  style={
                                    addPackageButton
                                  }
                                >
                                  {cartItem
                                    ? `+ Add (${cartItem.quantity})`
                                    : "+ Add"}
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      }
                    )}
                  </div>
                </section>
              )}

              {filteredServices.length >
                0 && (
                <section
                  style={
                    serviceSection
                  }
                >
                  {filteredPackages.length >
                    0 && (
                    <div
                      style={
                        sectionHeader
                      }
                    >
                      <div>
                        <p
                          style={
                            serviceEyebrow
                          }
                        >
                          INDIVIDUAL
                          SERVICES
                        </p>

                        <h2
                          style={
                            sectionTitle
                          }
                        >
                          服务项目
                        </h2>
                      </div>
                    </div>
                  )}

                  <div
                    style={
                      serviceGrid
                    }
                  >
                    {filteredServices.map(
                      (
                        service
                      ) => {
                        const cartItem =
                          cart.find(
                            (
                              item
                            ) =>
                              item.key ===
                              `service-${service.id}`
                          );

                        return (
                          <ServiceCard
                            key={
                              service.id
                            }
                            service={
                              service
                            }
                            quantity={
                              cartItem?.quantity ||
                              0
                            }
                            onClick={() =>
                              addServiceToCart(
                                service
                              )
                            }
                          />
                        );
                      }
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </section>

        <ShoppingCart
          cart={cart}
          discount={
            safeDiscount
          }
          paymentMethod={
            paymentMethod
          }
          subtotal={subtotal}
          total={total}
          checkingOut={
            checkingOut
          }
          onDiscountChange={
            updateDiscount
          }
          onPaymentMethodChange={
            setPaymentMethod
          }
          onUpdateQuantity={
            updateQuantity
          }
          onRemove={
            removeFromCart
          }
          onCheckout={
            checkout
          }
        />
      </div>

      {checkingOut && (
        <div
          style={
            checkoutOverlay
          }
        >
          <div
            style={
              checkoutMessage
            }
          >
            正在建立订单，请稍候...
          </div>
        </div>
      )}
    </div>
  );
}

function getErrorMessage(
  error: unknown
) {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return "操作失败，请稍后重试";
}

const pageHeader = {
  display: "flex",

  alignItems: "center",

  justifyContent:
    "space-between",

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

const refreshButton = {
  padding: "11px 16px",

  border:
    "1px solid #d1d5db",

  borderRadius: 11,

  background: "#ffffff",
  color: "#374151",

  cursor: "pointer",
  fontWeight: 800,
};

const layout = {
  display: "grid",

  gridTemplateColumns:
    "minmax(0, 1.3fr) minmax(340px, .9fr)",

  alignItems: "start",
  gap: 24,
};

const card = {
  minWidth: 0,
  padding: 24,

  borderRadius: 20,
  background: "#ffffff",

  boxShadow:
    "0 10px 30px rgba(15,23,42,.08)",
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

  justifyContent:
    "space-between",

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

  gridTemplateColumns:
    "repeat(auto-fit, minmax(250px, 1fr))",

  gap: 16,
};

const packageCard = {
  minWidth: 0,

  overflow: "hidden",

  borderRadius: 18,

  border:
    "1px solid #fed7aa",

  background:
    "linear-gradient(180deg, #fff7ed 0%, #ffffff 55%)",

  boxShadow:
    "0 10px 24px rgba(234,88,12,.10)",
};

const packageImageBox = {
  position:
    "relative" as const,

  height: 155,

  overflow: "hidden",
  background: "#ffedd5",
};

const packageImage = {
  width: "100%",
  height: "100%",

  display: "block",

  objectFit:
    "cover" as const,
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
  position:
    "absolute" as const,

  top: 12,
  left: 12,

  padding: "6px 10px",

  borderRadius: 999,

  color: "#ffffff",
  background: "#ea580c",

  fontSize: 11,
  fontWeight: 900,

  boxShadow:
    "0 6px 16px rgba(234,88,12,.3)",
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

  flexDirection:
    "column" as const,

  gap: 5,

  marginTop: 12,
  padding: 10,

  borderRadius: 11,

  color: "#475569",

  background:
    "rgba(255,255,255,.78)",

  fontSize: 12,
};

const packageBottom = {
  display: "flex",

  alignItems: "flex-end",

  justifyContent:
    "space-between",

  gap: 12,

  marginTop: 15,
};

const packageOriginalPrice = {
  display: "block",

  color: "#9ca3af",

  fontSize: 12,

  textDecoration:
    "line-through",
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

const serviceGrid = {
  display: "grid",

  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",

  gap: 14,
};

const emptyState = {
  padding: 40,

  borderRadius: 16,

  background: "#f8fafc",
  color: "#64748b",

  textAlign:
    "center" as const,
};

const checkoutOverlay = {
  position:
    "fixed" as const,

  inset: 0,
  zIndex: 9999,

  display: "flex",

  alignItems: "center",
  justifyContent: "center",

  background:
    "rgba(15,23,42,.48)",

  backdropFilter:
    "blur(4px)",
};

const checkoutMessage = {
  padding: "20px 26px",

  borderRadius: 16,

  background: "#ffffff",
  color: "#111827",

  boxShadow:
    "0 20px 60px rgba(0,0,0,.2)",

  fontWeight: 800,
};

export default POS;