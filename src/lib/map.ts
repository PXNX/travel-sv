/**
 * Adds OSM + satellite tile layers with a toggle control to a Leaflet map.
 * Call after creating the map instance.
 */
export async function addTileLayers(map: L.Map) {
    const L = await import('leaflet');

    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OSM',
        maxZoom: 19
    });

    const satellite = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
            attribution: '&copy; Esri',
            maxZoom: 19
        }
    );

    // Default to OSM
    osm.addTo(map);

    L.control
        .layers(
            { 'Map': osm, 'Satellite': satellite },
            {},
            { position: 'topright', collapsed: true }
        )
        .addTo(map);
}
