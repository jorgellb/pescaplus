import Link from 'next/link'
import Layout from '@/components/Layout'
import { FISHING_TYPES } from '@/lib/fishing'
import HeroArt from '@/components/graphics/HeroArt'
import OceanWaves from '@/components/graphics/OceanWaves'
import CategoryIcon from '@/components/graphics/CategoryIcon'

export default function Home() {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-32 md:py-44 bg-gradient-to-b from-cyan-950/30 via-slate-950 to-[#060b13]">
        {/* Background glow blobs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-600/5 rounded-full blur-[120px] -z-10 animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px] -z-10 animate-pulse-slow" style={{ animationDelay: '2s' }} />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] -z-10" />

        {/* Animated underwater scene */}
        <HeroArt />

        <div className="max-w-7xl mx-auto px-4 text-center space-y-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 tracking-wide uppercase">
            ⚡ Tu asistente de pesca inteligente
          </span>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.1] bg-gradient-to-r from-white via-slate-200 to-cyan-300 bg-clip-text text-transparent">
            Domina el Arte de la Pesca con Inteligencia Artificial
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Obtén consejos instantáneos de expertos y descubre cañas, carretes y aparejos de AliExpress analizados especialmente para ti.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
            <Link
              href="/advice"
              className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold px-8 py-4 rounded-xl shadow-lg shadow-cyan-500/15 hover:shadow-cyan-400/25 active:scale-[0.98] transition-all tracking-wide text-base"
            >
              Consultar Asistente IA 🤖
            </Link>
            <Link
              href="/categories/spinning"
              className="w-full sm:w-auto bg-slate-900/80 hover:bg-slate-900 border border-white/10 hover:border-cyan-500/30 text-slate-200 hover:text-white font-bold px-8 py-4 rounded-xl active:scale-[0.98] transition-all text-base"
            >
              Explorar Aparejos
            </Link>
          </div>
        </div>

        {/* Wave divider */}
        <OceanWaves className="absolute bottom-0 left-0 w-full h-20 md:h-28" />
      </section>

      {/* Categories Section */}
      <section className="max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Equípate por Modalidad
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto text-sm md:text-base">
            Selecciona tu estilo de pesca para ver los mejores productos y recomendaciones.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FISHING_TYPES.map((type) => (
            <Link
              key={type.id}
              href={`/categories/${type.id}`}
              className="group relative rounded-2xl p-6 bg-slate-900/40 border border-white/5 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/5 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden"
            >
              {/* Internal glow matching category color */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${type.color} rounded-full blur-2xl -z-10 group-hover:opacity-150 transition-opacity`} />
              
              <div>
                <span className="inline-flex text-cyan-400 p-3.5 bg-slate-950/80 rounded-xl mb-6 shadow-inner border border-white/5 group-hover:text-cyan-300 group-hover:border-cyan-500/20 transition-colors">
                  <CategoryIcon id={type.id} className="w-8 h-8" strokeWidth={1.4} />
                </span>
                <h3 className="text-xl font-bold text-slate-100 group-hover:text-cyan-400 transition-colors duration-200 mb-3">
                  {type.name}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  {type.description}
                </p>
              </div>
              
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 uppercase tracking-widest pt-2">
                Ver Equipamiento <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Value Prop Section */}
      <section className="border-t border-white/5 bg-slate-950/40 backdrop-blur-sm py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-20">
            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              ¿Por qué elegir PescaPlus?
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto text-sm">
              Diseñamos la herramienta que todo pescador necesita antes de comprar su próximo aparejo.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4 text-center md:text-left flex flex-col items-center md:items-start">
              <span className="text-4xl p-4 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20 mb-2">
                🤖
              </span>
              <h3 className="text-xl font-bold text-slate-100">Asistente IA Experto</h3>
              <p className="text-slate-400 text-sm leading-relaxed text-center md:text-left">
                Nuestro motor de IA simula las opiniones de un guía de pesca profesional para sugerirte aparejos perfectos según tu modalidad.
              </p>
            </div>
            
            <div className="space-y-4 text-center md:text-left flex flex-col items-center md:items-start">
              <span className="text-4xl p-4 bg-teal-500/10 text-teal-400 rounded-2xl border border-teal-500/20 mb-2">
                🎯
              </span>
              <h3 className="text-xl font-bold text-slate-100">Filtrado de AliExpress</h3>
              <p className="text-slate-400 text-sm leading-relaxed text-center md:text-left">
                Evitamos productos engañosos. Filtramos las mejores cañas y carretes basándonos en puntuaciones y valoraciones de compradores reales.
              </p>
            </div>
            
            <div className="space-y-4 text-center md:text-left flex flex-col items-center md:items-start">
              <span className="text-4xl p-4 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 mb-2">
                🔗
              </span>
              <h3 className="text-xl font-bold text-slate-100">Redirección Segura</h3>
              <p className="text-slate-400 text-sm leading-relaxed text-center md:text-left">
                Generamos enlaces directos de afiliación verificados de AliExpress para que realices tus transacciones de manera rápida y segura.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  )
}