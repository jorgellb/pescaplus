import CharterIcon from './CharterIcon'
import Group from './OptionGroup'
import {
  resolveOptions, TECHNIQUES, TARGET_SPECIES, FISHING_AREAS, INCLUDED, EXCLUDED,
  POLICIES, SEASONS, LANGUAGES, NAVIGATION, SAFETY, BOAT_AMENITIES, FISHING_GEAR,
} from '@/lib/charter-options'

/**
 * The detailed half of a charter listing: what you'll fish, with what, on which
 * boat and under which rules. Every parameter carries an icon so the page can be
 * skimmed — an angler comparing two trips reads these blocks, not the prose.
 * Empty groups render nothing, so a sparse listing simply looks shorter.
 */

/** A single boat measurement. */
function Spec({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink/[0.07] bg-paper px-3.5 py-3">
      <CharterIcon name={icon} className="w-5 h-5 shrink-0 text-accent" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-ink/45 leading-none">{label}</p>
        <p className="font-semibold text-ink text-[15px] leading-tight mt-1 truncate">{value}</p>
      </div>
    </div>
  )
}

export interface BoatInfo {
  boatName: string
  boatType: string
  capacity: number
  crewSize: number
  boatLength: number | null
  boatBeam: number | null
  boatEngineHp: number | null
  boatMaxSpeedKn: number | null
  boatYear: number | null
  marina: string
  navigation: string[]
  safety: string[]
  amenities: string[]
  gear: string[]
}

export interface TripInfo {
  techniques: string[]
  species: string[]
  areas: string[]
  included: string[]
  excluded: string[]
  policies: string[]
  seasons: string[]
  languages: string[]
  highlights: string
}

export function BoatSpecs({ boat }: { boat: BoatInfo }) {
  const specs: { icon: string; label: string; value: string }[] = []
  if (boat.boatName) specs.push({ icon: 'boat', label: 'Barco', value: boat.boatName })
  if (boat.boatType) specs.push({ icon: 'anchor', label: 'Tipo', value: boat.boatType })
  if (boat.boatLength) specs.push({ icon: 'ruler', label: 'Eslora', value: `${boat.boatLength} m` })
  if (boat.boatBeam) specs.push({ icon: 'beam', label: 'Manga', value: `${boat.boatBeam} m` })
  if (boat.boatEngineHp) specs.push({ icon: 'engine', label: 'Motor', value: `${boat.boatEngineHp} CV` })
  if (boat.boatMaxSpeedKn) specs.push({ icon: 'speed', label: 'Vel. máxima', value: `${boat.boatMaxSpeedKn} nudos` })
  if (boat.boatYear) specs.push({ icon: 'calendar', label: 'Año', value: String(boat.boatYear) })
  if (boat.crewSize) specs.push({ icon: 'crew', label: 'Tripulación', value: String(boat.crewSize) })
  if (boat.capacity) specs.push({ icon: 'users', label: 'Máx. pasajeros', value: String(boat.capacity) })

  const hasEquipment = boat.navigation.length || boat.safety.length || boat.amenities.length || boat.gear.length
  if (specs.length === 0 && !hasEquipment) return null

  return (
    <div className="space-y-6">
      {specs.length > 0 && (
        <section>
          <h3 className="flex items-center gap-2 font-semibold text-ink mb-3">
            <CharterIcon name="boat" className="w-[18px] h-[18px] text-accent" />
            Características del barco
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {specs.map((s) => <Spec key={s.label} {...s} />)}
          </div>
        </section>
      )}
      <Group title="Electrónica y navegación" icon="radar" options={resolveOptions(NAVIGATION, boat.navigation)} />
      <Group title="Seguridad a bordo" icon="lifebuoy" options={resolveOptions(SAFETY, boat.safety)} />
      <Group title="Comodidades" icon="cabin" options={resolveOptions(BOAT_AMENITIES, boat.amenities)} />
      <Group title="Aparejos disponibles" icon="reel" options={resolveOptions(FISHING_GEAR, boat.gear)} />
    </div>
  )
}

export function TripSpecs({ trip }: { trip: TripInfo }) {
  return (
    <div className="space-y-6">
      {trip.highlights && (
        <section className="rounded-2xl border border-accent/25 bg-accent/[0.05] p-4">
          <h3 className="flex items-center gap-2 font-semibold text-ink">
            <CharterIcon name="check" className="w-[18px] h-[18px] text-accent" />
            Lo más destacado
          </h3>
          <p className="text-[15px] text-ink/80 mt-1.5">{trip.highlights}</p>
        </section>
      )}
      <Group title="Técnicas de pesca" icon="rod" options={resolveOptions(TECHNIQUES, trip.techniques)} />
      <Group title="Especies objetivo" icon="fish" options={resolveOptions(TARGET_SPECIES, trip.species)} />
      <Group title="Zonas de pesca" icon="offshore" options={resolveOptions(FISHING_AREAS, trip.areas)} />
      <Group title="Incluido en el precio" icon="check" tone="yes" options={resolveOptions(INCLUDED, trip.included)} />
      <Group title="No incluido — tráelo tú" icon="cross" tone="no" options={resolveOptions(EXCLUDED, trip.excluded)} />
      <Group title="Normas a bordo" icon="shield" options={resolveOptions(POLICIES, trip.policies)} />
      <Group title="Idiomas" icon="language" options={resolveOptions(LANGUAGES, trip.languages)} />
      <Group title="Temporada" icon="calendar" options={resolveOptions(SEASONS, trip.seasons)} />
    </div>
  )
}
