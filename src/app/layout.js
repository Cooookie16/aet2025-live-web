import "./globals.css";

export const metadata = {
  title: "AET2026 - 直播系統",
  description: "AET好用直播控制系統 -- Developed By Cookie --",
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
      <body>
        {children}
      </body>
    </html>
  );
};