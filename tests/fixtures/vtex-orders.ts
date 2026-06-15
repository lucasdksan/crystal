import type { VtexOrder } from "@/backend/types/vtex";

function createOrder(
  overrides: Partial<VtexOrder> & Pick<VtexOrder, "orderId">,
): VtexOrder {
  return {
    clientName: "Cliente Teste",
    creationDate: "2025-01-15T14:30:00.000Z",
    items: [
      {
        quantity: 1,
        price: 10000,
        sellingPrice: 9000,
        description: "Produto A",
        productId: "prod-a",
        seller: "1",
      },
    ],
    totalValue: 9000,
    totalItems: 1,
    origin: "Marketplace",
    paymentNames: "Pix",
    status: "delivered",
    salesChannel: "1",
    workflowInErrorState: false,
    isAllDelivered: true,
    ...overrides,
  };
}

export const fixtureVtexOrdersRaw: VtexOrder[] = [
  createOrder({
    orderId: "order-001",
    creationDate: "2025-01-15T10:00:00.000Z",
    paymentNames: "Pix",
    status: "delivered",
    items: [
      {
        quantity: 2,
        price: 5000,
        sellingPrice: 4500,
        description: "Camiseta Premium",
        productId: "prod-shirt",
        seller: "1",
      },
    ],
    totalValue: 9000,
    totalItems: 1,
  }),
  createOrder({
    orderId: "order-002",
    creationDate: "2025-01-15T11:00:00.000Z",
    paymentNames: "Boleto Bancário",
    status: "canceled",
    items: [
      {
        quantity: 1,
        price: 8000,
        sellingPrice: 7500,
        description: "Camiseta Premium",
        productId: "prod-shirt",
        seller: "1",
      },
    ],
    totalValue: 7500,
    totalItems: 1,
  }),
  createOrder({
    orderId: "order-003",
    creationDate: "2025-01-16T09:00:00.000Z",
    paymentNames: "Boleto Bancário",
    status: "canceled",
    items: [
      {
        quantity: 1,
        price: 8000,
        sellingPrice: 7500,
        description: "Camiseta Premium",
        productId: "prod-shirt",
        seller: "1",
      },
    ],
    totalValue: 7500,
    totalItems: 1,
  }),
  createOrder({
    orderId: "order-004",
    creationDate: "2025-01-16T12:00:00.000Z",
    paymentNames: "Pix",
    status: "delivered",
    salesChannel: "2",
    items: [
      {
        quantity: 3,
        price: 3000,
        sellingPrice: 2800,
        description: "Meia Esportiva",
        productId: "prod-socks",
        seller: "1",
      },
    ],
    totalValue: 8400,
    totalItems: 1,
  }),
  createOrder({
    orderId: "order-005",
    creationDate: "2025-01-17T15:00:00.000Z",
    paymentNames: "Cartão de Crédito",
    status: "delivered",
    salesChannel: "2",
    items: [
      {
        quantity: 1,
        price: 12000,
        sellingPrice: 11000,
        description: "Boné Casual",
        productId: "prod-cap",
        seller: "1",
      },
    ],
    totalValue: 11000,
    totalItems: 1,
  }),
  createOrder({
    orderId: "order-006",
    creationDate: "2025-01-17T16:00:00.000Z",
    origin: "Desconhecido",
    paymentNames: "Forma Desconhecida",
    status: "status-invalido",
    items: [
      {
        quantity: 2,
        price: 4000,
        sellingPrice: 3500,
        description: "Chaveiro",
        productId: "prod-keychain",
        seller: "1",
      },
    ],
    totalValue: 7000,
    totalItems: 1,
  }),
  createOrder({
    orderId: "order-007",
    creationDate: "2025-01-18T08:00:00.000Z",
    paymentNames: "Pix",
    status: "delivered",
    workflowInErrorState: true,
    isAllDelivered: false,
    items: [
      {
        quantity: 1,
        price: 6000,
        sellingPrice: 5500,
        description: "Meia Esportiva",
        productId: "prod-socks",
        seller: "1",
      },
    ],
    totalValue: 5500,
    totalItems: 1,
  }),
  createOrder({
    orderId: "order-008",
    creationDate: "2025-01-18T20:00:00.000Z",
    paymentNames: "Boleto Bancário",
    status: "canceled",
    items: [
      {
        quantity: 1,
        price: 15000,
        sellingPrice: 14000,
        description: "Boné Casual",
        productId: "prod-cap",
        seller: "1",
      },
    ],
    totalValue: 14000,
    totalItems: 1,
  }),
];

export function fixtureVtexOrdersNormalized(): VtexOrder[] {
  return fixtureVtexOrdersRaw.map((order) => ({
    ...order,
    totalValue: order.totalValue / 100,
    items: (order.items ?? []).map((item) => ({
      ...item,
      price: item.price / 100,
      sellingPrice: item.sellingPrice / 100,
    })),
  }));
}
