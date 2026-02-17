import "./globals.css";

import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils/cn";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: {
    default: "Baby Routine Builder",
    template: "%s | Baby Routine Builder",
  },
  description: "Smart routine planning for modern parents",
  icons: {
    icon: "/favicon.ico",
  },
  metadataBase: new URL("http://localhost:3000"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="scroll-smooth"
    >
      <body
        className={cn(
          inter.variable,
          "min-h-screen",
          "bg-gradient-to-br from-neutral-50 to-neutral-100",
          "dark:from-neutral-950 dark:to-neutral-900",
          "font-sans antialiased",
          "text-neutral-900 dark:text-neutral-100"
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Global App Container */}
          <div className="relative min-h-screen flex flex-col">
            
            {/* Optional global header placeholder */}
            {/* You can later insert Navbar here */}

            {/* Main Content */}
            <main className="flex-1">
              {children}
            </main>

            {/* Optional global footer */}
            <footer className="text-center text-xs text-neutral-400 py-6">
              © {new Date().getFullYear()} Baby Routine Builder
            </footer>
          </div>

          {/* Global Toast Notifications */}
          <Toaster
            position="top-right"
            richColors
            closeButton
            expand
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
