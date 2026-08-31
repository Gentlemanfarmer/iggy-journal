export const categories = {
  Fell: ['Vollschur', 'Baden', 'Bürsten', 'Krallen', 'Augen', 'Bart', 'Intimschur', 'Ohren'],
  Futter: ['Fütterung', 'Futterwechsel', 'Leckerli'],
  Gewicht: ['Wiegen'],
  Training: ['Session', 'Kommando gelernt', 'Ruheübung', 'Leinentraining', 'Nasenarbeit', 'Sozialisierung', 'Meilenstein'],
  Medizin: ['Tierarzt', 'Impfung', 'Entwurmung', 'Zeckenschutz', 'Medikament', 'Symptom'],
}

export const categoryColors = {
  Fell: 'bg-teal text-paper',
  Futter: 'bg-chestnut text-paper',
  Gewicht: 'bg-amber-600 text-paper',
  Training: 'bg-blue-600 text-paper',
  Medizin: 'bg-red-600 text-paper',
}

export const getCategoryLabel = (category) => {
  const labels = {
    Fell: 'Fellpflege',
    Futter: 'Futter',
    Gewicht: 'Gewicht',
    Training: 'Training',
    Medizin: 'Medizin',
  }
  return labels[category] || category
}
