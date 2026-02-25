import crypto from "node:crypto";

const buildSignContent = (params: Record<string, string>) =>
  Object.keys(params)
    .sort()
    .filter((key) => params[key] !== "" && params[key] !== undefined)
    .map((key) => `${key}=${params[key]}`)
    .join("&");

export const signAlipayParams = (
  params: Record<string, string>,
  privateKey: string,
) => {
  const content = buildSignContent(params);
  return crypto
    .sign("RSA-SHA256", Buffer.from(content), privateKey)
    .toString("base64");
};

export const verifyAlipaySign = (
  params: Record<string, string>,
  publicKey: string,
) => {
  const { sign, sign_type: _signType, ...rest } = params;
  if (!sign) {
    return false;
  }
  const content = buildSignContent(rest);
  return crypto.verify(
    "RSA-SHA256",
    Buffer.from(content),
    publicKey,
    Buffer.from(sign, "base64"),
  );
};
