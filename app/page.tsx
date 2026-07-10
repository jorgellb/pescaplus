import Link from 'next/link'
import Layout from '@/components/Layout'
import { FISHING_TYPES } from '@/lib/fishing'
import CategoryIcon from '@/components/graphics/CategoryIcon'
import OceanWaves from '@/components/graphics/OceanWaves'

export default function Home() {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-50 via-white to-[#f6f8fb]">
        <div className="absolute top-0 right-0 w-[38rem] h-[38rem] bg-sky-200/30 rounded-full blur-[120px] -z-0" />
        <div className="absolute -top-10 left-1/4 w-80 h-80 bg-teal-200/25 rounded-full blur-[100px] -z-0" />

        <div className="relative max-w-5xl mx-auto px-4 text-center pt-24 pb-32 md:pt-32 md:pb-40">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white text-sky-700 border border-sky-100 shadow-sm">
            ⚡ Tu asistente de pesca con inteligencia artificial
          </span>

          <h1 className="mt-6 text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.08] max-w-4xl mx-auto">
            Todo tu equipo de pesca,{' '}
            <span className="text-sky-600">seleccionado con IA</span>
          </h1>

          <p className="mt-6 text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Cañas, carretes, señuelos y aparejos de AliExpress con fichas optimizadas y consejos de
            un experto virtual para cada modalidad.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row justify-center items-center gap-3">
            <Link
              href="/categories/canas"
              className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg shadow-sky-600/20 hover:shadow-sky-600/30 active:scale-[0.98] transition-all"
            >
              Explorar catálogo
            </Link>
            <Link
              href="/advice"
              className="w-full sm:w-auto bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 font-bold px-8 py-3.5 rounded-xl shadow-sm active:scale-[0.98] transition-all"
            >
              Consultar Asistente IA 🤖
            </Link>
          </div>
        </div>

        <OceanWaves className="block w-full h-16 md:h-24" />
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-14">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            Compra por categoría
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto">
            Encuentra rápido lo que buscas entre nuestras {FISHING_TYPES.length} categorías de pesca.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {FISHING_TYPES.map((type) => (
            <Link
              key={type.id}
              href={`/categories/${type.id}`}
              className="group relative rounded-2xl p-5 md:p-6 bg-white border border-slate-200 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-600/5 hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              <span className={`inline-flex text-slate-700 p-3 rounded-xl mb-4 bg-gradient-to-br ${type.color} ring-1 ring-slate-900/5`}>
                <CategoryIcon id={type.id} className="w-7 h-7" strokeWidth={1.5} />
              </span>
              <h3 className="text-base md:text-lg font-bold text-slate-900 group-hover:text-sky-600 transition-colors mb-1.5">
                {type.name}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 flex-1">
                {type.description}
              </p>
              <span className="flex items-center gap-1 text-xs font-bold text-sky-600 uppercase tracking-wide mt-4">
                Ver productos
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Value props */}
      <section className="bg-white border-y border-slate-200 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-14">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">¿Por qué PescaPlus?</h2>
            <p className="text-slate-500 max-w-lg mx-auto">
              La herramienta que todo pescador necesita antes de comprar su próximo aparejo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: '🤖',
                tint: 'bg-sky-50 text-sky-600',
                title: 'Fichas optimizadas con IA',
                text: 'Cada producto tiene título y descripción redactados por IA, claros y honestos, sin la típica jerga confusa de los marketplaces.',
              },
              {
                icon: '🎯',
                tint: 'bg-emerald-50 text-emerald-600',
                title: 'Selección de AliExpress',
                text: 'Filtramos las mejores cañas, carretes y aparejos según ventas y valoraciones de compradores reales.',
              },
              {
                icon: '🔗',
                tint: 'bg-amber-50 text-amber-600',
                title: 'Compra segura',
                text: 'Te redirigimos con enlaces oficiales de AliExpress para que compres de forma rápida y protegida.',
              },
            ].map((f) => (
              <div key={f.title} className="text-center md:text-left space-y-3">
                <span className={`inline-flex text-2xl w-14 h-14 items-center justify-center rounded-2xl ${f.tint}`}>
                  {f.icon}
                </span>
                <h3 className="text-lg font-bold text-slate-900">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  )
}
