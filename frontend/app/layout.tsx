import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sprite from "@/components/Sprite";
import { StoreProvider } from "@/lib/store";
import { Toast } from "@/components/ui";

export const metadata: Metadata = {
  title: "AgriAI Malawi",
  description: "Early-season maize harvest estimates for smallholder farmers in Malawi",
  appleWebApp: { capable: true, title: "AgriAI" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1B5E20",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Sprite />
        <StoreProvider>
          <div className="app">
            {children}
            <Toast />
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
