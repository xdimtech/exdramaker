import { ensureAlipayConfig } from "../config";

import { signAlipayParams, verifyAlipaySign } from "../utils/alipayCrypto";

import type {
  PaymentCreateInput,
  PaymentCreateResult,
  PaymentStatus,
} from "../types";

const ALIPAY_GATEWAY = "https://openapi.alipay.com/gateway.do";

const formatTimestamp = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds(),
  )}`;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildAutoForm = (params: Record<string, string>) => {
  const inputs = Object.entries(params)
    .map(
      ([key, value]) =>
        `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(
          value,
        )}" />`,
    )
    .join("");
  return `<!DOCTYPE html><html><body><form id="alipay_submit" method="POST" action="${ALIPAY_GATEWAY}">${inputs}</form><script>document.getElementById('alipay_submit').submit();</script></body></html>`;
};

const buildAlipayParams = (
  input: PaymentCreateInput,
  method: string,
  bizContent: Record<string, string>,
) => {
  const { appId, notifyBaseUrl } = ensureAlipayConfig();
  const notifyUrl = `${notifyBaseUrl}/api/payments/notify/alipay`;

  const params: Record<string, string> = {
    app_id: appId,
    method,
    format: "JSON",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: formatTimestamp(new Date()),
    version: "1.0",
    notify_url: notifyUrl,
    biz_content: JSON.stringify(bizContent),
  };

  if (input.returnUrl) {
    params.return_url = input.returnUrl;
  }

  return params;
};

const requestAlipay = async (params: Record<string, string>) => {
  const { privateKey } = ensureAlipayConfig();
  const sign = signAlipayParams(params, privateKey);
  const body = new URLSearchParams({ ...params, sign }).toString();

  const response = await fetch(ALIPAY_GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Alipay request failed: ${response.status} ${text}`);
  }

  const data = JSON.parse(text) as Record<string, any>;
  const responseKey = `${params.method.replace(/\./g, "_")}_response`;
  const payload = data[responseKey];

  if (!payload) {
    throw new Error("Alipay response missing");
  }

  if (payload.code !== "10000") {
    throw new Error(payload.sub_msg || payload.msg || "Alipay request failed");
  }

  return payload as Record<string, string>;
};

export const createAlipayPayment = async (
  input: PaymentCreateInput,
): Promise<PaymentCreateResult> => {
  const totalAmount = (input.amount / 100).toFixed(2);

  if (input.client === "native") {
    const params = buildAlipayParams(input, "alipay.trade.precreate", {
      out_trade_no: input.orderNo,
      total_amount: totalAmount,
      subject: input.subject,
    });
    const payload = await requestAlipay(params);
    return {
      orderNo: input.orderNo,
      channel: "alipay",
      qrCode: payload.qr_code,
    };
  }

  const params = buildAlipayParams(input, "alipay.trade.wap.pay", {
    out_trade_no: input.orderNo,
    total_amount: totalAmount,
    subject: input.subject,
    product_code: "QUICK_WAP_WAY",
  });

  const { privateKey } = ensureAlipayConfig();
  const sign = signAlipayParams(params, privateKey);
  const form = buildAutoForm({ ...params, sign });

  return { orderNo: input.orderNo, channel: "alipay", form };
};

export const parseAlipayNotify = (payload: Record<string, string>) => {
  const { publicKey } = ensureAlipayConfig();
  const isValid = verifyAlipaySign(payload, publicKey);
  if (!isValid) {
    throw new Error("Alipay signature invalid");
  }

  const statusMap: Record<string, PaymentStatus> = {
    TRADE_SUCCESS: "paid",
    TRADE_FINISHED: "paid",
    TRADE_CLOSED: "closed",
  };

  return {
    orderNo: payload.out_trade_no,
    tradeNo: payload.trade_no,
    status: statusMap[payload.trade_status] ?? "failed",
  };
};
