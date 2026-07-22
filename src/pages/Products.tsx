import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";
import useCurrency from "../hooks/useCurrency";

import InventoryAdjustModal, {
  type InventoryProduct,
} from "../components/InventoryAdjustModal";

import {
  InventoryService,
  type InventoryAction,
  type InventoryAdjustmentResult,
  type InventoryMovement,
} from "../services/inventoryService";

interface Product extends InventoryProduct {
  category: string | null;
  brand: string | null;

  cost_price: number | null;
  selling_price: number | null;

  barcode: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

type StockFilter =
  | "all"
  | "normal"
  | "low"
  | "out";

interface AdjustmentModalState {
  open: boolean;
  product: Product | null;
  action: InventoryAction;
}

const initialAdjustmentModal: AdjustmentModalState = {
  open: false,
  product: null,
  action: "increase",
};

export default function Products() {
  const {
    formatMoney: formatDisplayMoney,
    displayCurrency,
    accountingCurrency,
  } = useCurrency();

  const [products, setProducts] = useState<Product[]>(
    []
  );

  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] =
    useState("");

  const [categoryFilter, setCategoryFilter] =
    useState("all");

  const [stockFilter, setStockFilter] =
    useState<StockFilter>("all");

  const [adjustmentModal, setAdjustmentModal] =
    useState<AdjustmentModalState>(
      initialAdjustmentModal
    );

  const [successMessage, setSuccessMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [historyOpen, setHistoryOpen] =
    useState(false);

  const [historyProduct, setHistoryProduct] =
    useState<Product | null>(null);

  const [movements, setMovements] = useState<
    InventoryMovement[]
  >([]);

  const [historyLoading, setHistoryLoading] =
    useState(false);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("products")
        .select(
          `
            id,
            sku,
            product_name,
            category,
            brand,
            cost_price,
            selling_price,
            stock_qty,
            min_stock,
            unit,
            barcode,
            is_active,
            created_at
          `
        )
        .order("product_name", {
          ascending: true,
        });

      if (error) {
        throw error;
      }

      setProducts((data ?? []) as Product[]);
    } catch (error) {
      console.error(
        "Load products failed:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "读取产品库存失败。"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const categories = useMemo(() => {
    const categorySet = new Set<string>();

    products.forEach((product) => {
      const category =
        product.category?.trim();

      if (category) {
        categorySet.add(category);
      }
    });

    return Array.from(categorySet).sort(
      (a, b) => a.localeCompare(b)
    );
  }, [products]);

