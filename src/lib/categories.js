export const categories = {
  Pflege: [
    'Schur komplett',
    'Baden',
    'Abspülen',
    'Bürsten',
    'Krallen geschnitten',
    'Hygieneschur',
    'Augen freigeschnitten',
    'Bart getrimmt',
    'Ohren gereinigt',
    'Ohren kontrolliert',
    'Ohren gezupft',
  ],
  Futter: ['Fütterung', 'Futterwechsel', 'Leckerli'],
  Gewicht: ['Wiegen'],
  Training: ['Session', 'Kommando gelernt', 'Ruheübung', 'Leinentraining', 'Nasenarbeit', 'Sozialisierung', 'Meilenstein'],
  Medizin: ['Tierarzt', 'Impfung', 'Entwurmt', 'Zeckenschutz gegeben', 'Medikament', 'Symptom'],
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
