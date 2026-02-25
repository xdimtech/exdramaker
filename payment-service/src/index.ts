import cors from "cors";
import express from "express";

import { config } from "./config";
import { createPaymentRouter } from "./routes/payments";

const app = express();
app.set("trust proxy", true);
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  }),
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/payments", createPaymentRouter());

app.listen(config.port, () => {
  process.stdout.write(`payment-service listening on ${config.port}\n`);
});
