export type PaymentChannel = "wechat" | "alipay";
export type PaymentClient = "web" | "wechat" | "native";

export type PaymentStatus =
  | "created"
  | "paid"
  | "failed"
  | "closed"
  | "refunded";

export type PaymentCreateInput = {
  channel: PaymentChannel;
  client: PaymentClient;
  orderNo: string;
  amount: number;
  subject: string;
  returnUrl?: string;
  openid?: string;
  clientIp: string;
};

export type PaymentCreateResult = {
  orderNo: string;
  channel: PaymentChannel;
  payUrl?: string;
  payParams?: Record<string, string>;
  form?: string;
  qrCode?: string;
};

export type OrderRecord = {
  orderNo: string;
  amount: number;
  currency: "CNY";
  status: PaymentStatus;
  channel: PaymentChannel;
  providerTradeNo?: string;
  clientIp: string;
  createdAt: string;
  paidAt?: string;
};
