import crypto from "node:crypto";

export const createWechatAuthorization = (options: {
  method: string;
  path: string;
  body: string;
  mchId: string;
  serialNo: string;
  privateKey: string;
}) => {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString("hex");
  const message = `${options.method}\n${options.path}\n${timestamp}\n${nonceStr}\n${options.body}\n`;
  const signature = crypto
    .sign("RSA-SHA256", Buffer.from(message), options.privateKey)
    .toString("base64");

  const authorization =
    `WECHATPAY2-SHA256-RSA2048 mchid="${options.mchId}",` +
    `nonce_str="${nonceStr}",timestamp="${timestamp}",` +
    `serial_no="${options.serialNo}",signature="${signature}"`;

  return { authorization, timestamp, nonceStr };
};

export const verifyWechatSignature = (options: {
  timestamp: string;
  nonce: string;
  signature: string;
  body: string;
  platformCert: string;
}) => {
  const message = `${options.timestamp}\n${options.nonce}\n${options.body}\n`;
  return crypto.verify(
    "RSA-SHA256",
    Buffer.from(message),
    options.platformCert,
    Buffer.from(options.signature, "base64"),
  );
};

export const decryptWechatResource = (options: {
  apiV3Key: string;
  ciphertext: string;
  nonce: string;
  associatedData?: string;
}) => {
  const key = Buffer.from(options.apiV3Key, "utf8");
  const data = Buffer.from(options.ciphertext, "base64");
  const authTag = data.subarray(data.length - 16);
  const ciphertext = data.subarray(0, data.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, options.nonce);
  if (options.associatedData) {
    decipher.setAAD(Buffer.from(options.associatedData));
  }
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
};

export const createWechatPayParams = (options: {
  appId: string;
  prepayId: string;
  privateKey: string;
}) => {
  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString("hex");
  const packageValue = `prepay_id=${options.prepayId}`;
  const message = `${options.appId}\n${timeStamp}\n${nonceStr}\n${packageValue}\n`;
  const paySign = crypto
    .sign("RSA-SHA256", Buffer.from(message), options.privateKey)
    .toString("base64");

  return {
    appId: options.appId,
    timeStamp,
    nonceStr,
    package: packageValue,
    signType: "RSA",
    paySign,
  };
};
