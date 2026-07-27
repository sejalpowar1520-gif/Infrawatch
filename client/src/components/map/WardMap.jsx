import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';

const WARD_COORDS = {
  Koramangala: [12.9352, 77.6245],
  Whitefield: [12.9698, 77.75],
  'HSR Layout': [12.9116, 77.6389],
  Jayanagar: [12.925, 77.5838],
  Hebbal: [13.0358, 77.597],
  Indiranagar: [12.9784, 77.6408],
  Rajajinagar: [12.9886, 77.5523],
  Yelahanka: [13.1007, 77.5963],
  Banashankari: [12.9255, 77.5468],
  Marathahalli: [12.9591, 77.7019],
  'BTM Layout': [12.9166, 77.6101],
  'JP Nagar': [12.9063, 77.5857],
  Malleswaram: [13.0035, 77.5708],
  Sadashivanagar: [13.007, 77.582],
  'Electronic City': [12.8399, 77.677],
};

const STATUS_COLORS = {
  NEW: '#FF4545',
  'UNDER REVIEW': '#F5A623',
  'NOTICE SENT': '#A78BFA',
  RESOLVED: '#00C9A7',
  DISMISSED: '#4A5468',
};

const SHAPE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const DEFAULT_BOUNDS = { lat: 0.0088, lng: 0.0104 };

function hashWardName(name) {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 2147483647;
  }
  return hash;
}

function seededUnit(name, step) {
  const value = Math.sin(hashWardName(`${name}-${step}`)) * 10000;
  return value - Math.floor(value);
}

function buildHull(points) {
  if (points.length <= 3) return points;

  const sorted = [...points].sort((a, b) => (a.lng === b.lng ? a.lat - b.lat : a.lng - b.lng));
  const cross = (origin, first, second) => (
    (first.lng - origin.lng) * (second.lat - origin.lat) -
    (first.lat - origin.lat) * (second.lng - origin.lng)
  );

  const lower = [];
  sorted.forEach((point) => {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop();
    }
    lower.push(point);
  });

  const upper = [];
  [...sorted].reverse().forEach((point) => {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop();
    }
    upper.push(point);
  });

  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

function expandPolygon(points, center, scale = 1.12) {
  return points.map((point) => ({
    lat: center[0] + (point.lat - center[0]) * scale,
    lng: center[1] + (point.lng - center[1]) * scale,
  }));
}

function createWardScaffold(wardName, center, wardViolations) {
  const [centerLat, centerLng] = center;
  let latSpread = DEFAULT_BOUNDS.lat;
  let lngSpread = DEFAULT_BOUNDS.lng;

  wardViolations.forEach((violation) => {
    latSpread = Math.max(latSpread, Math.abs(violation.lat - centerLat) + 0.002);
    lngSpread = Math.max(lngSpread, Math.abs(violation.lng - centerLng) + 0.0024);
  });

  return SHAPE_ANGLES.map((angle, index) => {
    const rad = (angle * Math.PI) / 180;
    const latFactor = 0.72 + seededUnit(wardName, `lat-${index}`) * 0.5;
    const lngFactor = 0.72 + seededUnit(wardName, `lng-${index}`) * 0.55;
    return {
      lat: centerLat + Math.sin(rad) * latSpread * latFactor,
      lng: centerLng + Math.cos(rad) * lngSpread * lngFactor,
    };
  });
}

function buildWardGeometry(wardName, violations) {
  const center = WARD_COORDS[wardName];
  if (!center) return null;

  const wardViolations = violations.filter((violation) => violation.ward === wardName && violation.lat && violation.lng);
  const rawPoints = [
    ...createWardScaffold(wardName, center, wardViolations),
    ...wardViolations.map((violation) => ({ lat: violation.lat, lng: violation.lng })),
  ];

  const hull = buildHull(rawPoints);
  const expanded = expandPolygon(hull, center, wardViolations.length ? 1.12 : 1.06);
  const polygon = expanded.map((point) => [point.lng, point.lat]);

  return {
    type: 'Feature',
    properties: {
      name: wardName,
      center,
      count: wardViolations.length,
      openCount: wardViolations.filter((violation) => violation.status !== 'RESOLVED' && violation.status !== 'DISMISSED').length,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[...polygon, polygon[0]]],
    },
  };
}

function createWardClusterIcon(count, openCount) {
  const intensity = count >= 18 ? 'high' : count >= 10 ? 'medium' : 'low';
  return L.divIcon({
    className: 'ward-cluster-shell',
    html: `
      <div class="ward-cluster ward-cluster-${intensity}">
        <div class="ward-cluster-count">${count}</div>
        <div class="ward-cluster-open">${openCount} open</div>
      </div>
    `,
    iconSize: [54, 54],
    iconAnchor: [27, 27],
  });
}

