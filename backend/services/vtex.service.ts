import type {
  FetchVtexOptions,
  VtexOrder,
  VtexOrdersResponse,
} from "@/backend/types/vtex";

const DEFAULT_PER_PAGE = 100;
const MAX_PAGES = 30;

/** VTEX OMS rejects milliseconds in f_creationDate (expects …T00:00:00Z). */
function toVtexOmsIso(iso: string): string {
  return iso.replace(/\.\d{3}Z$/, "Z");
}

function centsToCurrency(value: number): number {
  return value / 100;
}

function normalizeOrderMonetaryValues(order: VtexOrder): VtexOrder {
  return {
    ...order,
    totalValue: centsToCurrency(order.totalValue),
    items: (order.items ?? []).map((item) => ({
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

function buildOrdersQuery(options: FetchVtexOptions & { page: number; perPage: number }): string {
  const params = new URLSearchParams();

  // VTEX omits line items when _items is absent; analysis requires them.
  params.set("_items", "1");
  params.set("orderBy", "creationDate,desc");
  params.set("page", String(options.page));
  params.set("per_page", String(options.perPage));

  if (options.startDate && options.endDate) {
    const startDate = toVtexOmsIso(options.startDate);
    const endDate = toVtexOmsIso(options.endDate);
    params.set(
      "f_creationDate",
      `creationDate:[${startDate} TO ${endDate}]`,
    );
  }

  return `?${params.toString()}`;
}

async function fetchOrdersPage(
  options: FetchVtexOptions & { page: number; perPage: number },
): Promise<VtexOrdersResponse> {
  const { baseUrl, appKey, appToken } = getVtexConfig();
  const query = buildOrdersQuery(options);
  const response = await fetch(`${baseUrl}api/oms/pvt/orders${query}`, {
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

  return (await response.json()) as VtexOrdersResponse;
}

export async function fetchVtexOrders(
  options?: FetchVtexOptions,
): Promise<VtexOrder[]> {
  const hasDateFilter = Boolean(options?.startDate && options?.endDate);
  const perPage = options?.perPage ?? DEFAULT_PER_PAGE;
  const startPage = options?.page ?? 1;
  const fetchAllPages = hasDateFilter && options?.page == null;

  const allOrders: VtexOrder[] = [];
  let page = startPage;

  do {
    const json = await fetchOrdersPage({
      ...options,
      page,
      perPage,
    });

    const batch = (json.list ?? []).map(normalizeOrderMonetaryValues);
    allOrders.push(...batch);

    if (!fetchAllPages) {
      break;
    }

    const totalPages = json.paging?.pages ?? 1;
    if (page >= totalPages || batch.length < perPage) {
      break;
    }

    page += 1;
  } while (page <= MAX_PAGES);

  if (allOrders.length === 0) {
    throw new Error("Nenhum pedido encontrado.");
  }

  return allOrders;
}
