import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_ORIGIN ?? "http://localhost:3000"),
  title: { default: "InTandem · USC practice partners", template: "%s · InTandem" },
  description: "Find a USC peer for course study, technical practice, or career interviews.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "InTandem" },
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#8a2535" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a><header className="site-header"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true">in</span>InTandem<span className="brand-campus">USC</span></Link></header>{children}<footer className="site-footer">Built for learning together. Independent student project; not an official USC service.</footer></body></html>;
}
