import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';
import ViewSkeleton from './components/ui/Skeleton';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MapPage from './pages/MapPage';
import ViolationsPage from './pages/ViolationsPage';
import DetailPage from './pages/DetailPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import AIFeaturesDemo from './pages/AIFeaturesDemo';
import RealTimeSatelliteDetection from './pages/RealTimeSatelliteDetection';
import SDGPage from './pages/SDGPage';
import CitizenReportPage from './pages/CitizenReportPage';

// Check URL for public citizen-report route — accessible without login
function isCitizenReportRoute() {
  const params = new URLSearchParams(window.location.search);
  return params.get('report') === '1' || window.location.pathname === '/report';
}

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [view, setView] = useState('dashboard');
  const [publicRoute, setPublicRoute] = useState(isCitizenReportRoute() ? 'citizen-report' : null);
  const [detailViolation, setDetailViolation] = useState(null);
  const [mapViolation, setMapViolation] = useState(null);
  const [liveDetectionLocation, setLiveDetectionLocation] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const navigate = useCallback((target, data) => {
    if (target === 'detail' && data) {
      setDetailViolation(data);
      setView('detail');
    } else if (target === 'map' && data) {
      setMapViolation(data);
      setView('map');
    } else if (target === 'live-detection' && data) {
      setLiveDetectionLocation(data);
      setView('live-detection');
    } else {
      if (target === 'live-detection') setLiveDetectionLocation(null);
      setView(target);
    }
    setViewLoading(true);
    setTimeout(() => setViewLoading(false), 300);
  }, []);

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    const handler = (ev) => {
      if (ev.key === '/' && ev.target.tagName !== 'INPUT' && ev.target.tagName !== 'TEXTAREA') {
        ev.preventDefault();
        const input = document.querySelector("input[type='text']");
        if (input) input.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (authLoading) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Space Mono', fontSize: 28, fontWeight: 700, color: 'var(--am)', letterSpacing: '.08em', marginBottom: 8 }}>INFRAWATCH</div>
          <div className="pu" style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--am)', margin: '0 auto' }} />
        </div>
      </div>
    );
  }

  // Public citizen-report portal — works without login
  if (publicRoute === 'citizen-report') {
    return <CitizenReportPage onBack={() => {
      setPublicRoute(null);
      window.history.pushState({}, '', '/');
    }} />;
  }

  if (!user) return <LoginPage onOpenCitizenReport={() => setPublicRoute('citizen-report')} />;

  const renderView = () => {
    if (viewLoading) return <ViewSkeleton />;
    switch (view) {
      case 'dashboard': return <DashboardPage onNav={navigate} />;
      case 'map': return <MapPage onNav={navigate} initialViolation={mapViolation} />;
      case 'violations': return <ViolationsPage onNav={navigate} />;
      case 'detail': return <DetailPage onNav={navigate} violationId={detailViolation?.id} onBack={() => navigate('violations')} />;
      case 'analytics': return <AnalyticsPage onNav={navigate} />;
      case 'settings': return <SettingsPage />;
      case 'ai-features': return <AIFeaturesDemo />;
      case 'live-detection': return <RealTimeSatelliteDetection initialViolation={liveDetectionLocation} />;
      case 'sdg': return <SDGPage onNav={navigate} />;
      default: return <DashboardPage onNav={navigate} />;
    }
  };

  // Live Detection is a full-screen map experience — hide footer there to avoid clipping
  const hideFooter = view === 'live-detection';

  return (
    <>
      <Sidebar view={view} onNav={navigate} />
      <div style={{ marginLeft: 220, overflowY: 'auto', width: 'calc(100vw - 220px)', height: '100vh', display: 'flex', flexDirection: 'column' }} key={view}>
        <div style={{ flex: 1, minHeight: 0 }}>
          {renderView()}
        </div>
        {!hideFooter && <Footer onNav={navigate} />}
      </div>
    </>
  );
}
