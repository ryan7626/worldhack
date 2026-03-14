/**
 * Reverse geocoding using OpenStreetMap Nominatim (free, no API key needed).
 * Converts GPS coordinates into a human-readable place name.
 */

interface GeoResult {
  placeName: string;
  city?: string;
  state?: string;
  country?: string;
  neighbourhood?: string;
  landmark?: string;
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeoResult | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=16&addressdetails=1`,
      {
        headers: {
          "User-Agent": "MemoryReliver/1.0 (hackathon project)",
        },
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const addr = data.address || {};

    return {
      placeName: data.display_name || "",
      city: addr.city || addr.town || addr.village || addr.hamlet,
      state: addr.state,
      country: addr.country,
      neighbourhood: addr.neighbourhood || addr.suburb || addr.quarter,
      landmark: addr.tourism || addr.historic || addr.amenity || addr.building,
    };
  } catch (error) {
    console.warn("Reverse geocoding failed:", error);
    return null;
  }
}
