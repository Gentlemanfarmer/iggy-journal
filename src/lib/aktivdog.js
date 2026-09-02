// AktivDog feeding calculator
// Data measured 2026-09-02 from https://www.aktivdog.ch/futtermengenrechner/
// Profile: weiblich · intakt · ideal · Familienhund
// Only weight and age are variable inputs in v1.

export const MEASURED_ON = '2026-09-02'
export const IGGY_BIRTHDATE = '2026-04-13'

// 3-5M: only 2 anchors (7.5/8.3 kg); below 7.5 kg is extrapolated (thin data).
// 9Y+: only 1 data point (13 kg); weight scaling uses 2-8Y slope (approximation).
// Values are manufacturer guidelines, not veterinary advice.
// The calculator is NOT strictly isocaloric across varieties — the lookup table
// is the source of truth, not a kcal formula.
export const FEEDING_TABLE = {
  '3-5M': {
    gefluegel:   [{ w: 7.5, g: 570 }, { w: 8.3, g: 610 }],
    pferd:       [{ w: 7.5, g: 540 }, { w: 8.3, g: 580 }],
    rind:        [{ w: 7.5, g: 590 }, { w: 8.3, g: 630 }],
    truthahn:    [{ w: 7.5, g: 560 }, { w: 8.3, g: 610 }],
    wildschwein: [{ w: 7.5, g: 460 }, { w: 8.3, g: 490 }],
  },
  '6-12M': {
    gefluegel:   [{ w: 9.2, g: 520 }, { w: 10.2, g: 560 }, { w: 11.0, g: 590 }, { w: 11.7, g: 620 }, { w: 12.2, g: 640 }, { w: 12.6, g: 650 }, { w: 12.9, g: 670 }],
    pferd:       [{ w: 9.2, g: 490 }, { w: 10.2, g: 530 }, { w: 11.0, g: 560 }, { w: 11.7, g: 590 }, { w: 12.2, g: 600 }, { w: 12.6, g: 620 }, { w: 12.9, g: 630 }],
    rind:        [{ w: 9.2, g: 530 }, { w: 10.2, g: 570 }, { w: 11.0, g: 610 }, { w: 11.7, g: 640 }, { w: 12.2, g: 660 }, { w: 12.6, g: 670 }, { w: 12.9, g: 680 }],
    truthahn:    [{ w: 9.2, g: 510 }, { w: 10.2, g: 550 }, { w: 11.0, g: 580 }, { w: 11.7, g: 610 }, { w: 12.2, g: 630 }, { w: 12.6, g: 640 }, { w: 12.9, g: 660 }],
    wildschwein: [{ w: 9.2, g: 410 }, { w: 10.2, g: 450 }, { w: 11.0, g: 470 }, { w: 11.7, g: 490 }, { w: 12.2, g: 510 }, { w: 12.6, g: 520 }, { w: 12.9, g: 530 }],
  },
  '13-24M': {
    gefluegel:   [{ w: 11, g: 420 }, { w: 12, g: 450 }, { w: 13, g: 480 }, { w: 14, g: 510 }],
    pferd:       [{ w: 11, g: 400 }, { w: 12, g: 430 }, { w: 13, g: 450 }, { w: 14, g: 480 }],
    rind:        [{ w: 11, g: 430 }, { w: 12, g: 460 }, { w: 13, g: 490 }, { w: 14, g: 520 }],
    truthahn:    [{ w: 11, g: 420 }, { w: 12, g: 440 }, { w: 13, g: 470 }, { w: 14, g: 500 }],
    wildschwein: [{ w: 11, g: 340 }, { w: 12, g: 360 }, { w: 13, g: 380 }, { w: 14, g: 400 }],
  },
  '2-8Y': {
    gefluegel:   [{ w: 11, g: 340 }, { w: 12, g: 360 }, { w: 13, g: 380 }, { w: 14, g: 400 }],
    pferd:       [{ w: 11, g: 320 }, { w: 12, g: 340 }, { w: 13, g: 360 }, { w: 14, g: 380 }],
    rind:        [{ w: 11, g: 350 }, { w: 12, g: 370 }, { w: 13, g: 390 }, { w: 14, g: 420 }],
    truthahn:    [{ w: 11, g: 330 }, { w: 12, g: 350 }, { w: 13, g: 380 }, { w: 14, g: 400 }],
    wildschwein: [{ w: 11, g: 270 }, { w: 12, g: 290 }, { w: 13, g: 310 }, { w: 14, g: 320 }],
  },
  '9Y+': {
    gefluegel:   [{ w: 13, g: 330 }],
    pferd:       [{ w: 13, g: 320 }],
    rind:        [{ w: 13, g: 340 }],
    truthahn:    [{ w: 13, g: 330 }],
    wildschwein: [{ w: 13, g: 270 }],
  },
}

