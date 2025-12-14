import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/employee(.*)',
  '/auth-redirect(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // Only protect specific routes, let everything else through fast
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip static files and public assets
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}