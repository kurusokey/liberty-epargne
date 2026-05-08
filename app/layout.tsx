import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Liberty Épargne",
  description: "Suivi d'épargne — Objectif 10 000 € en 12 mois",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Liberty Epargne",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('theme');
                  if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        {user && <Header email={user.email ?? ""} />}
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{})}` }} />
              <a href="https://sampapaya.com" aria-label="Retour à sampapaya.com" style={{position:"fixed",top:10,right:10,zIndex:9999,background:"rgba(15,15,30,0.85)",color:"#F5A623",padding:"5px 12px",borderRadius:999,fontSize:11,fontFamily:"'JetBrains Mono',ui-monospace,monospace",fontWeight:500,textDecoration:"none",border:"1px solid rgba(245,166,35,0.3)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}}>← sampapaya</a>
      </body>
    </html>
  );
}
