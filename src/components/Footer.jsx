import packageJson from '../../package.json'

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-teal/10 pt-4 pb-2 text-center text-xs text-teal/50">
      <p>Iggy Journal v{packageJson.version}</p>
    </footer>
  )
}
