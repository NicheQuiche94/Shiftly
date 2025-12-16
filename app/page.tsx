import Link from 'next/link'
import Image from 'next/image'

// Force static generation - this page will be pre-rendered at build time
export const dynamic = 'force-static'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <Image 
                src="/logo.svg" 
                alt="Shiftly" 
                width={32} 
                height={32}
              />
              <span className="text-2xl text-gray-900 font-cal">
                Shiftly
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <Link 
                href="#pricing"
                className="px-5 py-2.5 text-gray-700 hover:text-gray-900 font-medium transition-colors hidden sm:block"
              >
                Pricing
              </Link>
              <Link 
                href="/sign-in"
                className="px-5 py-2.5 text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link 
                href="/sign-up"
                className="px-5 py-2.5 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-all"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 lg:px-8 py-20 lg:py-28 overflow-hidden bg-gradient-to-br from-pink-100 via-pink-50 to-white">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-block mb-6 px-4 py-1.5 bg-pink-50 border border-pink-200 rounded-full">
            <span className="text-pink-600 text-sm font-medium">Staff scheduling that's actually fair</span>
          </div>
          
          <h1 className="text-5xl lg:text-7xl text-gray-900 mb-6 leading-tight font-cal">
            Build rotas in minutes,{' '}
            <span className="text-pink-500">not hours</span>
          </h1>
          <p className="text-xl lg:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Stop being the rota referee. Set your rules once, and Shiftly builds fair, balanced schedules every time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/sign-up"
              className="inline-block px-8 py-4 bg-pink-500 text-white text-lg font-semibold rounded-xl hover:bg-pink-600 transition-all"
            >
              Start Free Trial
            </Link>
            <Link 
              href="#how-it-works"
              className="inline-block px-8 py-4 bg-gray-100 text-gray-900 text-lg font-semibold rounded-xl hover:bg-gray-200 transition-all"
            >
              See How It Works
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-4">14-day free trial • No credit card required</p>
        </div>
      </section>

      {/* Hero Screenshot */}
      <section className="px-6 lg:px-8 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
            <Image 
              src="/screenshots/dashboard.png" 
              alt="Shiftly Dashboard" 
              width={1200}
              height={700}
              className="w-full h-auto" 
            />
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="px-6 lg:px-8 py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl text-gray-900 mb-4 font-cal">
              The real cost of manual scheduling
            </h2>
            <p className="text-xl text-gray-600">
              It's not just the hours spent—it's the drama that follows
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 font-cal">Endless complaints</h3>
              <p className="text-gray-600">
                "Why do I always close?" "How come they never work weekends?" Staff unhappy with perceived unfairness.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 font-cal">Hours wasted weekly</h3>
              <p className="text-gray-600">
                Juggling availability, preferences, contracted hours, and shift coverage. Every. Single. Week.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 font-cal">Costly mistakes</h3>
              <p className="text-gray-600">
                Under contracted hours? Legal issue. Close then open? Burnout. Double-booked? Chaos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-6 lg:px-8 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl text-gray-900 mb-4 font-cal">
              Set up once. Generate forever.
            </h2>
            <p className="text-xl text-gray-600">
              Three simple steps to fair, balanced rotas
            </p>
          </div>

          {/* Step 1 */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
            <div>
              <div className="inline-block px-3 py-1 bg-pink-100 text-pink-600 rounded-full text-sm font-semibold mb-4">
                Step 1
              </div>
              <h3 className="text-2xl lg:text-3xl text-gray-900 mb-4 font-cal">
                Add your team and shifts
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                Enter your staff, their contracted hours, and availability. Define your shift patterns—morning, evening, whatever works for your business.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700">
                  <svg className="w-5 h-5 text-pink-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Staff profiles with contracted hours
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <svg className="w-5 h-5 text-pink-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Flexible availability windows
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <svg className="w-5 h-5 text-pink-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Custom shift patterns
                </li>
              </ul>
            </div>
            {/* Screenshot */}
            <div className="rounded-2xl shadow-xl overflow-hidden border border-gray-200">
              <Image 
                src="/screenshots/workspace.png" 
                alt="Workspace" 
                width={800}
                height={600}
                className="w-full h-auto" 
              />
            </div>
          </div>

          {/* Step 2 */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
            <div className="order-2 lg:order-1">
              <div className="rounded-2xl shadow-xl overflow-hidden border border-gray-200">
                <Image 
                  src="/screenshots/rules.png" 
                  alt="Rules" 
                  width={800}
                  height={600}
                  className="w-full h-auto" 
                />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-block px-3 py-1 bg-pink-100 text-pink-600 rounded-full text-sm font-semibold mb-4">
                Step 2
              </div>
              <h3 className="text-2xl lg:text-3xl text-gray-900 mb-4 font-cal">
                Set your fairness rules
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                Define what "fair" means for your team. No clopening shifts, even weekend distribution, maximum consecutive days—you decide, Shiftly enforces.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700">
                  <svg className="w-5 h-5 text-pink-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Prevent close-then-open shifts
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <svg className="w-5 h-5 text-pink-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Distribute weekends fairly
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <svg className="w-5 h-5 text-pink-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Respect contracted hours exactly
                </li>
              </ul>
            </div>
          </div>

          {/* Step 3 */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-3 py-1 bg-pink-100 text-pink-600 rounded-full text-sm font-semibold mb-4">
                Step 3
              </div>
              <h3 className="text-2xl lg:text-3xl text-gray-900 mb-4 font-cal">
                Generate and share
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                Hit generate. In seconds, get a perfectly balanced rota that follows all your rules. Review it, approve it, share it with your team.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700">
                  <svg className="w-5 h-5 text-pink-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Generate rotas in seconds
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <svg className="w-5 h-5 text-pink-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Staff app for viewing schedules
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <svg className="w-5 h-5 text-pink-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Time-off requests built in
                </li>
              </ul>
            </div>
            {/* Screenshot */}
            <div className="rounded-2xl shadow-xl overflow-hidden border border-gray-200">
              <Image 
                src="/screenshots/rota.png" 
                alt="Generated Rota" 
                width={800}
                height={600}
                className="w-full h-auto" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="px-6 lg:px-8 py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl text-gray-900 mb-4 font-cal">
              Simple pricing. Everything included.
            </h2>
            <p className="text-xl text-gray-600">
              No tiers. No feature gates. No "contact sales for enterprise."
            </p>
          </div>

          {/* Pricing Card */}
          <div className="bg-white rounded-3xl border-2 border-pink-200 shadow-xl overflow-hidden max-w-lg mx-auto">
            <div className="bg-pink-500 px-8 py-6 text-center">
              <p className="text-pink-100 text-sm font-medium uppercase tracking-wide mb-1">One plan. Everything.</p>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl font-bold text-white">$49</span>
                <span className="text-pink-100 text-lg">/month</span>
              </div>
              <p className="text-pink-100 text-sm mt-2">or $499/year (save $89)</p>
            </div>

            <div className="p-8">
              <p className="text-gray-600 text-center mb-8">
                Most scheduling tools gate features behind "Enterprise" tiers. We think that's nonsense. Here's everything you get:
              </p>

              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700"><strong>Unlimited staff</strong> — add your whole team</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700"><strong>Unlimited rotas</strong> — generate as many as you need</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700"><strong>All fairness rules</strong> — every rule, no restrictions</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700"><strong>Staff mobile app</strong> — they see schedules, request time off</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700"><strong>Time-off management</strong> — approve/reject requests</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700"><strong>Payroll integration</strong> — yes, included (not "Enterprise only")</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700"><strong>Multiple teams</strong> — manage different departments</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700"><strong>Priority support</strong> — we actually respond</span>
                </li>
              </ul>

              <div className="mt-8 pt-6 border-t border-gray-100">
                <Link 
                  href="/sign-up"
                  className="block w-full py-4 bg-pink-500 text-white text-center text-lg font-semibold rounded-xl hover:bg-pink-600 transition-all"
                >
                  Start 14-Day Free Trial
                </Link>
                <p className="text-center text-gray-500 text-sm mt-3">No credit card required</p>
              </div>
            </div>
          </div>

          {/* Tongue-in-cheek note */}
          <div className="mt-12 text-center">
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Looking for an "Enterprise" tier with a 6-month sales cycle and mandatory demos? Sorry, we don't do that. Everyone gets everything.
            </p>
          </div>
        </div>
      </section>

      {/* Social Proof / Trust */}
      <section className="px-6 lg:px-8 py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl text-gray-900 mb-4 font-cal">
            Built for retail and hospitality
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Where scheduling is hardest and fairness matters most
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6">
              <div className="text-4xl font-bold text-pink-500 mb-2">3-5 hrs</div>
              <p className="text-gray-600">Saved per week on scheduling</p>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-pink-500 mb-2">Zero</div>
              <p className="text-gray-600">"That's not fair" complaints</p>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-pink-500 mb-2">100%</div>
              <p className="text-gray-600">Contracted hours compliance</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 lg:px-8 py-20 bg-pink-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl lg:text-5xl text-white mb-6 font-cal">
            Ready to stop being the rota referee?
          </h2>
          <p className="text-xl text-pink-100 mb-10">
            Join managers who've taken back their time
          </p>
          <Link 
            href="/sign-up"
            className="inline-block px-8 py-4 bg-white text-pink-500 text-lg font-semibold rounded-xl hover:bg-gray-100 transition-all"
          >
            Start Free Trial
          </Link>
          <p className="text-pink-200 text-sm mt-4">14-day free trial • No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Image 
                src="/logo-white.svg" 
                alt="Shiftly" 
                width={28} 
                height={28}
              />
              <span className="text-xl text-white font-cal">
                Shiftly
              </span>
            </div>
            <div className="flex gap-6 text-sm">
              <Link href="/sign-in" className="hover:text-white transition-colors">Sign In</Link>
              <Link href="/sign-up" className="hover:text-white transition-colors">Get Started</Link>
              <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm">
            <p>© 2025 Shiftly. Built for retail and hospitality managers.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}