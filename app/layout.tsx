import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import { SiteHeader } from "@/components/site-header";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Orkait Jobs | Careers",
    description: "Join our team at Orkait. Explore open positions and apply today to build the future with us.",
    openGraph: {
        title: "Orkait Jobs | Careers",
        description: "Explore exciting career opportunities at Orkait. Apply now!",
        url: "https://jobs.orkait.com",
        siteName: "Orkait Jobs",
        locale: "en_US",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Orkait Jobs | Careers",
        description: "Join our team at Orkait. Explore open positions and apply today.",
    },
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const cookieStore = await cookies();
    const isLoggedIn = cookieStore.has("admin_session");

    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background font-sans antialiased`}
            >
                <SiteHeader isLoggedIn={isLoggedIn} />
                <main className="container mx-auto py-6 px-4">
                    {children}
                </main>
            </body>
        </html>
    );
}
