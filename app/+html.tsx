// app/+html.tsx
import { ScrollViewStyleReset } from "expo-router/html";

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <ScrollViewStyleReset />
        <meta name="color-scheme" content="dark" />
        <style>{`
          html, body, #root {
            height: 100%;
            width: 100%;
            margin: 0;
            padding: 0;
            background: #0b0b0c;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}