export default function WardMap({ violations = [], activeWard, onWardClick, onViolationClick, style }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const wardLayerRef = useRef(null);
  const markerLayerRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(12);

  const wardBoundaries = useMemo(() => ({
    type: 'FeatureCollection',
    features: Object.keys(WARD_COORDS)
      .map((wardName) => buildWardGeometry(wardName, violations))
      .filter(Boolean),
  }), [violations]);

  useEffect(() => {
    if (mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [12.9716, 77.5946],
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 19,
    }).addTo(map);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      opacity: 0.7,
    }).addTo(map);

    wardLayerRef.current = L.layerGroup().addTo(map);
    markerLayerRef.current = L.layerGroup().addTo(map);
    mapInstance.current = map;
    setZoomLevel(map.getZoom());

    const handleZoom = () => setZoomLevel(map.getZoom());
    map.on('zoomend', handleZoom);

    return () => {
      map.off('zoomend', handleZoom);
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (!wardLayerRef.current) return;
    wardLayerRef.current.clearLayers();

    L.geoJSON(wardBoundaries, {
      style: (feature) => {
        const isActive = feature?.properties?.name === activeWard;
        const count = feature?.properties?.count || 0;
        const fillOpacity = isActive ? 0.22 : count ? 0.11 : 0.05;

        return {
          color: isActive ? '#F5A623' : '#334057',
          weight: isActive ? 2.4 : 1.2,
          opacity: isActive ? 0.95 : 0.7,
          fillColor: isActive ? '#7A4F0D' : '#1A2332',
          fillOpacity,
        };
      },
      onEachFeature: (feature, layer) => {
        const wardName = feature.properties.name;
        const count = feature.properties.count;
        const openCount = feature.properties.openCount;

        layer.bindTooltip(`${wardName} | ${count} detections`, {
          permanent: false,
          direction: 'center',
          className: 'ward-tooltip',
        });

        layer.bindPopup(`
          <div style="font-family:DM Sans;min-width:190px">
            <div style="font-family:Space Mono;font-size:13px;color:#F5A623;font-weight:700;margin-bottom:4px">${wardName}</div>
            <div style="font-size:12px;color:#D7DCE4;margin-bottom:3px">${count} detections in current view</div>
            <div style="font-size:11px;color:#8892A4">${openCount} open enforcement cases</div>
          </div>
        `);

        layer.on('click', () => onWardClick?.(wardName));
      },
    }).addTo(wardLayerRef.current);
  }, [wardBoundaries, activeWard, onWardClick]);

  useEffect(() => {
    if (!markerLayerRef.current) return;
    markerLayerRef.current.clearLayers();

    const showWardClusters = !activeWard && zoomLevel <= 12;

    if (showWardClusters) {
      wardBoundaries.features.forEach((feature) => {
        const { name, center, count, openCount } = feature.properties;
        if (!count) return;

        const marker = L.marker(center, {
          icon: createWardClusterIcon(count, openCount),
          keyboard: false,
        });

        marker.bindPopup(`
          <div style="font-family:DM Sans;min-width:180px">
            <div style="font-family:Space Mono;font-size:13px;color:#F5A623;font-weight:700;margin-bottom:4px">${name}</div>
            <div style="font-size:12px;color:#D7DCE4;margin-bottom:3px">${count} detections grouped at city zoom</div>
            <div style="font-size:11px;color:#8892A4">Click to zoom into ward detections</div>
          </div>
        `);
        marker.on('click', () => onWardClick?.(name));
        marker.addTo(markerLayerRef.current);
      });
      return;
    }

    violations.forEach((violation) => {
      if (!violation.lat || !violation.lng) return;

      const marker = L.circleMarker([violation.lat, violation.lng], {
        radius: violation.status === 'NEW' ? 6.5 : 5,
        fillColor: STATUS_COLORS[violation.status] || '#4A5468',
        fillOpacity: 0.92,
        color: '#080A0D',
        weight: 2,
      });

      marker.bindPopup(`
        <div style="font-family:DM Sans;min-width:220px">
          <div style="font-family:Space Mono;font-size:12px;color:#F5A623;font-weight:700;margin-bottom:5px">${violation.id}</div>
          <div style="font-size:12px;color:#D7DCE4;margin-bottom:4px">${violation.type}</div>
          <div style="font-size:11px;color:#8892A4;margin-bottom:3px">${violation.address}</div>
          <div style="font-size:11px;color:#8892A4;margin-bottom:3px">${violation.ward} | ${violation.confidence}% confidence</div>
          <div style="font-size:11px;color:#D7DCE4">Officer: ${violation.officer_name || 'Unassigned'}</div>
        </div>
      `);

      marker.on('click', () => onViolationClick?.(violation));
      marker.addTo(markerLayerRef.current);
    });
  }, [violations, wardBoundaries, activeWard, zoomLevel, onViolationClick, onWardClick]);

  useEffect(() => {
    if (!mapInstance.current) return;

    if (!activeWard) {
      mapInstance.current.flyTo([12.9716, 77.5946], 12, { duration: 0.45 });
      return;
    }

    const feature = wardBoundaries.features.find((item) => item.properties.name === activeWard);
    if (!feature) return;

    const latLngs = feature.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
    mapInstance.current.fitBounds(latLngs, {
      padding: [32, 32],
      maxZoom: 14,
      animate: true,
      duration: 0.45,
    });
  }, [activeWard, wardBoundaries]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%', ...style }} />;
}

export { STATUS_COLORS, WARD_COORDS };
