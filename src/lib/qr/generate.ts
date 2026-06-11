import { nanoid } from "nanoid";
import QRCode from "qrcode";

export function generateBadgeToken(): string {
  return nanoid(24);
}

export async function generateQRDataURL(badgeToken: string, appUrl: string): Promise<string> {
  const url = `${appUrl}/badge/${badgeToken}`;
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 300,
    color: { dark: "#070108", light: "#fdf0ee" },
  });
}
