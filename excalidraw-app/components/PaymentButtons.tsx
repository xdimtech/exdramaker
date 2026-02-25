import React, { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@excalidraw/excalidraw/index";

import {
  generateOrderNo,
  getPaymentOrder,
  isWechatBrowser,
  startPayment,
} from "../payments/paymentClient";
import { PaymentDialog } from "../payments/PaymentDialog";

import type { PaymentChannel, PaymentStatus } from "../payments/paymentClient";

const DEFAULT_SUBJECT = "产品购买";
const DEFAULT_AMOUNT_YUAN = "1";

const STATUS_TEXT_MAP: Record<PaymentStatus, string> = {
  created: "请扫码完成支付",
  paid: "支付成功",
  failed: "支付失败",
  closed: "订单已关闭",
  refunded: "已退款",
};

const STATUS_ALERT_MAP: Record<PaymentStatus, string> = {
  created: "",
  paid: "支付成功",
  failed: "支付失败",
  closed: "订单已关闭",
  refunded: "已退款",
};

const TERMINAL_STATUSES: PaymentStatus[] = [
  "paid",
  "failed",
  "closed",
  "refunded",
];

export const PaymentButtons = () => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrTitle, setQrTitle] = useState("");
  const [orderNo, setOrderNo] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(
    null,
  );
  const notifiedStatusRef = useRef<PaymentStatus | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  const handleCloseDialog = useCallback(() => {
    setQrCode(null);
    setQrTitle("");
    setOrderNo(null);
    setPaymentStatus(null);
    notifiedStatusRef.current = null;
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!qrCode || !orderNo) {
      return;
    }

    let mounted = true;
    const poll = async () => {
      try {
        const order = await getPaymentOrder(orderNo);
        if (!mounted) {
          return;
        }
        setPaymentStatus(order.status);

        if (
          order.status !== "created" &&
          notifiedStatusRef.current !== order.status
        ) {
          notifiedStatusRef.current = order.status;
          const message = STATUS_ALERT_MAP[order.status];
          if (message) {
            window.alert(message);
          }
        }

        if (TERMINAL_STATUSES.includes(order.status)) {
          window.clearInterval(intervalId);
          if (!closeTimeoutRef.current) {
            closeTimeoutRef.current = window.setTimeout(() => {
              handleCloseDialog();
            }, 3000);
          }
        }
      } catch {}
    };

    const intervalId = window.setInterval(poll, 3000);
    poll();

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, [qrCode, orderNo, handleCloseDialog]);

  const handlePay = useCallback(
    async (channel: PaymentChannel, mode: "online" | "native" = "online") => {
      try {
        const amountInput = window.prompt(
          "请输入支付金额（元）",
          DEFAULT_AMOUNT_YUAN,
        );
        if (!amountInput) {
          return;
        }
        const amountYuan = Number(amountInput);
        if (!Number.isFinite(amountYuan) || amountYuan <= 0) {
          window.alert("金额无效");
          return;
        }

        const orderNo = generateOrderNo();
        let client: "web" | "wechat" | "native" = "web";

        if (mode === "native") {
          client = "native";
        } else if (channel === "wechat" && isWechatBrowser()) {
          client = "wechat";
        }

        let openId: string | undefined;

        if (client === "wechat") {
          openId =
            window.prompt("请输入微信 openid（JSAPI 必填）") ?? undefined;
          if (!openId) {
            window.alert("缺少 openid，无法在微信内发起支付");
            return;
          }
        }

        const result = await startPayment({
          channel,
          client,
          amount: Math.round(amountYuan * 100),
          subject: DEFAULT_SUBJECT,
          orderNo,
          returnUrl: window.location.href,
          openId,
        });

        if (result.qrCode) {
          setQrCode(result.qrCode);
          setQrTitle(channel === "wechat" ? "微信扫码支付" : "支付宝扫码支付");
          setOrderNo(orderNo);
          setPaymentStatus("created");
          notifiedStatusRef.current = null;
          if (closeTimeoutRef.current) {
            window.clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
          }
        }
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "支付失败");
      }
    },
    [],
  );

  const statusText = paymentStatus ? STATUS_TEXT_MAP[paymentStatus] : undefined;
  const statusTone = (() => {
    if (paymentStatus === "paid") {
      return "success";
    }
    if (paymentStatus === "failed" || paymentStatus === "closed") {
      return "error";
    }
    return "neutral";
  })();

  return (
    <>
      {qrCode && (
        <PaymentDialog
          title={qrTitle}
          qrCode={qrCode}
          statusText={statusText}
          statusTone={statusTone}
          onClose={handleCloseDialog}
        />
      )}
      <Button
        onSelect={() => void handlePay("wechat")}
        style={{ width: "auto" }}
      >
        微信支付
      </Button>
      <Button
        onSelect={() => void handlePay("wechat", "native")}
        style={{ width: "auto" }}
      >
        微信扫码
      </Button>
      <Button
        onSelect={() => void handlePay("alipay")}
        style={{ width: "auto" }}
      >
        支付宝支付
      </Button>
      <Button
        onSelect={() => void handlePay("alipay", "native")}
        style={{ width: "auto" }}
      >
        支付宝扫码
      </Button>
    </>
  );
};
