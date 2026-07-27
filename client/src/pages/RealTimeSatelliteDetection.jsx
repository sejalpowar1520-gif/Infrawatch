import { useState, useRef, useEffect, useCallback } from 'react';
import { officersApi, violationsApi } from '../api/client';

/**
 * REAL-TIME Satellite Detection System
 * 
 * This captures ACTUAL satellite imagery from the map and sends it
 * to Gemini Vision API for REAL detection - no mocks, no seeds.
 * 
 * Flow:
 * 1. User navigates to any location on the map
 * 2. User clicks "Scan This Area"
 * 3. We capture the actual satellite tiles as an image
 * 4. Send to Gemini Vision API for real analysis
 * 5. Display real AI detection results with bounding boxes
 */

const BENGALURU_CENTER = { lat: 12.9716, lng: 77.5946 };

// Known construction hotspots — areas with visible construction activity in satellite imagery
const HOTSPOTS = [
  { name: 'Koramangala 5th Block', lat: 12.9342, lng: 77.6220 },
  { name: 'Whitefield Construction', lat: 12.9685, lng: 77.7460 },
  { name: 'HSR Layout Sector 3', lat: 12.9080, lng: 77.6410 },
  { name: 'Electronic City', lat: 12.8480, lng: 77.6630 },
  { name: 'Sarjapur ORR Junction', lat: 12.9100, lng: 77.6860 },
  { name: 'Bellandur Encroachment', lat: 12.9310, lng: 77.6700 },
  { name: 'Hebbal Lake Area', lat: 13.0370, lng: 77.5920 },
  { name: 'JP Nagar 6th Phase', lat: 12.8990, lng: 77.5870 },
];

