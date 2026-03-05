import { Footer, Layout, Navbar } from "nextra-theme-docs";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import "nextra-theme-docs/style.css";

export const metadata = {
  title: "avex way",
  description: "avex way - エイベックス創業者松浦勝人氏のストーリー",
};

export default async function RootLayout({ children }) {
  return (
    <html lang="ja" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={<Navbar logo={<span style={{ fontWeight: 800 }}>avex way</span>} />}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/schroneko/avexway/blob/main"
          footer={<Footer />}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
