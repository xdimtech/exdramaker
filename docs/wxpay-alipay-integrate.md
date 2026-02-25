# 微信/支付宝 Web 支付接入方案（直连）

适用场景：大陆主体、C 端用户、Web 场景、人民币结算。

## 目标与原则

- 前端不持有任何密钥，仅负责发起与跳转。
- 后端统一下单、验签回调、退款、对账。
- 统一订单模型与支付网关层，便于扩展更多渠道。

## 总体架构

- 前端：`excalidraw-app`（React + Vite + TS）。
- 后端：`payment-service`（已在仓库内提供 Node/TS + Express 服务骨架）。
- 数据库：`payment-service` 默认使用 SQLite 存订单与支付流水。
- 支付渠道：微信支付（v3）+ 支付宝（WAP）。

## 仓库落地路径

- 服务目录：`payment-service`。
- 配置文件：`payment-service/.env.example`。
- 入口文件：`payment-service/src/index.ts`。
- 路由文件：`payment-service/src/routes/payments.ts`。

## 支付场景路由（Web）

- 微信内置浏览器：JSAPI（需要 `openid`）。
- 非微信浏览器：H5 支付（mweb_url 跳转）。
- Web 扫码支付：微信 Native + 支付宝预下单（返回 `qrCode`）。
- 支付宝：WAP 支付（表单跳转）。

## 核心流程

1. 前端创建业务订单。
2. 前端调用后端创建支付单。
3. 后端调用微信/支付宝下单，返回支付参数。
4. 前端跳转或唤起支付。
5. 支付平台回调 `notify_url`。
6. 后端验签、更新订单状态。
7. 前端轮询/查询支付结果。

## API 设计（建议）

### `POST /api/payments/create`

- 入参：
  - `channel`: `wechat` | `alipay`
  - `client`: `web` | `wechat` | `native`
  - `order_no`: 业务订单号
  - `amount`: 金额（分）
  - `subject`: 商品标题
  - `return_url`: 支付完成后的返回页
- 出参：
  - `pay_url`（微信 H5）
  - `pay_params`（微信 JSAPI）
  - `form`（支付宝 WAP 表单）
  - `qrCode`（扫码支付二维码内容）

### `POST /api/payments/notify/wechat`

- 微信支付异步通知回调。

### `POST /api/payments/notify/alipay`

- 支付宝异步通知回调。

### `GET /api/payments/{order_no}`

- 查询支付状态，用于前端轮询。

### `POST /api/payments/refund`（可选）

- 退款、部分退款。

## 数据模型（最小集）

- `order_no`
- `amount`
- `currency`（CNY）
- `status`（created/paid/failed/closed/refunded）
- `channel`（wechat/alipay）
- `provider_trade_no`
- `client_ip`
- `paid_at`
- `created_at`
- `extra`

## 微信支付（v3）落地要点

- H5 下单接口：`/v3/pay/transactions/h5`。
- JSAPI 下单接口：`/v3/pay/transactions/jsapi`（需 `openid`）。
- 回调验签：`Wechatpay-Signature` + 平台证书。
- 必填配置：
  - `WECHAT_MCH_ID`
  - `WECHAT_APP_ID`
  - `WECHAT_API_V3_KEY`
  - `WECHAT_MCH_PRIVATE_KEY`
  - `WECHAT_MCH_CERT_SERIAL`

## 支付宝 WAP 落地要点

- 接口：`alipay.trade.wap.pay`。
- 回调验签：RSA2（使用 `ALIPAY_PUBLIC_KEY`）。
- 返回自动提交表单 HTML，前端渲染即可跳转。
- 必填配置：
  - `ALIPAY_APP_ID`
  - `ALIPAY_PRIVATE_KEY`
  - `ALIPAY_PUBLIC_KEY`

## 前端接入（React + Vite）

- 调用 `POST /api/payments/create`。
- 配置 `VITE_APP_PAYMENT_API_BASE` 指向 `payment-service`（可为空表示同域）。
- 微信 H5：`window.location.href = pay_url`。
- 微信 JSAPI：后端返回 `prepay_id` 和签名参数，前端调用 `WeixinJSBridge.invoke`。
- 支付宝：后端返回 `form` HTML，前端插入 DOM 并自动提交。
- 扫码支付：后端返回 `qrCode`，前端生成二维码展示。
- 扫码支付建议轮询 `GET /api/payments/{order_no}` 并提示完成。
- 支付完成后轮询 `GET /api/payments/{order_no}`。

## 安全与稳定性

- 回调验签必做，严格校验金额、订单号、签名。
- 订单幂等：相同 `order_no` 重复回调必须安全。
- 回调失败重试：记录失败原因，支持人工补单。
- 支付状态回查：对异步通知异常或丢失进行兜底。

## 运行与部署清单

- 支付域名备案并在微信/支付宝后台配置。
- `notify_url` 必须 HTTPS 公网可访问。
- 生产证书与密钥只存后端环境变量。
- 预留日志与告警：支付失败率、回调错误率。

## 上线步骤建议

1. 申请并开通微信/支付宝商户号。
2. 申请/配置 API 证书、密钥。
3. 实现后端支付网关与回调处理。
4. 前端集成支付拉起逻辑。
5. 沙箱/测试环境联调。
6. 灰度上线与监控。
