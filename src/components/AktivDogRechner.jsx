import { useMemo, useState } from 'react'
import {
  IGGY_BIRTHDATE,
  SORTEN,
  SORTEN_META,
  ageInMonths,
  ageBracket,
  ageBracketLabel,
  dailyGramsAll,
} from '../lib/aktivdog'
import { formatDateDE } from '../lib/dates'
import { getMealsPerDay } from '../lib/feeding'

export default function AktivDogRechner({ lastWeight, feedingComponents }) {
  const [adjustment, setAdjustment] = useState(0)
  const [open, setOpen] = useState(true)

  const age = useMemo(() => ageInMonths(IGGY_BIRTHDATE), [])
  const bracket = useMemo(() => ageBracket(age), [age])

  const recommendations = useMemo(() => {
    if (!lastWeight?.value || !bracket) return null
    return dailyGramsAll(lastWeight.value, age)
  }, [lastWeight, age, bracket])

  const activeSorten = useMemo(() => {
    if (!feedingComponents) return new Set()
    const names = feedingComponents.map((c) => c.name.toLowerCase())
    const active = new Set()
    for (const sorte of SORTEN) {
      const keywords = sorte === 'gefluegel' ? ['geflügel', 'gefluegel'] : [sorte]
      if (names.some((n) => keywords.some((k) => n.includes(k)))) {
        active.add(sorte)
      }
    }
    return active
  }, [feedingComponents])

  const mealsPerDay = getMealsPerDay()

  if (!bracket) {
    return (
      <div className="rounded border border-amber-200 bg-amber-50 p-3">
        <p className="text-sm font-medium text-amber-700">AktivDog Empfehlung</p>
        <p className="text-xs text-amber-600 mt-1">
          Iggy ist unter 3 Monate alt — der AktivDog-Rechner deckt dieses Alter mit separatem Welpenfutter ab.
        </p>
      </div>
    )
  }

  if (!lastWeight?.value) {
    return (
      <div className="rounded border border-teal/20 bg-teal/5 p-3">
        <p className="text-sm font-medium text-teal">AktivDog Empfehlung</p>
        <p className="text-xs text-teal/60 mt-1">
          Kein Gewicht erfasst. Iggy wiegen, um die empfohlene Futtermenge zu berechnen.
        </p>
      </div>
    )
  }

  const adjustFactor = 1 + adjustment / 100

  return (
    <div className="rounded border border-teal/20 bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <p className="text-sm font-semibold text-teal">AktivDog Empfehlung</p>
        <span className="text-xs text-teal/60">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          {/* Context */}
          <div className="text-xs text-teal/60 space-y-0.5">
            <p>Alter: <strong>{age} Monate</strong> — {ageBracketLabel(bracket)}</p>
            <p>Gewicht: <strong>{lastWeight.value} kg</strong> (vom {formatDateDE(lastWeight.date)})</p>
          </div>

          {/* Recommendations */}
          <div className="space-y-1.5">
            {SORTEN.map((sorte) => {
              const raw = recommendations[sorte]
              if (raw == null) return null
              const adjusted = Math.max(0, Math.round((raw * adjustFactor) / 10) * 10)
              const perMeal = Math.round(adjusted / mealsPerDay)
              const isActive = activeSorten.has(sorte)
              const meta = SORTEN_META[sorte]

              return (
                <div
                  key={sorte}
                  className={`flex items-center justify-between rounded p-2 ${
                    isActive
                      ? 'bg-teal/10 border border-teal/30'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${isActive ? 'font-medium text-teal' : 'text-teal/70'}`}>
                      {meta.label}
                    </p>
                    <p className="text-[10px] text-teal/60">{meta.energieKcalKg} kcal/kg</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className={`text-sm font-bold ${isActive ? 'text-teal' : 'text-teal/60'}`}>
                      {adjusted}g<span className="font-normal text-[10px] text-teal/60">/Tag</span>
                    </p>
                    <p className="text-[10px] text-teal/60">{perMeal}g/Mahlzeit</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Adjustment slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-teal/60">Kondition anpassen</label>
              <span className="text-xs font-medium text-teal">
                {adjustment > 0 ? '+' : ''}{adjustment}%
              </span>
            </div>
            <input
              type="range"
              min={-15}
              max={15}
              step={5}
              value={adjustment}
              onChange={(e) => setAdjustment(parseInt(e.target.value))}
              className="w-full accent-teal"
            />
            <div className="flex justify-between text-[10px] text-teal/60">
              <span>dünn (−15%)</span>
              <span>ideal</span>
              <span>rund (+15%)</span>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-[10px] text-teal/60 leading-relaxed">
            Richtwert (AktivDog, Profil: intakt · ideal · Familienhund).
            Leckerli und Kauartikel von der Tagesmenge abziehen.
            An Iggys Kondition anpassen (Rippen tastbar, Taille von oben sichtbar).
          </p>
        </div>
      )}
    </div>
  )
}
