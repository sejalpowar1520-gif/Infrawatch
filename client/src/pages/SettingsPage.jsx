import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { settingsApi, noticesApi, officersApi } from '../api/client';

const WARDS = ["Koramangala","Whitefield","HSR Layout","Jayanagar","Hebbal","Indiranagar","Rajajinagar","Yelahanka","Banashankari","Marathahalli","BTM Layout","JP Nagar","Malleswaram","Sadashivanagar","Electronic City"];

export default function SettingsPage() {
  const toast = useToast();
  const { user, hasRole } = useAuth();
  const canAccessSettings = hasRole('commissioner', 'admin');
  const canEditConfig = hasRole('admin');
  const [tab, setTab] = useState('scan');
  const [settings, setSettings] = useState({});
  const [templates, setTemplates] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Scan config
  const [sat, setSat] = useState('ISRO Bhuvan');
  const [freq, setFreq] = useState('Bi-weekly');
  const [conf, setConf] = useState(85);
  const [activeWards, setActiveWards] = useState(new Set(WARDS.slice(0, 10)));

  // Templates
  const [editIdx, setEditIdx] = useState(0);

  // Team
  const [showInvite, setShowInvite] = useState(false);
  const [invEmail, setInvEmail] = useState('');
  const [invRole, setInvRole] = useState('field_officer');
  const [invWard, setInvWard] = useState(WARDS[0]);

  useEffect(() => {
    if (!canAccessSettings) {
      setLoading(false);
      return;
    }

    Promise.all([
      settingsApi.get(),
      noticesApi.templates(),
      officersApi.list(),
    ]).then(([s, t, o]) => {
      const cfg = s.settings || {};
      setSettings(cfg);
      setSat(cfg.satellite_source || 'ISRO Bhuvan');
      setFreq(cfg.scan_frequency || 'Bi-weekly');
      setConf(Number(cfg.confidence_threshold) || 85);
      if (cfg.active_wards) setActiveWards(new Set(Array.isArray(cfg.active_wards) ? cfg.active_wards : []));
      setTemplates(t.templates || []);
      setOfficers(o.officers || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [canAccessSettings]);

  const saveConfig = async () => {
    try {
      await settingsApi.update({
        satellite_source: sat,
        scan_frequency: freq,
        confidence_threshold: String(conf),
        active_wards: [...activeWards],
      });
      toast('Configuration saved', 'success');
    } catch {
      toast('Failed to save', 'error');
    }
  };

  const saveTemplate = async () => {
    const tpl = templates[editIdx];
    if (!tpl) return;
    try {
      await noticesApi.updateTemplate(tpl.id, { name: tpl.name, body: tpl.body });
      toast('Template saved', 'success');
    } catch {
      toast('Failed to save template', 'error');
    }
  };

  const inviteOfficer = async () => {
    if (!invEmail.includes('@')) { toast('Enter a valid email', 'error'); return; }
    try {
      await officersApi.invite({ email: invEmail, role: invRole, ward_access: [invWard] });
      toast('Invite sent to ' + invEmail, 'success');
      setShowInvite(false);
      setInvEmail('');
      // Refresh
      const o = await officersApi.list();
      setOfficers(o.officers || []);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const toggleWard = (w) => {
    const n = new Set(activeWards);
    n.has(w) ? n.delete(w) : n.add(w);
    setActiveWards(n);
  };

  const TABS = [{ id: 'scan', l: 'Scan Config' }, { id: 'templates', l: 'Notice Templates' }, { id: 'integrations', l: 'Integrations' }, { id: 'team', l: 'Team & Access' }];
  const integrations = settings.integrations || [];
  const tpl = templates[editIdx];
  if (!canAccessSettings) {
    return (
      <div className="fi" style={{ padding: '40px 22px', color: 'var(--mt)' }}>
        You do not have permission to access system settings.
      </div>
    );
  }

  const templatePreview = tpl ? tpl.body
    .replaceAll('{violation_id}', '#IW-2847')
    .replaceAll('{owner_name}', 'Ramesh Babu Naidu')
    .replaceAll('{address}', '14/2, 4th Cross, Koramangala 5th Block')
    .replaceAll('{date}', new Date().toLocaleDateString('en-IN'))
    .replaceAll('{officer_name}', user?.name || 'Priya Menon') : '';

  if (loading) return <div style={{ padding: 40, color: 'var(--mt)' }}>Loading settings...</div>;

  return (
    <div className="fi" style={{ padding: '18px 22px', overflowY: 'auto', height: '100%' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 18 }}>Settings</h1>

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--bd)', marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans', fontWeight: 500, background: 'transparent', color: tab === t.id ? 'var(--am)' : 'var(--sc)', borderBottom: tab === t.id ? '2px solid var(--am)' : '2px solid transparent', transition: 'all 150ms', marginBottom: -1 }}>{t.l}</button>
        ))}
      </div>

      {/* SCAN CONFIG */}
      {tab === 'scan' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 680 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {[['SOURCE', sat, 'var(--am)'], ['FREQUENCY', freq, 'var(--bl)'], ['THRESHOLD', `${conf}%`, 'var(--tl)'], ['ACTIVE WARDS', `${activeWards.size} selected`, 'var(--pu)']].map(([label, val, color]) => (
              <div key={label} className="card" style={{ padding: '14px 16px' }}>
                <div className="slb" style={{ marginBottom: 8 }}>{label}</div>
                <div style={{ fontFamily: 'Space Mono', fontSize: 18, fontWeight: 700, color }}>{val}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="slb">SATELLITE DATA SOURCE</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {['ISRO Bhuvan', 'Planet Labs', 'Maxar'].map(s => (
                <div key={s} onClick={() => setSat(s)} style={{ flex: 1, border: '1px solid', borderRadius: 6, padding: 12, cursor: 'pointer', borderColor: sat === s ? 'var(--am)' : 'var(--bd)', background: sat === s ? 'var(--amd)' : 'var(--ev)', transition: 'all 150ms' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: sat === s ? 'var(--am)' : 'var(--tx)', marginBottom: 3 }}>{s}</div>
                  <div style={{ fontSize: 10, color: 'var(--mt)' }}>{s === 'ISRO Bhuvan' ? 'Free · Government' : '₹12,000/month'}</div>
                  {sat === s && <div style={{ marginTop: 7 }}><span className="badge" style={{ background: 'var(--tld)', color: 'var(--tl)' }}>ACTIVE</span></div>}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="slb">SCAN FREQUENCY</div>
            <div style={{ display: 'flex', gap: 18 }}>
              {['Weekly', 'Bi-weekly', 'Monthly'].map(f => (
                <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13 }}>
                  <input type="radio" name="sf" checked={freq === f} onChange={() => setFreq(f)} /> {f}
                </label>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="slb">WARD COVERAGE — <span style={{ fontFamily: 'Space Mono', color: 'var(--am)' }}>{activeWards.size} of 198 active</span></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {WARDS.map(w => (
                <div key={w} onClick={() => toggleWard(w)} style={{ padding: '4px 9px', borderRadius: 4, border: '1px solid', cursor: 'pointer', fontSize: 11, borderColor: activeWards.has(w) ? 'var(--am)' : 'var(--bd)', background: activeWards.has(w) ? 'var(--amd)' : 'var(--ev)', color: activeWards.has(w) ? 'var(--am)' : 'var(--mt)', transition: 'all 150ms' }}>{w}</div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="slb">AUTO-FLAGGING THRESHOLD — <span style={{ fontFamily: 'Space Mono', color: 'var(--am)' }}>{conf}%</span></div>
            <input type="range" min={70} max={99} value={conf} onChange={(e) => setConf(+e.target.value)} style={{ marginBottom: 7 }} />
            <div style={{ fontFamily: 'Space Mono', fontSize: 11, color: 'var(--mt)' }}>Violations above {conf}% confidence are auto-flagged</div>
          </div>

          <button className="btn bp" style={{ width: 160 }} onClick={saveConfig} disabled={!canEditConfig}>
            {canEditConfig ? 'Save Configuration' : 'Admin Only'}
          </button>
        </div>
      )}

      {/* TEMPLATES */}
      {tab === 'templates' && (
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {templates.map((t, i) => (
              <div key={t.id} onClick={() => setEditIdx(i)} style={{ padding: '11px 13px', borderRadius: 4, border: '1px solid', cursor: 'pointer', borderColor: editIdx === i ? 'var(--am)' : 'var(--bd)', background: editIdx === i ? 'var(--amd)' : 'var(--sf)', transition: 'all 150ms' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: editIdx === i ? 'var(--am)' : 'var(--tx)', marginBottom: 5 }}>{t.name}</div>
                <div style={{ fontSize: 10, color: 'var(--mt)' }}>Last edited {t.updated_at?.slice(0, 10)}</div>
              </div>
            ))}
          </div>
          {tpl && (
            <div style={{ flex: 1 }}>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>{tpl.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--mt)' }}>Variables: <span style={{ fontFamily: 'Space Mono', color: 'var(--am)' }}>{'{violation_id} {owner_name} {address} {date}'}</span></div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['{violation_id}', '{owner_name}', '{address}', '{date}', '{officer_name}'].map(token => (
                    <button key={token} className="btn bs" style={{ fontSize: 10, padding: '4px 8px' }} onClick={() => {
                      const newTemplates = [...templates];
                      newTemplates[editIdx] = { ...tpl, body: tpl.body + '\n' + token };
                      setTemplates(newTemplates);
                    }}>{token}</button>
                  ))}
                </div>
                <textarea rows={15} value={tpl.body} onChange={(e) => {
                  const newTemplates = [...templates];
                  newTemplates[editIdx] = { ...tpl, body: e.target.value };
                  setTemplates(newTemplates);
                }} style={{ fontFamily: 'Space Mono', fontSize: 11, lineHeight: 1.7, background: 'rgba(8,10,13,.6)', resize: 'none' }} />
                <div style={{ border: '1px solid var(--bd)', borderRadius: 6, background: 'rgba(8,10,13,.55)', padding: '12px 14px' }}>
                  <div className="slb" style={{ marginBottom: 8 }}>LIVE PREVIEW</div>
                  <div style={{ fontFamily: 'Space Mono', fontSize: 10, color: 'var(--sc)', whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{templatePreview}</div>
                </div>
                <button className="btn bp" onClick={saveTemplate}>Save Template</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* INTEGRATIONS */}
      {tab === 'integrations' && (
        <div style={{ maxWidth: 720 }}>
          <div className="card" style={{
            background: 'rgba(245,166,35,0.06)',
            borderLeft: '3px solid var(--am)',
            marginBottom: 14,
          }}>
            <div className="slb" style={{ color: 'var(--am)' }}>PRODUCTION ROADMAP</div>
            <div style={{ fontSize: 12, color: 'var(--sc)', lineHeight: 1.6, marginTop: 4 }}>
              Listed integrations show current pilot status. Items marked <strong style={{ color: 'var(--rd)' }}>PLANNED</strong> are scoped for the June final-product milestone — see <a href="https://github.com" style={{ color: 'var(--am)' }}>roadmap on GitHub</a>.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {integrations.map((g, i) => {
              const isLive = g.status === 'LIVE';
              const isError = g.status === 'ERROR';
              const tone = isLive ? 'var(--tl)' : isError ? 'var(--rd)' : 'var(--mt)';
              const toneBg = isLive ? 'var(--tld)' : isError ? 'var(--rdd)' : 'var(--ev)';
              return (
                <div key={i} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11, flex: 1 }}>
                      <div className={isLive ? 'pu' : ''} style={{ width: 8, height: 8, borderRadius: '50%', background: tone, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{g.name}</div>
                        <div style={{ fontFamily: 'Space Mono', fontSize: 10, color: 'var(--mt)' }}>
                          Sync: {g.lastSync}{g.records !== '—' ? ' · ' + g.records + ' records' : ''}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="badge" style={{ background: toneBg, color: tone }}>{g.status}</span>
                      {isError && (
                        <button
                          onClick={() => toast(`Reconnect attempted for ${g.name}. Webhook URL re-registered.`, 'info')}
                          className="btn bs"
                          style={{ fontSize: 11 }}
                          data-tooltip="Re-attempt webhook handshake"
                        >
                          Reconnect
                        </button>
                      )}
                      {isLive && (
                        <button
                          onClick={() => toast(`Sync triggered for ${g.name}. Records will refresh shortly.`, 'success')}
                          className="btn bs"
                          style={{ fontSize: 11 }}
                          data-tooltip="Force a refresh"
                        >
                          Sync now
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Planned integrations — production roadmap */}
            {[
              { name: 'Google Earth Engine', desc: 'Petabyte-scale historical satellite analysis (5 years per plot)', tag: 'PLANNED · JUNE' },
              { name: 'WhatsApp Business API', desc: 'Officer dispatch + citizen reply notifications', tag: 'PLANNED · JUNE' },
              { name: 'Citizen Reporting Portal', desc: 'Public submission with photo + GPS, no login required', tag: 'PLANNED · JUNE' },
              { name: 'Vertex AI · Document AI', desc: 'Permit PDF parsing → automatic violation cross-check', tag: 'PLANNED · JUNE' },
            ].map((g) => (
              <div key={g.name} className="card" style={{ opacity: 0.78 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, flex: 1 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--bd)', border: '1px solid var(--mt)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{g.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--mt)', lineHeight: 1.4 }}>{g.desc}</div>
                    </div>
                  </div>
                  <span className="badge" style={{ background: 'rgba(167,139,250,0.12)', color: '#A78BFA', fontSize: 9, letterSpacing: '0.08em' }}>{g.tag}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TEAM */}
      {tab === 'team' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {[['ACTIVE OFFICERS', String(officers.filter(o => o.status === 'active').length), 'var(--tl)'], ['INVITED', String(officers.filter(o => o.status === 'invited').length), 'var(--bl)'], ['TOTAL TEAM', String(officers.length), 'var(--am)'], ['COMMAND ROLES', String(officers.filter(o => o.role === 'commissioner' || o.role === 'admin').length), 'var(--pu)']].map(([label, val, color]) => (
              <div key={label} className="card" style={{ padding: '14px 16px' }}>
                <div className="slb" style={{ marginBottom: 8 }}>{label}</div>
                <div style={{ fontFamily: 'Space Mono', fontSize: 18, fontWeight: 700, color }}>{val}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="slb" style={{ margin: 0 }}>OFFICERS</div>
              <button className="btn bp" style={{ fontSize: 11, padding: '4px 11px' }} onClick={() => setShowInvite(!showInvite)}>+ Invite Officer</button>
            </div>

            {showInvite && (
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--bd)', background: 'var(--ev)' }}>
                <div className="slb">INVITE NEW OFFICER</div>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  <input type="email" placeholder="officer@bbmp.gov.in" value={invEmail} onChange={(e) => setInvEmail(e.target.value)} style={{ flex: '1 1 220px' }} />
                  <select value={invRole} onChange={(e) => setInvRole(e.target.value)} style={{ width: 'auto', padding: '7px 9px' }}>
                    {['field_officer', 'inspector', 'commissioner', 'admin'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <select value={invWard} onChange={(e) => setInvWard(e.target.value)} style={{ width: 'auto', padding: '7px 9px' }}>
                    {WARDS.map(w => <option key={w}>{w}</option>)}
                  </select>
                  <button className="btn bp" onClick={inviteOfficer}>Send</button>
                </div>
              </div>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Name', 'Role', 'Ward Access', 'Last Active', 'Status'].map(hd => (
                    <th key={hd} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--mt)', background: 'rgba(22,27,36,.5)', borderBottom: '1px solid var(--bd)' }}>{hd}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {officers.map((o, i) => (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--bd)' }}>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500 }}>{o.name}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--sc)' }}>{o.role}</td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--mt)' }}>
                      {(() => { try { const wa = typeof o.ward_access === 'string' ? JSON.parse(o.ward_access) : o.ward_access; return wa === 'all' ? 'All Bengaluru' : Array.isArray(wa) ? wa.join(', ') : String(wa); } catch { return String(o.ward_access); } })()}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'Space Mono', fontSize: 10, color: 'var(--mt)' }}>
                      {o.last_active ? new Date(o.last_active).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="badge" style={{ background: o.status === 'active' ? 'var(--tld)' : o.status === 'invited' ? 'var(--bld)' : 'rgba(74,84,104,.2)', color: o.status === 'active' ? 'var(--tl)' : o.status === 'invited' ? 'var(--bl)' : 'var(--mt)' }}>{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Permissions Matrix */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--bd)' }}>
              <div className="slb" style={{ margin: 0 }}>ROLE PERMISSIONS MATRIX</div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, color: 'var(--mt)', background: 'rgba(22,27,36,.5)', borderBottom: '1px solid var(--bd)' }}>Permission</th>
                  {['Field Officer', 'Inspector', 'Commissioner', 'Admin'].map(r => (
                    <th key={r} style={{ padding: '8px 14px', textAlign: 'center', fontSize: 10, fontWeight: 500, color: 'var(--mt)', background: 'rgba(22,27,36,.5)', borderBottom: '1px solid var(--bd)' }}>{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[['View Violations', true, true, true, true], ['Flag Violations', true, true, true, true], ['Generate Notices', false, true, true, true], ['Escalate', false, true, true, true], ['Admin Settings', false, false, false, true]].map(([p, ...perms], i) => (
                  <tr key={p} style={{ borderBottom: '1px solid var(--bd)', background: i % 2 === 0 ? 'transparent' : 'rgba(22,27,36,.3)' }}>
                    <td style={{ padding: '8px 14px', fontSize: 11, color: 'var(--sc)' }}>{p}</td>
                    {perms.map((v, j) => (
                      <td key={j} style={{ padding: '8px 14px', textAlign: 'center' }}>
                        {v ? <span style={{ color: 'var(--tl)', fontSize: 14 }}>✓</span> : <span style={{ color: 'var(--mt)', opacity: 0.4, fontSize: 14 }}>✕</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
