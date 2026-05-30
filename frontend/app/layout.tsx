import type { Metadata, Viewport } from "next";
import { Sora, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SessionInitializer } from "../components/auth/SessionInitializer";
import { HydrationSafe } from "../components/ui/HydrationSafe";

// Sora — Headlines / Display (weight 700)
const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["400", "500", "600", "700"],
});

// Inter — Body / UI text (weight 400/500)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
});

// JetBrains Mono — Password / key fields only
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Sphynx | ZK Password Manager",
  description: "Your passwords, locked away where only you can reach them. Zero-knowledge credential vault secured by blockchain cryptography.",
  keywords: ["blockchain", "zero-knowledge", "security", "ethereum", "web3", "password manager", "siwe", "eip-4361"],
  authors: [{ name: "Sphynx Security Labs" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <head>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const check = (node) => {
                  if (node.nodeType === 1) {
                    if (node.hasAttribute('bis_skin_checked')) node.removeAttribute('bis_skin_checked');
                    node.querySelectorAll('[bis_skin_checked]').forEach(el => el.removeAttribute('bis_skin_checked'));
                  }
                };
                const obs = new MutationObserver((muts) => {
                  for (let m of muts) {
                    if (m.type === 'childList') m.addedNodes.forEach(check);
                    if (m.type === 'attributes' && m.attributeName === 'bis_skin_checked') check(m.target);
                  }
                });
                obs.observe(document.documentElement, {
                  childList: true,
                  subtree: true,
                  attributes: true,
                  attributeFilter: ['bis_skin_checked']
                });
              })();
            `
          }}
        />
      </head>
      <body
        className="min-h-full flex flex-col bg-[#0A0806] text-[#F0E6D0] font-[family-name:var(--font-inter)] selection:bg-[#E8A020]/20 selection:text-[#F0E6D0]"
        suppressHydrationWarning
      >
        <SessionInitializer />
        <HydrationSafe>
          {children}
        </HydrationSafe>
      </body>
    </html>
  );
}
