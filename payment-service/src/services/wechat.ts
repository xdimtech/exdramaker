import { ensureWechatConfig, ensureWechatNotifyConfig } from "../config";

import {
  createWechatAuthorization,
  createWechatPayParams,
  decryptWechatResource,
  verifyWechatSignature,
} from "../utils/wechatCrypto";

import type {
  PaymentCreateInput,
  PaymentCreateResult,
  PaymentStatus,
} from "../types";

const WECHAT_BASE_URL = "https://api.mch.weixin.qq.com";

type WechatH5Response = { h5_url: string };
type WechatJsapiResponse = { prepay_id: string };
type WechatNativeResponse = { code_url: string };

type WechatNotifyResource = {
  ciphertext: string;
  nonce: string;
  associated_data?: string;
};

type WechatNotifyPayload = {
  resource: WechatNotifyResource;
};

type WechatTransaction = {
  out_trade_no: string;
  transaction_id: string;
  trade_state: string;
};

const requestWechat = async <T>(
  path: string,
  body: Record<string, unknown>,
) => {
  const { mchId, mchSerial, privateKey } = ensureWechatConfig();
  const bodyText = JSON.stringify(body);
  const { authorization } = createWechatAuthorization({
    method: "POST",
    path,
    body: bodyText,
    mchId,
    serialNo: mchSerial,
    privateKey,
  });

  const response = await fetch(`${WECHAT_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: bodyText,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Wechat request failed: ${response.status} ${text}`);
  }
  return JSON.parse(text) as T;
};

export const createWechatPayment = async (
  input: PaymentCreateInput,
): Promise<PaymentCreateResult> => {
  const wechatConfig = ensureWechatConfig();
  const { appId, mchId, notifyBaseUrl } = wechatConfig;
  const notifyUrl = `${notifyBaseUrl}/api/payments/notify/wechat`;

  if (input.client === "native") {
    const result = await requestWechat<WechatNativeResponse>(
      "/v3/pay/transactions/native",
      {
        appid: appId,
        mchid: mchId,
        description: input.subject,
        out_trade_no: input.orderNo,
        notify_url: notifyUrl,
        amount: { total: input.amount, currency: "CNY" },
      },
    );

    return {
      orderNo: input.orderNo,
      channel: "wechat",
      qrCode: result.code_url,
    };
  }

  if (input.client === "wechat") {
    if (!input.openid) {
      throw new Error("openid required for wechat JSAPI");
    }
    const result = await requestWechat<WechatJsapiResponse>(
      "/v3/pay/transactions/jsapi",
      {
        appid: appId,
        mchid: mchId,
        description: input.subject,
        out_trade_no: input.orderNo,
        notify_url: notifyUrl,
        amount: { total: input.amount, currency: "CNY" },
        payer: { openid: input.openid },
      },
    );

    const payParams = createWechatPayParams({
      appId,
      prepayId: result.prepay_id,
      privateKey: wechatConfig.privateKey,
    });

    return { orderNo: input.orderNo, channel: "wechat", payParams };
  }

  const result = await requestWechat<WechatH5Response>(
    "/v3/pay/transactions/h5",
    {
      appid: appId,
      mchid: mchId,
      description: input.subject,
      out_trade_no: input.orderNo,
      notify_url: notifyUrl,
      amount: { total: input.amount, currency: "CNY" },
      scene_info: {
        payer_client_ip: input.clientIp,
        h5_info: { type: "Wap" },
      },
    },
  );

  const payUrl = input.returnUrl
    ? `${result.h5_url}&redirect_url=${encodeURIComponent(input.returnUrl)}`
    : result.h5_url;

  return { orderNo: input.orderNo, channel: "wechat", payUrl };
};

export const parseWechatNotify = (
  body: string,
  headers: Record<string, string | string[] | undefined>,
) => {
  const { apiV3Key, platformCert } = ensureWechatNotifyConfig();
  const signature = headers["wechatpay-signature"];
  const timestamp = headers["wechatpay-timestamp"];
  const nonce = headers["wechatpay-nonce"];

  if (
    !signature ||
    !timestamp ||
    !nonce ||
    Array.isArray(signature) ||
    Array.isArray(timestamp) ||
    Array.isArray(nonce)
  ) {
    throw new Error("Wechat signature headers missing");
  }

  const isValid = verifyWechatSignature({
    signature,
    timestamp,
    nonce,
    body,
    platformCert,
  });

  if (!isValid) {
    throw new Error("Wechat signature invalid");
  }

  const payload = JSON.parse(body) as WechatNotifyPayload;
  const decrypted = decryptWechatResource({
    apiV3Key,
    ciphertext: payload.resource.ciphertext,
    nonce: payload.resource.nonce,
    associatedData: payload.resource.associated_data,
  });
  const transaction = JSON.parse(decrypted) as WechatTransaction;

  const statusMap: Record<string, PaymentStatus> = {
    SUCCESS: "paid",
    CLOSED: "closed",
    REVOKED: "failed",
    PAYERROR: "failed",
    NOTPAY: "created",
    USERPAYING: "created",
  };

  return {
    orderNo: transaction.out_trade_no,
    tradeNo: transaction.transaction_id,
    status: statusMap[transaction.trade_state] ?? "failed",
  };
};
