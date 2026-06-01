export interface VtexOrderItem {
  quantity: number;
  price: number;
  sellingPrice: number;
  description: string;
  productId: string;
  seller: string;
}

export interface VtexOrder {
  orderId: string;
  clientName: string;
  creationDate: string;
  items: VtexOrderItem[];
  totalValue: number;
  totalItems: number;
  origin: string;
  paymentNames: string;
  status: string;
  salesChannel: string;
  workflowInErrorState: boolean;
  isAllDelivered: boolean;
}

export interface VtexOrdersResponse {
  list: VtexOrder[];
}

export interface FetchVtexOptions {
  page?: number;
  perPage?: number;
  startDate?: string;
  endDate?: string;
}
