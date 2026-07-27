import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { violationsApi } from '../api/client';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { fmtIN } from '../components/ui/Counter';

const WARDS = ["Koramangala","Whitefield","HSR Layout","Jayanagar","Hebbal","Indiranagar","Rajajinagar","Yelahanka","Banashankari","Marathahalli","BTM Layout","JP Nagar","Malleswaram","Sadashivanagar","Electronic City"];
const VTYPES = ["Unauthorized Floor Addition","No Building Permit","Encroachment on Public Land","Commercial Use in Residential Zone","Setback Violation","Illegal Basement Construction"];
const STATUSES = ["NEW","UNDER REVIEW","NOTICE SENT","RESOLVED","DISMISSED"];

export default function ViolationsPage({ onNav }) {
  const toast = useToast();
  const { hasRole } = useAuth();
  const [violations, setViolations] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [ward, setWard] = useState('All');
  const [type, setType] = useState('All');
  const [status, setStatus] = useState('All');
  const [dateRange, setDateRange] = useState('All time');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('detected_date');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());

  // Summary counts
  const [summary, setSummary] = useState({ open: 0, notice: 0, resolved: 0, revenue: 0 });
  const canBulkManage = hasRole('inspector', 'commissioner', 'admin');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 30, sort, order };
      if (ward !== 'All') params.ward = ward;
      if (type !== 'All') params.type = type;
      if (status !== 'All') params.status = status;
      if (dateRange !== 'All time') params.date_range = dateRange;
      if (search) params.search = search;

      const data = await violationsApi.list(params);
      setViolations(data.violations || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);

      // Fetch summary (unfiltered)
      const allData = await violationsApi.list({ limit: 1 });
      const allViol = await violationsApi.list({ limit: 500 });
      const all = allViol.violations || [];
      setSummary({
        open: all.filter(v => v.status === 'NEW' || v.status === 'UNDER REVIEW').length,
        notice: all.filter(v => v.status === 'NOTICE SENT').length,
        resolved: all.filter(v => v.status === 'RESOLVED').length,
        revenue: (all.reduce((s, v) => s + (v.penalty || 0), 0) / 10).toFixed(1),
      });
    } catch (err) {
      toast('Error loading violations', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, sort, order, ward, type, status, dateRange, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSort = (col) => {
    if (sort === col) setOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSort(col); setOrder('asc'); }
  };

  const handleBulkAction = async (action) => {
    if (selected.size === 0) return;
    try {
      await violationsApi.bulkAction(action, [...selected]);
      toast(`${selected.size} violations updated`, 'success');
      setSelected(new Set());
      fetchData();
    } catch (err) {
      toast('Bulk action failed: ' + err.message, 'error');
    }
  };

  const handleExport = async () => {
    try {
      const params = {};
      if (ward !== 'All') params.ward = ward;
      if (type !== 'All') params.type = type;
      if (status !== 'All') params.status = status;
      if (search) params.search = search;

      const blob = await violationsApi.export(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'infrawatch-violations.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast('CSV exported', 'success');
    } catch {
      toast('Export failed', 'error');
    }
  };

  const TH = ({ col, lbl }) => (
    <th onClick={() => handleSort(col)} style={{ padding: '8px 11px', textAlign: 'left', cursor: 'pointer', userSelect: 'none', fontFamily: 'DM Sans', fontSize: 10, fontWeight: 500, color: 'var(--mt)', textTransform: 'uppercase', letterSpacing: '.08em', background: 'var(--sf)', borderBottom: '1px solid var(--bd)', whiteSpace: 'nowrap' }}>
      {lbl}{sort === col ? (order === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  );

  const pageNums = totalPages <= 8
    ? Array.from({ length: totalPages }, (_, i) => i + 1)
    : [1, 2, 3, '...', totalPages];

  return (
    <div className="fi" style={{ padding: '18px 22px', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Violations</h1>
          <span style={{ background: 'var(--rdd)', color: 'var(--rd)', fontFamily: 'Space Mono', fontSize: 12, padding: '2px 8px', borderRadius: 4 }}>{total}</span>
        </div>
        <button className="btn bs" onClick={handleExport}>⬇ Export CSV</button>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        {[['OPEN CASES', String(summary.open), 'New or under review', 'var(--rd)'], ['NOTICE SENT', String(summary.notice), 'Formal actions generated', 'var(--am)'], ['RESOLVED', String(summary.resolved), 'Enforcement closures', 'var(--tl)'], ['RECOVERABLE', `₹${summary.revenue} Cr`, 'Estimated penalty', 'var(--bl)']].map(([label, val, sub, color]) => (
          <div key={label} className="card" style={{ flex: 1, padding: '14px 16px' }}>
            <div className="slb" style={{ marginBottom: 8 }}>{label}</div>
            <div style={{ fontFamily: 'Space Mono', fontSize: 22, fontWeight: 700, color, marginBottom: 6 }}>{val}</div>
            <div style={{ fontSize: 11, color: 'var(--mt)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 7, marginBottom: 9, flexWrap: 'wrap' }}>
        <select value={ward} onChange={(e) => { setWard(e.target.value); setPage(1); }} style={{ width: 'auto', padding: '6px 9px', fontSize: 12 }}>
          <option value="All">All Wards</option>
          {WARDS.map(w => <option key={w}>{w}</option>)}
        </select>
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} style={{ width: 'auto', padding: '6px 9px', fontSize: 12 }}>
          <option value="All">All Types</option>
          {VTYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} style={{ width: 'auto', padding: '6px 9px', fontSize: 12 }}>
          <option value="All">All Statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={dateRange} onChange={(e) => { setDateRange(e.target.value); setPage(1); }} style={{ width: 'auto', padding: '6px 9px', fontSize: 12 }}>
          {['Last 7d', 'Last 30d', 'Last 90d', 'All time'].map(r => <option key={r}>{r}</option>)}
        </select>
        <div style={{ flex: 1, position: 'relative', minWidth: 150 }}>
          <input type="text" placeholder="Search ID or address..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ fontSize: 12, padding: '6px 9px 6px 27px' }} />
          <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--mt)', fontSize: 12 }}>&#x2295;</span>
        </div>
      </div>

      {/* Bulk actions */}
      {canBulkManage && selected.size > 0 && (
        <div style={{ background: 'var(--amd)', border: '1px solid var(--am)', borderRadius: 4, padding: '6px 12px', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'Space Mono', fontSize: 12, color: 'var(--am)' }}>{selected.size} selected</span>
          <button className="btn bp" style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => handleBulkAction('generate-notice')}>Generate Notices</button>
          <button className="btn bs" style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => handleBulkAction('mark-reviewed')}>Mark Reviewed</button>
        </div>
      )}

      {/* Table */}
      {violations.length > 0 && (
        <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--bd)', borderRadius: 6 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {canBulkManage && <th style={{ padding: '8px 11px', background: 'var(--sf)', borderBottom: '1px solid var(--bd)' }} />}
                <TH col="id" lbl="ID" /><TH col="address" lbl="Address" /><TH col="ward" lbl="Ward" />
                <TH col="type" lbl="Type" /><TH col="detected_date" lbl="Detected" /><TH col="confidence" lbl="Conf." />
                <TH col="status" lbl="Status" />
                <th style={{ padding: '8px 11px', background: 'var(--sf)', borderBottom: '1px solid var(--bd)', fontSize: 10, color: 'var(--mt)' }}>Officer</th>
                <th style={{ padding: '8px 11px', background: 'var(--sf)', borderBottom: '1px solid var(--bd)', fontSize: 10, color: 'var(--mt)' }} />
              </tr>
            </thead>
            <tbody>
              {violations.map((v, i) => (
                <tr key={v.id} style={{ background: i % 2 === 0 ? 'var(--sf)' : 'var(--ev)', cursor: 'pointer', transition: 'background 100ms' }}>
                  {canBulkManage && (
                    <td style={{ padding: '8px 11px' }}>
                      <input type="checkbox" checked={selected.has(v.id)}
                        onChange={(e) => { const n = new Set(selected); e.target.checked ? n.add(v.id) : n.delete(v.id); setSelected(n); }}
                        onClick={(e) => e.stopPropagation()} />
                    </td>
                  )}
                  <td style={{ padding: '8px 11px', fontFamily: 'Space Mono', fontSize: 11, color: 'var(--am)', whiteSpace: 'nowrap' }}>{v.id}</td>
                  <td style={{ padding: '8px 11px', fontSize: 11, color: 'var(--sc)', maxWidth: 180 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.address}</div>
                  </td>
                  <td style={{ padding: '8px 11px', fontSize: 11, color: 'var(--sc)', whiteSpace: 'nowrap' }}>{v.ward}</td>
                  <td style={{ padding: '8px 11px', fontSize: 11, color: 'var(--sc)', maxWidth: 160 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.type}</div>
                  </td>
                  <td style={{ padding: '8px 11px', fontFamily: 'Space Mono', fontSize: 10, color: 'var(--mt)', whiteSpace: 'nowrap' }}>{v.detected_date}</td>
                  <td style={{ padding: '8px 11px' }}>
                    <span style={{ fontFamily: 'Space Mono', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', display: 'inline-block', background: v.confidence >= 90 ? 'var(--tl)' : v.confidence >= 80 ? 'var(--am)' : 'var(--rd)' }} />
                      {v.confidence}%
                    </span>
                  </td>
                  <td style={{ padding: '8px 11px' }}><Badge status={v.status} /></td>
                  <td style={{ padding: '8px 11px', fontSize: 11, color: 'var(--sc)', whiteSpace: 'nowrap' }}>{v.officer_name || '—'}</td>
                  <td style={{ padding: '8px 11px', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
                    <span style={{ fontFamily: 'Space Mono', fontSize: 10, color: 'var(--bd)', cursor: 'pointer', padding: '3px 6px', borderRadius: 3, border: '1px solid var(--bd)', transition: 'all 150ms', display: 'inline-block' }} onClick={() => onNav('live-detection', v)} onMouseEnter={(e) => { e.target.style.background = 'var(--ev)'; e.target.style.color = 'var(--am)'; }} onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--bd)'; }} title="View on Live Detection Map">🛰</span>
                    <span style={{ fontFamily: 'Space Mono', fontSize: 11, color: 'var(--am)', cursor: 'pointer' }} onClick={() => onNav('detail', v)}>View →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {violations.length === 0 && !loading && (
        <EmptyState
          icon="🔍"
          title="No violations match your filters"
          description="Try clearing filters, broadening your search, or running an AI City Scan from the dashboard to surface new cases."
          ctaLabel="Clear All Filters"
          onCta={() => { setWard('All'); setType('All'); setStatus('All'); setSearch(''); }}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--mt)', fontFamily: 'Space Mono' }}>
            Showing {(page - 1) * 30 + 1}–{Math.min(page * 30, total)} of {total}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn bs" style={{ padding: '3px 9px', fontSize: 11 }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            {pageNums.map((p, i) => p === '...'
              ? <span key={'e' + i} style={{ padding: '4px 6px', fontFamily: 'Space Mono', fontSize: 10, color: 'var(--mt)' }}>...</span>
              : <button key={p} onClick={() => setPage(p)} style={{ width: 26, height: 26, borderRadius: 4, border: '1px solid', cursor: 'pointer', fontFamily: 'Space Mono', fontSize: 10, background: page === p ? 'var(--am)' : 'transparent', color: page === p ? '#080A0D' : 'var(--mt)', borderColor: page === p ? 'var(--am)' : 'var(--bd)' }}>{p}</button>
            )}
            <button className="btn bs" style={{ padding: '3px 9px', fontSize: 11 }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
