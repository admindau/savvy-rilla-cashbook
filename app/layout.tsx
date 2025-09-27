import "./globals.css";
import Header from "@/components/Header";

export const metadata = { title: "Savvy Rilla Cashbook" };

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main className="container py-6">{children}</main>
        <footer className="text-center text-white/50 text-sm py-6">
          © 2025 Savvy Rilla Cashbook
        </footer>
      </body>
    </html>
  );
}
