// Luồng trạng thái đơn — file riêng, không import Prisma client, để dùng được ở cả
// Client Component (nút chuyển trạng thái) lẫn server (lib/orders.ts).
export type OrderStatusValue = "NEW" | "CONTACTED" | "CONFIRMED" | "DELIVERED" | "CANCELLED";

// DELIVERED và CANCELLED là trạng thái cuối.
const TRANSITIONS: Record<OrderStatusValue, OrderStatusValue[]> = {
  NEW: ["CONTACTED", "CONFIRMED", "CANCELLED"],
  CONTACTED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export const nextStatuses = (s: OrderStatusValue): OrderStatusValue[] => TRANSITIONS[s];
