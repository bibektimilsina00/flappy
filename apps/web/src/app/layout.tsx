import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://riocut.com"),
  applicationName: "Riocut",
  title: "Riocut",
  description: "The all-in-one AI video studio — generate, edit, and clip video with AI, then publish to social.",
  keywords: ["AI video studio", "AI video editor", "AI clips", "text to video", "image to video", "video repurposing"],
  category: "technology",
  creator: "Riocut",
};

// Clerk's default theme auto-darkens via CSS `color-scheme: dark` (set on .dark in
// globals.css); we only override the accent + card bg to match the app's palette.
const clerkAppearance = {
  variables: {
    colorPrimary: "#14b8a6", // brand green (--mk-accent), used on all buttons
    colorPrimaryForeground: "#ffffff", // white button text
    colorBackground: "#1b1b1f",
    borderRadius: "0.375rem",
  },
  options: {
    logoImageUrl: "/logo.svg", // RioCut mark in the card header
    logoLinkUrl: "/",
    // full-width stacked "Continue with …" buttons instead of the compact row
    socialButtonsVariant: "blockButton" as const,
  },
  elements: {
    // lift the card off the /login background with a hairline border + soft shadow
    cardBox: "shadow-2xl shadow-black/50 ring-1 ring-white/10",
    // force the social providers into one full-width column (belt-and-suspenders
    // in case the 2-provider "auto" row layout wins over socialButtonsVariant)
    socialButtonsRoot: "flex flex-col gap-2",
    socialButtons: "grid grid-cols-1 gap-2 w-full",
    socialButtonsBlockButton: "w-full justify-start",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider appearance={clerkAppearance}>
          <Providers>{children}</Providers>
        </ClerkProvider>
        <Toaster />
      </body>
    </html>
  );
}
