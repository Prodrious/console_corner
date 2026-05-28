import "./globals.css";

export const metadata = {
  title: "Console Corner | Gaming Center Billing & Slot Tracker",
  description: "Premium gaming center management platform — track active console sessions, manage slot bookings, handle billing settlements, and view deep analytics.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
