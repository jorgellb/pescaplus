import OperatorVerify from '@/components/charters/OperatorVerify'
import { listOperators } from '@/lib/operators-store'

export const dynamic = 'force-dynamic'

export default async function AdminOperatorsPage() {
  const operators = await listOperators()
  const pending = operators.filter((o) => !o.verified).length
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 border-b border-ink/12 pb-4">
        <div>
          <h1 className="font-display uppercase text-3xl md:text-4xl text-ink leading-none">Operadores</h1>
          <p className="text-ink/60 text-sm mt-1">Verifica titulación y seguro antes de que puedan publicar chárters de pago.</p>
        </div>
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-ink/50 whitespace-nowrap">{pending} pendientes</span>
      </div>
      <OperatorVerify operators={operators.map((o) => ({ id: o.id, name: o.name, businessName: o.businessName, email: o.email, phone: o.phone, spotSlug: o.spotSlug, boatName: o.boatName, boatType: o.boatType, capacity: o.capacity, licenseRef: o.licenseRef, insuranceRef: o.insuranceRef, bio: o.bio, verified: o.verified }))} />
    </div>
  )
}
