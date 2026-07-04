import Navbar from './Navbar'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main>{children}</main>
      <footer className="bg-blue-900 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>&copy; 2024 PescaPlus - Tu tienda de afiliados de pesca</p>
          <p className="mt-2 text-sm text-gray-400">
            Los mejores productos de pesca de AliExpress con consejos de expertos
          </p>
        </div>
      </footer>
    </div>
  )
}