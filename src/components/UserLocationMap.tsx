import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import { useAppContext } from '../context/AppContext'

type LatLng = {
  lat: number
  lng: number
}

type LivePosition = LatLng & {
  accuracy: number
  updatedAt: number
}

const fallbackCenter: LatLng = {
  lat: 19.076,
  lng: 72.8777,
}

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function RecenterMap({ target }: { target: LatLng }) {
  const map = useMap()

  useEffect(() => {
    map.setView(target)
  }, [map, target])

  return null
}

function distanceMeters(a: LatLng, b: LatLng) {
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

export function UserLocationMap() {
  const {
    state,
    updateUserLiveLocation,
    updateUserMovementStatus,
    completeOrderWithProof,
  } = useAppContext()

  const [position, setPosition] = useState<LivePosition | null>(null)
  const samplesRef = useRef<LatLng[]>([])
  const [uploadMessage, setUploadMessage] = useState('')
  const [cameraError, setCameraError] = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)
  const [capturedPreview, setCapturedPreview] = useState('')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [geoError, setGeoError] = useState(() => {
    if (typeof navigator !== 'undefined' && !navigator.geolocation) {
      return 'Geolocation is not supported on this device.'
    }

    return ''
  })

  useEffect(() => {
    if (!state.isOrderActive) {
      return
    }

    samplesRef.current = []

    if (!navigator.geolocation) {
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setGeoError('')
        const next = {
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: coords.accuracy,
          updatedAt: Date.now(),
        }

        setPosition(next)
        updateUserLiveLocation(next.lat, next.lng, next.accuracy)
        samplesRef.current = [...samplesRef.current, { lat: next.lat, lng: next.lng }].slice(-6)

        if (samplesRef.current.length >= 4) {
          const pivot = samplesRef.current[0]
          const maxDistance = Math.max(...samplesRef.current.map((item) => distanceMeters(pivot, item)))
          updateUserMovementStatus(maxDistance <= 60)
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError('Location access was denied. Enable location permission to show your live map.')
          return
        }

        setGeoError('Unable to fetch your current location right now.')
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      },
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [state.isOrderActive, updateUserLiveLocation, updateUserMovementStatus])

  const activePosition = state.isOrderActive ? position : null
  const center = activePosition ?? fallbackCenter
  const lastUpdated = useMemo(() => {
    if (!activePosition) {
      return 'Waiting for location...'
    }

    return new Date(activePosition.updatedAt).toLocaleTimeString()
  }, [activePosition])

  const stopCamera = () => {
    if (!streamRef.current) {
      return
    }

    streamRef.current.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  useEffect(() => {
    if (!state.isOrderActive) {
      stopCamera()
    }
  }, [state.isOrderActive])

  const openCamera = async () => {
    if (!state.isOrderActive) {
      setCameraError('Camera verification is available only when an order is active.')
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not supported on this device.')
      return
    }

    if (!position) {
      setCameraError('Live location is unavailable. Enable location access first.')
      return
    }

    try {
      setCameraError('')
      setUploadMessage('')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })

      streamRef.current = stream
      setCameraOpen(true)

      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          void videoRef.current.play()
        }
      }, 0)
    } catch {
      setCameraError('Unable to open camera. Please allow camera permission.')
      stopCamera()
    }
  }

  const captureAndVerify = async () => {
    if (!videoRef.current || !position) {
      setCameraError('Camera or location is not ready yet.')
      return
    }

    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setCameraError('Unable to process camera frame.')
      return
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const tagText = `LAT ${position.lat.toFixed(6)}  LNG ${position.lng.toFixed(6)}  ${new Date(position.updatedAt).toLocaleString()}`
    const tagPadding = 10
    const tagHeight = 38
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
    ctx.fillRect(12, canvas.height - tagHeight - 12, canvas.width - 24, tagHeight)
    ctx.font = '600 16px Inter, sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(tagText, 12 + tagPadding, canvas.height - 12 - tagPadding)

    const preview = canvas.toDataURL('image/jpeg', 0.92)
    setCapturedPreview(preview)

    const result = completeOrderWithProof(preview, position.lat, position.lng)

    if (!result.ok) {
      setUploadMessage(result.error ?? 'Unable to complete order with proof photo.')
      return
    }

    setUploadMessage('Order completed successfully. Proof photo accepted.')

    stopCamera()
    setCameraOpen(false)
  }

  return (
    <section className="animate-fade-up mt-10 rounded-3xl bg-neutral-50 p-6 md:p-8">
      <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">Your Live Location</h2>
      <p className="mt-2 text-neutral-600">
        This map tracks the logged-in user position in real time only during active order delivery.
      </p>

      {!state.isOrderActive ? (
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-[0_10px_28px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-medium text-neutral-800">No active order.</p>
          <p className="mt-1 text-sm text-neutral-600">
            Map and GPS tracking are turned off. Start an active order from the dashboard to enable live tracking.
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-neutral-600">
        <span>Last updated: {lastUpdated}</span>
        {activePosition ? <span>Accuracy: {Math.round(activePosition.accuracy)} m</span> : null}
      </div>

      {geoError ? <p className="mt-4 text-sm text-neutral-700">{geoError}</p> : null}

      {state.isOrderActive ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200">
          <MapContainer
            center={center}
            zoom={activePosition ? 16 : 12}
            scrollWheelZoom
            className="h-[360px] w-full"
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {activePosition ? (
              <>
                <RecenterMap target={activePosition} />
                <Marker position={activePosition} icon={markerIcon}>
                  <Popup>You are here.</Popup>
                </Marker>
                <Circle center={activePosition} radius={Math.max(activePosition.accuracy, 10)} pathOptions={{ color: '#171717' }} />
                {state.activeOrder ? (
                  <>
                    <Marker position={state.activeOrder.destination} icon={markerIcon}>
                      <Popup>{state.activeOrder.destination.label}</Popup>
                    </Marker>
                    <Polyline positions={state.activeOrder.route} pathOptions={{ color: '#0f172a', weight: 4, opacity: 0.7 }} />
                  </>
                ) : null}
              </>
            ) : null}
          </MapContainer>
        </div>
      ) : null}

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-[0_14px_36px_rgba(0,0,0,0.06)]">
        <h3 className="text-lg font-semibold text-neutral-900">Delivery Completion Proof</h3>
        <p className="mt-2 text-sm text-neutral-600">
          After reaching destination, open camera and capture proof photo. Order will be marked completed only if you are near destination.
        </p>

        <div className="mt-4 grid gap-3 text-sm text-neutral-700 sm:grid-cols-2">
          <p>Order ID: <strong>{state.activeOrder?.id ?? 'No active order'}</strong></p>
          <p>Destination: <strong>{state.activeOrder?.destination.label ?? 'N/A'}</strong></p>
          <p>Movement status: <strong>{state.movementStatus}</strong></p>
          <p>Active order status: <strong>{state.activeOrder ? 'Active' : 'No active order'}</strong></p>
        </div>

        {state.isOrderActive && state.activeOrder ? (
          <div className="mt-4">
            <label className="block text-sm font-medium text-neutral-700">Capture destination proof</label>
            <p className="mt-1 text-xs text-neutral-500">
              Gallery uploads are not accepted. Capture with live location tag to complete order.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  void openCamera()
                }}
                className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white"
              >
                Open Camera
              </button>
              {cameraOpen ? (
                <button
                  type="button"
                  onClick={() => {
                    void captureAndVerify()
                  }}
                  className="rounded-full bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-900"
                >
                  Capture + Verify
                </button>
              ) : null}
              {cameraOpen ? (
                <button
                  type="button"
                  onClick={() => {
                    stopCamera()
                    setCameraOpen(false)
                  }}
                  className="rounded-full bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-700"
                >
                  Close Camera
                </button>
              ) : null}
            </div>

            {cameraOpen ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 bg-black">
                <div className="relative">
                  <video ref={videoRef} className="h-[300px] w-full object-cover" muted playsInline />
                  <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-lg bg-black/60 px-3 py-2 text-xs font-medium text-white">
                    LAT {position?.lat.toFixed(6) ?? '---'} | LNG {position?.lng.toFixed(6) ?? '---'} | {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {cameraError ? <p className="mt-3 text-sm text-neutral-700">{cameraError}</p> : null}
        {uploadMessage ? <p className="mt-3 text-sm text-neutral-700">{uploadMessage}</p> : null}

        {capturedPreview ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200">
            <img src={capturedPreview} alt="Captured geotag preview" className="w-full" />
          </div>
        ) : null}
      </section>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-[0_14px_36px_rgba(0,0,0,0.06)]">
        <h3 className="text-lg font-semibold text-neutral-900">Profile Snapshot</h3>
        <p className="mt-2 text-sm text-neutral-600">
          Verification data shown here is also persisted for the admin portal history review.
        </p>

        <div className="mt-4 grid gap-3 text-sm text-neutral-700 sm:grid-cols-2">
          <p>Name: <strong>{state.userName || 'Unknown User'}</strong></p>
          <p>Email: <strong>{state.userEmail || 'Unknown Email'}</strong></p>
          <p>
            Live location:
            {' '}
            <strong>
              {state.currentLocation ? `${state.currentLocation.lat.toFixed(6)}, ${state.currentLocation.lng.toFixed(6)}` : 'Not available'}
            </strong>
          </p>
          <p>
            Photo location:
            {' '}
            <strong>
              {state.photoLocation ? `${state.photoLocation.lat.toFixed(6)}, ${state.photoLocation.lng.toFixed(6)}` : 'Not uploaded'}
            </strong>
          </p>
          <p>Verification status: <strong>{state.verificationStatus}</strong></p>
          <p>Payout decision: <strong>{state.payoutEligible ? 'Approve payout' : 'Reject payout'}</strong></p>
        </div>
      </section>
    </section>
  )
}
