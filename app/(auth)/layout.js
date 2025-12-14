import { ClerkProvider } from '@clerk/nextjs'
import Providers from '../components/Providers'

export default function AuthLayout({ children }) {
  return (
    <ClerkProvider>
      <Providers>
        {children}
      </Providers>
    </ClerkProvider>
  )
}