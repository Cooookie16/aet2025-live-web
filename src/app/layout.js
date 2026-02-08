import "./globals.css";

export const metadata = {
  title: "AET2026直播系統",
  description: "AET直播控制系統 開發By餅乾",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <body className={`AETLiveSystemByCookie`}>
        {children}
      </body>
    </html>
  );
};