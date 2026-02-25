import db from "./db";

import type { OrderRecord, PaymentStatus } from "../types";

const mapRow = (row: any): OrderRecord => ({
  orderNo: row.order_no,
  amount: row.amount,
  currency: row.currency,
  status: row.status,
  channel: row.channel,
  providerTradeNo: row.provider_trade_no ?? undefined,
  clientIp: row.client_ip,
  createdAt: row.created_at,
  paidAt: row.paid_at ?? undefined,
});

class SqliteOrderStore {
  create(order: OrderRecord) {
    const stmt = db.prepare(
      `
        INSERT OR IGNORE INTO orders
          (order_no, amount, currency, status, channel, provider_trade_no, client_ip, created_at, paid_at)
        VALUES
          (@order_no, @amount, @currency, @status, @channel, @provider_trade_no, @client_ip, @created_at, @paid_at)
      `,
    );

    stmt.run({
      order_no: order.orderNo,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      channel: order.channel,
      provider_trade_no: order.providerTradeNo ?? null,
      client_ip: order.clientIp,
      created_at: order.createdAt,
      paid_at: order.paidAt ?? null,
    });
  }

  get(orderNo: string) {
    const row = db
      .prepare("SELECT * FROM orders WHERE order_no = ?")
      .get(orderNo);
    return row ? mapRow(row) : null;
  }

  update(orderNo: string, patch: Partial<OrderRecord>) {
    const columns: Array<{ column: string; key: string }> = [];
    const params: Record<string, unknown> = { order_no: orderNo };

    if (patch.amount !== undefined) {
      columns.push({ column: "amount", key: "amount" });
      params.amount = patch.amount;
    }
    if (patch.currency !== undefined) {
      columns.push({ column: "currency", key: "currency" });
      params.currency = patch.currency;
    }
    if (patch.status !== undefined) {
      columns.push({ column: "status", key: "status" });
      params.status = patch.status;
    }
    if (patch.channel !== undefined) {
      columns.push({ column: "channel", key: "channel" });
      params.channel = patch.channel;
    }
    if (patch.providerTradeNo !== undefined) {
      columns.push({ column: "provider_trade_no", key: "provider_trade_no" });
      params.provider_trade_no = patch.providerTradeNo ?? null;
    }
    if (patch.clientIp !== undefined) {
      columns.push({ column: "client_ip", key: "client_ip" });
      params.client_ip = patch.clientIp;
    }
    if (patch.createdAt !== undefined) {
      columns.push({ column: "created_at", key: "created_at" });
      params.created_at = patch.createdAt;
    }
    if (patch.paidAt !== undefined) {
      columns.push({ column: "paid_at", key: "paid_at" });
      params.paid_at = patch.paidAt ?? null;
    }

    if (columns.length === 0) {
      return this.get(orderNo);
    }

    const setClause = columns
      .map((item) => `${item.column} = @${item.key}`)
      .join(", ");
    db.prepare(`UPDATE orders SET ${setClause} WHERE order_no = @order_no`).run(
      params,
    );
    return this.get(orderNo);
  }

  updateStatus(
    orderNo: string,
    status: PaymentStatus,
    providerTradeNo?: string,
  ) {
    const patch: Partial<OrderRecord> = { status };
    if (providerTradeNo) {
      patch.providerTradeNo = providerTradeNo;
    }
    if (status === "paid") {
      patch.paidAt = new Date().toISOString();
    }
    return this.update(orderNo, patch);
  }
}

export const orderStore = new SqliteOrderStore();
