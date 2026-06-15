export interface ProcessedOrderItem {
  quantity: number;
  price: number;
  sellingPrice: number;
  description: string;
  productId: string;
  seller: string;
}

export interface ProcessedOrder {
  orderId: string;
  clientName: string;
  clientId: string;
  creationDate: string;
  items: ProcessedOrderItem[];
  totalValue: number;
  totalItems: number;
  origin: number;
  paymentNames: number;
  status: number;
  statusRaw: string;
  paymentRaw: string;
  originRaw: string;
  hourOfDay: number;
  dayOfWeek: number;
  salesChannel: number;
  salesChannelRaw: string;
  workflowInErrorState: number;
  isAllDelivered: number;
}

export type FeatureVector = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export interface MixedDataPoint {
  numeric: [number, number, number, number];
  categorical: {
    paymentMethod: string;
    origin: string;
    salesChannel: string;
    status: string;
    dayOfWeek: string;
  };
}

export const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"] as const;
