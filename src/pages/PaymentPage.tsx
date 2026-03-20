export function PaymentPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 pb-20 pt-10 md:px-10 md:pt-14">
      <section className="animate-fade-up rounded-3xl bg-white p-6 shadow-[0_20px_56px_rgba(0,0,0,0.08)] md:p-10">
        <p className="inline-flex rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-700">
          Coming Soon
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900 md:text-5xl">Payment Section</h1>
        <p className="mt-3 max-w-2xl text-neutral-600">
          Payment and payout features are under development and will be available soon.
        </p>

        <div className="mt-8 rounded-2xl bg-neutral-50 p-5">
          <p className="text-sm text-neutral-700">What you can do now</p>
          <ul className="mt-3 space-y-2 text-sm text-neutral-600">
            <li>1. Start and complete delivery orders from the dashboard.</li>
            <li>2. Submit destination proof photos after successful delivery.</li>
            <li>3. Track weekly completed orders for upcoming payout release.</li>
          </ul>
        </div>
      </section>
    </div>
  )
}