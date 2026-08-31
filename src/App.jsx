import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Journal from './pages/Journal'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/journal" element={<Journal />} />
      <Route path="/" element={<Navigate to="/journal" replace />} />
    </Routes>
  )
}
