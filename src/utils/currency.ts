export function formatCurrency(
  amount: number | string | null | undefined
) {
  const value = Number(amount || 0);

  return `￥${value.toFixed(2)}`;
}