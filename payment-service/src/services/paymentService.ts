import { orderStore } from "../store/orderStore";

import { createAlipayPayment } from "./alipay";
import { createWechatPayment } from "./wechat";

import type {
  PaymentCreateInput,
  PaymentCreateResult,
  PaymentStatus,
} from "../types";

export const createPayment = async (
  input: PaymentCreateInput,
): Promise<PaymentCreateResult> => {
  if (input.amount <= 0) {
    throw new Error("amount must be positive");
  }

  orderStore.create({
    orderNo: input.orderNo,
    amount: input.amount,
    currency: "CNY",
    status: "created",
    channel: input.channel,
    clientIp: input.clientIp,
    createdAt: new Date().toISOString(),
  });

  if (input.channel === "wechat") {
    return await createWechatPayment(input);
  }

  return await createAlipayPayment(input);
};

export const getOrder = (orderNo: string) => orderStore.get(orderNo);

export const updateOrderStatus = (
  orderNo: string,
  status: PaymentStatus,
  tradeNo?: string,
) => orderStore.updateStatus(orderNo, status, tradeNo);
