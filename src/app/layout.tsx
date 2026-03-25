import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "myCard Services - Tarjetas NFC Inteligentes para tu Negocio",
  description: "Conecta sin esfuerzo con tus clientes. Nuestras tarjetas NFC proporcionan acceso instantáneo a tus servicios, precios y agendamiento de citas con un solo toque.",
};

// Inline script to prevent theme flash
const themeScript = `
  (function() {
    try {
      var savedTheme = localStorage.getItem('theme') || 'light';
      var systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      var initialTheme = savedTheme || systemPreference;
      document.documentElement.setAttribute('data-theme', initialTheme);
    } catch (error) {
      var systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', systemPreference);
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} ${poppins.variable} font-inter antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