  const filteredProducts = useMemo(() => {
    const keyword = searchText
      .trim()
      .toLowerCase();

    return products.filter((product) => {
      const stock = Number(
        product.stock_qty ?? 0
      );

      const minimumStock = Number(
        product.min_stock ?? 0
      );

      const isOutOfStock = stock <= 0;

      const isLowStock =
        stock > 0 &&
        minimumStock > 0 &&
        stock <= minimumStock;

      const isNormalStock =
        stock > 0 && !isLowStock;

      const matchesSearch =
        !keyword ||
        product.product_name
          .toLowerCase()
          .includes(keyword) ||
        (product.sku ?? "")
          .toLowerCase()
          .includes(keyword) ||
        (product.category ?? "")
          .toLowerCase()
          .includes(keyword) ||
        (product.brand ?? "")
          .toLowerCase()
          .includes(keyword) ||
        (product.barcode ?? "")
          .toLowerCase()
          .includes(keyword);

      const matchesCategory =
        categoryFilter === "all" ||
        product.category === categoryFilter;

      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "out" &&
          isOutOfStock) ||
        (stockFilter === "low" &&
          isLowStock) ||
        (stockFilter === "normal" &&
          isNormalStock);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStock
      );
    });
  }, [
    products,
    searchText,
    categoryFilter,
    stockFilter,
  ]);

  const statistics = useMemo(() => {
    let normalStock = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let totalQuantity = 0;
    let stockCostValue = 0;
    let stockSellingValue = 0;
    let potentialProfitValue = 0;

    products.forEach((product) => {
      const stock = Number(
        product.stock_qty ?? 0
      );

      const minimumStock = Number(
        product.min_stock ?? 0
      );

      const costPrice = Number(
        product.cost_price ?? 0
      );

      const sellingPrice = Number(
        product.selling_price ?? 0
      );

      const safeStock = Number.isFinite(stock)
        ? stock
        : 0;

      const safeCostPrice = Number.isFinite(costPrice)
        ? costPrice
        : 0;

      const safeSellingPrice = Number.isFinite(
        sellingPrice
      )
        ? sellingPrice
        : 0;

      totalQuantity += safeStock;
      stockCostValue +=
        safeStock * safeCostPrice;
      stockSellingValue +=
        safeStock * safeSellingPrice;
      potentialProfitValue +=
        safeStock *
        (safeSellingPrice - safeCostPrice);

      if (stock <= 0) {
        outOfStock += 1;
      } else if (
        minimumStock > 0 &&
        stock <= minimumStock
      ) {
        lowStock += 1;
      } else {
        normalStock += 1;
      }
    });

    return {
      totalProducts: products.length,
      normalStock,
      lowStock,
      outOfStock,
      totalQuantity,
      stockCostValue,
      stockSellingValue,
      potentialProfitValue,
    };
  }, [products]);

  function openAdjustment(
    product: Product,
    action: InventoryAction
  ) {
    setSuccessMessage("");
    setErrorMessage("");

    setAdjustmentModal({
      open: true,
      product,
      action,
    });
  }

  function closeAdjustment() {
    setAdjustmentModal(
      initialAdjustmentModal
    );
  }

  async function handleAdjustmentSuccess(
    result: InventoryAdjustmentResult
  ) {
    closeAdjustment();

    setSuccessMessage(
      result.message ||
        `${result.product_name} 库存调整成功：${result.stock_before} → ${result.stock_after}`
    );

    await loadProducts();

    if (
      historyOpen &&
      historyProduct?.id ===
        result.product_id
    ) {
      await loadProductMovements(
        result.product_id
      );
    }
  }

  async function loadProductMovements(
    productId: number
  ) {
    try {
      setHistoryLoading(true);

      const result =
        await InventoryService.getMovements(
          productId
        );

      setMovements(result);
    } catch (error) {
      console.error(
        "Load inventory movements failed:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "读取库存流水失败。"
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  async function openHistory(
    product: Product
  ) {
    setHistoryProduct(product);
    setHistoryOpen(true);
    setMovements([]);
    setErrorMessage("");

    await loadProductMovements(product.id);
  }

  function closeHistory() {
    setHistoryOpen(false);
    setHistoryProduct(null);
    setMovements([]);
  }

  function getStockStatus(product: Product) {
    const stock = Number(
      product.stock_qty ?? 0
    );

    const minimumStock = Number(
      product.min_stock ?? 0
    );

    if (stock <= 0) {
      return {
        label: "缺货",
        className: "inventory-status-out",
      };
    }

    if (
      minimumStock > 0 &&
      stock <= minimumStock
    ) {
      return {
        label: "低库存",
        className: "inventory-status-low",
      };
    }

    return {
      label: "库存正常",
      className: "inventory-status-normal",
    };
  }

  function formatMoney(
    value: number | string | null | undefined
  ) {
    const numberValue = Number(value ?? 0);

    return formatDisplayMoney(
      Number.isFinite(numberValue)
        ? numberValue
        : 0
    );
  }

  function formatDate(
    value: string | null | undefined
  ) {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(
      "zh-CN",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(date);
  }

  function getMovementLabel(
    movement: InventoryMovement
  ) {
    const movementType =
      movement.movement_type
        ?.trim()
        .toLowerCase();

    if (
      movementType === "increase" ||
      movementType === "in"
    ) {
      return "产品入库";
    }

    if (
      movementType === "decrease" ||
      movementType === "out"
    ) {
      return "产品出库";
    }

    if (movementType === "set") {
      return "盘点修正";
    }

    if (
      movementType === "sale" ||
      movementType === "pos_sale"
    ) {
      return "POS 销售";
    }

    if (movementType === "purchase") {
      return "采购入库";
    }

    return (
      movement.movement_type ||
      "库存变动"
    );
  }

  return (
    <>
      <style>{pageStyles}</style>

      <main className="inventory-page">
        <section className="inventory-header">
          <div>
            <div className="inventory-eyebrow">
              INVENTORY MANAGEMENT
            </div>

            <h1>
              产品库存 / Product Inventory
            </h1>

            <p>
              管理产品库存、入库、出库、盘点及库存流水
            </p>
          </div>

          <button
            type="button"
            className="inventory-refresh-button"
            onClick={loadProducts}
            disabled={loading}
          >
            {loading
              ? "正在刷新..."
              : "↻ 刷新数据"}
          </button>
        </section>

        <section className="inventory-currency-panel">
          <div>
            <span>当前显示货币</span>
            <strong>{displayCurrency}</strong>
          </div>

          <div>
            <span>账本基础货币</span>
            <strong>{accountingCurrency}</strong>
          </div>

          <p>
            页面金额会自动换算为 {displayCurrency}；
            产品成本价、销售价和库存记录仍以
            {" "}
            {accountingCurrency} 保存。
          </p>
        </section>

        {successMessage && (
          <div className="inventory-alert inventory-alert-success">
            <span>✓</span>

            <div>{successMessage}</div>

            <button
              type="button"
              onClick={() =>
                setSuccessMessage("")
              }
            >
              ×
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="inventory-alert inventory-alert-error">
            <span>⚠</span>

            <div>{errorMessage}</div>

            <button
              type="button"
              onClick={() =>
                setErrorMessage("")
              }
            >
              ×
            </button>
          </div>
        )}

        <section className="inventory-stat-grid">
          <button
            type="button"
            className={`inventory-stat-card ${
              stockFilter === "all"
                ? "inventory-stat-card-active"
                : ""
            }`}
            onClick={() =>
              setStockFilter("all")
            }
          >
            <span>全部产品</span>

            <strong>
              {statistics.totalProducts}
            </strong>

            <small>
              当前库存数量：
              {statistics.totalQuantity}
            </small>
          </button>

          <button
            type="button"
            className={`inventory-stat-card inventory-stat-normal ${
              stockFilter === "normal"
                ? "inventory-stat-card-active"
                : ""
            }`}
            onClick={() =>
              setStockFilter("normal")
            }
          >
            <span>库存正常</span>

            <strong>
              {statistics.normalStock}
            </strong>

            <small>库存高于警戒线</small>
          </button>

          <button
            type="button"
            className={`inventory-stat-card inventory-stat-low ${
              stockFilter === "low"
                ? "inventory-stat-card-active"
                : ""
            }`}
            onClick={() =>
              setStockFilter("low")
            }
          >
            <span>低库存警告</span>

            <strong>
              {statistics.lowStock}
            </strong>

            <small>已经达到最低库存</small>
          </button>

          <button
            type="button"
            className={`inventory-stat-card inventory-stat-out ${
              stockFilter === "out"
                ? "inventory-stat-card-active"
                : ""
            }`}
            onClick={() =>
              setStockFilter("out")
            }
          >
            <span>缺货产品</span>

            <strong>
              {statistics.outOfStock}
            </strong>

            <small>当前库存为零</small>
          </button>

          <div className="inventory-stat-card inventory-stat-value">
            <span>库存成本价值</span>

            <strong>
              {formatMoney(
                statistics.stockCostValue
              )}
            </strong>

            <small>
              按产品成本价计算 · {displayCurrency}
            </small>
          </div>

          <div className="inventory-stat-card inventory-stat-retail">
            <span>库存销售价值</span>

            <strong>
              {formatMoney(
                statistics.stockSellingValue
              )}
            </strong>

            <small>
              按当前产品销售价计算
            </small>
          </div>

          <div className="inventory-stat-card inventory-stat-profit">
            <span>预计库存毛利</span>

            <strong>
              {formatMoney(
                statistics.potentialProfitValue
              )}
            </strong>

            <small>
              销售价值 − 成本价值
            </small>
          </div>
        </section>

        <section className="inventory-toolbar">
          <div className="inventory-search">
            <span>⌕</span>

            <input
              type="text"
              value={searchText}
              onChange={(event) =>
                setSearchText(
                  event.target.value
                )
              }
              placeholder="搜索产品名称、SKU、品牌、分类或条码..."
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              全部分类
            </option>

            {categories.map((category) => (
              <option
                key={category}
                value={category}
              >
                {category}
              </option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(event) =>
              setStockFilter(
                event.target
                  .value as StockFilter
              )
            }
          >
            <option value="all">
              全部库存状态
            </option>

            <option value="normal">
              库存正常
            </option>

            <option value="low">
              低库存
            </option>

            <option value="out">
              已缺货
            </option>
          </select>
        </section>

        <section className="inventory-table-card">
          <div className="inventory-table-heading">
            <div>
              <h2>产品库存清单</h2>

              <p>
                当前显示：
                {filteredProducts.length} 个产品
              </p>
            </div>
          </div>

          <div className="inventory-table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>产品资料</th>
                  <th>分类 / 品牌</th>
                  <th>成本价 · {displayCurrency}</th>
                  <th>销售价 · {displayCurrency}</th>
                  <th>当前库存</th>
                  <th>最低库存</th>
                  <th>库存状态</th>
                  <th>操作</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td
                      colSpan={8}
                      className="inventory-empty"
                    >
                      正在读取产品库存...
                    </td>
                  </tr>
                )}

                {!loading &&
                  filteredProducts.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="inventory-empty"
                      >
                        <div className="inventory-empty-icon">
                          📦
                        </div>

                        <strong>
                          没有找到符合条件的产品
                        </strong>

                        <span>
                          请修改搜索内容或库存筛选条件
                        </span>
                      </td>
                    </tr>
                  )}

                {!loading &&
                  filteredProducts.map(
                    (product) => {
                      const status =
                        getStockStatus(
                          product
                        );

                      const stock = Number(
                        product.stock_qty ??
                          0
                      );

                      const minimumStock =
                        Number(
                          product.min_stock ??
                            0
                        );

                      const unit =
                        product.unit ||
                        "pcs";

                      return (
                        <tr key={product.id}>
                          <td>
                            <div className="inventory-product-cell">
                              <div className="inventory-product-icon">
                                🧴
                              </div>

                              <div>
                                <strong>
                                  {
                                    product.product_name
                                  }
                                </strong>

                                <span>
                                  SKU：
                                  {product.sku ||
                                    "暂无"}
                                </span>

                                {product.barcode && (
                                  <span>
                                    条码：
                                    {
                                      product.barcode
                                    }
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="inventory-category">
                              <strong>
                                {product.category ||
                                  "未分类"}
                              </strong>

                              <span>
                                {product.brand ||
                                  "暂无品牌"}
                              </span>
                            </div>
                          </td>

                          <td>
                            {formatMoney(
                              product.cost_price
                            )}
                          </td>

                          <td>
                            <strong className="inventory-selling-price">
                              {formatMoney(
                                product.selling_price
                              )}
                            </strong>
                          </td>

                          <td>
                            <strong className="inventory-stock-number">
                              {stock}
                            </strong>

                            <span className="inventory-stock-unit">
                              {unit}
                            </span>
                          </td>

                          <td>
                            {minimumStock}{" "}
                            {unit}
                          </td>

                          <td>
                            <span
                              className={`inventory-status ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </td>

                          <td>
                            <div className="inventory-actions">
                              <button
                                type="button"
                                className="inventory-action-increase"
                                onClick={() =>
                                  openAdjustment(
                                    product,
                                    "increase"
                                  )
                                }
                              >
                                + 入库
                              </button>

                              <button
                                type="button"
                                className="inventory-action-decrease"
                                onClick={() =>
                                  openAdjustment(
                                    product,
                                    "decrease"
                                  )
                                }
                                disabled={
                                  stock <= 0
                                }
                              >
                                − 出库
                              </button>

                              <button
                                type="button"
                                className="inventory-action-set"
                                onClick={() =>
                                  openAdjustment(
                                    product,
                                    "set"
                                  )
                                }
                              >
                                盘点
                              </button>

                              <button
                                type="button"
                                className="inventory-action-history"
                                onClick={() =>
                                  openHistory(
                                    product
                                  )
                                }
                              >
                                流水
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <InventoryAdjustModal
        open={adjustmentModal.open}
        product={
          adjustmentModal.product as InventoryProduct | null
        }
        action={adjustmentModal.action}
        onClose={closeAdjustment}
        onSuccess={
          handleAdjustmentSuccess
        }
      />

      {historyOpen && historyProduct && (
        <div
          className="inventory-history-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeHistory();
            }
          }}
        >
          <aside className="inventory-history-panel">
            <header className="inventory-history-header">
              <div>
                <span>
                  INVENTORY MOVEMENTS
                </span>

                <h2>库存流水</h2>

                <p>
                  {
                    historyProduct.product_name
                  }
                  · SKU：
                  {historyProduct.sku ||
                    "暂无"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeHistory}
              >
                ×
              </button>
            </header>

            <div className="inventory-history-current">
              <span>当前库存</span>

              <strong>
                {Number(
                  historyProduct.stock_qty ??
                    0
                )}{" "}
                {historyProduct.unit || "pcs"}
              </strong>
            </div>

            <div className="inventory-history-list">
              {historyLoading && (
                <div className="inventory-history-empty">
                  正在读取库存流水...
                </div>
              )}

              {!historyLoading &&
                movements.length === 0 && (
                  <div className="inventory-history-empty">
                    <div>📑</div>

                    <strong>
                      暂无库存流水
                    </strong>

                    <span>
                      入库、出库、盘点或销售后会显示记录
                    </span>
                  </div>
                )}

              {!historyLoading &&
                movements.map(
                  (movement) => {
                    const change = Number(
                      movement.quantity_change ??
                        0
                    );

                    return (
                      <article
                        key={movement.id}
                        className="inventory-history-item"
                      >
                        <div className="inventory-history-item-top">
                          <div>
                            <strong>
                              {getMovementLabel(
                                movement
                              )}
                            </strong>

                            <span>
                              {formatDate(
                                movement.created_at
                              )}
                            </span>
                          </div>

                          <span
                            className={
                              change >= 0
                                ? "inventory-change-positive"
                                : "inventory-change-negative"
                            }
                          >
                            {change > 0
                              ? "+"
                              : ""}
                            {change}
                          </span>
                        </div>

                        <div className="inventory-history-stock">
                          <span>
                            调整前：
                            {
                              movement.stock_before
                            }
                          </span>

                          <span>→</span>

                          <strong>
                            调整后：
                            {
                              movement.stock_after
                            }
                          </strong>
                        </div>

                        {movement.reason && (
                          <p>
                            原因：
                            {movement.reason}
                          </p>
                        )}

                        {movement.notes && (
                          <p>
                            备注：
                            {movement.notes}
                          </p>
                        )}
                      </article>
                    );
                  }
                )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

const pageStyles = `
  .inventory-page {
    min-height: 100vh;
    padding: 28px;
    background:
      radial-gradient(circle at top right, rgba(37, 99, 235, 0.08), transparent 32%),
      #f8fafc;
    color: #0f172a;
  }

  .inventory-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    margin-bottom: 24px;
  }

  .inventory-eyebrow {
    color: #2563eb;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.14em;
    margin-bottom: 8px;
  }

  .inventory-header h1 {
    margin: 0;
    font-size: 32px;
    line-height: 1.2;
  }

  .inventory-header p {
    margin: 8px 0 0;
    color: #64748b;
    font-size: 15px;
  }

  .inventory-refresh-button {
    min-width: 130px;
    height: 44px;
    padding: 0 18px;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    background: #ffffff;
    color: #0f172a;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
  }

  .inventory-refresh-button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .inventory-currency-panel {
    display: grid;
    grid-template-columns: auto auto minmax(260px, 1fr);
    align-items: center;
    gap: 14px;
    margin-bottom: 20px;
    padding: 14px 16px;
    border: 1px solid #bfdbfe;
    border-radius: 15px;
    background: linear-gradient(
      135deg,
      #eff6ff 0%,
      #ffffff 100%
    );
    box-shadow: 0 8px 24px rgba(37, 99, 235, 0.06);
  }

  .inventory-currency-panel > div {
    min-width: 128px;
    padding: 10px 13px;
    border: 1px solid #dbeafe;
    border-radius: 11px;
    background: #ffffff;
  }

  .inventory-currency-panel span {
    display: block;
    margin-bottom: 4px;
    color: #64748b;
    font-size: 10px;
    font-weight: 800;
  }

  .inventory-currency-panel strong {
    color: #1d4ed8;
    font-size: 16px;
  }

  .inventory-currency-panel p {
    margin: 0;
    color: #475569;
    font-size: 12px;
    line-height: 1.65;
  }

  .inventory-alert {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    margin-bottom: 20px;
    border-radius: 13px;
    font-size: 14px;
    line-height: 1.6;
  }

  .inventory-alert button {
    border: none;
    background: transparent;
    color: inherit;
    font-size: 20px;
    cursor: pointer;
  }

  .inventory-alert-success {
    border: 1px solid #86efac;
    background: #f0fdf4;
    color: #166534;
  }

  .inventory-alert-error {
    border: 1px solid #fecaca;
    background: #fef2f2;
    color: #b91c1c;
  }

  .inventory-stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }

  .inventory-stat-card {
    min-height: 132px;
    padding: 20px;
    text-align: left;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    background: #ffffff;
    color: #0f172a;
    cursor: pointer;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
    transition: transform 0.15s ease, border-color 0.15s ease;
  }

  .inventory-stat-card:hover {
    transform: translateY(-2px);
  }

  .inventory-stat-card-active {
    border-color: #2563eb;
    box-shadow: 0 10px 30px rgba(37, 99, 235, 0.12);
  }

  .inventory-stat-card span {
    display: block;
    color: #64748b;
    font-size: 13px;
    font-weight: 700;
  }

  .inventory-stat-card strong {
    display: block;
    margin: 10px 0 7px;
    font-size: 29px;
  }

  .inventory-stat-card small {
    color: #94a3b8;
    font-size: 12px;
  }

  .inventory-stat-normal strong {
    color: #16a34a;
  }

  .inventory-stat-low strong {
    color: #d97706;
  }

  .inventory-stat-out strong {
    color: #dc2626;
  }

  .inventory-stat-value {
    cursor: default;
  }

  .inventory-stat-value strong {
    color: #7c3aed;
    font-size: 23px;
  }

  .inventory-stat-retail {
    cursor: default;
  }

  .inventory-stat-retail strong {
    color: #2563eb;
    font-size: 23px;
  }

  .inventory-stat-profit {
    cursor: default;
  }

  .inventory-stat-profit strong {
    color: #15803d;
    font-size: 23px;
  }

  .inventory-toolbar {
    display: grid;
    grid-template-columns: minmax(280px, 1fr) 210px 210px;
    gap: 12px;
    padding: 16px;
    margin-bottom: 20px;
    border: 1px solid #e2e8f0;
    border-radius: 17px;
    background: #ffffff;
    box-shadow: 0 8px 25px rgba(15, 23, 42, 0.04);
  }

  .inventory-search {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 46px;
    padding: 0 14px;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    background: #ffffff;
  }

  .inventory-search span {
    color: #64748b;
    font-size: 21px;
  }

  .inventory-search input {
    width: 100%;
    border: none;
    outline: none;
    font-size: 14px;
    color: #0f172a;
  }

  .inventory-toolbar select {
    height: 46px;
    padding: 0 12px;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    background: #ffffff;
    color: #0f172a;
    font-size: 14px;
    outline: none;
  }

  .inventory-table-card {
    overflow: hidden;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    background: #ffffff;
    box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
  }

  .inventory-table-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 22px;
    border-bottom: 1px solid #e2e8f0;
  }

  .inventory-table-heading h2 {
    margin: 0;
    font-size: 20px;
  }

  .inventory-table-heading p {
    margin: 5px 0 0;
    color: #64748b;
    font-size: 13px;
  }

  .inventory-table-wrapper {
    width: 100%;
    overflow-x: auto;
  }

  .inventory-table {
    width: 100%;
    min-width: 1180px;
    border-collapse: collapse;
  }

  .inventory-table th {
    padding: 14px 16px;
    text-align: left;
    background: #f8fafc;
    color: #475569;
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
  }

  .inventory-table td {
    padding: 17px 16px;
    border-top: 1px solid #eef2f7;
    color: #334155;
    font-size: 13px;
    vertical-align: middle;
  }

  .inventory-table tbody tr:hover {
    background: #fafcff;
  }

  .inventory-product-cell {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 210px;
  }

  .inventory-product-icon {
    width: 44px;
    height: 44px;
    flex: 0 0 44px;
    display: grid;
    place-items: center;
    border-radius: 13px;
    background: #eff6ff;
    font-size: 22px;
  }

  .inventory-product-cell strong {
    display: block;
    color: #0f172a;
    font-size: 14px;
    margin-bottom: 5px;
  }

  .inventory-product-cell span {
    display: block;
    color: #94a3b8;
    font-size: 11px;
    line-height: 1.5;
  }

  .inventory-category strong {
    display: block;
    color: #334155;
    margin-bottom: 5px;
  }

  .inventory-category span {
    color: #94a3b8;
    font-size: 12px;
  }

  .inventory-selling-price {
    color: #0f172a;
    font-size: 14px;
  }

  .inventory-stock-number {
    color: #0f172a;
    font-size: 18px;
  }

  .inventory-stock-unit {
    margin-left: 5px;
    color: #94a3b8;
    font-size: 11px;
  }

  .inventory-status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 82px;
    padding: 7px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 800;
  }

  .inventory-status-normal {
    border: 1px solid #86efac;
    background: #dcfce7;
    color: #166534;
  }

  .inventory-status-low {
    border: 1px solid #fcd34d;
    background: #fef3c7;
    color: #92400e;
  }

  .inventory-status-out {
    border: 1px solid #fca5a5;
    background: #fee2e2;
    color: #b91c1c;
  }

  .inventory-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    min-width: 235px;
  }

  .inventory-actions button {
    height: 34px;
    padding: 0 11px;
    border-radius: 9px;
    font-size: 11px;
    font-weight: 800;
    cursor: pointer;
  }

  .inventory-actions button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .inventory-action-increase {
    border: 1px solid #86efac;
    background: #f0fdf4;
    color: #166534;
  }

  .inventory-action-decrease {
    border: 1px solid #fca5a5;
    background: #fff1f2;
    color: #b91c1c;
  }

  .inventory-action-set {
    border: 1px solid #93c5fd;
    background: #eff6ff;
    color: #1d4ed8;
  }

  .inventory-action-history {
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #334155;
  }

  .inventory-empty {
    height: 260px;
    text-align: center;
    color: #64748b;
  }

  .inventory-empty-icon {
    font-size: 42px;
    margin-bottom: 12px;
  }

  .inventory-empty strong,
  .inventory-empty span {
    display: block;
  }

  .inventory-empty span {
    margin-top: 7px;
    color: #94a3b8;
    font-size: 12px;
  }

  .inventory-history-overlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    justify-content: flex-end;
    background: rgba(15, 23, 42, 0.58);
    backdrop-filter: blur(3px);
  }

  .inventory-history-panel {
    width: min(520px, 100%);
    height: 100%;
    overflow-y: auto;
    background: #f8fafc;
    box-shadow: -24px 0 60px rgba(15, 23, 42, 0.25);
  }

  .inventory-history-header {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    justify-content: space-between;
    gap: 20px;
    padding: 24px;
    background: #0f172a;
    color: #ffffff;
  }

  .inventory-history-header span {
    color: #fbbf24;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.12em;
  }

  .inventory-history-header h2 {
    margin: 7px 0 4px;
    font-size: 24px;
  }

  .inventory-history-header p {
    margin: 0;
    color: #cbd5e1;
    font-size: 12px;
  }

  .inventory-history-header button {
    width: 38px;
    height: 38px;
    border: 1px solid #334155;
    border-radius: 10px;
    background: #1e293b;
    color: #ffffff;
    font-size: 22px;
    cursor: pointer;
  }

  .inventory-history-current {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 18px;
    padding: 17px;
    border: 1px solid #bfdbfe;
    border-radius: 14px;
    background: #eff6ff;
  }

  .inventory-history-current span {
    color: #475569;
    font-size: 13px;
  }

  .inventory-history-current strong {
    color: #1d4ed8;
    font-size: 21px;
  }

  .inventory-history-list {
    padding: 0 18px 24px;
  }

  .inventory-history-item {
    padding: 17px;
    margin-bottom: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 15px;
    background: #ffffff;
  }

  .inventory-history-item-top {
    display: flex;
    justify-content: space-between;
    gap: 15px;
  }

  .inventory-history-item-top strong {
    display: block;
    color: #0f172a;
    font-size: 14px;
    margin-bottom: 5px;
  }

  .inventory-history-item-top span {
    color: #94a3b8;
    font-size: 11px;
  }

  .inventory-history-item-top > span {
    font-size: 17px;
    font-weight: 900;
  }

  .inventory-change-positive {
    color: #16a34a !important;
  }

  .inventory-change-negative {
    color: #dc2626 !important;
  }

  .inventory-history-stock {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 11px;
    margin-top: 13px;
    border-radius: 10px;
    background: #f8fafc;
    color: #64748b;
    font-size: 12px;
  }

  .inventory-history-stock strong {
    color: #0f172a;
  }

  .inventory-history-item p {
    margin: 10px 0 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.6;
  }

  .inventory-history-empty {
    min-height: 250px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #64748b;
    text-align: center;
  }

  .inventory-history-empty div {
    font-size: 42px;
    margin-bottom: 12px;
  }

  .inventory-history-empty strong {
    color: #334155;
    margin-bottom: 7px;
  }

  .inventory-history-empty span {
    color: #94a3b8;
    font-size: 12px;
  }

  @media (max-width: 1300px) {
    .inventory-stat-grid {
      grid-template-columns: repeat(3, minmax(180px, 1fr));
    }
  }

  @media (max-width: 900px) {
    .inventory-page {
      padding: 18px;
    }

    .inventory-header {
      flex-direction: column;
    }

    .inventory-currency-panel {
      grid-template-columns: 1fr 1fr;
    }

    .inventory-currency-panel p {
      grid-column: 1 / -1;
    }

    .inventory-stat-grid {
      grid-template-columns: repeat(2, minmax(150px, 1fr));
    }

    .inventory-toolbar {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 560px) {
    .inventory-currency-panel {
      grid-template-columns: 1fr;
    }

    .inventory-currency-panel p {
      grid-column: auto;
    }

    .inventory-stat-grid {
      grid-template-columns: 1fr;
    }

    .inventory-header h1 {
      font-size: 26px;
    }
  }
`;