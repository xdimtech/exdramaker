import Spinner from "@excalidraw/excalidraw/components/Spinner";
import { useEffect, useState } from "react";

type PaymentQRCodeProps = {
  value: string;
};

export const PaymentQRCode = ({ value }: PaymentQRCodeProps) => {
  const [svgData, setSvgData] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    import("../share/qrcode.chunk")
      .then(({ generateQRCodeSVG }) => {
        if (mounted) {
          try {
            setSvgData(generateQRCodeSVG(value));
          } catch {
            setError(true);
          }
        }
      })
      .catch(() => {
        if (mounted) {
          setError(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, [value]);

  if (error) {
    return null;
  }

  if (!svgData) {
    return (
      <div className="PaymentDialog__qrcode PaymentDialog__qrcode--loading">
        <Spinner />
      </div>
    );
  }

  return (
    <div
      className="PaymentDialog__qrcode"
      role="img"
      aria-label="QR code for payment"
      dangerouslySetInnerHTML={{ __html: svgData }}
    />
  );
};
