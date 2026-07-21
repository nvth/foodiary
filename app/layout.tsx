import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const themeInitializer = `(() => {
  const storageKey = "foodblog-theme";
  let theme;
  try {
    const storedTheme = window.localStorage.getItem(storageKey);
    if (storedTheme === "light" || storedTheme === "dark") theme = storedTheme;
  } catch {}
  if (!theme) theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();`;

const title = "Ăn đâu hôm nay? — Nhật ký vị giác";
const description = "Những quán đã ghé, những món khiến mình nhớ và vài câu chuyện nhỏ quanh bàn ăn.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const rawHost = (requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000")
    .split(",")[0]
    .trim();
  const safeHost = /^[a-z0-9.-]+(?::\d+)?$/i.test(rawHost) ? rawHost : "localhost:3000";
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : safeHost.startsWith("localhost")
      ? "http"
      : "https";
  const metadataBase = new URL(`${protocol}://${safeHost}`);

  return {
    metadataBase,
    title,
    description,
    icons: { icon: "/frog-logo.png", shortcut: "/frog-logo.png" },
    openGraph: {
      type: "website",
      locale: "vi_VN",
      title,
      description,
      images: [{ url: "/og.png", width: 1731, height: 909, alt: "Ăn đâu hôm nay? — Đi ăn, rồi kể lại." }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializer }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
