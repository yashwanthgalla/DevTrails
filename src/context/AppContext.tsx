import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, hasFirebaseConfig } from '../lib/firebase'

type RiskStatus = '🟢 Low Risk' | '🟡 Medium Risk' | '🔴 High Risk' | 'Unknown'
type UserRole = 'admin' | 'client'
type NotificationLevel = 'info' | 'success' | 'warning'
type MovementStatus = 'Unknown' | 'Moving' | 'Stationary'
type VerificationStatus = 'Not Required' | 'Pending Photo' | 'Verified' | 'Rejected'

type Notification = {
  id: string
  level: NotificationLevel
  message: string
}

type WeatherSnapshot = {
  city: string
  temperature: number
  condition: string
  rainMm: number
}

type GeoPoint = {
  lat: number
  lng: number
  accuracy: number
  updatedAt: number
}

type VerificationRecord = {
  id: string
  userId: string
  userName: string
  userEmail: string
  movementStatus: MovementStatus
  verificationStatus: VerificationStatus
  verificationReason: string
  payoutEligible: boolean
  liveLocation: { lat: number; lng: number } | null
  photoLocation: { lat: number; lng: number } | null
  distanceMeters: number | null
  createdAt: number
}

type DeliveryOrderPoint = {
  label: string
  lat: number
  lng: number
}

type DeliveryOrder = {
  id: string
  status: 'Active' | 'Completed'
  start: DeliveryOrderPoint
  destination: DeliveryOrderPoint
  route: Array<{ lat: number; lng: number }>
  startedAt: number
  completedAt: number | null
  proofPhoto: string
  proofLocation: { lat: number; lng: number } | null
}

type AuthResult = { ok: boolean; error?: string; role?: UserRole }

type UserProfileRecord = {
  uid: string
  email: string
  fullName: string
  role: UserRole
  createdAtMs: number
}

type AppState = {
  authLoading: boolean
  isAuthenticated: boolean
  userRole: UserRole
  userName: string
  userEmail: string
  isOrderActive: boolean
  city: string
  coverageStatus: 'Active' | 'Inactive'
  weeklyPremium: number
  payoutRatePerOrder: number
  weeklyOrders: number
  weeklyPayoutAmount: number
  lastPayoutWeekKey: string
  lastPayoutAt: number | null
  coverageAmount: string
  paymentStatus: 'Paid' | 'Pending'
  riskStatus: RiskStatus
  lastClaimStatus: string
  currentLocation: GeoPoint | null
  movementStatus: MovementStatus
  verificationStatus: VerificationStatus
  verificationReason: string
  photoLocation: { lat: number; lng: number } | null
  payoutEligible: boolean
  activeOrder: DeliveryOrder | null
  completedOrders: DeliveryOrder[]
  verificationRecords: VerificationRecord[]
  verificationLoading: boolean
  verificationError: string
  weather: WeatherSnapshot | null
  weatherError: string
  weatherLoading: boolean
  notifications: Notification[]
}

type AppContextValue = {
  state: AppState
  registerUser: (fullName: string, email: string, password: string) => Promise<AuthResult>
  loginUser: (email: string, password: string) => Promise<AuthResult>
  logout: () => void
  setOrderActive: (isActive: boolean) => void
  startOrder: (start: DeliveryOrderPoint, destination: DeliveryOrderPoint) => { ok: boolean; error?: string }
  completeOrderWithProof: (photoDataUrl: string, photoLat: number, photoLng: number) => { ok: boolean; error?: string }
  setCity: (city: string) => void
  fetchWeatherByCity: (city: string) => Promise<void>
  fetchWeatherByCoords: (lat: number, lon: number) => Promise<void>
  updateUserLiveLocation: (lat: number, lng: number, accuracy: number) => void
  updateUserMovementStatus: (isStationary: boolean) => void
  verifyUserPhotoLocation: (photoLat: number, photoLng: number) => Promise<{ ok: boolean; error?: string; matched?: boolean; distanceMeters?: number }>
  fetchVerificationRecords: () => Promise<void>
  processPayment: () => Promise<{ ok: boolean; error?: string }>
  dismissNotification: (id: string) => void
}

const STORAGE_KEY = 'gigguard_state_v1'
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather'

