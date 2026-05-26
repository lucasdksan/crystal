import type { VtexOrder, VtexOrdersResponse } from "@/backend/types/vtex";

function centsToCurrency(value: number): number {
  return value / 100;
}

function normalizeOrderMonetaryValues(order: VtexOrder): VtexOrder {
  return {
    ...order,
    totalValue: centsToCurrency(order.totalValue),
    items: order.items.map((item) => ({
      ...item,
      price: centsToCurrency(item.price),
      sellingPrice: centsToCurrency(item.sellingPrice),
    })),
  };
}

function getVtexConfig() {
  const baseUrl = process.env.VTEX_BASE_URL;
  const appKey = process.env.VTEX_APP_KEY;
  const appToken = process.env.VTEX_APP_TOKEN;

  if (!baseUrl || !appKey || !appToken) {
    throw new Error(
      "Missing VTEX credentials. Set VTEX_BASE_URL, VTEX_APP_KEY and VTEX_APP_TOKEN in .env.local",
    );
  }

  return {
    baseUrl: baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
    appKey,
    appToken,
  };
}

export async function fetchVtexOrders(): Promise<VtexOrder[]> {
  const { baseUrl, appKey, appToken } = getVtexConfig();
  const response = await fetch(`${baseUrl}api/oms/pvt/orders?_items=1`, {
    headers: {
      "Content-Type": "application/json",
      "X-VTEX-API-AppKey": appKey,
      "X-VTEX-API-AppToken": appToken,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `VTEX API request failed: ${response.status} ${response.statusText}`,
    );
  }

  const json = (await response.json()) as VtexOrdersResponse;

  if (!json.list || json.list.length === 0) {
    throw new Error("Nenhum pedido encontrado.");
  }

  return json.list.map(normalizeOrderMonetaryValues);
}
