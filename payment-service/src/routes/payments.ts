import express, { Router } from "express";

import {
  createPayment,
  getOrder,
  updateOrderStatus,
} from "../services/paymentService";
import { parseAlipayNotify } from "../services/alipay";
import { parseWechatNotify } from "../services/wechat";

import type { Request } from "express";
import type {
  PaymentChannel,
  PaymentClient,
  PaymentCreateInput,
} from "../types";

const getClientIp = (req: Request) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0];
  }
  return req.socket.remoteAddress ?? "";
};

const normalizeAlipayPayload = (body: Record<string, unknown>) =>
  Object.entries(body).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === "string") {
      acc[key] = value;
    } else if (Array.isArray(value)) {
      acc[key] = value[0] ?? "";
    } else if (value === undefined || value === null) {
      acc[key] = "";
    } else {
      acc[key] = String(value);
    }
    return acc;
  }, {});

const parseCreateBody = (req: Request) => {
  const body = req.body as Partial<Record<string, unknown>>;
  const channel = body.channel as PaymentChannel | undefined;
  const client = body.client as PaymentClient | undefined;
  const orderNo = (body.order_no ?? body.orderNo) as string | undefined;
  const amount = Number(body.amount);
  const subject = body.subject as string | undefined;
  const returnUrl = (body.return_url ?? body.returnUrl) as string | undefined;
  const openid = (body.openid ?? body.openId) as string | undefined;

  if (!channel || !client || !orderNo || !subject || !Number.isFinite(amount)) {
    throw new Error("invalid create payload");
  }

  if (channel !== "wechat" && channel !== "alipay") {
    throw new Error("invalid create payload");
  }

  if (client !== "web" && client !== "wechat" && client !== "native") {
    throw new Error("invalid create payload");
  }

  return {
    channel,
    client,
    orderNo,
    amount,
    subject,
    returnUrl,
    openid,
    clientIp: getClientIp(req),
  } as PaymentCreateInput;
};

export const createPaymentRouter = () => {
  const router = Router();

  router.post("/create", express.json(), async (req, res) => {
    try {
      const input = parseCreateBody(req);
      const result = await createPayment(input);
      res.json(result);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "invalid request",
      });
    }
  });

  router.get("/:orderNo", (req, res) => {
    const order = getOrder(req.params.orderNo);
    if (!order) {
      res.status(404).json({ error: "order not found" });
      return;
    }
    res.json(order);
  });

  router.post(
    "/notify/wechat",
    express.raw({ type: "application/json" }),
    (req, res) => {
      try {
        const body = req.body.toString("utf8");
        const result = parseWechatNotify(body, req.headers);
        updateOrderStatus(result.orderNo, result.status, result.tradeNo);
        res.json({ code: "SUCCESS", message: "成功" });
      } catch (error) {
        res.status(401).json({ code: "FAIL", message: "验签失败" });
      }
    },
  );

  router.post(
    "/notify/alipay",
    express.urlencoded({ extended: false }),
    (req, res) => {
      try {
        const payload = normalizeAlipayPayload(
          req.body as Record<string, unknown>,
        );
        const result = parseAlipayNotify(payload);
        updateOrderStatus(result.orderNo, result.status, result.tradeNo);
        res.send("success");
      } catch (error) {
        res.status(401).send("fail");
      }
    },
  );

  return router;
};
