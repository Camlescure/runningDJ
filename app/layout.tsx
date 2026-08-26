import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "RunDJ — You run. They DJ.", description: "Give a friend control of your running soundtrack." };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
