import { useState, useRef, useEffect } from 'react';

/**
 * AI Features Demo - Hackathon Showcase
 * 
 * This page demonstrates ALL the AI capabilities:
 * 1. AI Chatbot - Ask questions about violations
 * 2. Batch Analysis - Scan multiple locations
 * 3. Timeline Analysis - Track construction over time
 * 4. Risk Prediction - Predict future violations
 * 5. Voice Commands - Hands-free operation
 * 6. Smart Alerts - AI-prioritized notifications
 */

const FEATURES = [
  { id: 'chat', icon: '💬', title: 'AI Chatbot', desc: 'Ask questions about any case' },
  { id: 'alerts', icon: '🔔', title: 'Smart Alerts', desc: 'AI-prioritized notifications' },
];

export default function AIFeaturesDemo() {
  const [activeFeature, setActiveFeature] = useState('chat');
  const [isProcessing, setIsProcessing] = useState(false);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0A0C10 0%, #151820 100%)',
      color: '#E8E9EA',
    }}>
      {/* Header */}
      <div style={{
        padding: '30px 40px',
        borderBottom: '1px solid #2A2D35',
        background: 'rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'Space Mono', fontSize: 12, color: '#F5A623', letterSpacing: '0.2em' }}>
              RAPID CRISIS RESPONSE · OPEN INNOVATION
            </div>
            <h1 style={{ margin: '8px 0 0', fontSize: 32, fontWeight: 700 }}>
              INFRAWATCH <span style={{ color: '#F5A623' }}>AI Features</span>
            </h1>
          </div>
          <div style={{
            display: 'flex',
            gap: 12,
            padding: '12px 20px',
            background: 'rgba(245,166,35,0.1)',
            border: '1px solid rgba(245,166,35,0.3)',
            borderRadius: 8,
          }}>
            <span>🚀 Powered by Vision AI</span>
            <span>|</span>
            <span>2 AI Features</span>
          </div>
        </div>
      </div>

      {/* Feature Tabs */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '20px 40px',
        overflowX: 'auto',
        borderBottom: '1px solid #2A2D35',
      }}>
        {FEATURES.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFeature(f.id)}
            style={{
              padding: '12px 20px',
              background: activeFeature === f.id 
                ? 'linear-gradient(135deg, #F5A623 0%, #E09612 100%)'
                : 'rgba(255,255,255,0.05)',
              border: activeFeature === f.id ? 'none' : '1px solid #2A2D35',
              borderRadius: 8,
              color: activeFeature === f.id ? '#0A0C10' : '#E8E9EA',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontWeight: activeFeature === f.id ? 600 : 400,
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ marginRight: 8, fontSize: 18 }}>{f.icon}</span>
            {f.title}
          </button>
        ))}
      </div>

      {/* Feature Content */}
      <div style={{ padding: '30px 40px' }}>
        {activeFeature === 'chat' && <AIChatDemo />}
        {activeFeature === 'alerts' && <SmartAlertsDemo />}
      </div>
    </div>
  );
}

// ============================================================================
// FEATURE 1: AI Chatbot
// ============================================================================
const SUGGESTED_QUESTIONS = [
  '🔥 Show me the most critical cases right now',
  '📊 Which ward has the most active violations?',
  '⏱️ What\'s the SLA breach situation?',
  '⚖️ Explain BBMP Act Section 321 penalties',
  '👮 Who has the most cases assigned right now?',
  '💰 Estimate total penalty exposure across active cases',
];