const defaultState: AppState = {
  authLoading: hasFirebaseConfig,
  isAuthenticated: false,
  userRole: 'client',
  userName: '',
  userEmail: '',
  isOrderActive: false,
  city: 'Mumbai',
  coverageStatus: 'Inactive',
  weeklyPremium: 129,
  payoutRatePerOrder: 18,
  weeklyOrders: 0,
  weeklyPayoutAmount: 0,
  lastPayoutWeekKey: '',
  lastPayoutAt: null,
  coverageAmount: '$1,500 weekly coverage',
  paymentStatus: 'Pending',
  riskStatus: 'Unknown',
  lastClaimStatus: 'No claim triggered yet',
  currentLocation: null,
  movementStatus: 'Unknown',
  verificationStatus: 'Not Required',
  verificationReason: '',
  photoLocation: null,
  payoutEligible: true,
  activeOrder: null,
  completedOrders: [],
  verificationRecords: [],
  verificationLoading: false,
  verificationError: '',
  weather: null,
  weatherError: '',
  weatherLoading: false,
  notifications: [],
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

function readStoredState(): Partial<AppState> {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {}
    }

    return JSON.parse(raw) as Partial<AppState>
  } catch {
    return {}
  }
}

function getWeekKey(date: Date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function normalizeStoredState(raw: Partial<AppState>): Partial<AppState> {
  const currentWeekKey = getWeekKey(new Date())

  if (raw.lastPayoutWeekKey && raw.lastPayoutWeekKey !== currentWeekKey) {
    return {
      ...raw,
      paymentStatus: 'Pending',
    }
  }

  return raw
}

function persistState(state: AppState) {
  if (typeof window === 'undefined') {
    return
  }

  const snapshot: Partial<AppState> = {
    authLoading: false,
    isAuthenticated: state.isAuthenticated,
    userRole: state.userRole,
    userName: state.userName,
    userEmail: state.userEmail,
    isOrderActive: state.isOrderActive,
    city: state.city,
    coverageStatus: state.coverageStatus,
    weeklyPremium: state.weeklyPremium,
    payoutRatePerOrder: state.payoutRatePerOrder,
    weeklyOrders: state.weeklyOrders,
    weeklyPayoutAmount: state.weeklyPayoutAmount,
    lastPayoutWeekKey: state.lastPayoutWeekKey,
    lastPayoutAt: state.lastPayoutAt,
    coverageAmount: state.coverageAmount,
    paymentStatus: state.paymentStatus,
    riskStatus: state.riskStatus,
    lastClaimStatus: state.lastClaimStatus,
    currentLocation: state.currentLocation,
    movementStatus: state.movementStatus,
    verificationStatus: state.verificationStatus,
    verificationReason: state.verificationReason,
    photoLocation: state.photoLocation,
    payoutEligible: state.payoutEligible,
    activeOrder: state.activeOrder,
    completedOrders: state.completedOrders,
    weather: state.weather,
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // Ignore storage write errors to avoid breaking app rendering.
  }
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function evaluateRisk(weather: WeatherSnapshot): RiskStatus {
  const condition = weather.condition.toLowerCase()
  const temp = weather.temperature

  if (
    condition.includes('thunderstorm') ||
    condition.includes('squall') ||
    condition.includes('tornado') ||
    weather.rainMm >= 7
  ) {
    return '🔴 High Risk'
  }

  if (
    condition.includes('rain') ||
    condition.includes('drizzle') ||
    condition.includes('snow') ||
    condition.includes('mist') ||
    weather.rainMm > 0 ||
    temp >= 38 ||
    temp <= 5
  ) {
    return '🟡 Medium Risk'
  }

  return '🟢 Low Risk'
}

function haversineDistanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRadians = (value: number) => (value * Math.PI) / 180
  const earthRadius = 6371000

  const deltaLat = toRadians(b.lat - a.lat)
  const deltaLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)

  const h =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)

  return 2 * earthRadius * Math.asin(Math.sqrt(h))
}

function buildRoutePoints(start: { lat: number; lng: number }, destination: { lat: number; lng: number }) {
  const points = 8
  return Array.from({ length: points + 1 }, (_, index) => {
    const t = index / points
    return {
      lat: start.lat + (destination.lat - start.lat) * t,
      lng: start.lng + (destination.lng - start.lng) * t,
    }
  })
}

