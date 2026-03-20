import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { useAppContext } from '../context/AppContext'
import { db } from '../lib/firebase'

type AgentProfile = {
  uid: string
  fullName: string
  email: string
  role: string
  createdAtMs: number | null
}

type AgentOrder = {
  id: string
  orderId: string
  userId: string
  userName: string
  userEmail: string
  startLabel: string
  destinationLabel: string
  startedAtMs: number
  completedAtMs: number
  status: string
}

function getWeekKey(date: Date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export function AdminPage() {
  const { state, fetchVerificationRecords } = useAppContext()
  const [agents, setAgents] = useState<AgentProfile[]>([])
  const [orders, setOrders] = useState<AgentOrder[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [dataError, setDataError] = useState('')

  const payoutByAgent = useMemo(() => {
    const currentWeek = getWeekKey(new Date())
    const map = new Map<string, { weeklyCompleted: number; totalCompleted: number }>()

    for (const order of orders) {
      const existing = map.get(order.userId) ?? { weeklyCompleted: 0, totalCompleted: 0 }
      existing.totalCompleted += 1
      if (order.completedAtMs && getWeekKey(new Date(order.completedAtMs)) === currentWeek) {
        existing.weeklyCompleted += 1
      }
      map.set(order.userId, existing)
    }

    return map
  }, [orders])

  useEffect(() => {
    void fetchVerificationRecords()
  }, [fetchVerificationRecords])

  const loadAgentAndOrderData = async () => {
    if (!db) {
      setDataError('Firebase database is not configured.')
      return
    }

    setLoadingData(true)
    setDataError('')

    try {
      const [usersSnapshot, ordersSnapshot] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(query(collection(db, 'agent_orders'), orderBy('createdAt', 'desc'))),
      ])

      const nextAgents: AgentProfile[] = usersSnapshot.docs
        .map((userDoc) => {
          const data = userDoc.data() as Record<string, unknown>
          return {
            uid: userDoc.id,
            fullName: (data.fullName as string) ?? (data.fullname as string) ?? 'Unknown Agent',
            email: (data.email as string) ?? 'Unknown Email',
            role: (data.role as string) ?? 'client',
            createdAtMs: typeof data.createdAtMs === 'number' ? data.createdAtMs : null,
          }
        })
        .filter((item) => item.role === 'client')

      const nextOrders: AgentOrder[] = ordersSnapshot.docs.map((orderDoc) => {
        const data = orderDoc.data() as Record<string, unknown>
        const start = (data.start as { label?: string } | undefined) ?? {}
        const destination = (data.destination as { label?: string } | undefined) ?? {}
        return {
          id: orderDoc.id,
          orderId: (data.orderId as string) ?? orderDoc.id,
          userId: (data.userId as string) ?? 'unknown',
          userName: (data.userName as string) ?? 'Unknown Agent',
          userEmail: (data.userEmail as string) ?? 'Unknown Email',
          startLabel: start.label ?? 'Pickup Point',
          destinationLabel: destination.label ?? 'Destination',
          startedAtMs: typeof data.startedAtMs === 'number' ? data.startedAtMs : Date.now(),
          completedAtMs: typeof data.completedAtMs === 'number' ? data.completedAtMs : Date.now(),
          status: (data.status as string) ?? 'Completed',
        }
      })

      setAgents(nextAgents)
      setOrders(nextOrders)
    } catch {
      setDataError('Failed to load agent and order details.')
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    void loadAgentAndOrderData()
  }, [])

  return (
    <div className="mx-auto w-full max-w-6xl px-6 pb-20 pt-10 md:px-10 md:pb-28 md:pt-12">
      <section className="animate-fade-up">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 md:text-5xl">Admin Portal</h1>
        <p className="mt-3 max-w-2xl text-neutral-600">
          Review user verification history, location checks, and payout decisions.
        </p>
      </section>

      <section className="mt-8 rounded-3xl bg-white p-5 shadow-[0_14px_38px_rgba(0,0,0,0.07)] md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-neutral-900">Verification Records</h2>
          <button
            type="button"
            onClick={() => {
              void fetchVerificationRecords()
            }}
            className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white"
          >
            Refresh
          </button>
        </div>

        {state.verificationLoading ? <p className="mt-4 text-sm text-neutral-600">Loading records...</p> : null}
        {state.verificationError ? <p className="mt-4 text-sm text-neutral-700">{state.verificationError}</p> : null}

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-500">
                <th className="px-3 py-2 font-medium">User</th>
                <th className="px-3 py-2 font-medium">Movement</th>
                <th className="px-3 py-2 font-medium">Verification</th>
                <th className="px-3 py-2 font-medium">Live Location</th>
                <th className="px-3 py-2 font-medium">Photo Location</th>
                <th className="px-3 py-2 font-medium">Distance</th>
                <th className="px-3 py-2 font-medium">Payout</th>
                <th className="px-3 py-2 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {state.verificationRecords.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-neutral-500" colSpan={8}>No records yet.</td>
                </tr>
              ) : (
                state.verificationRecords.map((record) => (
                  <tr key={record.id} className="border-b border-neutral-100 align-top text-neutral-700">
                    <td className="px-3 py-3">
                      <p className="font-medium text-neutral-900">{record.userName}</p>
                      <p className="text-xs text-neutral-500">{record.userEmail}</p>
                    </td>
                    <td className="px-3 py-3">{record.movementStatus}</td>
                    <td className="px-3 py-3">
                      <p>{record.verificationStatus}</p>
                      <p className="mt-1 text-xs text-neutral-500">{record.verificationReason}</p>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {record.liveLocation
                        ? `${record.liveLocation.lat.toFixed(6)}, ${record.liveLocation.lng.toFixed(6)}`
                        : 'N/A'}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {record.photoLocation
                        ? `${record.photoLocation.lat.toFixed(6)}, ${record.photoLocation.lng.toFixed(6)}`
                        : 'N/A'}
                    </td>
                    <td className="px-3 py-3">{record.distanceMeters !== null ? `${Math.round(record.distanceMeters)} m` : 'N/A'}</td>
                    <td className="px-3 py-3">{record.payoutEligible ? 'Approved' : 'Rejected'}</td>
                    <td className="px-3 py-3 text-xs text-neutral-500">{new Date(record.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-3xl bg-white p-5 shadow-[0_14px_38px_rgba(0,0,0,0.07)] md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-neutral-900">Agent User Details + Payout Due</h2>
          <button
            type="button"
            onClick={() => {
              void loadAgentAndOrderData()
            }}
            className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white"
          >
            Refresh
          </button>
        </div>

        {loadingData ? <p className="mt-4 text-sm text-neutral-600">Loading agents and orders...</p> : null}
        {dataError ? <p className="mt-4 text-sm text-neutral-700">{dataError}</p> : null}

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-500">
                <th className="px-3 py-2 font-medium">UID</th>
                <th className="px-3 py-2 font-medium">Agent</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium">Weekly Orders</th>
                <th className="px-3 py-2 font-medium">Total Orders</th>
                <th className="px-3 py-2 font-medium">Payout Due</th>
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-neutral-500" colSpan={8}>No agents found.</td>
                </tr>
              ) : (
                agents.map((agent) => {
                  const stats = payoutByAgent.get(agent.uid) ?? { weeklyCompleted: 0, totalCompleted: 0 }
                  const payoutDue = stats.weeklyCompleted * state.payoutRatePerOrder

                  return (
                    <tr key={agent.uid} className="border-b border-neutral-100 align-top text-neutral-700">
                      <td className="px-3 py-3 text-xs text-neutral-500">{agent.uid}</td>
                      <td className="px-3 py-3 font-medium text-neutral-900">{agent.fullName}</td>
                      <td className="px-3 py-3 text-xs text-neutral-500">{agent.email}</td>
                      <td className="px-3 py-3">{agent.role}</td>
                      <td className="px-3 py-3 text-xs text-neutral-500">
                        {agent.createdAtMs ? new Date(agent.createdAtMs).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-3 py-3">{stats.weeklyCompleted}</td>
                      <td className="px-3 py-3">{stats.totalCompleted}</td>
                      <td className="px-3 py-3 font-semibold text-neutral-900">${payoutDue}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-3xl bg-white p-5 shadow-[0_14px_38px_rgba(0,0,0,0.07)] md:p-6">
        <h2 className="text-xl font-semibold text-neutral-900">All Agent Orders</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-500">
                <th className="px-3 py-2 font-medium">Order ID</th>
                <th className="px-3 py-2 font-medium">Agent</th>
                <th className="px-3 py-2 font-medium">Pickup</th>
                <th className="px-3 py-2 font-medium">Destination</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Started</th>
                <th className="px-3 py-2 font-medium">Completed</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-neutral-500" colSpan={7}>No order records yet.</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b border-neutral-100 align-top text-neutral-700">
                    <td className="px-3 py-3 font-medium text-neutral-900">{order.orderId}</td>
                    <td className="px-3 py-3">
                      <p>{order.userName}</p>
                      <p className="text-xs text-neutral-500">{order.userEmail}</p>
                    </td>
                    <td className="px-3 py-3">{order.startLabel}</td>
                    <td className="px-3 py-3">{order.destinationLabel}</td>
                    <td className="px-3 py-3">{order.status}</td>
                    <td className="px-3 py-3 text-xs text-neutral-500">{new Date(order.startedAtMs).toLocaleString()}</td>
                    <td className="px-3 py-3 text-xs text-neutral-500">{new Date(order.completedAtMs).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
