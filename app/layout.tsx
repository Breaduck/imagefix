import type { Metadata } from "next";
import "./globals.css";

// TODO: Pretendard 폰트 설정
// 아직 폰트 파일이 다운로드되지 않았으므로, 시스템 폰트를 임시로 사용합니다.
// 폰트 파일을 public/fonts/에 다운로드한 후 아래 코드의 주석을 해제하세요.
//
// import localFont from "next/font/local";
// const pretendard = localFont({
//   src: [
//     { path: "../public/fonts/Pretendard-Regular.woff2", weight: "400", style: "normal" },
//     { path: "../public/fonts/Pretendard-Medium.woff2", weight: "500", style: "normal" },
//     { path: "../public/fonts/Pretendard-SemiBold.woff2", weight: "600", style: "normal" },
//     { path: "../public/fonts/Pretendard-Bold.woff2", weight: "700", style: "normal" },
//   ],
//   variable: "--font-pretendard",
//   fallback: ["system-ui", "sans-serif"],
// });

export const metadata: Metadata = {
  title: "NotebookLM Text Editor",
  description: "Extract and edit text from NotebookLM PDF screenshots",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
