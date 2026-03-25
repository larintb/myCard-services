'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface MapboxMapProps {
  address: string
  businessName: string
  className?: string
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

async function geocodeAddress(address: string): Promise<[number, number] | null> {
  if (!MAPBOX_TOKEN) return null
  try {
    const query = encodeURIComponent(address)
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${MAPBOX_TOKEN}&limit=1`
    const res = await fetch(url)
    const data = await res.json()
    const feature = data.features?.[0]
    if (!feature) return null
    return feature.center as [number, number] // [lng, lat]
  } catch {
    return null
  }
}

export function MapboxMap({ address, businessName, className = '' }: MapboxMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!address?.trim()) {
      setError(null)
      setIsLoaded(false)
      return
    }

    if (!MAPBOX_TOKEN) {
      setError('Token de Mapbox no configurado')
      return
    }

    let cancelled = false

    const initMap = async () => {
      const coords = await geocodeAddress(address)

      if (cancelled) return

      if (!coords || !mapContainerRef.current) {
        setError('No se pudo cargar el mapa para esta dirección')
        return
      }

      // Clean up previous map instance
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }

      mapboxgl.accessToken = MAPBOX_TOKEN

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: coords,
        zoom: 15,
        attributionControl: true
      })

      map.addControl(new mapboxgl.NavigationControl(), 'top-right')
      map.addControl(new mapboxgl.FullscreenControl())

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding:6px 4px; max-width:180px;">
          <strong style="font-size:14px;">${businessName}</strong>
          <p style="margin:4px 0 8px; font-size:12px; color:#555;">${address}</p>
          <a
            href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}"
            target="_blank"
            rel="noopener noreferrer"
            style="font-size:12px; color:#1976d2; text-decoration:underline;"
          >Cómo llegar</a>
        </div>
      `)

      new mapboxgl.Marker({ color: '#6366F1' })
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(map)

      map.on('load', () => {
        if (!cancelled) setIsLoaded(true)
      })

      mapRef.current = map
    }

    initMap()

    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [address, businessName])

  if (!address?.trim()) {
    return (
      <div className={`${className} h-64 rounded-lg p-6 text-center flex flex-col justify-center bg-gray-50 border-2 border-dashed border-gray-300`}>
        <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        </svg>
        <p className="text-gray-500">No hay dirección para mostrar</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${className} h-64 rounded-lg p-6 text-center flex flex-col justify-center bg-gray-50 border-2 border-dashed border-gray-300`}>
        <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{businessName}</h3>
        <p className="text-sm text-gray-600 mb-4">{address}</p>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
        >
          Ver en mapa
        </a>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <div
        ref={mapContainerRef}
        className="w-full h-full min-h-[300px] rounded-lg overflow-hidden"
      />
      {!isLoaded && (
        <div className="absolute inset-0 rounded-lg flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Cargando mapa...</p>
          </div>
        </div>
      )}
    </div>
  )
}
