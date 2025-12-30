import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "AnnoTron",
  description: "Roboflow-style annotation tool",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        />
      </head>
      <body
        className={`
          ${geistSans.variable}
          ${geistMono.variable}
          bg-zinc-950
          text-zinc-100
          min-h-screen
        `}
      >
        {/* Global shell */}
        <div className="flex min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
}
