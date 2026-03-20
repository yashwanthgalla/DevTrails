import { useEffect, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Polyline, TileLayer, useMapEvents } from 'react-leaflet'
import { useAppContext } from '../context/AppContext'
import { UserLocationMap } from '../components/UserLocationMap'

type PickMode = 'start' | 'destination'

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function MapClickPicker({
  mode,
  onPick,
}: {
  mode: PickMode
  onPick: (mode: PickMode, lat: number, lng: number) => void
}) {
  useMapEvents({
    click: (event) => {
      onPick(mode, event.latlng.lat, event.latlng.lng)
    },
  })

  return null
}

function labelClass(value: string) {
  if (value === '🔴 High Risk' || value === 'Inactive' || value === 'Pending') {
    return 'bg-neutral-200 text-neutral-900'
  }

  if (value === '🟡 Medium Risk') {
    return 'bg-neutral-100 text-neutral-700'
  }

  return 'bg-neutral-900 text-white'
}

export function DashboardPage() {
  const {
    state,
    setOrderActive,
    startOrder,
    setCity,
    fetchWeatherByCity,
    fetchWeatherByCoords,
  } = useAppContext()

  const [cityInput, setCityInput] = useState(state.city)
  const [startLabel, setStartLabel] = useState('Pickup Point')
  const [startLat, setStartLat] = useState('19.0760')
  const [startLng, setStartLng] = useState('72.8777')
  const [destinationLabel, setDestinationLabel] = useState('Customer Address')
  const [destinationLat, setDestinationLat] = useState('19.0920')
  const [destinationLng, setDestinationLng] = useState('72.9050')
  const [pickMode, setPickMode] = useState<PickMode>('start')
  const [orderError, setOrderError] = useState('')

  const parsedStartLat = Number(startLat)
  const parsedStartLng = Number(startLng)
  const parsedDestinationLat = Number(destinationLat)
  const parsedDestinationLng = Number(destinationLng)

  const selectedStart = Number.isFinite(parsedStartLat) && Number.isFinite(parsedStartLng)
    ? { lat: parsedStartLat, lng: parsedStartLng }
    : null

  const selectedDestination = Number.isFinite(parsedDestinationLat) && Number.isFinite(parsedDestinationLng)
    ? { lat: parsedDestinationLat, lng: parsedDestinationLng }
    : null

  const pickerCenter = selectedStart ?? { lat: 19.076, lng: 72.8777 }

  useEffect(() => {
    const city = state.city.trim()
    if (!city) {
      return
    }

    void fetchWeatherByCity(city)

    const intervalId = window.setInterval(() => {
      void fetchWeatherByCity(city)
    }, 180000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [fetchWeatherByCity, state.city])

  const onSearchCity = async () => {
    const city = cityInput.trim()
    if (!city) {
      return
    }

    setCity(city)
    await fetchWeatherByCity(city)
  }

  const onUseMyLocation = async () => {
    if (!navigator.geolocation) {
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        void fetchWeatherByCoords(coords.latitude, coords.longitude)
      },
      () => {
        // Geolocation permission errors are silent to keep UX minimal.
      },
    )
  }

  const onStartOrder = () => {
    setOrderError('')
    const result = startOrder(
      {
        label: startLabel.trim() || 'Pickup Point',
        lat: Number(startLat),
        lng: Number(startLng),
      },
      {
        label: destinationLabel.trim() || 'Customer Address',
        lat: Number(destinationLat),
        lng: Number(destinationLng),
      },
    )

    if (!result.ok) {
      setOrderError(result.error ?? 'Unable to start order.')
    }
  }

  const onMapPick = (mode: PickMode, lat: number, lng: number) => {
    if (mode === 'start') {
      setStartLat(lat.toFixed(6))
      setStartLng(lng.toFixed(6))
      return
    }

    setDestinationLat(lat.toFixed(6))
    setDestinationLng(lng.toFixed(6))
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 pb-20 pt-10 md:px-10 md:pb-28 md:pt-12">
      <section className="animate-fade-up">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 md:text-5xl">Worker Dashboard</h1>
        <p className="mt-3 max-w-2xl text-neutral-600">
          Real-time protection status powered by live weather monitoring and automatic insurance automation.
        </p>
      </section>

      <section className="animate-fade-up mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-3xl bg-white p-5 shadow-[0_14px_38px_rgba(0,0,0,0.07)]">
          <p className="text-xs uppercase tracking-[0.13em] text-neutral-500">Order Delivery</p>
          <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${state.isOrderActive ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-900'}`}>
            {state.isOrderActive ? 'Active' : 'Inactive'}
          </span>
          {state.activeOrder ? (
            <p className="mt-3 text-xs text-neutral-600">
              Order: {state.activeOrder.id} | {state.activeOrder.start.label} to {state.activeOrder.destination.label}
            </p>
          ) : null}
          {state.isOrderActive ? (
            <button
              type="button"
              onClick={() => setOrderActive(false)}
              className="mt-4 inline-flex rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white"
            >
              Cancel Active Order
            </button>
          ) : null}
        </article>

        <article className="rounded-3xl bg-white p-5 shadow-[0_14px_38px_rgba(0,0,0,0.07)]">
          <p className="text-xs uppercase tracking-[0.13em] text-neutral-500">Coverage Status</p>
          <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${labelClass(state.coverageStatus)}`}>
            {state.coverageStatus}
          </span>
        </article>

        <article className="rounded-3xl bg-white p-5 shadow-[0_14px_38px_rgba(0,0,0,0.07)]">
          <p className="text-xs uppercase tracking-[0.13em] text-neutral-500">Weekly Premium</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-neutral-900">${state.weeklyPremium}</p>
        </article>

        <article className="rounded-3xl bg-white p-5 shadow-[0_14px_38px_rgba(0,0,0,0.07)]">
          <p className="text-xs uppercase tracking-[0.13em] text-neutral-500">Risk Status</p>
          <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${labelClass(state.riskStatus)}`}>
            {state.riskStatus}
          </span>
        </article>

        <article className="rounded-3xl bg-white p-5 shadow-[0_14px_38px_rgba(0,0,0,0.07)]">
          <p className="text-xs uppercase tracking-[0.13em] text-neutral-500">Last Claim Status</p>
          <p className="mt-3 text-sm leading-relaxed text-neutral-700">{state.lastClaimStatus}</p>
        </article>

        <article className="rounded-3xl bg-white p-5 shadow-[0_14px_38px_rgba(0,0,0,0.07)]">
          <p className="text-xs uppercase tracking-[0.13em] text-neutral-500">Payment Status</p>
          <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${labelClass(state.paymentStatus)}`}>
            {state.paymentStatus}
          </span>
        </article>
      </section>

      <p className="mt-6 text-sm text-neutral-600">
        GPS tracking and map are {state.isOrderActive ? 'ON because an order is active.' : 'OFF because no order is active.'}
      </p>

      {!state.isOrderActive ? (
        <section className="animate-fade-up mt-6 rounded-3xl bg-neutral-50 p-6 md:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">Start New Order</h2>
          <p className="mt-2 text-neutral-600">
            Enter pickup and destination details to start delivery tracking and map route.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPickMode('start')}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${pickMode === 'start' ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-800'}`}
            >
              Select Start On Map
            </button>
            <button
              type="button"
              onClick={() => setPickMode('destination')}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${pickMode === 'destination' ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-800'}`}
            >
              Select Destination On Map
            </button>
            <p className="self-center text-xs text-neutral-600">
              Click map to set: {pickMode === 'start' ? 'Start point' : 'Destination point'}
            </p>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200">
            <MapContainer center={pickerCenter} zoom={13} scrollWheelZoom className="h-[320px] w-full">
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickPicker mode={pickMode} onPick={onMapPick} />
              {selectedStart ? <Marker position={selectedStart} icon={markerIcon} /> : null}
              {selectedDestination ? <Marker position={selectedDestination} icon={markerIcon} /> : null}
              {selectedStart && selectedDestination ? (
                <Polyline positions={[selectedStart, selectedDestination]} pathOptions={{ color: '#171717', weight: 4, opacity: 0.7 }} />
              ) : null}
            </MapContainer>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <input value={startLabel} onChange={(event) => setStartLabel(event.target.value)} placeholder="Pickup label" className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-900" />
            <input value={destinationLabel} onChange={(event) => setDestinationLabel(event.target.value)} placeholder="Destination label" className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-900" />
            <input value={startLat} onChange={(event) => setStartLat(event.target.value)} placeholder="Pickup latitude" className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-900" />
            <input value={startLng} onChange={(event) => setStartLng(event.target.value)} placeholder="Pickup longitude" className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-900" />
            <input value={destinationLat} onChange={(event) => setDestinationLat(event.target.value)} placeholder="Destination latitude" className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-900" />
            <input value={destinationLng} onChange={(event) => setDestinationLng(event.target.value)} placeholder="Destination longitude" className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-900" />
          </div>

          <button
            type="button"
            onClick={onStartOrder}
            className="mt-4 inline-flex rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white"
          >
            Start Order
          </button>
          {orderError ? <p className="mt-3 text-sm text-neutral-700">{orderError}</p> : null}
        </section>
      ) : null}

      <section className="animate-fade-up mt-10 rounded-3xl bg-neutral-50 p-6 md:p-8">
        <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">Weather Monitoring</h2>
        <p className="mt-2 text-neutral-600">
          OpenWeather powers disruption detection for automatic claims and risk alerts.
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          Auto-refresh is enabled every 3 minutes.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            value={cityInput}
            onChange={(event) => setCityInput(event.target.value)}
            placeholder="Enter city"
            className="w-full rounded-full border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none ring-neutral-900 transition focus:ring-2"
          />
          <button
            type="button"
            onClick={onSearchCity}
            className="rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
            disabled={state.weatherLoading}
          >
            {state.weatherLoading ? 'Checking...' : 'Check Weather'}
          </button>
          <button
            type="button"
            onClick={onUseMyLocation}
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-neutral-700"
          >
            Use My Location
          </button>
        </div>

        {state.weatherError ? (
          <p className="mt-4 text-sm text-neutral-600">{state.weatherError}</p>
        ) : null}

        {state.weather ? (
          <div className="mt-6 grid gap-3 rounded-2xl bg-white p-5 shadow-[0_14px_36px_rgba(0,0,0,0.06)] sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">City</p>
              <p className="mt-1 text-lg font-semibold text-neutral-900">{state.weather.city}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Temperature</p>
              <p className="mt-1 text-lg font-semibold text-neutral-900">{state.weather.temperature}°C</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Condition</p>
              <p className="mt-1 text-lg font-semibold text-neutral-900">{state.weather.condition}</p>
              <p className="text-sm text-neutral-500">Rain: {state.weather.rainMm.toFixed(1)} mm/hr</p>
            </div>
          </div>
        ) : null}
      </section>

      <UserLocationMap />
    </div>
  )
}