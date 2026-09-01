import { supabase } from './supabase'

/**
 * Find the user_rule matching a category + subtype for a given user.
 * Returns the rule row (incl. id) or null.
 */
export async function getRule(userId, category, subtype) {
  const { data } = await supabase
    .from('user_rules')
    .select('*')
    .eq('user_id', userId)
    .eq('category', category)
    .eq('subtype', subtype)
    .limit(1)
  return data?.[0] || null
}

/**
 * Fetch dependent rules for a given main rule id.
 * Returns an array of { dependent_rule_id, user_rules } (empty if none / table missing).
 */
export async function getDependencies(userId, mainRuleId) {
  try {
    const { data, error } = await supabase
      .from('rule_dependencies')
      .select('dependent_rule_id, user_rules!dependent_rule_id(*)')
      .eq('main_rule_id', mainRuleId)
      .eq('user_id', userId)
    if (error) return []
    return data || []
  } catch {
    // Dependencies feature not available yet (migration pending)
    return []
  }
}

/**
 * Fetch all dependency links for a user.
 * Returns an array of { main_rule_id, dependent_rule_id } (empty if none / table missing).
 */
export async function getAllDependencies(userId) {
  try {
    const { data, error } = await supabase
      .from('rule_dependencies')
      .select('main_rule_id, dependent_rule_id')
      .eq('user_id', userId)
    if (error) return []
    return data || []
  } catch {
    return []
  }
}

/**
 * Add a dependency link (main rule triggers dependent rule).
 * Ignores duplicates via the table's unique constraint.
 */
export async function addDependency(userId, mainRuleId, dependentRuleId) {
  const { error } = await supabase
    .from('rule_dependencies')
    .insert({ user_id: userId, main_rule_id: mainRuleId, dependent_rule_id: dependentRuleId })
  if (error && error.code !== '23505') throw error // 23505 = unique_violation (already linked)
}

/**
 * Remove a dependency link.
 */
export async function removeDependency(userId, mainRuleId, dependentRuleId) {
  const { error } = await supabase
    .from('rule_dependencies')
    .delete()
    .eq('user_id', userId)
    .eq('main_rule_id', mainRuleId)
    .eq('dependent_rule_id', dependentRuleId)
  if (error) throw error
}

/**
 * Build entry rows for the selected dependent rules on a given date.
 * selectedMap maps dependent_rule_id -> boolean.
 */
export function buildDependentEntries(userId, dependencies, selectedMap, date) {
  return dependencies
    .filter((dep) => selectedMap[dep.dependent_rule_id])
    .map((dep) => ({
      user_id: userId,
      category: dep.user_rules.category,
      subtype: dep.user_rules.subtype,
      date,
      note: null,
      value: null,
    }))
}
