import { Dialog } from "@excalidraw/excalidraw/components/Dialog";
import { FilledButton } from "@excalidraw/excalidraw/components/FilledButton";
import React from "react";

import { PaymentQRCode } from "./PaymentQRCode";

import "./PaymentDialog.scss";

type PaymentDialogProps = {
  title: string;
  qrCode: string;
  statusText?: string;
  statusTone?: "success" | "error" | "neutral";
  onClose: () => void;
};

export const PaymentDialog = ({
  title,
  qrCode,
  statusText,
  statusTone = "neutral",
  onClose,
}: PaymentDialogProps) => {
  const statusClassName = `PaymentDialog__status PaymentDialog__status--${statusTone}`;

  return (
    <Dialog size="small" onCloseRequest={onClose} title={false}>
      <div className="PaymentDialog">
        <h3 className="PaymentDialog__title">{title}</h3>
        <PaymentQRCode value={qrCode} />
        {statusText && <div className={statusClassName}>{statusText}</div>}
        <div className="PaymentDialog__actions">
          <FilledButton size="large" label="关闭" onClick={onClose} />
        </div>
      </div>
    </Dialog>
  );
};
