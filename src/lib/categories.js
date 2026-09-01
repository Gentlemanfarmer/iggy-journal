export const categories = {
  Pflege: [
    'Schur komplett',
    'Baden',
    'Abspülen',
    'Gebürstet',
    'Krallen geschnitten',
    'Hygieneschur',
    'Augen freigeschnitten',
    'Bart getrimmt',
    'Ohren gereinigt',
    'Ohren kontrolliert',
    'Ohren gezupft',
  ],
  Futter: ['Futter umgestellt', 'Spezialfutter / Schonkost', 'Nicht gefressen', 'Unverträglichkeit'],
  Gewicht: ['Gewogen'],
  Training: ['Trainiert', 'Neues Kommando', 'Ruheübung', 'Leine geübt', 'Nasenarbeit', 'Sozialisierung', 'Meilenstein', 'Rückruf geübt'],
  Medizin: ['Tierarztbesuch', 'Geimpft', 'Entwurmt', 'Zeckenschutz gegeben', 'Medikament gegeben', 'Symptom beobachtet'],
}

export const categoryColors = {
  Pflege: 'bg-teal text-paper',
  Futter: 'bg-chestnut text-paper',
  Gewicht: 'bg-amber-600 text-paper',
  Training: 'bg-blue-600 text-paper',
  Medizin: 'bg-red-600 text-paper',
}

export const getCategoryLabel = (category) => {
  const labels = {
    Pflege: 'Pflege',
    Futter: 'Futter',
    Gewicht: 'Gewicht',
    Training: 'Training',
    Medizin: 'Medizin',
  }
  return labels[category] || category
}
