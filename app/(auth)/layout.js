import { ClerkProvider } from '@clerk/nextjs'

export default function AuthLayout({ children }) {
  return (
    <ClerkProvider>
      {children}
    </ClerkProvider>
  )
}