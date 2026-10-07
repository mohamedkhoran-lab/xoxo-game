import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "XO Challenge — Tu peux pas gagner 😈",
  description: "Essaie de battre la machine au jeu XO. Spoiler : c'est impossible. Viens jouer si t'as le courage !",
  keywords: ["XO", "tic-tac-toe", "jeu", "challenge", "impossible"],
  openGraph: {
    title: "XO Challenge — Tu peux pas gagner 😈",
    description: "Essaie de battre la machine si tu oses !",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <div className="bg-blob bg-blob-1" />
        <div className="bg-blob bg-blob-2" />
        <div className="bg-blob bg-blob-3" />
        {children}
        <footer className="site-footer">
          réalisé par <span className="footer-name">amine</span> · 2026
        </footer>
      </body>
    </html>
  );
}
