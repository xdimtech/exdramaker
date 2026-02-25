# Payment Service

用于直连微信/支付宝的最小支付网关服务，适用于大陆主体 Web 支付场景。

## 运行

```bash
cp .env.example .env
yarn dev
```

## 入口

- `POST /api/payments/create`
- `POST /api/payments/notify/wechat`
- `POST /api/payments/notify/alipay`
- `GET /api/payments/:orderNo`

## 说明

- 订单存储使用 SQLite，默认路径 `PAYMENT_DB_PATH=./payment.sqlite`。
- 微信/支付宝证书与私钥只放在服务端环境变量。
