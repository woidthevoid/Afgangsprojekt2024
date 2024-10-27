import { Cartographic, sampleTerrainMostDetailed, Viewer, Math as CesiumMath } from "cesium";

export class Terrain {
    private viewer: Viewer;
    private terrainCache: Map<string, { lon: number, lat: number, height: number, timestamp: number }> = new Map();  // Cache with coordinates
    private cacheDuration: number = 5 * 60 * 1000;  // Cache expiration time in milliseconds (default 5 minutes)
    private cacheTolerance: number = 0.00003;  // Tolerance for latitude/longitude comparison (~2 meters)

    constructor(viewer: Viewer) {
        this.viewer = viewer;
    }

    public async getTerrainHeight(lon: number, lat: number): Promise<number> {
        const now = Date.now();

        // Try to find a cached entry within the tolerance range
        const cached = this.findCacheEntryWithinTolerance(lon, lat);

        // If cache is valid and within the tolerance range, return it
        if (cached && now - cached.timestamp < this.cacheDuration) {
            return cached.height;
        }

        // Otherwise, sample the terrain
        const terrainHeight = await this.sampleTerrain(lon, lat);

        // Cache the result with the current timestamp and original coordinates
        this.terrainCache.set(this.getCacheKey(lon, lat), { lon, lat, height: terrainHeight, timestamp: now });

        return terrainHeight;
    }

    private async sampleTerrain(lon: number, lat: number): Promise<number> {
        const cartographicPosition = Cartographic.fromDegrees(lon, lat);
        const terrainSample = await sampleTerrainMostDetailed(this.viewer.terrainProvider, [cartographicPosition]);

        if (!terrainSample || !terrainSample[0]) {
            console.error("Failed to sample terrain.");
            return 0;
        }

        return terrainSample[0].height;  // Return the sampled terrain height
    }

    private findCacheEntryWithinTolerance(lon: number, lat: number): { lon: number, lat: number, height: number, timestamp: number } | null {
        const cachedEntries = Array.from(this.terrainCache.values());
        for (const cached of cachedEntries) {
            if (this.isWithinTolerance(lon, lat, cached.lon, cached.lat)) {
                return cached;  // Return the cached entry if within tolerance
            }
        }
        return null;
    }

    private isWithinTolerance(lon1: number, lat1: number, lon2: number, lat2: number): boolean {
        const dLon = Math.abs(lon1 - lon2);
        const dLat = Math.abs(lat1 - lat2);
        return dLon <= this.cacheTolerance && dLat <= this.cacheTolerance;
    }

    private getCacheKey(lon: number, lat: number): string {
        return `${lon.toFixed(5)},${lat.toFixed(5)}`;
    }

    public setCacheExpiration(minutes: number) {
        this.cacheDuration = minutes * 60 * 1000;  // Convert minutes to milliseconds
    }

    public setCacheTolerance(tolerance: number) {
        this.cacheTolerance = tolerance;  // Set the latitude/longitude tolerance
    }

    public clearCache() {
        this.terrainCache.clear();
    }

    // Set cache tolerance. Lower tolerance in meters = more precise plot lone
    public setCacheToleranceInMeters(meters: number, latitude: number) {
        if (meters === 0 || meters < 0) {
            this.cacheTolerance = 0;  // Turn off tolerance (exact match only)
        } else {
            // Convert meters to degrees
            const latTolerance = meters / 111320;  // Latitude tolerance (degrees)
            const lonTolerance = meters / (111320 * Math.cos(CesiumMath.toRadians(latitude)));  // Longitude tolerance (degrees)
            
            // Use the larger tolerance for both lat/lon
            this.cacheTolerance = Math.max(latTolerance, lonTolerance);
            console.log(this.cacheTolerance)
        }
    }
}