export function getRemaining(component, mealsPerDay) {
  if (!component.inventory_date || component.quantity_available_g == null) return null
  const invDate = new Date(component.inventory_date + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysElapsed = Math.max(0, Math.floor((today - invDate) / (1000 * 60 * 60 * 24)))
  const consumed = (component.quantity_g || 0) * mealsPerDay * daysElapsed
  return Math.max(0, component.quantity_available_g - consumed)
}

export function getDaysRemaining(remaining, component, mealsPerDay) {
  if (remaining == null || !component.quantity_g) return null
  const dailyConsumption = component.quantity_g * mealsPerDay
  if (dailyConsumption === 0) return Infinity
  return Math.floor(remaining / dailyConsumption)
}

export function getMealsPerDay() {
  try { return parseInt(localStorage.getItem('iggy_meals_per_day') || '3') } catch { return 3 }
}

export function formatUnit(amount, unit) {
  return `${amount}${unit || 'g'}`
}

export function formatMealTotals(components) {
  const totals = {}
  for (const c of components) {
    const unit = c.unit || 'g'
    totals[unit] = (totals[unit] || 0) + (c.quantity_g || 0)
  }
  return Object.entries(totals)
    .filter(([, amount]) => amount > 0)
    .map(([unit, amount]) => `${amount}${unit}`)
    .join(' + ') || '0g'
}

export function formatDailyTotals(components, mealsPerDay) {
  const totals = {}
  for (const c of components) {
    const unit = c.unit || 'g'
    totals[unit] = (totals[unit] || 0) + (c.quantity_g || 0)
  }
  return Object.entries(totals)
    .filter(([, amount]) => amount > 0)
    .map(([unit, amount]) => `~${amount * mealsPerDay}${unit}`)
    .join(' + ') || '0g'
}
