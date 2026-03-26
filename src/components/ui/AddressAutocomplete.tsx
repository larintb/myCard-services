'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export interface AddressDetails {
  fullAddress: string
  streetNumber?: string
  route?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  placeId?: string
  latitude?: number
  longitude?: number
}

interface MapboxFeature {
  id: string
  place_name: string
  center: [number, number]   // [lng, lat]
  text: string               // street name
  address?: string           // house number
  context?: Array<{
    id: string
    text: string
  }>
}

interface AddressAutocompleteProps {
  onAddressSelect: (address: AddressDetails) => void
  placeholder?: string
  className?: string
  initialValue?: string
  disabled?: boolean
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

function parseMapboxFeature(feature: MapboxFeature): AddressDetails {
  const details: AddressDetails = {
    fullAddress: feature.place_name,
    placeId: feature.id,
    longitude: feature.center[0],
    latitude: feature.center[1],
    route: feature.text,
    streetNumber: feature.address
  }

  if (feature.context) {
    for (const ctx of feature.context) {
      const type = ctx.id.split('.')[0]
      switch (type) {
        case 'place':
        case 'locality':
          details.city = ctx.text
          break
        case 'region':
          details.state = ctx.text
          break
        case 'country':
          details.country = ctx.text
          break
        case 'postcode':
          details.postalCode = ctx.text
          break
      }
    }
  }

  return details
}

export function AddressAutocomplete({
  onAddressSelect,
  placeholder = 'Ingresa la dirección...',
  className = '',
  initialValue = '',
  disabled = false
}: AddressAutocompleteProps) {
  const [value, setValue] = useState(initialValue)
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!MAPBOX_TOKEN) {
      setError('Token de Mapbox no configurado')
      return
    }

    setIsLoading(true)
    try {
      const encoded = encodeURIComponent(query)
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${MAPBOX_TOKEN}&types=address&limit=5&language=es&country=MX`
      const res = await fetch(url)
      const data = await res.json()
      setSuggestions(data.features ?? [])
      setIsOpen(true)
      setError(null)
    } catch {
      setError('Error al cargar sugerencias')
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setValue(query)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length < 3) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(query)
    }, 300)
  }

  const handleSelect = (feature: MapboxFeature) => {
    setValue(feature.place_name)
    setSuggestions([])
    setIsOpen(false)
    onAddressSelect(parseMapboxFeature(feature))
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-app bg-card ${
          error ? 'border-red-300 bg-red-50' : 'border-gray-300'
        }`}
      />

      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {suggestions.map((feature) => (
            <li
              key={feature.id}
              onMouseDown={() => handleSelect(feature)}
              className="px-4 py-3 text-sm text-gray-800 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
            >
              <span className="font-medium">{feature.text}</span>
              {feature.address && (
                <span className="text-gray-500"> {feature.address}</span>
              )}
              <p className="text-xs text-gray-400 mt-0.5 truncate">{feature.place_name}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
