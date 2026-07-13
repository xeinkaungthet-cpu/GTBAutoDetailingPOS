import { useEffect, useMemo, useState } from "react";

import type {
  Member,
  Service,
  Vehicle,
} from "../types/database";

import { supabase } from "../lib/supabase";
import { MemberService } from "../services/memberService";
import { ServiceService } from "../services/serviceService";
import { VehicleService } from "../services/vehicleService";

import CustomerPanel from "../components/pos/CustomerPanel";
import ServiceCard from "../components/pos/ServiceCard";
import ServiceFilters from "../components/pos/ServiceFilters";
import ShoppingCart from "../components/pos/ShoppingCart";

type CartItem = {
  service: Service;
  quantity: number;
};

function POS() {
  const [members, setMembers] = useState<Member[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [selectedMemberId, setSelectedMemberId] =
    useState("");
  const [selectedVehicleId, setSelectedVehicleId] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("cash");
  const [discount, setDiscount] = useState(0);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("全部");

  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  const subtotal = useMemo(() => {
    return cart.reduce(
      (sum, item) =>
        sum +
        Number(item.service.price) *
          item.quantity,
      0
    );
  }, [cart]);

  const safeDiscount = Math.max(
    0,
    Math.min(Number(discount) || 0, subtotal)
  );

  const total = Math.max(
    subtotal - safeDiscount,
    0
  );

  const categories = useMemo(() => {
    const serviceCategories = services
      .map((service) => service.category)
      .filter(
        (value): value is string =>
          Boolean(value?.trim())
      );

    return [
      "全部",
      ...Array.from(new Set(serviceCategories)),
    ];
  }, [services]);

  const filteredServices = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return services.filter((service) => {
      const serviceName =
        service.service_name?.toLowerCase() || "";

      const serviceCategory =
        service.category?.toLowerCase() || "";

      const matchSearch =
        !keyword ||
        serviceName.includes(keyword) ||
        serviceCategory.includes(keyword);

      const matchCategory =
        category === "全部" ||
        service.category === category;

      const isAvailable =
        service.is_active !== false;

      return (
        matchSearch &&
        matchCategory &&
        isAvailable
      );
    });
  }, [services, search, category]);

  async function loadData() {
    setLoading(true);

    try {
      const [memberData, serviceData] =
        await Promise.all([
          MemberService.getAll(),
          ServiceService.getAll(),
        ]);

      setMembers(memberData);
      setServices(serviceData);
    } catch (error: unknown) {
      alert(getErrorMessage(error));
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
      alert(getErrorMessage(error));
      console.error(error);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleMemberChange(
    memberId: string
  ) {
    setSelectedMemberId(memberId);
    setSelectedVehicleId("");
    setCart([]);
    setDiscount(0);

    loadVehicles(memberId);
  }

  function addToCart(service: Service) {
    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) =>
          item.service.id === service.id
      );

      if (existingItem) {
        return currentCart.map((item) =>
          item.service.id === service.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          service,
          quantity: 1,
        },
      ];
    });
  }

  function removeFromCart(
    serviceId: number
  ) {
    setCart((currentCart) =>
      currentCart.filter(
        (item) =>
          item.service.id !== serviceId
      )
    );
  }

  function updateQuantity(
    serviceId: number,
    quantity: number
  ) {
    if (quantity <= 0) {
      removeFromCart(serviceId);
      return;
    }

    setCart((currentCart) =>
      currentCart.map((item) =>
        item.service.id === serviceId
          ? {
              ...item,
              quantity,
            }
          : item
      )
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
    if (checkingOut) return;

    if (!selectedMemberId) {
      alert("请选择会员");
      return;
    }

    if (!selectedVehicleId) {
      alert("请选择车辆");
      return;
    }

    if (cart.length === 0) {
      alert("请加入服务到购物车");
      return;
    }

    setCheckingOut(true);

    const orderNo = `GTB-${Date.now()}`;

    try {
      const { data: order, error: orderError } =
        await supabase
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
              discount: safeDiscount,
              total,
              payment_method: paymentMethod,
              payment_status: "paid",
              status: "completed",
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

      const orderItems = cart.map(
        (item) => ({
          order_id: order.id,
          service_id: item.service.id,
          product_id: null,
          quantity: item.quantity,
          unit_price: Number(
            item.service.price
          ),
          discount: 0,
          total:
            Number(item.service.price) *
            item.quantity,
        })
      );

      const { error: itemError } =
        await supabase
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

  return (
    <div>
      <div style={pageHeader}>
        <div>
          <h1 style={pageTitle}>
            POS 收银 / Point of Sale
          </h1>

          <p style={pageDescription}>
            选择客户、车辆和服务，然后完成收款
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
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
            categories={categories}
            onSearchChange={setSearch}
            onCategoryChange={setCategory}
          />

          {loading ? (
            <div style={emptyState}>
              正在载入服务项目...
            </div>
          ) : filteredServices.length === 0 ? (
            <div style={emptyState}>
              没有找到符合条件的服务
            </div>
          ) : (
            <div style={serviceGrid}>
              {filteredServices.map(
                (service) => {
                  const cartItem =
                    cart.find(
                      (item) =>
                        item.service.id ===
                        service.id
                    );

                  return (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      quantity={
                        cartItem?.quantity || 0
                      }
                      onClick={() =>
                        addToCart(service)
                      }
                    />
                  );
                }
              )}
            </div>
          )}
        </section>

        <ShoppingCart
          cart={cart}
          discount={safeDiscount}
          paymentMethod={paymentMethod}
          subtotal={subtotal}
          total={total}
          onDiscountChange={updateDiscount}
          onPaymentMethodChange={
            setPaymentMethod
          }
          onUpdateQuantity={updateQuantity}
          onRemove={removeFromCart}
          onCheckout={checkout}
        />
      </div>

      {checkingOut && (
        <div style={checkoutOverlay}>
          <div style={checkoutMessage}>
            正在建立订单，请稍候...
          </div>
        </div>
      )}
    </div>
  );
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
  border: "1px solid #d1d5db",
  borderRadius: 11,
  background: "#fff",
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
  background: "#fff",
  boxShadow:
    "0 10px 30px rgba(15,23,42,.08)",
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
  background: "#fff",
  color: "#111827",
  boxShadow:
    "0 20px 60px rgba(0,0,0,.2)",
  fontWeight: 800,
};

export default POS;