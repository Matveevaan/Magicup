// app/layout.tsx
import { Header } from "../components/Header"
import Footer from "../components/Footer"
import "../public/styles/globals.scss"

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}): any {
    return (
        <html lang="ru" data-scroll-behavior="smooth">
            <body>
                <Header />
                <main>{children}</main>
                <Footer />     
            </body>
        </html>
    )
}