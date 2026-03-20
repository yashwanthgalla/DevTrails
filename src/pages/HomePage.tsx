import { Link } from 'react-router-dom'

const whatWeDo = [
  {
    title: 'AI Risk Detection',
    description: 'Detects environmental and real-time disruptions affecting delivery workers.',
    detail: 'Combines weather severity, route conditions, and work patterns to classify risk as low, medium, or high.',
  },
  {
    title: 'Automatic Claims',
    description: 'Claims are triggered automatically when disruption conditions are met.',
    detail: 'No manual paperwork: the system checks verified triggers and prepares payout flow in near real time.',
  },
  {
    title: 'Fraud Protection',
    description: 'Prevents fake claims using location validation and anomaly detection.',
    detail: 'Uses live location checks plus camera-based geotag verification before claim approval.',
  },
  {
    title: 'Instant Payout',
    description: 'Workers receive payouts instantly through integrated payment systems.',
    detail: 'When verification passes, payout eligibility is enabled and funds can be released without delay.',
  },
]

const coreFeatures = [
  {
    title: 'AI Risk Detection',
    summary: 'Continuously scans for disruptions before income is affected.',
    points: ['Weather-based disruption scoring', 'City and location-aware alerts'],
  },
  {
    title: 'Automatic Claims',
    summary: 'Claims are auto-created when trigger rules match.',
    points: ['Trigger engine for severe conditions', 'No manual claim submission required'],
  },
  {
    title: 'Fraud Protection',
    summary: 'Claim approval requires strict location verification.',
    points: ['Stationary-location checks', 'Camera capture with live geotag overlay'],
  },
  {
    title: 'Instant Payout',
    summary: 'Verified users can receive payout without long processing.',
    points: ['Eligibility gate before payment', 'Admin review history in portal'],
  },
]

export function HomePage() {
  return (
    <div className="h-[calc(100svh-73px)] snap-y snap-mandatory overflow-y-auto">
      <section className="snap-start">
        <div className="mx-auto flex min-h-[calc(100svh-73px)] w-full max-w-6xl animate-fade-up flex-col items-center justify-center px-6 py-10 text-center md:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Automated Insurance for Gig Workers
          </p>
          <h1 className="mx-auto mt-4 max-w-[14ch] text-balance text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl md:text-6xl">
            Protect Every Delivery. Automatically.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-neutral-600 md:text-lg">
            GigGuard AI uses weather intelligence and automated rules to protect gig workers from income loss without manual claims.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/login"
              className="rounded-full bg-neutral-900 px-7 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(0,0,0,0.2)] transition-transform hover:-translate-y-0.5"
            >
              Get Started
            </Link>
            <Link
              to="/dashboard"
              className="rounded-full bg-neutral-100 px-7 py-3 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-200"
            >
              View Demo
            </Link>
          </div>
        </div>
      </section>

      <section className="snap-start">
        <div className="mx-auto flex min-h-[calc(100svh-73px)] w-full max-w-6xl animate-fade-up flex-col items-center justify-center px-6 py-10 md:px-10">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-neutral-900 md:text-4xl">What We Do</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-neutral-600">
            A real-world protection engine built for day-to-day delivery uncertainty.
          </p>

          <div className="mt-10 grid w-full gap-4 md:grid-cols-2">
            {whatWeDo.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,0.07)] transition-transform hover:-translate-y-0.5"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-neutral-700" />
                </div>
                <h3 className="text-xl font-semibold tracking-tight text-neutral-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{item.description}</p>
                <p className="mt-3 text-sm leading-relaxed text-neutral-500">{item.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="snap-start">
        <div className="mx-auto flex min-h-[calc(100svh-73px)] w-full max-w-6xl animate-fade-up flex-col items-center justify-center px-6 py-10 md:px-10">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-neutral-900 md:text-4xl">Core Features</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-neutral-600">
            Each module works together to keep payouts fast, safe, and fair for active workers.
          </p>

          <div className="mx-auto mt-8 grid w-full max-w-6xl gap-4 md:grid-cols-2">
            {coreFeatures.map((feature) => (
              <article key={feature.title} className="rounded-3xl bg-neutral-50 p-6">
                <p className="text-base font-semibold text-neutral-900">{feature.title}</p>
                <p className="mt-2 text-sm text-neutral-600">{feature.summary}</p>
                <div className="mt-4 space-y-2">
                  {feature.points.map((point) => (
                    <p key={point} className="rounded-xl bg-white px-3 py-2 text-xs text-neutral-600">
                      {point}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-6 grid w-full max-w-6xl gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-4 text-center shadow-[0_10px_28px_rgba(0,0,0,0.06)]">
              <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Verification Gate</p>
              <p className="mt-2 text-sm font-medium text-neutral-700">Pending/Rejected users are blocked from payout.</p>
            </div>
            <div className="rounded-2xl bg-white p-4 text-center shadow-[0_10px_28px_rgba(0,0,0,0.06)]">
              <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Admin Review</p>
              <p className="mt-2 text-sm font-medium text-neutral-700">Verification history is visible in the admin portal.</p>
            </div>
            <div className="rounded-2xl bg-white p-4 text-center shadow-[0_10px_28px_rgba(0,0,0,0.06)]">
              <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Realtime Tracking</p>
              <p className="mt-2 text-sm font-medium text-neutral-700">Live location updates keep claim decisions accurate.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="snap-start">
        <div className="mx-auto flex min-h-[calc(100svh-73px)] w-full max-w-6xl animate-fade-up flex-col items-center justify-center px-6 py-10 md:px-10">
          <div className="w-full rounded-3xl bg-neutral-50 px-6 py-14 text-center md:px-10">
            <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 md:text-5xl">
              Start protecting your income today
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-neutral-600">
              Pay once, activate coverage, and let GigGuard AI automate the rest.
            </p>
            <Link
              to="/payment"
              className="mt-7 inline-flex rounded-full bg-neutral-900 px-8 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(0,0,0,0.2)] transition-transform hover:-translate-y-0.5"
            >
              Go to Payment
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}