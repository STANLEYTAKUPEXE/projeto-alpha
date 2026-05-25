import { Outlet } from 'react-router-dom'
import BottomNav from '../../components/layout/BottomNav'

export default function PlayerLayout() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
