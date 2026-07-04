import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="bg-blue-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-yellow-400">
              PescaPlus
            </Link>
            <div className="hidden md:flex ml-10 space-x-8">
              <Link href="/categories/spinning" className="hover:text-yellow-400 transition">Spinning</Link>
              <Link href="/categories/flyfishing" className="hover:text-yellow-400 transition">Fly Fishing</Link>
              <Link href="/categories/carp" className="hover:text-yellow-400 transition">Carp Fishing</Link>
              <Link href="/categories/sea" className="hover:text-yellow-400 transition">Sea Fishing</Link>
              <Link href="/advice" className="hover:text-yellow-400 transition">Consejos IA</Link>
            </div>
          </div>
          <div className="flex items-center">
            <Link href="/advice" className="bg-yellow-500 text-blue-900 px-4 py-2 rounded-lg font-semibold hover:bg-yellow-400 transition">
              Asistente IA
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}