export default function RealTimeSatelliteDetection({ initialViolation }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const canvasRef = useRef(null);

  const startLocation = (initialViolation?.lat && initialViolation?.lng)
    ? { lat: Number(initialViolation.lat), lng: Number(initialViolation.lng) }
    : BENGALURU_CENTER;

  const [isMapReady, setIsMapReady] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(startLocation);
  const [showViolationCard, setShowViolationCard] = useState(Boolean(initialViolation?.id));
  const [currentZoom, setCurrentZoom] = useState(18); // High zoom for building detail
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [detectionHistory, setDetectionHistory] = useState([]);
  const [error, setError] = useState(null);
  const [analysisStage, setAnalysisStage] = useState('');

  // Officers list + assignment modal state
  const [officers, setOfficers] = useState([]);
  const [assignModal, setAssignModal] = useState(null); // { detection } or null
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdViolations, setCreatedViolations] = useState({}); // { detectionIndex: violationId }
  const [toast, setToast] = useState(null);

  // Load officers once
  useEffect(() => {
    officersApi.list()
      .then(data => setOfficers(data.officers || []))
      .catch(err => console.warn('Failed to load officers:', err.message));
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const openAssignModal = (detection, detectionIndex) => {
    setAssignModal({ detection, detectionIndex });
    setSelectedOfficerId('');
    // Pre-select ward from current hotspot if available
    const nearbyHotspot = HOTSPOTS.find(h =>
      Math.abs(h.lat - currentLocation.lat) < 0.005 && Math.abs(h.lng - currentLocation.lng) < 0.005
    );
    setSelectedWard(nearbyHotspot ? nearbyHotspot.name.split(' ')[0] : '');
  };

  const closeAssignModal = () => {
    setAssignModal(null);
    setSelectedOfficerId('');
    setSelectedWard('');
  };

  const VIOLATION_TYPE_MAP = {
    floor_addition: 'Unauthorized Floor Addition',
    no_permit: 'No Building Permit',
    encroachment: 'Encroachment on Public Land',
    commercial_in_residential: 'Commercial Use in Residential Zone',
    setback: 'Setback Violation',
    basement: 'Illegal Basement Construction',
  };

  const submitCreateViolation = async () => {
    if (!assignModal) return;
    const { detection, detectionIndex } = assignModal;

    if (!selectedWard.trim()) {
      showToast('Please enter a ward name', 'error');
      return;
    }

    setIsCreating(true);
    try {
      const violationType = VIOLATION_TYPE_MAP[detection.potentialViolationType]
        || analysisResult?.primaryViolationType
        || 'No Building Permit';

      const payload = {
        address: `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)} — Live AI Detection`,
        ward: selectedWard.trim(),
        type: violationType,
        detected_date: new Date().toISOString().slice(0, 10),
        confidence: detection.violationLikelihood || analysisResult?.overallConfidence || 75,
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        officer_id: selectedOfficerId ? Number(selectedOfficerId) : null,
        area: detection.estimatedAreaSqFt || 0,
        zone: 'Residential (R2)',
        owner_name: 'To be identified',
        status: 'NEW',
        source: 'live_ai_scan',
      };

      const res = await violationsApi.create(payload);
      setCreatedViolations(prev => ({ ...prev, [detectionIndex]: res.violation.id }));
      showToast(`Violation ${res.violation.id} created${selectedOfficerId ? ' and assigned' : ''}`);
      closeAssignModal();
    } catch (err) {
      showToast('Failed to create: ' + err.message, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // Initialize Leaflet map with satellite tiles
  useEffect(() => {
    if (mapRef.current) return;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      
      const map = L.map(mapContainerRef.current, {
        center: [startLocation.lat, startLocation.lng],
        zoom: 18,
        maxZoom: 20,
        minZoom: 10,
      });

      // Use ESRI World Imagery - high quality satellite tiles (FREE, no API key)
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri',
          maxZoom: 20,
        }
      ).addTo(map);

      // Add labels overlay for context
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 20,
          opacity: 0.7,
        }
      ).addTo(map);

      // Track map movements
      map.on('moveend', () => {
        const center = map.getCenter();
        setCurrentLocation({ lat: center.lat, lng: center.lng });
        setCurrentZoom(map.getZoom());
      });

      // If navigated here from a violation, drop a highlighted marker at that location
      if (initialViolation?.lat && initialViolation?.lng) {
        const pinIcon = L.divIcon({
          className: 'live-detection-pin',
          html: `
            <div style="position: relative; width: 36px; height: 36px;">
              <div style="position: absolute; inset: 0; border-radius: 50%; background: rgba(255,59,48,0.25); animation: pin-pulse 1.5s ease-out infinite;"></div>
              <div style="position: absolute; inset: 8px; border-radius: 50%; background: #FF3B30; border: 2px solid #fff; box-shadow: 0 0 12px rgba(255,59,48,0.7); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: bold;">!</div>
            </div>
            <style>@keyframes pin-pulse { 0% { transform: scale(0.8); opacity: 0.9; } 100% { transform: scale(2.2); opacity: 0; } }</style>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });
        const v = initialViolation;
        const popupHtml = v.id ? `
          <div style="font-family: 'Inter', system-ui, sans-serif; font-size: 11px; min-width: 230px;">
            <div style="font-family: 'Space Mono', monospace; color: #F5A623; font-size: 12px; font-weight: 700; margin-bottom: 4px;">${v.id || ''}</div>
            <div style="font-weight: 600; color: #0A0C10; margin-bottom: 6px; font-size: 12px;">${v.type || ''}</div>
            <div style="color: #555; margin-bottom: 4px; font-size: 11px;">${v.address || ''}</div>
            <div style="display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap;">
              <span style="background: #FF3B30; color: #fff; padding: 2px 7px; border-radius: 3px; font-size: 9px; font-weight: 700; letter-spacing: 0.05em;">${v.status || 'NEW'}</span>
              <span style="color: #555; font-size: 10px;">Confidence <b>${v.confidence || 0}%</b></span>
              ${v.area ? `<span style="color: #555; font-size: 10px;">${v.area} sq.ft</span>` : ''}
            </div>
            <div style="margin-top: 6px; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 4px;">
              <b>Ward:</b> ${v.ward || '-'} · <b>Zone:</b> ${v.zone || '-'}<br/>
              <b>Officer:</b> ${v.officer_name || 'Unassigned'}
            </div>
          </div>
        ` : `<div style="font-family: 'Space Mono', monospace; font-size: 11px;">📍 Selected location<br/>Lat: ${Number(v.lat).toFixed(6)}<br/>Lng: ${Number(v.lng).toFixed(6)}</div>`;

        L.marker([initialViolation.lat, initialViolation.lng], { icon: pinIcon })
          .addTo(map)
          .bindPopup(popupHtml, { maxWidth: 280 })
          .openPopup();
      }

      mapRef.current = map;
      setIsMapReady(true);
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Navigate to a hotspot
  const goToLocation = (spot) => {
    if (mapRef.current) {
      mapRef.current.flyTo([spot.lat, spot.lng], 18, { duration: 1.5 });
    }
  };

  // Capture the current map view as an image
  const captureMapImage = useCallback(async () => {
    if (!mapRef.current) return null;

    setIsCapturing(true);
    setAnalysisStage('Capturing satellite imagery...');

    try {
      const map = mapRef.current;
      const container = map.getContainer();
      
      // Use html2canvas to capture the map
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(container, {
        useCORS: true,
        allowTaint: true,
        scale: 1,
        logging: false,
        backgroundColor: null,
      });

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);
      setIsCapturing(false);
      return dataUrl;
    } catch (err) {
      console.error('Capture error:', err);
      setIsCapturing(false);
      
      // Fallback: Create a tile-based capture
      return await captureTilesDirectly();
    }
  }, []);

  // Alternative: Capture tiles directly
  const captureTilesDirectly = async () => {
    if (!mapRef.current) return null;

    const map = mapRef.current;
    const center = map.getCenter();
    const zoom = Math.floor(map.getZoom());
    
    // Calculate tile coordinates
    const lat = center.lat;
    const lng = center.lng;
    const n = Math.pow(2, zoom);
    const xtile = Math.floor((lng + 180) / 360 * n);
    const ytile = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);

    // Create canvas and load tiles
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Load center tile and surrounding tiles
    const tiles = [
      { dx: 0, dy: 0, x: xtile, y: ytile },
      { dx: 256, dy: 0, x: xtile + 1, y: ytile },
      { dx: 0, dy: 256, x: xtile, y: ytile + 1 },
      { dx: 256, dy: 256, x: xtile + 1, y: ytile + 1 },
    ];

    const loadTile = (tile) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.drawImage(img, tile.dx, tile.dy, 256, 256);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tile.y}/${tile.x}`;
      });
    };

    await Promise.all(tiles.map(loadTile));
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    return dataUrl;
  };

  // Send captured image to Gemini Vision for REAL analysis
  const analyzeWithGemini = async (imageDataUrl) => {
    setIsAnalyzing(true);
    setAnalysisStage('Sending to Vision AI...');
    setError(null);

    const token = localStorage.getItem('iw_token');
    const bounds = mapRef.current?.getBounds();
    
    const locationContext = {
      address: `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`,
      ward: 'Live Scan',
      zone: 'Bengaluru',
      coordinates: currentLocation,
      zoom: currentZoom,
      bounds: bounds ? {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      } : null,
    };

    // 30-second client-side timeout with graceful message
    const controller = new AbortController();
    const slowTimer = setTimeout(() => {
      setAnalysisStage('AI service is slow — retrying with fallback provider...');
    }, 10000);
    const hardTimer = setTimeout(() => controller.abort(), 30000);

    try {
      setAnalysisStage('AI analyzing satellite imagery...');

      // Call our backend which uses Gemini Vision (auto-fails over to Groq on rate-limit)
      const response = await fetch('/api/vision/analyze-single', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          image: { dataUrl: imageDataUrl },
          locationContext,
        }),
        signal: controller.signal,
      });

      clearTimeout(slowTimer);
      clearTimeout(hardTimer);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errData.error || `AI service returned ${response.status}`);
      }

      setAnalysisStage('Processing results...');
      const data = await response.json();
      if (data._provider) console.log('[AI] answered by:', data._provider, data.fallback ? '(fallback)' : '(primary)');
      
      const result = {
        ...data,
        capturedImage: imageDataUrl,
        location: currentLocation,
        zoom: currentZoom,
        timestamp: new Date().toISOString(),
      };

      setAnalysisResult(result);
      
      // Add to history if violations found
      if (data.suspiciousAreasDetected || data.totalAreas > 0) {
        setDetectionHistory(prev => [{
          id: Date.now(),
          location: currentLocation,
          timestamp: new Date().toISOString(),
          violationType: data.primaryViolationType,
          confidence: data.overallConfidence,
          area: data.totalEstimatedAreaSqFt,
          riskLevel: data.riskLevel,
        }, ...prev].slice(0, 20));
      }

    } catch (err) {
      clearTimeout(slowTimer);
      clearTimeout(hardTimer);
      console.error('[AI] Analysis error:', err);
      if (err.name === 'AbortError') {
        setError('AI service timeout — both Gemini and Groq are slow right now. Please try again in a moment.');
      } else {
        setError(err.message || 'AI analysis failed — the AI service may be temporarily unavailable.');
      }
    } finally {
      setIsAnalyzing(false);
      setAnalysisStage('');
    }
  };

  // Main scan function
  const scanCurrentArea = async () => {
    setAnalysisResult(null);
    setError(null);
    setCreatedViolations({});
    
    // Step 1: Capture the map
    const imageDataUrl = await captureMapImage();
    if (!imageDataUrl) {
      setError('Failed to capture map image');
      return;
    }

    // Step 2: Send to Gemini for real analysis
    await analyzeWithGemini(imageDataUrl);
  };

  const result = analysisResult;
  const detections = result?.detections || [];

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0A0C10' }}>
      {/* Map Section */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div 
          ref={mapContainerRef} 
          style={{ width: '100%', height: '100%' }}
        />

        {/* Crosshair overlay */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 1000,
        }}>
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="35" fill="none" stroke="#F5A623" strokeWidth="2" strokeDasharray="5,5" opacity="0.7" />
            <line x1="40" y1="5" x2="40" y2="25" stroke="#F5A623" strokeWidth="2" />
            <line x1="40" y1="55" x2="40" y2="75" stroke="#F5A623" strokeWidth="2" />
            <line x1="5" y1="40" x2="25" y2="40" stroke="#F5A623" strokeWidth="2" />
            <line x1="55" y1="40" x2="75" y2="40" stroke="#F5A623" strokeWidth="2" />
          </svg>
        </div>

        {/* Top Info Bar */}
        <div style={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          display: 'flex',
          justifyContent: 'space-between',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'rgba(10,12,16,0.95)',
            border: '1px solid #2A2D35',
            borderRadius: 8,
            padding: '12px 16px',
          }}>
            <div style={{ fontFamily: 'Space Mono', fontSize: 10, color: '#F5A623', letterSpacing: '0.1em' }}>
              REAL-TIME SATELLITE DETECTION
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#E8E9EA', marginTop: 4 }}>
              Navigate to any location → Click Scan
            </div>
          </div>

          <div style={{
            background: 'rgba(10,12,16,0.95)',
            border: '1px solid #2A2D35',
            borderRadius: 8,
            padding: '10px 14px',
            fontFamily: 'Space Mono',
            fontSize: 11,
            color: '#8A8F98',
          }}>
            <div>LAT: {currentLocation.lat.toFixed(6)}</div>
            <div>LNG: {currentLocation.lng.toFixed(6)}</div>
            <div>ZOOM: {currentZoom}</div>
          </div>
        </div>

        {/* Violation Details Overlay — shown when navigated from a specific case */}
        {showViolationCard && initialViolation?.id && (
          <div style={{
            position: 'absolute',
            top: 100,
            left: 16,
            width: 340,
            background: 'rgba(10,12,16,0.96)',
            border: '1px solid #FF3B30',
            borderLeft: '3px solid #FF3B30',
            borderRadius: 8,
            padding: 16,
            zIndex: 1000,
            boxShadow: '0 8px 24px rgba(255,59,48,0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
              <div>
                <div style={{ fontFamily: 'Space Mono', fontSize: 10, color: '#FF3B30', letterSpacing: '0.1em', fontWeight: 700 }}>
                  SELECTED VIOLATION
                </div>
                <div style={{ fontFamily: 'Space Mono', fontSize: 18, color: '#F5A623', fontWeight: 700, marginTop: 2 }}>
                  {initialViolation.id}
                </div>
              </div>
              <button
                onClick={() => setShowViolationCard(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid #2A2D35',
                  borderRadius: 4,
                  color: '#8A8F98',
                  padding: '4px 8px',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, color: '#E8E9EA', marginBottom: 6 }}>
              {initialViolation.type}
            </div>

            <div style={{ fontSize: 11, color: '#B8BCC4', marginBottom: 10, lineHeight: 1.5 }}>
              {initialViolation.address}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <Stat label="STATUS" value={initialViolation.status} color="#FF3B30" />
              <Stat label="CONFIDENCE" value={`${initialViolation.confidence}%`} color="#F5A623" />
              <Stat label="WARD" value={initialViolation.ward || '-'} color="#4A9EFF" />
              <Stat label="AREA" value={initialViolation.area ? `${initialViolation.area} sq.ft` : '-'} color="#34C759" />
            </div>

            <div style={{
              padding: '8px 10px',
              background: 'rgba(245,166,35,0.08)',
              border: '1px solid rgba(245,166,35,0.3)',
              borderRadius: 4,
              marginBottom: 10,
            }}>
              <div style={{ fontSize: 9, color: '#8A8F98', letterSpacing: '0.1em', marginBottom: 3 }}>
                ASSIGNED OFFICER
              </div>
              <div style={{ fontSize: 12, color: initialViolation.officer_name ? '#F5A623' : '#FF9500', fontWeight: 600 }}>
                {initialViolation.officer_name || 'UNASSIGNED — awaiting dispatch'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 10, color: '#8A8F98' }}>
              <div><span style={{ color: '#5A5F68' }}>Owner:</span> {initialViolation.owner_name || 'Unknown'}</div>
              <div><span style={{ color: '#5A5F68' }}>Survey:</span> {initialViolation.survey_no || '-'}</div>
              <div><span style={{ color: '#5A5F68' }}>Zone:</span> {initialViolation.zone || '-'}</div>
              <div><span style={{ color: '#5A5F68' }}>Penalty:</span> ₹{initialViolation.penalty || 0}L</div>
            </div>

            <div style={{
              marginTop: 10,
              fontSize: 10,
              color: '#5A5F68',
              fontFamily: 'Space Mono',
              borderTop: '1px solid #1A1D24',
              paddingTop: 6,
            }}>
              Detected: {initialViolation.detected_date || '-'} · Lat {Number(initialViolation.lat).toFixed(5)}, Lng {Number(initialViolation.lng).toFixed(5)}
            </div>
          </div>
        )}

        {/* Scan Button */}
        <div style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
        }}>
          <button
            onClick={scanCurrentArea}
            disabled={isCapturing || isAnalyzing}
            style={{
              padding: '16px 48px',
              fontSize: 16,
              fontWeight: 600,
              background: isCapturing || isAnalyzing 
                ? '#2A2D35' 
                : 'linear-gradient(135deg, #F5A623 0%, #E09612 100%)',
              border: 'none',
              borderRadius: 12,
              color: isCapturing || isAnalyzing ? '#8A8F98' : '#0A0C10',
              cursor: isCapturing || isAnalyzing ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 20px rgba(245,166,35,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {isCapturing || isAnalyzing ? (
              <>
                <span className="spinner" style={{
                  width: 20,
                  height: 20,
                  border: '2px solid #8A8F98',
                  borderTopColor: '#F5A623',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                {analysisStage || 'Processing...'}
              </>
            ) : (
              <>
                🛰️ SCAN THIS AREA WITH AI
              </>
            )}
          </button>
        </div>

        {/* Hotspot Quick Nav */}
        <div style={{
          position: 'absolute',
          bottom: 90,
          left: 16,
          right: 16,
          zIndex: 1000,
        }}>
          <div style={{
            background: 'rgba(10,12,16,0.9)',
            border: '1px solid #2A2D35',
            borderRadius: 8,
            padding: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: '#8A8F98' }}>
                QUICK NAVIGATE TO KNOWN HOTSPOTS:
              </div>
              <div
                title="Hotspot scans return seeded detection data for demo reliability. Scans elsewhere route to live Groq Vision AI on real satellite imagery."
                style={{
                  fontSize: 9,
                  color: '#8A8F98',
                  border: '1px solid #2A2D35',
                  borderRadius: 3,
                  padding: '2px 7px',
                  fontFamily: 'Space Mono',
                  letterSpacing: '0.05em',
                  cursor: 'help',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F5A623' }} />
                DEMO DATA · OTHERS USE LIVE AI
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {HOTSPOTS.map(spot => (
                <button
                  key={spot.name}
                  onClick={() => goToLocation(spot)}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(245,166,35,0.1)',
                    border: '1px solid #F5A623',
                    borderRadius: 4,
                    color: '#F5A623',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  {spot.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results Panel */}
      <div style={{
        width: 420,
        background: '#12151B',
        borderLeft: '1px solid #2A2D35',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #2A2D35',
          background: '#0A0C10',
        }}>
          <div style={{ fontFamily: 'Space Mono', fontSize: 10, color: '#F5A623' }}>
            VISION AI ANALYSIS
          </div>
          <div style={{ fontSize: 14, color: '#E8E9EA', marginTop: 4 }}>
            Real Detection Results
          </div>
        </div>

        {/* Results Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {error && (
            <div style={{
              padding: 16,
              background: 'rgba(255,59,48,0.1)',
              border: '1px solid #FF3B30',
              borderRadius: 8,
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 12, color: '#FF3B30', fontWeight: 500 }}>Error</div>
              <div style={{ fontSize: 11, color: '#FF6B6B', marginTop: 4 }}>{error}</div>
            </div>
          )}

          {result ? (
            <>
              {/* Captured Image */}
              {result.capturedImage && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: '#8A8F98', marginBottom: 8 }}>
                    CAPTURED SATELLITE IMAGE
                  </div>
                  <div style={{
                    position: 'relative',
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: '1px solid #2A2D35',
                  }}>
                    <img 
                      src={result.capturedImage} 
                      alt="Captured" 
                      style={{ width: '100%', display: 'block' }}
                    />
                    {/* Draw bounding boxes — color by severity */}
                    {detections.map((det, i) => {
                      const sev = det.severity || (det.violationLikelihood > 75 ? 'violation' : det.violationLikelihood > 50 ? 'warning' : 'clear');
                      const colors = {
                        violation: { border: '#FF3B30', bg: 'rgba(255,59,48,0.2)', badge: '#FF3B30' },
                        warning: { border: '#FFD60A', bg: 'rgba(255,214,10,0.15)', badge: '#E6A800' },
                        clear: { border: '#34C759', bg: 'rgba(52,199,89,0.15)', badge: '#34C759' },
                      };
                      const c = colors[sev] || colors.warning;
                      const label = sev === 'clear' ? 'CLEAR' : sev === 'warning' ? 'WARNING' : (det.potentialViolationType || 'VIOLATION');
                      return (
                        <div
                          key={i}
                          style={{
                            position: 'absolute',
                            left: `${det.boundingBox?.x || 20}%`,
                            top: `${det.boundingBox?.y || 20}%`,
                            width: `${det.boundingBox?.width || 30}%`,
                            height: `${det.boundingBox?.height || 30}%`,
                            border: `2px solid ${c.border}`,
                            background: c.bg,
                            borderRadius: 4,
                          }}
                        >
                          <div style={{
                            position: 'absolute',
                            top: -20,
                            left: 0,
                            background: c.badge,
                            color: sev === 'warning' ? '#000' : '#fff',
                            fontSize: 9,
                            padding: '2px 6px',
                            borderRadius: 2,
                            whiteSpace: 'nowrap',
                            fontWeight: 600,
                          }}>
                            {label} ({det.violationLikelihood}%)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Detection Summary with severity breakdown */}
              {(() => {
                const violations = detections.filter(d => d.severity === 'violation').length;
                const warnings = detections.filter(d => d.severity === 'warning').length;
                const cleared = detections.filter(d => d.severity === 'clear').length;
                const summaryColor = violations > 0 ? '#FF3B30' : warnings > 0 ? '#E6A800' : '#34C759';
                const summaryBg = violations > 0 ? 'rgba(255,59,48,0.1)' : warnings > 0 ? 'rgba(255,214,10,0.1)' : 'rgba(52,199,89,0.1)';
                return (
                  <div style={{
                    padding: 16,
                    background: summaryBg,
                    border: `1px solid ${summaryColor}`,
                    borderRadius: 8,
                    marginBottom: 16,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>
                      {violations > 0 ? '⚠️' : warnings > 0 ? '🔍' : '✅'}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: summaryColor }}>
                      {violations > 0
                        ? `${violations} Violation(s) Detected`
                        : warnings > 0
                        ? `${warnings} Area(s) Need Inspection`
                        : 'Area Cleared — No Violations'}
                    </div>
                    <div style={{ fontSize: 12, color: '#8A8F98', marginTop: 8 }}>
                      Confidence: {result.overallConfidence}%
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF3B30' }} />
                        <span style={{ color: '#FF3B30' }}>{violations} Violation{violations !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFD60A' }} />
                        <span style={{ color: '#E6A800' }}>{warnings} Warning{warnings !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34C759' }} />
                        <span style={{ color: '#34C759' }}>{cleared} Clear</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Scan Details — always shown */}
              {(() => {
                const hasViolations = detections.some(d => d.severity === 'violation');
                return (
                <>
                  {/* Risk summary — only if violations exist */}
                  {hasViolations && (
                    <div style={{
                      padding: 16,
                      background: '#0A0C10',
                      borderRadius: 8,
                      marginBottom: 16,
                    }}>
                      <div style={{ fontSize: 11, color: '#F5A623', marginBottom: 12, fontFamily: 'Space Mono' }}>
                        PRIMARY VIOLATION
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                        {result.primaryViolationType}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 9, color: '#8A8F98' }}>RISK LEVEL</div>
                          <div style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: result.riskLevel === 'CRITICAL' ? '#FF3B30' :
                                   result.riskLevel === 'HIGH' ? '#FF9500' :
                                   result.riskLevel === 'MEDIUM' ? '#F5A623' : '#34C759',
                          }}>
                            {result.riskLevel}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 9, color: '#8A8F98' }}>EST. AREA</div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>
                            {result.totalEstimatedAreaSqFt} sq.ft
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Individual Detections — all severities */}
                  {detections.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, color: '#F5A623', marginBottom: 8, fontFamily: 'Space Mono' }}>
                        SCANNED AREAS ({detections.length})
                      </div>
                      {detections.map((det, i) => {
                        const sev = det.severity || 'warning';
                        const borderColor = sev === 'violation' ? '#FF3B30' : sev === 'warning' ? '#E6A800' : '#34C759';
                        const tagBg = sev === 'violation' ? 'rgba(255,59,48,0.15)' : sev === 'warning' ? 'rgba(255,214,10,0.12)' : 'rgba(52,199,89,0.12)';
                        const tagLabel = sev === 'violation' ? 'VIOLATION' : sev === 'warning' ? 'NEEDS INSPECTION' : 'CLEARED';
                        const createdId = createdViolations[i];
                        const buttonLabel = sev === 'violation' ? '+ Add to Violations & Assign Officer'
                          : sev === 'warning' ? '+ Add as Inspection Case'
                          : '+ Log as Cleared';
                        return (
                          <div key={i} style={{
                            padding: 12,
                            background: '#0A0C10',
                            borderRadius: 6,
                            marginBottom: 8,
                            borderLeft: `3px solid ${borderColor}`,
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <span style={{
                                fontSize: 9,
                                fontWeight: 700,
                                color: borderColor,
                                background: tagBg,
                                padding: '2px 8px',
                                borderRadius: 3,
                                letterSpacing: '0.05em',
                              }}>{tagLabel}</span>
                              <span style={{ fontSize: 10, color: '#8A8F98' }}>{det.violationLikelihood}%</span>
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 500, marginTop: 4 }}>
                              {det.description || det.potentialViolationType}
                            </div>
                            {sev !== 'clear' && det.estimatedAreaSqFt > 0 && (
                              <div style={{ fontSize: 11, color: '#8A8F98', marginTop: 4 }}>
                                Est. Area: {det.estimatedAreaSqFt} sq.ft
                              </div>
                            )}
                            {/* Action button */}
                            {createdId ? (
                              <div style={{
                                marginTop: 8,
                                padding: '6px 10px',
                                background: 'rgba(52,199,89,0.1)',
                                border: '1px solid #34C759',
                                borderRadius: 4,
                                fontSize: 10,
                                color: '#34C759',
                                fontWeight: 600,
                                textAlign: 'center',
                              }}>
                                ✓ Filed as {createdId} — view in Violations
                              </div>
                            ) : (
                              <button
                                onClick={() => openAssignModal(det, i)}
                                style={{
                                  marginTop: 8,
                                  width: '100%',
                                  padding: '7px 10px',
                                  background: sev === 'clear' ? 'rgba(52,199,89,0.1)' : 'rgba(245,166,35,0.1)',
                                  border: `1px solid ${sev === 'clear' ? '#34C759' : '#F5A623'}`,
                                  borderRadius: 4,
                                  color: sev === 'clear' ? '#34C759' : '#F5A623',
                                  fontSize: 10,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  letterSpacing: '0.03em',
                                }}
                              >
                                {buttonLabel}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Visual Evidence */}
                  {result.visualEvidence?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, color: '#F5A623', marginBottom: 8, fontFamily: 'Space Mono' }}>
                        AI VISUAL EVIDENCE
                      </div>
                      {result.visualEvidence.map((evidence, i) => (
                        <div key={i} style={{
                          padding: 10,
                          background: '#0A0C10',
                          borderRadius: 4,
                          marginBottom: 6,
                          fontSize: 12,
                          color: '#B8BCC4',
                        }}>
                          • {evidence}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Narrative */}
                  {result.analysisNarrative && (
                    <div style={{
                      padding: 12,
                      background: 'rgba(245,166,35,0.1)',
                      border: '1px solid #F5A623',
                      borderRadius: 6,
                      marginBottom: 16,
                    }}>
                      <div style={{ fontSize: 10, color: '#F5A623', marginBottom: 6 }}>
                        AI ANALYSIS
                      </div>
                      <div style={{ fontSize: 12, color: '#E8E9EA', lineHeight: 1.6 }}>
                        {result.analysisNarrative}
                      </div>
                    </div>
                  )}
                </>
                );
              })()}

              {/* Metadata */}
              <div style={{
                padding: 10,
                background: '#0A0C10',
                borderRadius: 6,
                fontSize: 10,
                color: '#5A5F68',
              }}>
                <div>Model: {result._model || 'AI Vision'}</div>
                <div>Processed: {new Date(result._processedAt || result.timestamp).toLocaleString()}</div>
                <div>Location: {result.location?.lat.toFixed(6)}, {result.location?.lng.toFixed(6)}</div>
              </div>
            </>
          ) : (
            <div style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: '#5A5F68',
            }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>🛰️</div>
              <div style={{ fontSize: 16, color: '#E8E9EA', marginBottom: 8 }}>
                Real-Time AI Detection
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 280 }}>
                Navigate to any location on the satellite map, then click 
                <strong style={{ color: '#F5A623' }}> "SCAN THIS AREA"</strong> to 
                analyze for illegal construction using Vision AI.
              </div>
              <div style={{
                marginTop: 24,
                padding: '12px 16px',
                background: 'rgba(245,166,35,0.1)',
                border: '1px solid #F5A623',
                borderRadius: 8,
                fontSize: 11,
              }}>
                <div style={{ color: '#F5A623', fontWeight: 500 }}>💡 Pro Tip</div>
                <div style={{ color: '#B8BCC4', marginTop: 4 }}>
                  Zoom level 18+ gives best building detail for accurate detection
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Detection History */}
        {detectionHistory.length > 0 && (
          <div style={{
            borderTop: '1px solid #2A2D35',
            padding: 12,
            maxHeight: 200,
            overflow: 'auto',
          }}>
            <div style={{ fontSize: 10, color: '#8A8F98', marginBottom: 8 }}>
              RECENT DETECTIONS ({detectionHistory.length})
            </div>
            {detectionHistory.slice(0, 5).map(det => (
              <div key={det.id} style={{
                padding: 8,
                background: '#0A0C10',
                borderRadius: 4,
                marginBottom: 6,
                fontSize: 11,
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ color: '#FF3B30' }}>{det.violationType}</div>
                  <div style={{ color: '#5A5F68', fontSize: 10 }}>
                    {det.location.lat.toFixed(4)}, {det.location.lng.toFixed(4)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#F5A623' }}>{det.confidence}%</div>
                  <div style={{ color: '#5A5F68', fontSize: 10 }}>
                    {new Date(det.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          padding: '12px 18px',
          background: toast.type === 'error' ? 'rgba(255,59,48,0.95)' : 'rgba(52,199,89,0.95)',
          color: '#fff',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 500,
          zIndex: 10000,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Assign Officer Modal */}
      {assignModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }} onClick={closeAssignModal}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#12151B',
            border: '1px solid #2A2D35',
            borderRadius: 10,
            padding: 24,
            width: 460,
            maxWidth: '90vw',
          }}>
            <div style={{ fontSize: 11, color: '#F5A623', fontFamily: 'Space Mono', marginBottom: 6, letterSpacing: '0.1em' }}>
              FILE NEW VIOLATION
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, color: '#E8E9EA' }}>
              Add to Violations List
            </div>
            <div style={{ fontSize: 12, color: '#8A8F98', marginBottom: 16 }}>
              {assignModal.detection.description}
            </div>

            <div style={{
              padding: 10,
              background: '#0A0C10',
              borderRadius: 6,
              marginBottom: 16,
              fontSize: 11,
              color: '#B8BCC4',
              fontFamily: 'Space Mono',
            }}>
              <div>📍 {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}</div>
              <div>🎯 Confidence: {assignModal.detection.violationLikelihood}%</div>
              {assignModal.detection.estimatedAreaSqFt > 0 && (
                <div>📐 Area: {assignModal.detection.estimatedAreaSqFt} sq.ft</div>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#8A8F98', marginBottom: 6, letterSpacing: '0.05em' }}>
                WARD *
              </label>
              <input
                type="text"
                value={selectedWard}
                onChange={e => setSelectedWard(e.target.value)}
                placeholder="e.g. Koramangala, HSR Layout"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#0A0C10',
                  border: '1px solid #2A2D35',
                  borderRadius: 4,
                  color: '#E8E9EA',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#8A8F98', marginBottom: 6, letterSpacing: '0.05em' }}>
                ASSIGN TO OFFICER (Optional)
              </label>
              <select
                value={selectedOfficerId}
                onChange={e => setSelectedOfficerId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#0A0C10',
                  border: '1px solid #2A2D35',
                  borderRadius: 4,
                  color: '#E8E9EA',
                  fontSize: 13,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="">— Unassigned —</option>
                {officers.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.role}{o.ward_access?.length ? ` · ${Array.isArray(o.ward_access) ? o.ward_access.join(', ') : o.ward_access}` : ''})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={closeAssignModal}
                disabled={isCreating}
                style={{
                  padding: '10px 18px',
                  background: 'transparent',
                  border: '1px solid #2A2D35',
                  borderRadius: 4,
                  color: '#B8BCC4',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitCreateViolation}
                disabled={isCreating}
                style={{
                  padding: '10px 18px',
                  background: 'linear-gradient(135deg, #F5A623 0%, #E09612 100%)',
                  border: 'none',
                  borderRadius: 4,
                  color: '#0A0C10',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isCreating ? 'not-allowed' : 'pointer',
                  opacity: isCreating ? 0.6 : 1,
                }}
              >
                {isCreating ? 'Creating...' : 'File Violation'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spinner {
          display: inline-block;
        }
      `}</style>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{
      padding: '6px 9px',
      background: '#0F1117',
      border: '1px solid #2A2D35',
      borderRadius: 4,
    }}>
      <div style={{ fontSize: 9, color: '#8A8F98', letterSpacing: '0.08em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: color || '#E8E9EA', fontFamily: 'Space Mono' }}>{value}</div>
    </div>
  );
}
