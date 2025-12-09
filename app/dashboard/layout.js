import Navigation from '@/app/components/Navigation'

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-500 to-pink-600 p-3 pl-52">
      <Navigation />
      <div className="min-h-[calc(100vh-1.5rem)] bg-[#F8F9FA] rounded-[1.25rem] ml-1">
        {children}
      </div>
    </div>
  )
}