export const SORTEN = ['gefluegel', 'pferd', 'rind', 'truthahn', 'wildschwein']

export const SORTEN_META = {
  gefluegel:   { label: 'AktivDog Geflügel',                     energieKcalKg: 1315, boxKg: 2.5 },
  pferd:       { label: 'AktivDog Pferd mit Süsskartoffel',      energieKcalKg: 1506, boxKg: 2.5 },
  rind:        { label: 'AktivDog Rind',                          energieKcalKg: 1685, boxKg: 2.5 },
  truthahn:    { label: 'AktivDog Truthahn mit Polenta',          energieKcalKg: 1735, boxKg: 2.5 },
  wildschwein: { label: 'AktivDog Wildschwein mit Haferflocken',  energieKcalKg: 2158, boxKg: 2.5 },
}

const BRACKET_LABELS = {
  '3-5M': '3–5 Monate (Welpe)',
  '6-12M': '6–12 Monate (Junghund)',
  '13-24M': '13–24 Monate (Junghund)',
  '2-8Y': '2–8 Jahre (Adult)',
  '9Y+': '9+ Jahre (Senior)',
}

export function ageBracket(ageMonths) {
  if (ageMonths < 3) return null
  if (ageMonths <= 5) return '3-5M'
  if (ageMonths <= 12) return '6-12M'
  if (ageMonths <= 24) return '13-24M'
  if (ageMonths < 108) return '2-8Y'
  return '9Y+'
}

export function ageBracketLabel(bracket) {
  return BRACKET_LABELS[bracket] || bracket
}

function lerpByWeight(anchors, w, fallbackSlope = 0) {
  const s = [...anchors].sort((a, b) => a.w - b.w)
  if (s.length === 1) return s[0].g + fallbackSlope * (w - s[0].w)
  const seg = (a, b) => a.g + ((b.g - a.g) / (b.w - a.w)) * (w - a.w)
  if (w <= s[0].w) return seg(s[0], s[1])
  if (w >= s[s.length - 1].w) return seg(s[s.length - 2], s[s.length - 1])
  for (let i = 0; i < s.length - 1; i++) {
    if (w >= s[i].w && w <= s[i + 1].w) return seg(s[i], s[i + 1])
  }
  return s[s.length - 1].g
}

function slopeOf(anchors) {
  if (anchors.length < 2) return 0
  const s = [...anchors].sort((a, b) => a.w - b.w)
  return (s[s.length - 1].g - s[0].g) / (s[s.length - 1].w - s[0].w)
}

const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi)

export function dailyGrams(weightKg, ageMonths, sorte) {
  const bracket = ageBracket(ageMonths)
  if (!bracket) return null
  const w = clamp(weightKg, 2, 60)
  const anchors = FEEDING_TABLE[bracket][sorte]
  const fallback = bracket === '9Y+' ? slopeOf(FEEDING_TABLE['2-8Y'][sorte]) : 0
  const g = lerpByWeight(anchors, w, fallback)
  return Math.max(0, Math.round(g / 10) * 10)
}

export function dailyGramsAll(weightKg, ageMonths) {
  return Object.fromEntries(SORTEN.map((s) => [s, dailyGrams(weightKg, ageMonths, s)]))
}

export function ageInMonths(birthdateISO, at = new Date()) {
  const b = new Date(birthdateISO)
  let m = (at.getFullYear() - b.getFullYear()) * 12 + (at.getMonth() - b.getMonth())
  if (at.getDate() < b.getDate()) m -= 1
  return m
}
