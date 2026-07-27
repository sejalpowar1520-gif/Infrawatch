import { useState } from 'react';

/**
 * Public citizen reporting page — no login required.
 *
 * Accessible at /?report=1 or via the "Report a Violation" button on the login screen.
 * Submits to POST /api/citizen/report (unauthenticated endpoint).
 */

const WARDS = [
  'Koramangala', 'Jayanagar', 'Indiranagar', 'Whitefield', 'HSR Layout',
  'Malleshwaram', 'Basavanagudi', 'Yelahanka', 'Hebbal', 'Marathahalli',
  'Bellandur', 'BTM Layout', 'Rajajinagar', 'Banashankari', 'JP Nagar',
  'Other / Not sure',
];

export default function CitizenReportPage({ onBack }) {
  const [step, setStep] = useState('form'); // form | submitting | success | error
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [reportId, setReportId] = useState(null);
  const [form, setForm] = useState({
    reporter_name: '',
    reporter_phone: '',
    reporter_email: '',
    description: '',
    address: '',
    ward: '',
    lat: '',
    lng: '',
  });

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Photo too large. Please use an image under 8 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result);
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }));
      },
      (err) => setErrorMsg('Could not get your location: ' + err.message),
      { timeout: 10000 }
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.description || form.description.trim().length < 10) {
      setErrorMsg('Please describe the violation in at least 10 characters.');
      return;
    }

    setStep('submitting');

    try {
      const res = await fetch('/api/citizen/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          lat: form.lat ? Number(form.lat) : null,
          lng: form.lng ? Number(form.lng) : null,
          photo_data_url: photo,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Submission failed.');
        setStep('error');
        return;
      }
      setReportId(data.reportId);
      setStep('success');
    } catch (err) {
      setErrorMsg(err.message || 'Network error.');
      setStep('error');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top right, rgba(245,166,35,0.08), transparent 60%), #080A0D',
      color: '#E8E9EA',
      padding: '30px 20px 60px',
      overflowY: 'auto',
    }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: 'Space Mono', fontSize: 11, color: '#F5A623', letterSpacing: '0.15em' }}>
              INFRAWATCH · PUBLIC REPORTING PORTAL
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 600, marginTop: 4 }}>
              Report an Illegal Construction
            </h1>
            <p style={{ fontSize: 13, color: '#8A8F98', marginTop: 6, lineHeight: 1.55 }}>
              See a suspicious construction near you? Submit a report directly to BBMP enforcement.
              No login required. Anonymous submissions accepted.
            </p>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                background: 'transparent',
                border: '1px solid #2A2D35',
                color: '#8A8F98',
                padding: '6px 12px',
                borderRadius: 4,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              ← Back to Login
            </button>
          )}
        </div>

        {/* SUCCESS state */}
        {step === 'success' && (
          <div style={{
            background: 'rgba(52,199,89,0.08)',
            border: '1px solid #34C759',
            borderLeft: '3px solid #34C759',
            borderRadius: 8,
            padding: 22,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#34C759', marginBottom: 6 }}>
              Report Received
            </div>
            <div style={{ fontSize: 13, color: '#B8BCC4', lineHeight: 1.6 }}>
              Your report has been logged as <strong style={{ color: '#F5A623' }}>#CR-{reportId}</strong>.
              A BBMP enforcement officer will review it within 24 hours and may contact you if more details are needed.
            </div>
            <div style={{ marginTop: 16, fontSize: 11, color: '#8A8F98' }}>
              Every submission feeds INFRAWATCH's AI to improve detection for your neighbourhood.
            </div>
          </div>
        )}

        {/* ERROR state */}
        {step === 'error' && (
          <div style={{
            background: 'rgba(255,59,48,0.1)',
            border: '1px solid #FF3B30',
            borderRadius: 8,
            padding: 20,
            marginBottom: 16,
          }}>
            <div style={{ color: '#FF3B30', fontWeight: 600, marginBottom: 4 }}>Submission failed</div>
            <div style={{ fontSize: 13, color: '#FF6B6B', marginBottom: 10 }}>{errorMsg}</div>
            <button onClick={() => setStep('form')} className="btn bs" style={{ fontSize: 12 }}>
              Try again
            </button>
          </div>
        )}

        {/* FORM */}
        {(step === 'form' || step === 'submitting') && (
          <form onSubmit={submit} style={{
            background: '#0F1117',
            border: '1px solid #2A2D35',
            borderRadius: 10,
            padding: 24,
          }}>
            {errorMsg && (
              <div style={{
                background: 'rgba(255,59,48,0.08)',
                border: '1px solid #FF3B30',
                color: '#FF6B6B',
                padding: '8px 12px',
                borderRadius: 4,
                fontSize: 12,
                marginBottom: 14,
              }}>{errorMsg}</div>
            )}

            {/* Description */}
            <Field label="WHAT DID YOU SEE? *" hint="Describe the violation in your own words. Example: 'New 4th floor being added to the building at the corner. Construction started last week.'">
              <textarea
                required
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe what you observed…"
                style={textStyle()}
              />
            </Field>

            {/* Address + Ward */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="STREET ADDRESS / LANDMARK">
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="e.g. 5th Cross, HSR Sector 6"
                  style={textStyle()}
                />
              </Field>
              <Field label="WARD">
                <select
                  value={form.ward}
                  onChange={(e) => setForm({ ...form, ward: e.target.value })}
                  style={textStyle()}
                >
                  <option value="">-- Select ward --</option>
                  {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </Field>
            </div>

            {/* Location */}
            <Field label="GPS LOCATION (OPTIONAL BUT HELPFUL)">
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                  placeholder="Latitude"
                  style={textStyle()}
                />
                <input
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                  placeholder="Longitude"
                  style={textStyle()}
                />
                <button
                  type="button"
                  onClick={useMyLocation}
                  style={{
                    background: 'rgba(245,166,35,0.1)',
                    border: '1px solid #F5A623',
                    color: '#F5A623',
                    padding: '0 14px',
                    borderRadius: 4,
                    fontSize: 11,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  📍 Use my location
                </button>
              </div>
            </Field>

            {/* Photo */}
            <Field label="UPLOAD A PHOTO (OPTIONAL)">
              <label style={{
                display: 'block',
                padding: '12px 14px',
                background: photoPreview ? 'rgba(52,199,89,0.06)' : '#0A0C10',
                border: '1px dashed #2A2D35',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
                color: photoPreview ? '#34C759' : '#8A8F98',
                textAlign: 'center',
              }}>
                {photoPreview ? '✓ Photo attached (click to replace)' : '📷 Click to upload a photo of the violation'}
                <input type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
              </label>
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Preview"
                  style={{ marginTop: 8, maxWidth: '100%', maxHeight: 160, borderRadius: 4, border: '1px solid #2A2D35' }}
                />
              )}
            </Field>

            <hr style={{ border: 'none', borderTop: '1px solid #1E2533', margin: '18px 0' }} />

            <div style={{ fontSize: 11, color: '#8A8F98', marginBottom: 12 }}>
              <strong style={{ color: '#E8E9EA' }}>YOUR CONTACT (optional — for follow-up)</strong>
              <div style={{ marginTop: 3 }}>All fields below are optional. You can submit anonymously.</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="NAME (OPTIONAL)">
                <input
                  value={form.reporter_name}
                  onChange={(e) => setForm({ ...form, reporter_name: e.target.value })}
                  placeholder="Your name"
                  style={textStyle()}
                />
              </Field>
              <Field label="PHONE (OPTIONAL)">
                <input
                  value={form.reporter_phone}
                  onChange={(e) => setForm({ ...form, reporter_phone: e.target.value })}
                  placeholder="+91-XXXXXXXXXX"
                  style={textStyle()}
                />
              </Field>
            </div>

            <Field label="EMAIL (OPTIONAL)">
              <input
                type="email"
                value={form.reporter_email}
                onChange={(e) => setForm({ ...form, reporter_email: e.target.value })}
                placeholder="your@email.com"
                style={textStyle()}
              />
            </Field>

            {/* Submit */}
            <button
              type="submit"
              disabled={step === 'submitting'}
              style={{
                width: '100%',
                marginTop: 10,
                padding: '12px 20px',
                background: 'linear-gradient(135deg, #F5A623, #E09612)',
                border: 'none',
                color: '#0A0C10',
                fontWeight: 700,
                fontSize: 14,
                borderRadius: 6,
                cursor: step === 'submitting' ? 'not-allowed' : 'pointer',
                letterSpacing: '0.02em',
                opacity: step === 'submitting' ? 0.6 : 1,
              }}
            >
              {step === 'submitting' ? 'Submitting…' : '🚨 Submit Report to BBMP'}
            </button>

            <div style={{ marginTop: 12, fontSize: 10, color: '#5A5F68', textAlign: 'center', lineHeight: 1.6 }}>
              Your report will be reviewed by a BBMP enforcement officer. False or malicious reports
              may be subject to action under Section 182 of the Indian Penal Code.
            </div>
          </form>
        )}

        {/* Info footer */}
        <div style={{
          marginTop: 28,
          fontSize: 11,
          color: '#5A5F68',
          textAlign: 'center',
          lineHeight: 1.6,
        }}>
          INFRAWATCH · Urban Safety Crisis Response ·
          Aligned with UN SDG 11 &amp; SDG 16 ·
          Built for Google Solution Challenge 2026
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: 'block',
        fontSize: 10,
        fontFamily: 'Space Mono',
        color: '#8A8F98',
        letterSpacing: '0.08em',
        marginBottom: 5,
      }}>
        {label}
      </label>
      {children}
      {hint && (
        <div style={{ fontSize: 10, color: '#5A5F68', marginTop: 4, lineHeight: 1.5 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function textStyle() {
  return {
    width: '100%',
    padding: '10px 12px',
    background: '#0A0C10',
    border: '1px solid #2A2D35',
    borderRadius: 4,
    color: '#E8E9EA',
    fontSize: 13,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  };
}
