export type PaymentChannel = "wechat" | "alipay";
export type PaymentClient = "web" | "wechat" | "native";
export type PaymentStatus =
  | "created"
  | "paid"
  | "failed"
  | "closed"
  | "refunded";

export type CreatePaymentInput = {
  channel: PaymentChannel;
  amount: number;
  subject: string;
  orderNo?: string;
  returnUrl?: string;
  client?: PaymentClient;
  openId?: string;
};

export type CreatePaymentResponse = {
  orderNo: string;
  channel: PaymentChannel;
  payUrl?: string;
  payParams?: Record<string, string>;
  form?: string;
  qrCode?: string;
};

export type PaymentOrder = {
  orderNo: string;
  status: PaymentStatus;
  paidAt?: string;
};

const normalizeBaseUrl = (value: string | undefined) =>
  (value ?? "").replace(/\/+$/, "");

const paymentBaseUrl = normalizeBaseUrl(
  import.meta.env.VITE_APP_PAYMENT_API_BASE,
);

export const generateOrderNo = () => {
  const timePart = Date.now();
  const randomPart =
    window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
  return `ORD-${timePart}-${randomPart}`;
};

export const isWechatBrowser = () =>
  /MicroMessenger/i.test(navigator.userAgent);

export const createPayment = async (
  input: CreatePaymentInput,
): Promise<CreatePaymentResponse> => {
  const orderNo = input.orderNo ?? generateOrderNo();
  const payload = {
    channel: input.channel,
    client: input.client ?? "web",
    order_no: orderNo,
    amount: input.amount,
    subject: input.subject,
    return_url: input.returnUrl,
    openid: input.openId,
  };

  const response = await fetch(`${paymentBaseUrl}/api/payments/create`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || "支付请求失败");
  }

  return JSON.parse(text) as CreatePaymentResponse;
};

export const getPaymentOrder = async (
  orderNo: string,
): Promise<PaymentOrder> => {
  const response = await fetch(`${paymentBaseUrl}/api/payments/${orderNo}`);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || "查询支付状态失败");
  }
  return JSON.parse(text) as PaymentOrder;
};

const submitAlipayForm = (formHtml: string) => {
  const container = document.createElement("div");
  container.innerHTML = formHtml;
  const form = container.querySelector("form");
  if (!form) {
    throw new Error("支付宝表单缺失");
  }
  document.body.appendChild(form);
  (form as HTMLFormElement).submit();
};

const invokeWechatPay = (params: Record<string, string>) =>
  new Promise<void>((resolve, reject) => {
    const runInvoke = () => {
      if (!window.WeixinJSBridge?.invoke) {
        reject(new Error("WeixinJSBridge 不可用"));
        return;
      }

      window.WeixinJSBridge.invoke(
        "getBrandWCPayRequest",
        params,
        (response: { err_msg?: string }) => {
          if (response.err_msg === "get_brand_wcpay_request:ok") {
            resolve();
            return;
          }
          reject(new Error(response.err_msg || "微信支付失败"));
        },
      );
    };

    if (window.WeixinJSBridge?.invoke) {
      runInvoke();
      return;
    }

    document.addEventListener("WeixinJSBridgeReady", runInvoke, false);
  });

export const startPayment = async (input: CreatePaymentInput) => {
  const result = await createPayment(input);

  if (result.qrCode) {
    return result;
  }

  if (result.payUrl) {
    window.location.href = result.payUrl;
    return result;
  }

  if (result.form) {
    submitAlipayForm(result.form);
    return result;
  }

  if (result.payParams) {
    await invokeWechatPay(result.payParams);
    return result;
  }

  throw new Error("支付返回缺少参数");
};
