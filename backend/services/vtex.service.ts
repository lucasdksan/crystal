import type { VtexOrder, VtexOrdersResponse } from "@/backend/types/vtex";

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

  console.log("baseUrl", baseUrl);
  console.log("appKey", appKey);
  console.log("appToken", appToken);

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

  return json.list;
}
