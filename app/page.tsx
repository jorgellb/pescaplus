import Link from 'next/link'
import Layout from '@/components/Layout'

export default function Home() {
  const fishingTypes = [
    { id: 'spinning', name: 'Spinning', description: 'Pesca con señuelos artificiales', icon: '🎣' },
    { id: 'flyfishing', name: 'Fly Fishing', description: 'Pesca con mosca', icon: '🪰' },
    { id: 'carp', name: 'Carp Fishing', description: 'Pesca de carpas', icon: '🐟' },
    { id: 'sea', name: 'Sea Fishing', description: 'Pesca en mar', icon: '🌊' },
    { id: 'baitcasting', name: 'Baitcasting', description: 'Técnica precisa', icon: '🎯' },
  ]

  return (
    <Layout>
      <div className="bg-gradient-to-r from-blue-800 to-blue-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4">PescaPlus</h1>
          <p className="text-xl mb-8">Tu tienda de afiliados de pesca con asistente IA</p>
          <div className="flex justify-center gap-4">
            <Link
              href="/advice"
              className="bg-yellow-500 text-blue-900 px-8 py-3 rounded-lg font-semibold hover:bg-yellow-400 transition"
            >
              Asistente IA
            </Link>
            <Link
              href="/categories/spinning"
              className="bg-white text-blue-800 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Ver Productos
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
          Tipos de Pesca
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {fishingTypes.map((type) => (
            <Link
              key={type.id}
              href={`/categories/${type.id}`}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition hover:scale-105"
            >
              <div className="text-5xl mb-4">{type.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{type.name}</h3>
              <p className="text-gray-600">{type.description}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4 text-gray-900">
            ¿Por qué PescaPlus?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
            <div className="text-center">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold mb-2">Asistente IA</h3>
              <p className="text-gray-600">
                Consejos personalizados de pesca con inteligencia artificial
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🛒</div>
              <h3 className="text-xl font-semibold mb-2">Mejores Productos</h3>
              <p className="text-gray-600">
                Selección de los mejores productos de AliExpress
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-semibold mb-2">Precios Competitivos</h3>
              <p className="text-gray-600">
                Los mejores precios del mercado en equipo de pesca
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}