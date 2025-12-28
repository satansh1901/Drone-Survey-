import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { Drone, Mission } from '../../services/api';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

interface MapViewProps {
    drones?: Drone[];
    missions?: Mission[];
    onPolygonDrawn?: (coordinates: number[][]) => void;
    drawMode?: boolean;
    selectedMission?: Mission | null;
}

export const MapView: React.FC<MapViewProps> = ({
    drones = [],
    onPolygonDrawn,
    drawMode = false,
    selectedMission,
}) => {
    console.log('🔄 MapView render - Received drones:', drones.length, drones);

    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const draw = useRef<MapboxDraw | null>(null);
    const droneMarkers = useRef<Map<string, mapboxgl.Marker>>(new Map());
    const droneElements = useRef<Map<string, HTMLDivElement>>(new Map());
    const [mapLoaded, setMapLoaded] = useState(false);
    const hasZoomedToDrones = useRef(false);

    console.log('🗺️ MapView state - mapLoaded:', mapLoaded, 'hasZoomedToDrones:', hasZoomedToDrones.current);

    // Initialize map
    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        console.log('🗺️ Initializing Mapbox map...');

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [77.5946, 12.9716], // Bangalore coordinates
            zoom: 11,
        });

        map.current.on('load', () => {
            console.log('✅ Map loaded successfully');
            setMapLoaded(true);

            // Add navigation controls
            map.current!.addControl(new mapboxgl.NavigationControl(), 'top-right');

            // Initialize drawing tools
            draw.current = new MapboxDraw({
                displayControlsDefault: false,
                controls: {
                    polygon: true,
                    trash: true,
                },
                defaultMode: 'simple_select',
            });

            map.current!.addControl(draw.current as any, 'top-left');

            // Handle polygon creation
            map.current!.on('draw.create', () => {
                const data = draw.current!.getAll();
                if (data.features.length > 0) {
                    const feature = data.features[0];
                    if (feature.geometry.type === 'Polygon') {
                        const coords = feature.geometry.coordinates[0];
                        onPolygonDrawn?.(coords);
                    }
                }
            });
        });

        return () => {
            console.log('🗑️ Cleaning up map');
            map.current?.remove();
            map.current = null;
        };
    }, []);

    // Update draw mode
    useEffect(() => {
        if (!draw.current) return;

        if (drawMode) {
            draw.current.changeMode('draw_polygon');
        } else {
            draw.current.changeMode('simple_select');
        }
    }, [drawMode]);

    // Update drone markers
    useEffect(() => {
        if (!map.current || !mapLoaded) {
            console.log('⏳ Map not ready yet, skipping drone update');
            return;
        }

        console.log(`🚁 Updating ${drones.length} drones on map`);

        const currentDroneIds = new Set(drones.map((d) => d.id));

        // Remove markers for drones that no longer exist
        droneMarkers.current.forEach((marker, droneId) => {
            if (!currentDroneIds.has(droneId)) {
                console.log(`🗑️ Removing drone marker: ${droneId}`);
                marker.remove();
                droneMarkers.current.delete(droneId);
                droneElements.current.delete(droneId);
            }
        });

        // Update or create markers for each drone
        drones.forEach((drone) => {
            if (drone.latitude && drone.longitude) {
                const existingMarker = droneMarkers.current.get(drone.id);

                if (existingMarker) {
                    // Update existing marker position
                    console.log(`📍 Updating drone ${drone.name} position: [${drone.longitude}, ${drone.latitude}]`);
                    existingMarker.setLngLat([drone.longitude, drone.latitude]);

                    // Update popup content
                    const popup = existingMarker.getPopup();
                    if (popup) {
                        popup.setHTML(`
              <div class="p-2">
                <h3 class="font-bold text-lg">${drone.name}</h3>
                <p class="text-sm">Model: ${drone.model}</p>
                <p class="text-sm">Status: ${drone.status}</p>
                <p class="text-sm">Battery: ${drone.battery.toFixed(1)}%</p>
                ${drone.altitude ? `<p class="text-sm">Altitude: ${drone.altitude.toFixed(1)}m</p>` : ''}
                <p class="text-sm text-slate-400">Lat: ${drone.latitude.toFixed(6)}</p>
                <p class="text-sm text-slate-400">Lng: ${drone.longitude.toFixed(6)}</p>
              </div>
            `);
                    }

                    // Update marker style based on status
                    const el = droneElements.current.get(drone.id);
                    if (el) {
                        el.style.backgroundColor = drone.status === 'IN_MISSION' ? '#3b82f6' : '#10b981';
                        if (drone.status === 'IN_MISSION') {
                            el.classList.add('animate-pulse-ring');
                        } else {
                            el.classList.remove('animate-pulse-ring');
                        }
                    }
                } else {
                    // Create new marker
                    console.log(`✨ Creating new marker for ${drone.name} at [${drone.longitude}, ${drone.latitude}]`);

                    const el = document.createElement('div');
                    el.className = 'drone-marker';
                    el.style.width = '40px';
                    el.style.height = '40px';
                    el.style.borderRadius = '50%';
                    el.style.backgroundColor = drone.status === 'IN_MISSION' ? '#3b82f6' : '#10b981';
                    el.style.border = '4px solid white';
                    el.style.boxShadow = '0 0 15px rgba(0,0,0,0.8)';
                    el.style.cursor = 'pointer';
                    el.style.position = 'relative';

                    // Add pulsing animation for active drones
                    if (drone.status === 'IN_MISSION') {
                        el.classList.add('animate-pulse-ring');
                    }

                    const marker = new mapboxgl.Marker({
                        element: el,
                        anchor: 'center'
                    })
                        .setLngLat([drone.longitude, drone.latitude])
                        .setPopup(
                            new mapboxgl.Popup({ offset: 25 }).setHTML(`
                <div class="p-2">
                  <h3 class="font-bold text-lg">${drone.name}</h3>
                  <p class="text-sm">Model: ${drone.model}</p>
                  <p class="text-sm">Status: ${drone.status}</p>
                  <p class="text-sm">Battery: ${drone.battery.toFixed(1)}%</p>
                  ${drone.altitude ? `<p class="text-sm">Altitude: ${drone.altitude.toFixed(1)}m</p>` : ''}
                  <p class="text-sm text-slate-400">Lat: ${drone.latitude.toFixed(6)}</p>
                  <p class="text-sm text-slate-400">Lng: ${drone.longitude.toFixed(6)}</p>
                </div>
              `)
                        )
                        .addTo(map.current!);

                    console.log(`✅ Marker added for ${drone.name}`);
                    droneMarkers.current.set(drone.id, marker);
                    droneElements.current.set(drone.id, el);
                }
            } else {
                console.log(`⚠️ Drone ${drone.name} has no position (lat: ${drone.latitude}, lng: ${drone.longitude})`);
            }
        });

        console.log(`📊 Total markers on map: ${droneMarkers.current.size}`);

        // Auto-fit map to show all drones (only once when first loaded)
        if (drones.length > 0 && !hasZoomedToDrones.current && !selectedMission) {
            const bounds = new mapboxgl.LngLatBounds();
            drones.forEach((drone) => {
                if (drone.latitude && drone.longitude) {
                    bounds.extend([drone.longitude, drone.latitude]);
                }
            });

            console.log('🎯 Auto-fitting map to show all drones');
            map.current.fitBounds(bounds, {
                padding: 100,
                maxZoom: 13,
                duration: 1000
            });
            hasZoomedToDrones.current = true;
        }
    }, [drones, mapLoaded, selectedMission]);

    // Display mission flight paths
    useEffect(() => {
        if (!map.current || !mapLoaded) return;

        // Remove existing mission layers
        if (map.current.getLayer('mission-path')) {
            map.current.removeLayer('mission-path');
        }
        if (map.current.getLayer('mission-area')) {
            map.current.removeLayer('mission-area');
        }
        if (map.current.getSource('mission-path')) {
            map.current.removeSource('mission-path');
        }
        if (map.current.getSource('mission-area')) {
            map.current.removeSource('mission-area');
        }

        if (selectedMission && selectedMission.waypoints && selectedMission.waypoints.length > 0) {
            console.log(`🛤️ Drawing flight path for mission: ${selectedMission.name}`);

            // Add flight path
            const pathCoordinates = selectedMission.waypoints.map((wp) => [
                wp.longitude,
                wp.latitude,
            ]);

            map.current.addSource('mission-path', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: pathCoordinates,
                    },
                },
            });

            map.current.addLayer({
                id: 'mission-path',
                type: 'line',
                source: 'mission-path',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round',
                },
                paint: {
                    'line-color': '#f59e0b',
                    'line-width': 3,
                    'line-dasharray': [2, 2],
                },
            });

            // Add survey area
            if (selectedMission.surveyArea && selectedMission.surveyArea.length > 0) {
                map.current.addSource('mission-area', {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'Polygon',
                            coordinates: [selectedMission.surveyArea],
                        },
                    },
                });

                map.current.addLayer({
                    id: 'mission-area',
                    type: 'fill',
                    source: 'mission-area',
                    paint: {
                        'fill-color': '#3b82f6',
                        'fill-opacity': 0.2,
                    },
                });

                // Fit map to mission bounds
                const bounds = new mapboxgl.LngLatBounds();
                selectedMission.surveyArea.forEach((coord) => {
                    bounds.extend(coord as [number, number]);
                });
                map.current.fitBounds(bounds, { padding: 50 });
            }
        }
    }, [selectedMission, mapLoaded]);

    return <div ref={mapContainer} className="absolute inset-0 w-full h-full overflow-hidden" />;
};
