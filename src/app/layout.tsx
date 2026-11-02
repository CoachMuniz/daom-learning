import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getCurrentUser } from "@/lib/auth/session";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    template: "%s | DAOM Learning — Formación en Weightlifting",
    default: "DAOM Learning | Capacitaciones Oficiales en Levantamiento Olímpico de Pesas",
  },
  description:
    "Plataforma oficial de capacitación y formación técnica de DAOM Weightlifting. Seminarios de Squats, Snatch, Clean, Jerk, Biomecánica y Planificación deportiva.",
  keywords: [
    "Weightlifting",
    "Levantamiento Olímpico de Pesas",
    "Capacitaciones Weightlifting",
    "Seminarios DAOM",
    "Abel Matías Muñiz",
    "Snatch",
    "Clean and Jerk",
    "Squats sentadilla",
    "Biomecánica deportiva",
    "Club DAOM",
  ],
  authors: [{ name: "DAOM Weightlifting", url: "https://www.daom-weightlifting.com" }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "/",
    siteName: "DAOM Learning",
    title: "DAOM Learning | Formación Técnica en Weightlifting",
    description:
      "Plataforma académica y de especialización en Levantamiento Olímpico de Pesas de DAOM Weightlifting en Club DAOM.",
    images: [
      {
        url: "/assets/logos/daom-weightlifting-horizontal-azul.png",
        width: 1200,
        height: 630,
        alt: "DAOM Learning — Capacitaciones Oficiales",
      },
    ],
  },
  other: {
    "canary-project": "DAOM-FORMACION-SHEET-01",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "DAOM Learning",
    alternateName: "DAOM Weightlifting Formación",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    logo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/assets/logos/daom-weightlifting-horizontal-azul.png`,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Av. Varela 1800",
      addressLocality: "Flores, CABA",
      addressRegion: "Buenos Aires",
      addressCountry: "AR",
    },
    telephone: "+54 11 3039-3030",
    email: "capacitaciones@daom-weightlifting.com",
    sameAs: ["https://www.daom-weightlifting.com"],
  };

  return (
    <html lang="es" className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className="min-h-screen flex flex-col font-sans selection:bg-daom-blue selection:text-white">
        <Navbar
          user={
            user
              ? {
                  email: user.email,
                  fullName: user.full_name,
                  role: user.role,
                }
              : null
          }
        />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