function completedOrdersForWeek(orders: DeliveryOrder[]) {
  const currentWeekKey = getWeekKey(new Date())
  return orders.filter((order) => order.status === 'Completed' && order.completedAt && getWeekKey(new Date(order.completedAt)) === currentWeekKey).length
}

async function fetchUserProfileRole(uid: string): Promise<UserRole> {
  if (!db) {
    throw new Error('Firebase database is not configured.')
  }

  const profileRef = doc(db, 'users', uid)
  const snapshot = await getDoc(profileRef)
  if (!snapshot.exists()) {
    return 'client'
  }

  const role = (snapshot.data().role as UserRole | undefined) ?? 'client'
  return role === 'admin' ? 'admin' : 'client'
}

async function ensureClientProfile(profile: UserProfileRecord) {
  if (!db) {
    throw new Error('Firebase database is not configured.')
  }

  await setDoc(
    doc(db, 'users', profile.uid),
    {
      uid: profile.uid,
      email: profile.email,
      fullName: profile.fullName,
      role: profile.role,
      createdAtMs: profile.createdAtMs,
    },
    { merge: true },
  )
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const hydrated = {
      ...defaultState,
      ...normalizeStoredState(readStoredState()),
    }

    const weeklyOrders = completedOrdersForWeek(hydrated.completedOrders ?? [])

    return {
      ...hydrated,
      weeklyOrders,
      weeklyPayoutAmount: weeklyOrders * hydrated.payoutRatePerOrder,
    }
  })

  const pushNotification = useCallback((message: string, level: NotificationLevel = 'info') => {
    setState((prev) => {
      const next = {
        ...prev,
        notifications: [{ id: makeId(), message, level }, ...prev.notifications].slice(0, 6),
      }
      persistState(next)
      return next
    })
  }, [])

  const runAutomation = useCallback((current: AppState, weather: WeatherSnapshot): AppState => {
    const riskStatus = evaluateRisk(weather)
    let lastClaimStatus = current.lastClaimStatus
    const nextNotifications = [...current.notifications]

    if (riskStatus !== '🟢 Low Risk') {
      nextNotifications.unshift({
        id: makeId(),
        level: 'warning',
        message: `Risk alert: ${riskStatus} in ${weather.city}.`,
      })
    }

    const disruptionDetected = riskStatus === '🔴 High Risk' || riskStatus === '🟡 Medium Risk'
    const fraudValidationFailed = current.paymentStatus !== 'Paid' || !current.payoutEligible

    if (disruptionDetected && current.coverageStatus === 'Active') {
      if (fraudValidationFailed) {
        const reason = current.paymentStatus !== 'Paid'
          ? 'inactive payment'
          : current.verificationReason || 'identity/location mismatch'

        lastClaimStatus = `Claim blocked by fraud validation (${reason}).`
        nextNotifications.unshift({
          id: makeId(),
          level: 'warning',
          message: `Fraud check blocked automated claim: ${reason}.`,
        })
      } else {
        lastClaimStatus = 'Claim triggered automatically and payout sent.'
        nextNotifications.unshift({
          id: makeId(),
          level: 'success',
          message: 'Automated claim triggered. Payout initiated successfully.',
        })
      }
    } else if (disruptionDetected && current.coverageStatus === 'Inactive') {
      lastClaimStatus = 'Disruption detected, but coverage is inactive.'
    }

    return {
      ...current,
      riskStatus,
      lastClaimStatus,
      notifications: nextNotifications.slice(0, 6),
    }
  }, [])

  const registerUser = useCallback(async (fullName: string, email: string, password: string): Promise<AuthResult> => {
    if (!auth || !hasFirebaseConfig) {
      return { ok: false, error: 'Firebase Auth is not configured yet. Add Firebase env variables.' }
    }

    try {
      const normalizedEmail = email.trim()
      const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password)

      if (fullName.trim()) {
        await updateProfile(credential.user, { displayName: fullName.trim() })
      }

      await ensureClientProfile({
        uid: credential.user.uid,
        email: credential.user.email ?? normalizedEmail,
        fullName: fullName.trim() || credential.user.displayName || 'Client User',
        role: 'client',
        createdAtMs: Date.now(),
      })

      const role = await fetchUserProfileRole(credential.user.uid)

      setState((prev) => {
        const next = {
          ...prev,
          authLoading: false,
          isAuthenticated: true,
          userRole: role,
          userName: fullName.trim() || credential.user.displayName || prev.userName,
          userEmail: credential.user.email ?? normalizedEmail,
        }
        persistState(next)
        return next
      })

      pushNotification('Registration successful.', 'success')
      return { ok: true, role }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed'
      return { ok: false, error: message }
    }
  }, [pushNotification])

  const loginUser = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!auth || !hasFirebaseConfig) {
      return { ok: false, error: 'Firebase Auth is not configured yet. Add Firebase env variables.' }
    }

    try {
      const normalizedEmail = email.trim()
      const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password)
      const role = await fetchUserProfileRole(credential.user.uid)

      setState((prev) => {
        const next = {
          ...prev,
          authLoading: false,
          isAuthenticated: true,
          userRole: role,
          userName: credential.user.displayName ?? prev.userName,
          userEmail: credential.user.email ?? normalizedEmail,
        }
        persistState(next)
        return next
      })

      pushNotification('Login successful.', 'success')
      return { ok: true, role }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      return { ok: false, error: message }
    }
  }, [pushNotification])

  const logout = useCallback(() => {
    if (auth) {
      void signOut(auth)
    }

    setState((prev) => {
      const next = {
        ...prev,
        authLoading: false,
        isAuthenticated: false,
        userRole: 'client' as const,
        userName: '',
        userEmail: '',
      }
      persistState(next)
      return next
    })
  }, [])

  const fetchVerificationRecords = useCallback(async () => {
    if (!db) {
      setState((prev) => ({ ...prev, verificationError: 'Firebase database is not configured.' }))
      return
    }

    setState((prev) => ({ ...prev, verificationLoading: true, verificationError: '' }))

    try {
      const q = query(collection(db, 'verification_records'), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)

      const records = snapshot.docs.map((doc) => {
        const data = doc.data() as Record<string, unknown>

        return {
          id: doc.id,
          userId: (data.userId as string) ?? 'unknown',
          userName: (data.userName as string) ?? 'Unknown User',
          userEmail: (data.userEmail as string) ?? 'Unknown Email',
          movementStatus: (data.movementStatus as MovementStatus) ?? 'Unknown',
          verificationStatus: (data.verificationStatus as VerificationStatus) ?? 'Not Required',
          verificationReason: (data.verificationReason as string) ?? '',
          payoutEligible: Boolean(data.payoutEligible),
          liveLocation: (data.liveLocation as { lat: number; lng: number } | null) ?? null,
          photoLocation: (data.photoLocation as { lat: number; lng: number } | null) ?? null,
          distanceMeters: typeof data.distanceMeters === 'number' ? data.distanceMeters : null,
          createdAt: typeof data.createdAtMs === 'number' ? data.createdAtMs : Date.now(),
        }
      })

      setState((prev) => ({
        ...prev,
        verificationLoading: false,
        verificationRecords: records,
      }))
    } catch {
      setState((prev) => ({
        ...prev,
        verificationLoading: false,
        verificationError: 'Failed to load verification history.',
      }))
    }
  }, [])

  useEffect(() => {
    if (!auth || !hasFirebaseConfig) {
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setState((prev) => {
          const next = {
            ...prev,
            authLoading: false,
            isAuthenticated: false,
            userRole: 'client' as const,
            userName: '',
            userEmail: '',
          }
          persistState(next)
          return next
        })
        return
      }

      void (async () => {
        try {
          const role = await fetchUserProfileRole(user.uid)

          setState((prev) => {
            const next = {
              ...prev,
              authLoading: false,
              isAuthenticated: true,
              userRole: role,
              userName: user.displayName ?? prev.userName,
              userEmail: user.email ?? prev.userEmail,
            }
            persistState(next)
            return next
          })
        } catch {
          setState((prev) => ({ ...prev, authLoading: false, isAuthenticated: false }))
        }
      })()
    })

    return unsubscribe
  }, [])

  const setCity = useCallback((city: string) => {
    setState((prev) => {
      const next = {
        ...prev,
        city,
      }
      persistState(next)
      return next
    })
  }, [])

  const setOrderActive = useCallback((isActive: boolean) => {
    setState((prev) => {
      const next = isActive
        ? {
          ...prev,
          isOrderActive: true,
        }
        : {
          ...prev,
          isOrderActive: false,
          activeOrder: null,
          currentLocation: null,
          movementStatus: 'Unknown' as const,
          verificationStatus: 'Not Required' as const,
          verificationReason: '',
          photoLocation: null,
          payoutEligible: true,
        }

      persistState(next)
      return next
    })
  }, [])

  const startOrder = useCallback((start: DeliveryOrderPoint, destination: DeliveryOrderPoint) => {
    if (state.activeOrder) {
      return { ok: false, error: 'Complete the current active order first.' }
    }

    if (!Number.isFinite(start.lat) || !Number.isFinite(start.lng) || !Number.isFinite(destination.lat) || !Number.isFinite(destination.lng)) {
      return { ok: false, error: 'Enter valid start and destination coordinates.' }
    }

    const route = buildRoutePoints({ lat: start.lat, lng: start.lng }, { lat: destination.lat, lng: destination.lng })

    setState((prev) => {
      const next: AppState = {
        ...prev,
        isOrderActive: true,
        activeOrder: {
          id: `ORD-${Date.now()}`,
          status: 'Active',
          start,
          destination,
          route,
          startedAt: Date.now(),
          completedAt: null,
          proofPhoto: '',
          proofLocation: null,
        },
        notifications: [
          {
            id: makeId(),
            level: 'info' as const,
            message: `Order started from ${start.label} to ${destination.label}.`,
          },
          ...prev.notifications,
        ].slice(0, 6),
      }
      persistState(next)
      return next
    })

    return { ok: true }
  }, [state.activeOrder])

  const completeOrderWithProof = useCallback((photoDataUrl: string, photoLat: number, photoLng: number) => {
    if (!state.activeOrder) {
      return { ok: false, error: 'No active order to complete.' }
    }

    const distanceToDestination = haversineDistanceMeters(
      { lat: photoLat, lng: photoLng },
      { lat: state.activeOrder.destination.lat, lng: state.activeOrder.destination.lng },
    )

    if (distanceToDestination > 300) {
      return { ok: false, error: `Reach destination before completion proof. Remaining distance: ${Math.round(distanceToDestination)} m.` }
    }

    const completedAt = Date.now()

    setState((prev) => {
      if (!prev.activeOrder) {
        return prev
      }

      const completedOrder: DeliveryOrder = {
        ...prev.activeOrder,
        status: 'Completed',
        completedAt,
        proofPhoto: photoDataUrl,
        proofLocation: { lat: photoLat, lng: photoLng },
      }

      const completedOrders = [completedOrder, ...prev.completedOrders].slice(0, 200)
      const weeklyOrders = completedOrdersForWeek(completedOrders)

      const next: AppState = {
        ...prev,
        isOrderActive: false,
        activeOrder: null,
        completedOrders,
        weeklyOrders,
        weeklyPayoutAmount: weeklyOrders * prev.payoutRatePerOrder,
        notifications: [
          {
            id: makeId(),
            level: 'success' as const,
            message: `Order ${completedOrder.id} completed and proof submitted successfully.`,
          },
          ...prev.notifications,
        ].slice(0, 6),
      }

      persistState(next)
      return next
    })

    if (db) {
      void addDoc(collection(db, 'agent_orders'), {
        orderId: state.activeOrder.id,
        userId: auth?.currentUser?.uid ?? 'unknown',
        userName: state.userName || 'Unknown User',
        userEmail: state.userEmail || 'Unknown Email',
        start: state.activeOrder.start,
        destination: state.activeOrder.destination,
        startedAtMs: state.activeOrder.startedAt,
        completedAtMs: completedAt,
        proofLocation: { lat: photoLat, lng: photoLng },
        status: 'Completed',
        createdAt: serverTimestamp(),
      }).catch(() => {
        pushNotification('Order completed locally, but cloud order sync failed.', 'warning')
      })
    }

    return { ok: true }
  }, [pushNotification, state.activeOrder, state.userEmail, state.userName])

  const fetchFromOpenWeather = useCallback(
    async (queryParams: string) => {
      const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY
      if (!apiKey) {
        throw new Error('OpenWeather API key is missing. Set VITE_OPENWEATHER_API_KEY in .env')
      }

      const response = await fetch(`${OPENWEATHER_BASE_URL}?${queryParams}&APPID=${apiKey}&units=metric`)
      if (!response.ok) {
        throw new Error('Unable to fetch weather right now. Try another city.')
      }

      return response.json() as Promise<{
        name: string
        main: { temp: number }
        weather: Array<{ main: string }>
        rain?: { '1h'?: number; '3h'?: number }
      }>
    },
    [],
  )

  const applyWeatherUpdate = useCallback((weather: WeatherSnapshot) => {
    setState((prev) => {
      const automated = runAutomation(
        {
          ...prev,
          weather,
          weatherError: '',
          weatherLoading: false,
        },
        weather,
      )

      const next = {
        ...automated,
        city: weather.city,
      }
      persistState(next)
      return next
    })
  }, [runAutomation])

  const fetchWeatherByCity = useCallback(
    async (city: string) => {
      if (!city.trim()) {
        return
      }

      setState((prev) => ({ ...prev, weatherLoading: true, weatherError: '' }))

      try {
        const data = await fetchFromOpenWeather(`q=${encodeURIComponent(city.trim())}`)

        const rainMm =
          typeof data.rain?.['1h'] === 'number'
            ? data.rain['1h']
            : typeof data.rain?.['3h'] === 'number'
              ? data.rain['3h'] / 3
              : 0

        applyWeatherUpdate({
          city: data.name,
          temperature: Number(data.main.temp.toFixed(1)),
          condition: data.weather?.[0]?.main ?? 'Clear',
          rainMm,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Weather service unavailable'
        setState((prev) => ({ ...prev, weatherLoading: false, weatherError: message }))
      }
    },
    [applyWeatherUpdate, fetchFromOpenWeather],
  )

  const fetchWeatherByCoords = useCallback(
    async (lat: number, lon: number) => {
      setState((prev) => ({ ...prev, weatherLoading: true, weatherError: '' }))

      try {
        const data = await fetchFromOpenWeather(`lat=${lat}&lon=${lon}`)

        const rainMm =
          typeof data.rain?.['1h'] === 'number'
            ? data.rain['1h']
            : typeof data.rain?.['3h'] === 'number'
              ? data.rain['3h'] / 3
              : 0

        applyWeatherUpdate({
          city: data.name,
          temperature: Number(data.main.temp.toFixed(1)),
          condition: data.weather?.[0]?.main ?? 'Clear',
          rainMm,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Weather service unavailable'
        setState((prev) => ({ ...prev, weatherLoading: false, weatherError: message }))
      }
    },
    [applyWeatherUpdate, fetchFromOpenWeather],
  )

  const updateUserLiveLocation = useCallback((lat: number, lng: number, accuracy: number) => {
    setState((prev) => {
      const next = {
        ...prev,
        currentLocation: {
          lat,
          lng,
          accuracy,
          updatedAt: Date.now(),
        },
      }
      persistState(next)
      return next
    })
  }, [])

  const updateUserMovementStatus = useCallback((isStationary: boolean) => {
    setState((prev) => {
      const nextMovementStatus: MovementStatus = isStationary ? 'Stationary' : 'Moving'

      let verificationStatus = prev.verificationStatus
      let verificationReason = prev.verificationReason
      let payoutEligible = prev.payoutEligible

      if (isStationary && prev.verificationStatus !== 'Verified') {
        verificationStatus = 'Pending Photo'
        verificationReason = 'Location remained constant. Geotagged photo required.'
        payoutEligible = false
      }

      if (!isStationary && prev.verificationStatus !== 'Rejected') {
        verificationStatus = 'Not Required'
        verificationReason = ''
        payoutEligible = true
      }

      const next = {
        ...prev,
        movementStatus: nextMovementStatus,
        verificationStatus,
        verificationReason,
        payoutEligible,
      }
      persistState(next)
      return next
    })
  }, [])

  const verifyUserPhotoLocation = useCallback(async (photoLat: number, photoLng: number) => {
    if (!state.currentLocation) {
      return { ok: false, error: 'Live location is unavailable. Allow location access first.' }
    }

    const distanceMeters = haversineDistanceMeters(state.currentLocation, { lat: photoLat, lng: photoLng })
    const thresholdMeters = 250
    const matched = distanceMeters <= thresholdMeters

    const record: VerificationRecord = {
      id: makeId(),
      userId: auth?.currentUser?.uid ?? 'unknown',
      userName: state.userName || 'Unknown User',
      userEmail: state.userEmail || 'Unknown Email',
      movementStatus: state.movementStatus,
      verificationStatus: matched ? 'Verified' : 'Rejected',
      verificationReason: matched
        ? 'Photo GPS matched user live location.'
        : 'Photo GPS does not match user live location.',
      payoutEligible: matched,
      liveLocation: { lat: state.currentLocation.lat, lng: state.currentLocation.lng },
      photoLocation: { lat: photoLat, lng: photoLng },
      distanceMeters,
      createdAt: Date.now(),
    }

    setState((prev) => {
      const next = {
        ...prev,
        photoLocation: { lat: photoLat, lng: photoLng },
        verificationStatus: record.verificationStatus,
        verificationReason: record.verificationReason,
        payoutEligible: matched,
        verificationRecords: [record, ...prev.verificationRecords].slice(0, 200),
      }
      persistState(next)
      return next
    })

    if (db) {
      try {
        await addDoc(collection(db, 'verification_records'), {
          userId: record.userId,
          userName: record.userName,
          userEmail: record.userEmail,
          movementStatus: record.movementStatus,
          verificationStatus: record.verificationStatus,
          verificationReason: record.verificationReason,
          payoutEligible: record.payoutEligible,
          liveLocation: record.liveLocation,
          photoLocation: record.photoLocation,
          distanceMeters: record.distanceMeters,
          createdAt: serverTimestamp(),
          createdAtMs: record.createdAt,
        })
      } catch {
        pushNotification('Verification saved locally, but cloud sync failed.', 'warning')
      }
    }

    if (matched) {
      pushNotification('Identity verified. User is eligible for payout.', 'success')
    } else {
      pushNotification('Verification failed. Payout is blocked.', 'warning')
    }

    return { ok: true, matched, distanceMeters }
  }, [pushNotification, state.currentLocation, state.movementStatus, state.userEmail, state.userName])

  const processPayment = useCallback(async () => {
    if (state.verificationStatus === 'Pending Photo' || state.verificationStatus === 'Rejected') {
      return {
        ok: false,
        error: 'Claim/payment blocked. Complete location verification first.',
      }
    }

    const currentWeekKey = getWeekKey(new Date())

    if (state.lastPayoutWeekKey === currentWeekKey) {
      return {
        ok: false,
        error: 'Weekly payout already claimed for this week.',
      }
    }

    if (state.weeklyOrders <= 0) {
      return {
        ok: false,
        error: 'Add your weekly order count before claiming payout.',
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 900))

    setState((prev) => {
      const payoutAmount = prev.weeklyOrders * prev.payoutRatePerOrder
      const next = {
        ...prev,
        coverageStatus: 'Active' as const,
        paymentStatus: 'Paid' as const,
        weeklyPayoutAmount: payoutAmount,
        lastPayoutWeekKey: currentWeekKey,
        lastPayoutAt: Date.now(),
        notifications: [
          {
            id: makeId(),
            level: 'success' as const,
            message: `Weekly payout of $${payoutAmount} sent for ${prev.weeklyOrders} orders.`,
          },
          ...prev.notifications,
        ].slice(0, 6),
      }
      persistState(next)
      return next
    })

    return { ok: true }
  }, [state.lastPayoutWeekKey, state.verificationStatus, state.weeklyOrders])

  const dismissNotification = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.filter((item) => item.id !== id),
    }))
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      registerUser,
      loginUser,
      logout,
      setOrderActive,
      startOrder,
      completeOrderWithProof,
      setCity,
      fetchWeatherByCity,
      fetchWeatherByCoords,
      updateUserLiveLocation,
      updateUserMovementStatus,
      verifyUserPhotoLocation,
      fetchVerificationRecords,
      processPayment,
      dismissNotification,
    }),
    [
      state,
      registerUser,
      loginUser,
      logout,
      setOrderActive,
      startOrder,
      completeOrderWithProof,
      setCity,
      fetchWeatherByCity,
      fetchWeatherByCoords,
      updateUserLiveLocation,
      updateUserMovementStatus,
      verifyUserPhotoLocation,
      fetchVerificationRecords,
      processPayment,
      dismissNotification,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider')
  }

  return context
}
