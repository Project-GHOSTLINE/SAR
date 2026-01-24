'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon issue with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface UserLocation {
  city: string
  country: string
  users: number
  sessions: number
  lat: number
  lng: number
}

interface UserMapProps {
  locations: Array<{
    city: string
    country: string
    users: number
    sessions: number
  }>
}

// Coordonnées des principales villes canadiennes
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  // Québec
  'Montreal': { lat: 45.5017, lng: -73.5673 },
  'Quebec City': { lat: 46.8139, lng: -71.2080 },
  'Laval': { lat: 45.6066, lng: -73.7124 },
  'Gatineau': { lat: 45.4765, lng: -75.7013 },
  'Longueuil': { lat: 45.5312, lng: -73.5186 },
  'Sherbrooke': { lat: 45.4042, lng: -71.8929 },
  'Saguenay': { lat: 48.4284, lng: -71.0656 },
  'Lévis': { lat: 46.8037, lng: -71.1778 },
  'Trois-Rivières': { lat: 46.3432, lng: -72.5424 },
  'Terrebonne': { lat: 45.7010, lng: -73.6471 },

  // Ontario
  'Toronto': { lat: 43.6532, lng: -79.3832 },
  'Ottawa': { lat: 45.4215, lng: -75.6972 },
  'Mississauga': { lat: 43.5890, lng: -79.6441 },
  'Brampton': { lat: 43.7315, lng: -79.7624 },
  'Hamilton': { lat: 43.2557, lng: -79.8711 },
  'London': { lat: 42.9849, lng: -81.2453 },
  'Markham': { lat: 43.8561, lng: -79.3370 },
  'Vaughan': { lat: 43.8371, lng: -79.4983 },
  'Kitchener': { lat: 43.4516, lng: -80.4925 },
  'Windsor': { lat: 42.3149, lng: -83.0364 },

  // Alberta
  'Calgary': { lat: 51.0447, lng: -114.0719 },
  'Edmonton': { lat: 53.5461, lng: -113.4938 },
  'Red Deer': { lat: 52.2681, lng: -113.8111 },
  'Lethbridge': { lat: 49.6934, lng: -112.8416 },

  // Colombie-Britannique
  'Vancouver': { lat: 49.2827, lng: -123.1207 },
  'Surrey': { lat: 49.1913, lng: -122.8490 },
  'Burnaby': { lat: 49.2488, lng: -122.9805 },
  'Richmond': { lat: 49.1666, lng: -123.1336 },
  'Victoria': { lat: 48.4284, lng: -123.3656 },

  // Manitoba
  'Winnipeg': { lat: 49.8951, lng: -97.1384 },

  // Saskatchewan
  'Saskatoon': { lat: 52.1332, lng: -106.6700 },
  'Regina': { lat: 50.4452, lng: -104.6189 },

  // Nouvelle-Écosse
  'Halifax': { lat: 44.6488, lng: -63.5752 },

  // Nouveau-Brunswick
  'Moncton': { lat: 46.0878, lng: -64.7782 },

  // Terre-Neuve
  'St. John\'s': { lat: 47.5615, lng: -52.7126 },

  // Default Canada center
  'Canada': { lat: 56.1304, lng: -106.3468 }
}

// Créer une icône customisée avec le nombre d'utilisateurs
function createNumberIcon(users: number): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
        border-radius: 50%;
        width: ${Math.min(60, 30 + Math.log(users) * 5)}px;
        height: ${Math.min(60, 30 + Math.log(users) * 5)}px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: ${Math.min(16, 10 + Math.log(users))}px;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      ">
        ${users >= 1000 ? `${(users / 1000).toFixed(1)}k` : users}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

function MapUpdater({ locations }: { locations: UserLocation[] }) {
  const map = useMap()

  useEffect(() => {
    if (locations.length > 0) {
      const bounds = L.latLngBounds(locations.map(loc => [loc.lat, loc.lng]))
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 })
    }
  }, [locations, map])

  return null
}

export default function UserMap({ locations }: UserMapProps) {
  const [mounted, setMounted] = useState(false)
  const [mapType, setMapType] = useState<'satellite' | 'street'>('satellite')

  useEffect(() => {
    setMounted(true)
  }, [])

  // Enrichir les locations avec les coordonnées
  const enrichedLocations: UserLocation[] = locations
    .map(loc => {
      const coords = CITY_COORDS[loc.city] || CITY_COORDS[loc.country] || null
      if (!coords) return null
      return {
        ...loc,
        lat: coords.lat,
        lng: coords.lng,
      }
    })
    .filter((loc): loc is UserLocation => loc !== null)

  if (!mounted) {
    return (
      <div className="w-full h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Chargement de la carte...</p>
      </div>
    )
  }

  const center: [number, number] = enrichedLocations.length > 0
    ? [enrichedLocations[0].lat, enrichedLocations[0].lng]
    : [45.5017, -73.5673] // Montreal par défaut

  return (
    <div className="relative">
      {/* Sélecteur de type de carte */}
      <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg overflow-hidden">
        <button
          onClick={() => setMapType('satellite')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            mapType === 'satellite'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Satellite
        </button>
        <button
          onClick={() => setMapType('street')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            mapType === 'street'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Carte
        </button>
      </div>

      <MapContainer
        center={center}
        zoom={5}
        style={{ height: '500px', width: '100%', borderRadius: '0.5rem' }}
        className="z-0"
      >
        {mapType === 'satellite' ? (
          <TileLayer
            attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}

        {enrichedLocations.map((location, idx) => (
          <Marker
            key={idx}
            position={[location.lat, location.lng]}
            icon={createNumberIcon(location.users)}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-lg text-gray-900">
                  {location.city}, {location.country}
                </h3>
                <div className="mt-2 space-y-1 text-sm">
                  <p className="text-blue-600 font-semibold">
                    👥 {location.users.toLocaleString()} utilisateurs
                  </p>
                  <p className="text-gray-600">
                    📊 {location.sessions.toLocaleString()} sessions
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        <MapUpdater locations={enrichedLocations} />
      </MapContainer>

      {/* Légende */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Légende</h4>
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-full"></div>
            <span>Nombre d'utilisateurs (taille proportionnelle)</span>
          </div>
          <div className="text-gray-500">
            {enrichedLocations.length} villes affichées sur {locations.length} total
          </div>
        </div>
      </div>
    </div>
  )
}