function AIChatDemo() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [image, setImage] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (overrideText) => {
    const text = (overrideText || input).trim();
    if (!text) return;

    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const controller = new AbortController();
    const slowTimer = setTimeout(() => {
      setMessages(prev => {
        // Only show the "slow" notice if we're still loading
        if (prev[prev.length - 1]?.role === 'user') {
          return [...prev, { role: 'system', content: '⏳ AI service is slow — retrying with fallback provider...' }];
        }
        return prev;
      });
    }, 10000);
    const hardTimer = setTimeout(() => controller.abort(), 30000);

    try {
      const token = localStorage.getItem('iw_token');
      const response = await fetch('/api/vision/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          question: text,
          imageData: image,
          conversationHistory: messages.filter(m => m.role !== 'system'),
        }),
        signal: controller.signal,
      });

      clearTimeout(slowTimer);
      clearTimeout(hardTimer);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errData.error || `AI service returned ${response.status}`);
      }

      const data = await response.json();
      if (data._provider) console.log('[AI] chat answered by:', data._provider);
      // Strip the interim "slow" system message if present
      setMessages(prev => {
        const cleaned = prev.filter(m => m.role !== 'system');
        return [...cleaned, { role: 'assistant', content: data.answer || 'No response from AI.' }];
      });
    } catch (err) {
      clearTimeout(slowTimer);
      clearTimeout(hardTimer);
      console.error('[AI] chat error:', err);
      const msg = err.name === 'AbortError'
        ? '⚠️ AI timeout (30s) — both Gemini and Groq are unavailable right now. Please try again.'
        : `⚠️ AI error: ${err.message}`;
      setMessages(prev => {
        const cleaned = prev.filter(m => m.role !== 'system');
        return [...cleaned, { role: 'assistant', content: msg }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const dataUrl = await fileToDataUrl(file);
      setImage({ name: file.name, dataUrl });
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <FeatureHeader
        icon="💬"
        title="AI Chatbot"
        subtitle="Ask anything about violations, building codes, or uploaded satellite imagery"
      />

      {/* Image Upload */}
      <div style={{ marginBottom: 20 }}>
        <label style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 16px',
          background: image ? 'rgba(52,199,89,0.1)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${image ? '#34C759' : '#2A2D35'}`,
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 13,
        }}>
          📷 {image ? `Image: ${image.name}` : 'Upload satellite image for context'}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
        </label>
      </div>

      {/* Chat Messages */}
      <div style={{
        background: '#12151B',
        border: '1px solid #2A2D35',
        borderRadius: 12,
        height: 400,
        overflowY: 'auto',
        padding: 20,
        marginBottom: 16,
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#5A5F68', padding: '20px 16px 16px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
            <div style={{ fontSize: 15, color: '#E8E9EA', fontWeight: 500, marginBottom: 4 }}>
              INFRAWATCH AI Copilot
            </div>
            <div style={{ fontSize: 12, color: '#8A8F98', marginBottom: 18 }}>
              I have <span style={{ color: '#34C759', fontWeight: 600 }}>live read access</span> to your violations database. Ask anything.
            </div>
            <div style={{ fontSize: 10, color: '#8A8F98', letterSpacing: '0.1em', marginBottom: 8, fontFamily: 'Space Mono' }}>
              SUGGESTED QUESTIONS
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 600, margin: '0 auto' }}>
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q.replace(/^[^\s]+\s/, ''))}
                  style={{
                    padding: '7px 12px',
                    background: 'rgba(245,166,35,0.08)',
                    border: '1px solid rgba(245,166,35,0.3)',
                    borderRadius: 16,
                    color: '#E8E9EA',
                    fontSize: 11,
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(245,166,35,0.18)'; e.currentTarget.style.borderColor = '#F5A623'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(245,166,35,0.08)'; e.currentTarget.style.borderColor = 'rgba(245,166,35,0.3)'; }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: 12,
          }}>
            <div style={{
              maxWidth: '80%',
              padding: '12px 16px',
              borderRadius: 12,
              background: msg.role === 'user' ? '#F5A623' : '#1E2128',
              color: msg.role === 'user' ? '#0A0C10' : '#E8E9EA',
              fontSize: 14,
              lineHeight: 1.6,
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ display: 'flex', gap: 4, padding: 12 }}>
            <div className="pu" style={{ width: 8, height: 8, borderRadius: '50%', background: '#F5A623' }} />
            <span style={{ color: '#5A5F68', fontSize: 13 }}>AI is thinking...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 12 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage(null)}
          placeholder="Ask about violations, penalties, building codes..."
          style={{
            flex: 1,
            padding: '14px 18px',
            background: '#12151B',
            border: '1px solid #2A2D35',
            borderRadius: 8,
            color: '#E8E9EA',
            fontSize: 14,
          }}
        />
        <button
          onClick={() => sendMessage(null)}
          disabled={isLoading || !input.trim()}
          style={{
            padding: '14px 28px',
            background: 'linear-gradient(135deg, #F5A623 0%, #E09612 100%)',
            border: 'none',
            borderRadius: 8,
            color: '#0A0C10',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// FEATURE 6: Smart Alerts
// ============================================================================
function SmartAlertsDemo() {
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAlerts = async () => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem('iw_token');
      const response = await fetch('/api/vision/prioritize-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      setResult(await response.json());
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <FeatureHeader
        icon="🔔"
        title="AI-Prioritized Smart Alerts"
        subtitle="AI analyzes and prioritizes your pending cases by urgency and impact"
      />

      <button
        onClick={fetchAlerts}
        disabled={isLoading}
        style={{
          marginBottom: 20,
          padding: '12px 24px',
          background: 'linear-gradient(135deg, #F5A623 0%, #E09612 100%)',
          border: 'none',
          borderRadius: 8,
          color: '#0A0C10',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {isLoading ? 'Analyzing...' : '🔄 Refresh Prioritization'}
      </button>

      {result?.summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          <StatBox label="Total Pending" value={result.summary.totalAlerts} />
          <StatBox label="Immediate Action" value={result.summary.immediateAction} color="#FF3B30" />
          <StatBox label="Can Defer" value={result.summary.canDefer} color="#34C759" />
        </div>
      )}

      <div style={{ background: '#12151B', border: '1px solid #2A2D35', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #2A2D35', fontSize: 12, fontFamily: 'Space Mono', color: '#F5A623' }}>
          PRIORITIZED ALERTS
        </div>
        {result?.prioritizedAlerts?.map((alert, i) => (
          <div key={i} style={{
            padding: '16px 20px',
            borderBottom: '1px solid #2A2D35',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: alert.urgencyLevel === 'IMMEDIATE' ? '#FF3B30' :
                         alert.urgencyLevel === 'HIGH' ? '#FF9500' :
                         alert.urgencyLevel === 'MEDIUM' ? '#F5A623' : '#34C759',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: '#0A0C10',
            }}>
              {alert.priorityRank}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{alert.alertId}</div>
              <div style={{ fontSize: 12, color: '#8A8F98' }}>{alert.reasoning}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: alert.urgencyLevel === 'IMMEDIATE' ? '#FF3B30' :
                       alert.urgencyLevel === 'HIGH' ? '#FF9500' :
                       alert.urgencyLevel === 'MEDIUM' ? '#F5A623' : '#34C759',
              }}>
                {alert.urgencyLevel}
              </div>
              <div style={{ fontSize: 11, color: '#5A5F68' }}>{alert.estimatedTimeToHandle}</div>
            </div>
          </div>
        ))}
        {(!result?.prioritizedAlerts || result.prioritizedAlerts.length === 0) && (
          <div style={{ padding: 40, textAlign: 'center', color: '#5A5F68' }}>
            No pending alerts to prioritize
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================
function FeatureHeader({ icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span style={{ fontSize: 32 }}>{icon}</span>
        <h2 style={{ margin: 0, fontSize: 24 }}>{title}</h2>
      </div>
      <p style={{ margin: 0, color: '#8A8F98' }}>{subtitle}</p>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{ background: '#0A0C10', borderRadius: 8, padding: 16 }}>
      <div style={{ fontSize: 10, color: '#8A8F98', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || '#E8E9EA', fontFamily: 'Space Mono' }}>
        {value}
      </div>
    </div>
  );
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1280;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
