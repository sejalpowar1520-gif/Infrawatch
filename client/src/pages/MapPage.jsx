import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { violationsApi } from '../api/client';
import WardMap from '../components/map/WardMap';
import ViolationCard from '../components/violations/ViolationCard';
import Badge from '../components/ui/Badge';

const VTYPES = ['Unauthorized Floor Addition', 'No Building Permit', 'Encroachment on Public Land', 'Commercial Use in Residential Zone', 'Setback Violation', 'Illegal Basement Construction'];
const STATUSES = ['NEW', 'UNDER REVIEW', 'NOTICE SENT', 'RESOLVED', 'DISMISSED'];

export default function MapPage({ onNav, initialViolation }) {
  const toast = useToast();
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeWard, setActiveWard] = useState(initialViolation?.ward || null);
  const [selected, setSelected] = useState(initialViolation || null);

  const [types, setTypes] = useState(new Set(VTYPES));
  const [filterStatus, setFilterStatus] = useState('All');
  const [confidence, setConfidence] = useState(85);
  const [dateRange, setDateRange] = useState('Last 30d');
  const [search, setSearch] = useState('');

  useEffect(() => {
    violationsApi.list({ limit: 500 }).then((data) => {
      setViolations(data.violations || []);
      setLoading(false);
      // If we have an initialViolation, set the ward
      if (initialViolation?.ward && !activeWard) {
        setActiveWard(initialViolation.ward);
      }
      if (initialViolation) {
        setSelected(initialViolation);
      }
    }).catch(() => setLoading(false));
  }, []);

  const rangeDays = { 'Last 7d': 7, 'Last 30d': 30, 'Last 90d': 90, 'All time': 9999 };

  const filtered = useMemo(() => {
    return violations.filter((violation) => {
      if (activeWard && violation.ward !== activeWard) return false;
      if (!types.has(violation.type)) return false;
      if (filterStatus !== 'All' && violation.status !== filterStatus) return false;
      if (violation.confidence < confidence) return false;

      const days = Math.floor((Date.now() - new Date(violation.detected_date)) / 86400000);
      if (days > rangeDays[dateRange]) return false;

      if (
        search &&
        !violation.address.toLowerCase().includes(search.toLowerCase()) &&
        !violation.ward.toLowerCase().includes(search.toLowerCase()) &&
        !violation.officer_name?.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [violations, activeWard, types, filterStatus, confidence, dateRange, search]);

  const activeWardViolations = useMemo(
    () => (activeWard ? filtered.filter((violation) => violation.ward === activeWard) : []),
    [activeWard, filtered]
  );

  const wardAssignmentSummary = useMemo(() => {
    if (!activeWard) return [];

    const summaryMap = new Map();
    activeWardViolations.forEach((violation) => {
      const key = violation.officer_name || 'Unassigned';
      const existing = summaryMap.get(key) || { officer: key, count: 0, open: 0 };

      existing.count += 1;
      if (violation.status !== 'RESOLVED' && violation.status !== 'DISMISSED') {
        existing.open += 1;
      }

      summaryMap.set(key, existing);
    });

    return [...summaryMap.values()].sort((a, b) => b.count - a.count);
  }, [activeWard, activeWardViolations]);

  const statusSummary = [
    ['NEW', filtered.filter((violation) => violation.status === 'NEW').length, 'var(--rd)'],
    ['UNDER REVIEW', filtered.filter((violation) => violation.status === 'UNDER REVIEW').length, 'var(--am)'],
    ['NOTICE SENT', filtered.filter((violation) => violation.status === 'NOTICE SENT').length, 'var(--pu)'],
    ['RESOLVED', filtered.filter((violation) => violation.status === 'RESOLVED').length, 'var(--tl)'],
  ];

  const toggleType = (type) => {
    const nextTypes = new Set(types);
    nextTypes.has(type) ? nextTypes.delete(type) : nextTypes.add(type);
    setTypes(nextTypes);
  };

  const clearFilters = () => {
    setTypes(new Set(VTYPES));
    setFilterStatus('All');
    setConfidence(85);
    setDateRange('Last 30d');
    setSearch('');
    setActiveWard(null);
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ width: 300, flexShrink: 0, background: 'var(--sf)', borderRight: '1px solid var(--bd)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ padding: 12, borderBottom: '1px solid var(--bd)' }}>
          <input
            type="text"
            placeholder="Search ward, address, or officer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 28, fontSize: 12, marginBottom: 10 }}
          />

          <div className="slb">VIOLATION TYPE</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
            {VTYPES.map((type) => (
              <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 11, color: 'var(--sc)' }}>
                <input type="checkbox" checked={types.has(type)} onChange={() => toggleType(type)} />
                {type}
              </label>
            ))}
          </div>

          <div className="slb">STATUS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
            {['All', ...STATUSES.slice(0, 4)].map((status) => (
              <label key={status} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 12, color: 'var(--sc)' }}>
                <input type="radio" name="ms" checked={filterStatus === status} onChange={() => setFilterStatus(status)} />
                {status}
              </label>
            ))}
          </div>

          <div className="slb">
            CONFIDENCE &gt;= <span style={{ fontFamily: 'Space Mono', color: 'var(--am)' }}>{confidence}%</span>
          </div>
          <input type="range" min={70} max={99} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} style={{ marginBottom: 10 }} />

          <div className="slb">DATE RANGE</div>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} style={{ fontSize: 12, marginBottom: 10 }}>
            {['Last 7d', 'Last 30d', 'Last 90d', 'All time'].map((option) => <option key={option}>{option}</option>)}
          </select>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn bp" style={{ flex: 1, justifyContent: 'center' }} onClick={() => toast(`${filtered.length} violations in view`, 'info')}>
              Apply
            </button>
            <button className="btn bs" style={{ flex: 1, justifyContent: 'center' }} onClick={clearFilters}>
              Clear
            </button>
          </div>

          {activeWard && (
            <div style={{ marginTop: 10, padding: '10px 12px', border: '1px solid var(--am)', borderRadius: 4, background: 'rgba(122,79,13,.18)' }}>
              <div style={{ fontSize: 10, color: 'var(--mt)', marginBottom: 5 }}>ACTIVE WARD FOCUS</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontFamily: 'Space Mono', fontSize: 12, color: 'var(--am)' }}>{activeWard}</span>
                <button className="btn bs" style={{ padding: '3px 8px', fontSize: 10 }} onClick={() => setActiveWard(null)}>
                  Reset
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6, marginBottom: wardAssignmentSummary.length ? 8 : 0 }}>
                <div style={{ padding: '6px 7px', background: 'var(--ev)', border: '1px solid var(--bd)', borderRadius: 4 }}>
                  <div style={{ fontSize: 9, color: 'var(--mt)' }}>Detections</div>
                  <div style={{ fontFamily: 'Space Mono', fontSize: 12, color: 'var(--am)' }}>{activeWardViolations.length}</div>
                </div>
                <div style={{ padding: '6px 7px', background: 'var(--ev)', border: '1px solid var(--bd)', borderRadius: 4 }}>
                  <div style={{ fontSize: 9, color: 'var(--mt)' }}>Assigned</div>
                  <div style={{ fontFamily: 'Space Mono', fontSize: 12, color: 'var(--tl)' }}>
                    {activeWardViolations.filter((violation) => violation.officer_name).length}
                  </div>
                </div>
              </div>
              {wardAssignmentSummary.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: 'var(--mt)', marginBottom: 5 }}>OFFICER ASSIGNMENTS</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {wardAssignmentSummary.map((entry) => (
                      <div key={entry.officer} style={{ padding: '7px 8px', background: 'var(--ev)', border: '1px solid var(--bd)', borderRadius: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 11, color: 'var(--sc)' }}>{entry.officer}</span>
                          <span style={{ fontFamily: 'Space Mono', fontSize: 10, color: 'var(--am)' }}>{entry.count} cases</span>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--mt)', marginTop: 3 }}>{entry.open} still open in this ward</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '8px 8px 4px' }}>
          <div style={{ fontFamily: 'Space Mono', fontSize: 10, color: 'var(--mt)', marginBottom: 7, padding: '0 4px' }}>
            {loading ? 'Loading detections...' : `${filtered.length} violations in current view`}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6, padding: '0 4px 8px' }}>
            {statusSummary.map(([label, value, color]) => (
              <div key={label} style={{ padding: '7px 8px', background: 'var(--ev)', border: '1px solid var(--bd)', borderRadius: 4 }}>
                <div style={{ fontSize: 9, color: 'var(--mt)', marginBottom: 3 }}>{label}</div>
                <div style={{ fontFamily: 'Space Mono', fontSize: 13, color }}>{value}</div>
              </div>
            ))}
          </div>

          {!loading && filtered.length === 0 && (
            <div style={{ padding: '18px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--mt)', textAlign: 'center' }}>
              <div style={{ fontSize: 24, color: 'var(--am)' }}>&#x2298;</div>
              <div style={{ fontSize: 12 }}>No violations match your filters</div>
              <button className="btn bs" style={{ fontSize: 11 }} onClick={clearFilters}>Clear</button>
            </div>
          )}

          {filtered.slice(0, 12).map((violation) => (
            <ViolationCard key={violation.id} v={violation} onClick={(item) => setSelected(item)} />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <WardMap
          violations={filtered}
          activeWard={activeWard}
          onWardClick={(ward) => {
            setSelected(null);
            setActiveWard((previous) => (previous === ward ? null : ward));
          }}
          onViolationClick={(violation) => setSelected(violation)}
        />

        <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(15,17,23,.92)', border: '1px solid var(--bd)', borderRadius: 4, padding: '8px 11px', fontSize: 10, zIndex: 1000, maxWidth: 200 }}>
          <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: 'var(--mt)', marginBottom: 6, fontWeight: 700 }}>CASE STATUS</div>
          {Object.entries({ NEW: '#FF4545', 'UNDER REVIEW': '#F5A623', 'NOTICE SENT': '#A78BFA', RESOLVED: '#00C9A7', DISMISSED: '#4A5468' }).map(([status, color]) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, color: 'var(--sc)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
              <span style={{ fontSize: 9 }}>{status}</span>
            </div>
          ))}

          <div style={{ borderTop: '1px solid var(--bd)', marginTop: 8, paddingTop: 8, fontSize: 8, color: 'var(--mt)', lineHeight: '1.3' }}>
            <strong>Map mode:</strong> city view groups cases by ward. Zoom in or click a ward to switch to individual detections.
          </div>
        </div>

        {selected && (
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 290, background: 'var(--sf)', borderLeft: '1px solid var(--bd)', display: 'flex', flexDirection: 'column', overflowY: 'auto', animation: 'fi .2s ease', zIndex: 1000 }}>
            <div style={{ padding: '13px 14px', borderBottom: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Space Mono', fontSize: 13, color: 'var(--am)', fontWeight: 700 }}>{selected.id}</span>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mt)', fontSize: 18, padding: 2 }}>x</button>
            </div>
            <div style={{ padding: 14 }}>
              <Badge status={selected.status} />
              <div style={{ fontSize: 13, fontWeight: 500, marginTop: 9, marginBottom: 3 }}>{selected.type}</div>
              <div style={{ fontSize: 11, color: 'var(--sc)', marginBottom: 14 }}>{selected.address}</div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, height: 72, background: 'var(--ev)', borderRadius: 4, border: '1px solid var(--bd)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                  <div style={{ fontSize: 10, color: 'var(--mt)', fontFamily: 'Space Mono' }}>BEFORE</div>
                  <div style={{ fontSize: 9, color: 'var(--mt)', fontFamily: 'Space Mono' }}>JAN 2025</div>
                </div>
                <div style={{ flex: 1, height: 72, background: 'var(--rdd)', borderRadius: 4, border: '1px solid var(--rd)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                  <div style={{ fontSize: 10, color: 'var(--rd)', fontFamily: 'Space Mono' }}>AFTER</div>
                  <div style={{ fontSize: 9, color: 'var(--rd)', fontFamily: 'Space Mono' }}>FEB 2025 ALERT</div>
                </div>
              </div>

              {[
                ['Ward', selected.ward],
                ['Detected', selected.detected_date],
                ['Confidence', `${selected.confidence}%`],
                ['Area', `~${selected.area} sq ft`],
                ['Officer', selected.officer_name || 'Unassigned'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--mt)' }}>{label}</span>
                  <span style={{ fontFamily: 'Space Mono', fontSize: 11 }}>{value}</span>
                </div>
              ))}

              <button className="btn bp" style={{ width: '100%', marginTop: 10, justifyContent: 'center' }} onClick={() => onNav('detail', selected)}>
                View Full Report
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
