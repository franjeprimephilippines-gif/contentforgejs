import "./globals.css";

export const metadata = {
  title: "ContentForge",
  description: "AI-powered content creation platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
