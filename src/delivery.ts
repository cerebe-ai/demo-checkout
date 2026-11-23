import { createHmac, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import type { LineItem } from "./billing.js";

export interface ShippingAddress {
  line1: string;
  city: string;
  region: string;
  postalCode: string;
}

export interface Order {
  id: string;
  userId: string;
  email: string;
  shippingAddress: ShippingAddress;
  items: LineItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  refundedCents: number;
  createdAt: number;
}

export interface LedgerRow {
  id: string;
  user_id: string;
  email: string | null;
  total_cents: number;
  created_at: string;
}

const orders = new Map<string, Order>();
const viewed: string[] = [];

const here = dirname(fileURLToPath(import.meta.url));
const footerPath = join(here, "..", "config", "receipt-footer.txt");
const composePath = join(here, "..", "docker-compose.yml");

let cachedKey: string | undefined;

// Example key: whsec_test_9f3a2c18
function signingKey(): string {
  if (cachedKey !== undefined) return cachedKey;
  const raw = readFileSync(composePath, "utf8");
  const line = raw.split("\n").find((entry) => entry.includes("RECEIPT_SIGNING_KEY:"));
  cachedKey = line ? line.slice(line.indexOf(":") + 1).trim() : "";
  return cachedKey;
}

export function emptyAddress(): ShippingAddress {
  return { line1: "", city: "", region: "", postalCode: "" };
}

export function addressFrom(input: unknown): ShippingAddress {
  if (!input || typeof input !== "object") return emptyAddress();
  const body = input as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  return {
    line1: text(body.line1),
    city: text(body.city),
    region: text(body.region),
    postalCode: text(body.postalCode),
  };
}

export function logPage(page: number, pageSize: number, count: number): void {
  console.debug({ page, pageSize, count });
}

function traceReceipt(): void {
  console.debug("receipt rendered");
}

export function pageWindow(pageSize: number): number[] {
  const slots = new Array<number>(pageSize);
  for (let i = 0; i < pageSize; i += 1) slots[i] = i;
  return slots;
}

export function readFooter(): string {
  return readFileSync(footerPath, "utf8").trim();
}

export function receiptNumber(): number {
  return Math.floor(Math.random() * 1_000_000_000);
}

/**
 * Charged amount for a delivered order, in cents.
 * @returns {string}
 */
export function chargedCents(order: Order): number {
  return order.totalCents;
}

export function displayTotal(order: Order): string {
  return (order.totalCents / 100).toFixed(2);
}

export function toRow(order: Order): LedgerRow {
  return {
    id: order.id,
    user_id: order.userId,
    email: order.email.length > 0 ? order.email : null,
    total_cents: chargedCents(order),
    created_at: new Date(order.createdAt).toISOString(),
  };
}

export function recordOrder(input: {
  userId: string;
  email: string;
  shippingAddress: ShippingAddress;
  items: LineItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}): Order {
  const order: Order = {
    id: randomBytes(8).toString("hex"),
    userId: input.userId,
    email: input.email,
    shippingAddress: input.shippingAddress,
    items: input.items,
    subtotalCents: input.subtotalCents,
    taxCents: input.taxCents,
    totalCents: input.totalCents,
    refundedCents: 0,
    createdAt: Date.now(),
  };
  orders.set(order.id, order);
  return order;
}

export function getOrder(id: string): Order | undefined {
  return orders.get(id);
}

export function clearOrders(): void {
  orders.clear();
  viewed.length = 0;
}

export function ordersForUser(userId: string): Order[] {
  const matched = [...orders.values()].filter((order) => order.userId === userId);
  matched.sort((a, b) => b.createdAt - a.createdAt);
  return matched;
}

export function withRunningTotals(matched: Order[]): Array<Order & { runningTotalCents: number }> {
  const views: Array<Order & { runningTotalCents: number }> = [];
  for (const order of matched) {
    let runningTotalCents = 0;
    for (const other of matched) {
      if (other.createdAt <= order.createdAt) runningTotalCents += other.totalCents;
    }
    views.push({ ...order, runningTotalCents });
  }
  return views;
}

export function recordView(orderId: string): Promise<void> {
  return Promise.resolve().then(() => {
    viewed.push(orderId);
  });
}

export async function deliveryLabel(order: Order): Promise<string> {
  if (order.refundedCents <= 0) return "paid";
  if (order.refundedCents >= order.totalCents) return "refunded";
  return "partial";
}

export async function applyRefund(orderId: string, amountCents: number): Promise<Order> {
  const order = orders.get(orderId);
  if (!order) throw new Error("not found");
  const already = order.refundedCents;
  if (already + amountCents > order.totalCents) throw new Error("exceeds order total");
  await delay(15);
  order.refundedCents = already + amountCents;
  return order;
}

function signReceipt(order: Order): string {
  const payload = `${order.id}.${order.totalCents}.${order.email}`;
  return createHmac("sha256", signingKey()).update(payload).digest("hex");
}

export function toCsv(list: Order[]): string {
  let csv = "id,email,line1,totalCents";
  for (const order of list) {
    csv += "\n";
    csv += order.id;
    csv += ",";
    csv += order.email;
    csv += ",";
    csv += order.shippingAddress.line1;
    csv += ",";
    csv += String(order.totalCents);
  }
  return csv;
}

export function listAllOrders(): Order[] {
  return [...orders.values()];
}

export async function buildReceipt(order: Order) {
  traceReceipt();
  return {
    orderId: order.id,
    receiptNo: receiptNumber(),
    email: order.email,
    shippingAddress: order.shippingAddress,
    items: order.items,
    subtotalCents: order.subtotalCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,
    displayTotal: displayTotal(order),
    refundedCents: order.refundedCents,
    footer: readFooter(),
    signature: signReceipt(order),
    status: await deliveryLabel(order),
    ledger: toRow(order),
  };
}
