// app/+html.tsx
import { ScrollViewStyleReset, useServerDocumentContext } from "expo-router/html";

export default function Root({ children }: { children: React.ReactNode }) {
  const { headNodes, bodyNodes } = useServerDocumentContext();

  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <ScrollViewStyleReset />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="color-scheme" content="dark" />
        <style>{`
          html, body, #root {
            height: 100%;
            width: 100%;
            margin: 0;
            padding: 0;
            max-width: 100%;
            overflow-x: hidden;
            background: #0b0b0c;
          }
        `}</style>
        {headNodes}
      </head>
      <body>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
