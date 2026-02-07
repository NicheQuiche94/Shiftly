import Navigation from '@/app/components/Navigation'
import DashboardTopBar from '@/app/components/DashboardTopBar'

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-500 to-pink-600 p-3 lg:pl-52">
      <Navigation />
      <div className="min-h-[calc(100vh-1.5rem)] bg-[#F8F9FA] rounded-[1.25rem] lg:ml-1 mt-14 lg:mt-0 flex flex-col">
        <div className="hidden lg:block">
          <DashboardTopBar />
        </div>
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}