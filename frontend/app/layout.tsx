import type { Metadata, Viewport } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import { SessionInitializer } from "../components/auth/SessionInitializer";
import { HydrationSafe } from "../components/ui/HydrationSafe";

// Configure Outfit Google Font for headlines and primary text
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700", "800"],
});

// Configure Inter Google Font for highly readable interface elements
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Sphynx | ZK Password Manager",
  description: "Next-generation zero-knowledge credential vault secured by EIP-4361 Sign-In with Ethereum cryptography. Your secrets never leave your device.",
  keywords: ["blockchain", "zero-knowledge", "security", "ethereum", "web3", "password manager", "siwe", "eip-4361"],
  authors: [{ name: "Sphynx Security Group" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${inter.variable} h-full antialiased dark`}
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
        className="min-h-full flex flex-col bg-[#0B0B0F] text-slate-100 font-sans selection:bg-purple-500/30 selection:text-white"
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
