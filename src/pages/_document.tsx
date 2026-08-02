import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en" className="dark">
      <Head>
        <meta name="description" content="Harz AI - Your custom AI assistant with fine-tuned models" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>
      <body className="bg-harz-bg text-harz-text">
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
