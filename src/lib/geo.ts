/**
 * Distancia en km entre dos puntos (fórmula de Haversine).
 */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Distancia total en km de un array de puntos (suma de segmentos).
 */
export function totalDistanceKm(
  points: { lat: number; lng: number }[]
): number {
  if (points.length < 2) return 0
  let sum = 0
  for (let i = 1; i < points.length; i++) {
    sum += distanceKm(
      points[i - 1].lat,
      points[i - 1].lng,
      points[i].lat,
      points[i].lng
    )
  }
  return sum
}
