import * as turf from '@turf/turf';

// Geospatial utility functions using Turf.js

/**
 * Calculate distance between two points using Haversine formula
 * @param from - Starting point [longitude, latitude]
 * @param to - Ending point [longitude, latitude]
 * @returns Distance in meters
 */
export function calculateDistance(
    from: [number, number],
    to: [number, number]
): number {
    const point1 = turf.point(from);
    const point2 = turf.point(to);
    return turf.distance(point1, point2, { units: 'meters' });
}

/**
 * Calculate area of a polygon
 * @param coordinates - Array of [longitude, latitude] points forming a polygon
 * @returns Area in square meters
 */
export function calculateArea(coordinates: number[][]): number {
    // Close the polygon if not already closed
    const coords = [...coordinates];
    if (
        coords[0][0] !== coords[coords.length - 1][0] ||
        coords[0][1] !== coords[coords.length - 1][1]
    ) {
        coords.push(coords[0]);
    }

    const polygon = turf.polygon([coords]);
    return turf.area(polygon);
}

/**
 * Calculate bearing between two points
 * @param from - Starting point [longitude, latitude]
 * @param to - Ending point [longitude, latitude]
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(
    from: [number, number],
    to: [number, number]
): number {
    const point1 = turf.point(from);
    const point2 = turf.point(to);
    return turf.bearing(point1, point2);
}

/**
 * Generate grid pattern flight path
 * @param polygon - Survey area polygon coordinates
 * @param altitude - Flight altitude in meters
 * @param spacing - Distance between parallel lines in meters
 * @param angle - Grid angle in degrees (0 = North-South)
 * @returns Array of waypoints [longitude, latitude, altitude]
 */
export function generateGridPattern(
    polygon: number[][],
    altitude: number,
    spacing: number = 50,
    _angle: number = 0
): Array<[number, number, number]> {
    const coords = [...polygon];
    if (
        coords[0][0] !== coords[coords.length - 1][0] ||
        coords[0][1] !== coords[coords.length - 1][1]
    ) {
        coords.push(coords[0]);
    }

    const turfPolygon = turf.polygon([coords]);
    const bbox = turf.bbox(turfPolygon);

    // Calculate grid lines
    const waypoints: Array<[number, number, number]> = [];
    const [minLng, minLat, maxLng, maxLat] = bbox;

    // Convert spacing from meters to degrees (approximate)
    const spacingDegrees = spacing / 111320; // 1 degree ≈ 111.32 km at equator

    let currentLat = minLat;
    let direction = 1; // 1 for left-to-right, -1 for right-to-left (boustrophedon)

    while (currentLat <= maxLat) {
        const lineStart = direction === 1 ? [minLng, currentLat] : [maxLng, currentLat];
        const lineEnd = direction === 1 ? [maxLng, currentLat] : [minLng, currentLat];

        const line = turf.lineString([lineStart, lineEnd]);
        const intersection = turf.lineIntersect(line, turfPolygon);

        if (intersection.features.length >= 2) {
            const points = intersection.features.map(f => f.geometry.coordinates);

            if (direction === 1) {
                waypoints.push([points[0][0], points[0][1], altitude]);
                waypoints.push([points[points.length - 1][0], points[points.length - 1][1], altitude]);
            } else {
                waypoints.push([points[points.length - 1][0], points[points.length - 1][1], altitude]);
                waypoints.push([points[0][0], points[0][1], altitude]);
            }
        }

        currentLat += spacingDegrees;
        direction *= -1; // Alternate direction for efficiency
    }

    return waypoints;
}

/**
 * Generate perimeter pattern flight path
 * @param polygon - Survey area polygon coordinates
 * @param altitude - Flight altitude in meters
 * @param offset - Offset from boundary in meters (negative = inside)
 * @returns Array of waypoints [longitude, latitude, altitude]
 */
export function generatePerimeterPattern(
    polygon: number[][],
    altitude: number,
    offset: number = -10
): Array<[number, number, number]> {
    const coords = [...polygon];
    if (
        coords[0][0] !== coords[coords.length - 1][0] ||
        coords[0][1] !== coords[coords.length - 1][1]
    ) {
        coords.push(coords[0]);
    }

    const turfPolygon = turf.polygon([coords]);

    // Create buffer (offset) if needed
    let finalPolygon = turfPolygon;
    if (offset !== 0) {
        const buffered = turf.buffer(turfPolygon, offset, { units: 'meters' });
        if (buffered) {
            finalPolygon = buffered;
        }
    }

    // Get coordinates and add altitude
    const perimeterCoords = turf.getCoords(finalPolygon)[0];
    return perimeterCoords.map((coord: number[]) => [coord[0], coord[1], altitude]);
}

/**
 * Generate crosshatch pattern flight path (grid with perpendicular passes)
 * @param polygon - Survey area polygon coordinates
 * @param altitude - Flight altitude in meters
 * @param spacing - Distance between parallel lines in meters
 * @returns Array of waypoints [longitude, latitude, altitude]
 */
export function generateCrosshatchPattern(
    polygon: number[][],
    altitude: number,
    spacing: number = 50
): Array<[number, number, number]> {
    // Generate two grids at 90-degree angles
    const grid1 = generateGridPattern(polygon, altitude, spacing, 0);
    const grid2 = generateGridPattern(polygon, altitude, spacing, 90);

    // Combine both grids
    return [...grid1, ...grid2];
}

/**
 * Calculate estimated mission time
 * @param waypoints - Array of waypoints
 * @param speed - Drone speed in m/s
 * @returns Estimated time in seconds
 */
export function calculateMissionTime(
    waypoints: Array<[number, number, number]>,
    speed: number
): number {
    let totalDistance = 0;

    for (let i = 0; i < waypoints.length - 1; i++) {
        const from: [number, number] = [waypoints[i][0], waypoints[i][1]];
        const to: [number, number] = [waypoints[i + 1][0], waypoints[i + 1][1]];
        totalDistance += calculateDistance(from, to);
    }

    return totalDistance / speed;
}

/**
 * Interpolate position between two waypoints
 * @param from - Starting waypoint [longitude, latitude, altitude]
 * @param to - Ending waypoint [longitude, latitude, altitude]
 * @param progress - Progress between waypoints (0-1)
 * @returns Interpolated position [longitude, latitude, altitude]
 */
export function interpolatePosition(
    from: [number, number, number],
    to: [number, number, number],
    progress: number
): [number, number, number] {
    const lng = from[0] + (to[0] - from[0]) * progress;
    const lat = from[1] + (to[1] - from[1]) * progress;
    const alt = from[2] + (to[2] - from[2]) * progress;

    return [lng, lat, alt];
}
