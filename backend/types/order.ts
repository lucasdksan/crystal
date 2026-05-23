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

/** 9-dimensional feature vector used for clustering */
export type FeatureVector = [
  number, // totalValue
  number, // totalItems
  number, // totalQuantity
  number, // avgPrice
  number, // origin
  number, // paymentNames
  number, // hourOfDay
  number, // dayOfWeek
  number, // salesChannel
];
