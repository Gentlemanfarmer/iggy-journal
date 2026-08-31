import { useState, useMemo } from 'react'
import { knowledge } from '../content/knowledge'
import { categoryColors } from '../lib/categories'

export default function KnowledgeBase() {
  const [selectedModule, setSelectedModule] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const modules = Object.values(knowledge)

  const filteredContent = useMemo(() => {
    if (!selectedModule || !searchTerm.trim()) return selectedModule?.sections || []

    const term = searchTerm.toLowerCase()
    return selectedModule.sections.filter(
      (section) =>
        section.heading.toLowerCase().includes(term) ||
        section.keywords.some((kw) => kw.includes(term)) ||
        section.content.toLowerCase().includes(term)
    )
  }, [selectedModule, searchTerm])

  const highlightText = (text, term) => {
    if (!term.trim()) return text
    const regex = new RegExp(`(${term})`, 'gi')
    return text.split(regex).map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-amber-200">{part}</mark> : part
    )
  }

  return (
    <div className="space-y-4">
      {!selectedModule ? (
        // Module list
        <div className="space-y-2">
          <p className="text-sm font-medium text-teal">Wähle ein Modul:</p>
          <div className="grid grid-cols-2 gap-2">
            {modules.map((mod) => (
              <button
                key={mod.title}
                onClick={() => {
                  setSelectedModule(mod)
                  setSearchTerm('')
                }}
                className="rounded border-2 border-teal bg-white py-3 text-center text-teal hover:bg-teal hover:text-paper transition text-sm font-medium"
              >
                <span className="text-lg">{mod.icon}</span>
                <div>{mod.title}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        // Module detail with search
        <div className="space-y-3">
          <button
            onClick={() => {
              setSelectedModule(null)
              setSearchTerm('')
            }}
            className="text-xs text-teal/60 hover:text-teal"
          >
            ← Zurück zu Modulen
          </button>

          <div>
            <h2 className="text-lg font-semibold text-teal mb-3">
              {selectedModule.icon} {selectedModule.title}
            </h2>

            <input
              type="text"
              placeholder="Stichwort suchen (z.B. 'baden', 'ölen', 'impfung')..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded border border-teal bg-white px-3 py-2 text-sm text-teal placeholder-teal/50 focus:outline-none focus:ring-2 focus:ring-chestnut"
            />
          </div>

          {filteredContent.length === 0 ? (
            <p className="text-sm text-teal/60">
              Keine Treffer für "{searchTerm}". Probiere ein anderes Stichwort.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-teal/60">
                {filteredContent.length} von {selectedModule.sections.length} Abschnitten
              </p>
              {filteredContent.map((section, idx) => (
                <div
                  key={idx}
                  className="rounded border-l-4 border-teal/40 bg-white p-3"
                >
                  <h3 className="text-sm font-semibold text-teal mb-1">
                    {highlightText(section.heading, searchTerm)}
                  </h3>
                  <p className="text-xs text-teal/80 leading-relaxed">
                    {highlightText(section.content, searchTerm)}
                  </p>
                  {searchTerm && section.keywords.some((kw) => kw.includes(searchTerm.toLowerCase())) && (
                    <p className="mt-1 text-xs text-chestnut/60">
                      Stichworte: {section.keywords.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
