import type { Metadata, Viewport } from "next"
import { Inter, Space_Grotesk } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
})

export const metadata: Metadata = {
  title: "Young Innovators Club | Dharmapala Vidyalaya",
  description:
    "Young Innovators Club at Dharmapala Vidyalaya - Empowering students through hands-on STEM education, robotics, solar energy projects, and innovative problem-solving",
  keywords:
    "STEM education, innovation club, robotics, solar energy, Dharmapala Vidyalaya, Pannipitiya, student projects, engineering, programming",
  authors: [{ name: "Young Innovators Club" }],
  openGraph: {
    type: "website",
    title: "Young Innovators Club | Dharmapala Vidyalaya",
    description:
      "Young Innovators Club at Dharmapala Vidyalaya - Empowering students through hands-on STEM education, robotics, solar energy projects, and innovative problem-solving",
    images: [
      "https://storage.googleapis.com/gpt-engineer-file-uploads/EkOl1g2fgzZeJ2pzIbADUxhR0i63/social-images/social-1767110197391-logo-8bCvVNjY.png",
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Young Innovators Club | Dharmapala Vidyalaya",
    description:
      "Young Innovators Club at Dharmapala Vidyalaya - Empowering students through hands-on STEM education, robotics, solar energy projects, and innovative problem-solving",
    images: [
      "https://storage.googleapis.com/gpt-engineer-file-uploads/EkOl1g2fgzZeJ2pzIbADUxhR0i63/social-images/social-1767110197391-logo-8bCvVNjY.png",
    ],
  },
  icons: {
    icon: "https://storage.googleapis.com/gpt-engineer-file-uploads/EkOl1g2fgzZeJ2pzIbADUxhR0i63/uploads/1767110209425-logo-8bCvVNjY.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
