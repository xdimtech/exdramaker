import dotenv from "dotenv";

dotenv.config();

const normalizeKey = (value?: string) =>
  value?.replace(/\\n/g, "\n").trim() ?? "";

export const config = {
  port: Number(process.env.PORT ?? "3300"),
  payBaseUrl: process.env.PAY_BASE_URL ?? "",
  notifyBaseUrl: process.env.NOTIFY_BASE_URL ?? "",
  corsOrigin: process.env.PAY_CORS_ORIGIN ?? "*",
  dbPath: process.env.PAYMENT_DB_PATH ?? "./payment.sqlite",
  wechat: {
    mchId: process.env.WECHAT_MCH_ID ?? "",
    appId: process.env.WECHAT_APP_ID ?? "",
    apiV3Key: process.env.WECHAT_API_V3_KEY ?? "",
    mchSerial: process.env.WECHAT_MCH_CERT_SERIAL ?? "",
    privateKey: normalizeKey(process.env.WECHAT_MCH_PRIVATE_KEY),
    platformCert: normalizeKey(process.env.WECHAT_PLATFORM_CERT_PUBLIC_KEY),
  },
  alipay: {
    appId: process.env.ALIPAY_APP_ID ?? "",
    privateKey: normalizeKey(process.env.ALIPAY_PRIVATE_KEY),
    publicKey: normalizeKey(process.env.ALIPAY_PUBLIC_KEY),
  },
};

export const ensureWechatConfig = () => {
  const { wechat, notifyBaseUrl } = config;
  if (
    !wechat.mchId ||
    !wechat.appId ||
    !wechat.apiV3Key ||
    !wechat.mchSerial ||
    !wechat.privateKey
  ) {
    throw new Error("Wechat config missing");
  }
  if (!notifyBaseUrl) {
    throw new Error("NOTIFY_BASE_URL missing");
  }
  return { ...wechat, notifyBaseUrl };
};

export const ensureWechatNotifyConfig = () => {
  const { wechat } = config;
  if (!wechat.apiV3Key || !wechat.platformCert) {
    throw new Error("Wechat notify config missing");
  }
  return wechat;
};

export const ensureAlipayConfig = () => {
  const { alipay, notifyBaseUrl } = config;
  if (!alipay.appId || !alipay.privateKey || !alipay.publicKey) {
    throw new Error("Alipay config missing");
  }
  if (!notifyBaseUrl) {
    throw new Error("NOTIFY_BASE_URL missing");
  }
  return { ...alipay, notifyBaseUrl };
};
