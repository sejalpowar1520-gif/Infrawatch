import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { canAccessWard } from '../middleware/access.js';
import { generateAINotice } from '../services/gemini.js';

const router = Router();
router.use(authenticate);

// POST /api/notices/generate
router.post('/generate', requireRole('inspector', 'commissioner', 'admin'), (req, res) => {
  const db = getDb();
  const { violationId, templateId } = req.body;

  const violation = db.prepare(`
    SELECT v.*, u.name as officer_name
    FROM violations v
    LEFT JOIN users u ON v.officer_id = u.id
    WHERE v.id = ?
  `).get(violationId);

  if (!violation) {
    return res.status(404).json({ error: 'Violation not found' });
  }
  if (!canAccessWard(req.user, violation.ward)) {
    return res.status(403).json({ error: 'Access denied for this ward' });
  }

  const template = db.prepare('SELECT * FROM notice_templates WHERE id = ?').get(templateId || 1);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const content = template.body
    .replaceAll('{violation_id}', violation.id)
    .replaceAll('{owner_name}', violation.owner_name || 'Unknown')
    .replaceAll('{address}', violation.address)
    .replaceAll('{date}', today)
    .replaceAll('{officer_name}', violation.officer_name || req.user.name);

  const insertNotice = db.prepare(
    'INSERT INTO notices (violation_id, template_id, generated_by, content) VALUES (?, ?, ?, ?)'
  ).run(violationId, template.id, req.user.id, content);

  db.prepare("UPDATE violations SET status = 'NOTICE SENT', updated_at = datetime('now') WHERE id = ? AND status != 'RESOLVED'").run(
    violationId
  );

  db.prepare("INSERT INTO activity_logs (message, type, user_id, violation_id) VALUES (?, 'success', ?, ?)").run(
    `Generated ${template.name} for ${violationId}`,
    req.user.id,
    violationId
  );

  const notice = db.prepare(`
    SELECT
      n.id,
      n.template_id,
      n.content,
      n.created_at,
      nt.name as template_name,
      u.name as generated_by_name
    FROM notices n
    LEFT JOIN notice_templates nt ON n.template_id = nt.id
    LEFT JOIN users u ON n.generated_by = u.id
    WHERE n.id = ?
  `).get(insertNotice.lastInsertRowid);

  const updatedViolation = db.prepare(`
    SELECT v.*, u.name as officer_name
    FROM violations v
    LEFT JOIN users u ON v.officer_id = u.id
    WHERE v.id = ?
  `).get(violationId);

  res.json({
    message: 'Notice generated',
    content,
    notice,
    violation: updatedViolation,
  });
});

// POST /api/notices/generate-ai - Generate notice using configured AI provider
router.post('/generate-ai', requireRole('inspector', 'commissioner', 'admin'), async (req, res) => {
  const db = getDb();
  const { violationId } = req.body;

  const violation = db.prepare(`
    SELECT v.*, u.name as officer_name
    FROM violations v
    LEFT JOIN users u ON v.officer_id = u.id
    WHERE v.id = ?
  `).get(violationId);

  if (!violation) {
    return res.status(404).json({ error: 'Violation not found' });
  }
  if (!canAccessWard(req.user, violation.ward)) {
    return res.status(403).json({ error: 'Access denied for this ward' });
  }

  try {
    // Generate AI notice using the configured provider.
    const aiResult = await generateAINotice(violation);

    if (!aiResult.success) {
      return res.status(500).json({ error: 'Failed to generate AI notice' });
    }

    // Store AI notice in database (with special marker)
    const insertNotice = db.prepare(
      'INSERT INTO notices (violation_id, template_id, generated_by, ai_generated, ai_provider, ai_model, content) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      violationId,
      null,
      req.user.id,
      1,
      aiResult.provider || 'unknown',
      aiResult.model || null,
      aiResult.content
    );

    db.prepare("UPDATE violations SET status = 'NOTICE SENT', updated_at = datetime('now') WHERE id = ? AND status != 'RESOLVED'").run(
      violationId
    );

    // Log activity
    db.prepare("INSERT INTO activity_logs (message, type, user_id, violation_id) VALUES (?, 'success', ?, ?)").run(
      `Generated AI-enhanced notice for ${violationId}`,
      req.user.id,
      violationId
    );

    const notice = db.prepare(`
      SELECT
        n.id,
        n.template_id,
        n.content,
        n.created_at,
        n.ai_generated,
        n.ai_provider,
        n.ai_model,
        nt.name as template_name,
        u.name as generated_by_name
      FROM notices n
      LEFT JOIN notice_templates nt ON n.template_id = nt.id
      LEFT JOIN users u ON n.generated_by = u.id
      WHERE n.id = ?
    `).get(insertNotice.lastInsertRowid);

    res.json({
      message: 'AI notice generated successfully',
      content: aiResult.content,
      notice,
      aiGenerated: true,
      model: aiResult.model,
      provider: aiResult.provider,
    });
  } catch (error) {
    console.error('AI notice generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate AI notice',
      details: error.message,
      suggestion: 'Check AI_PROVIDER and the matching API key, then restart the server.'
    });
  }
});

// POST /api/notices/compare - Compare AI vs Template notice
router.post('/compare', requireRole('inspector', 'commissioner', 'admin'), async (req, res) => {
  const db = getDb();
  const { violationId } = req.body;

  const violation = db.prepare(`
    SELECT v.*, u.name as officer_name
    FROM violations v
    LEFT JOIN users u ON v.officer_id = u.id
    WHERE v.id = ?
  `).get(violationId);

  if (!violation) {
    return res.status(404).json({ error: 'Violation not found' });
  }
  if (!canAccessWard(req.user, violation.ward)) {
    return res.status(403).json({ error: 'Access denied for this ward' });
  }

  try {
    // Get template notice
    const template = db.prepare('SELECT * FROM notice_templates WHERE id = ?').get(1);
    const today = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const templateContent = template.body
      .replaceAll('{violation_id}', violation.id)
      .replaceAll('{owner_name}', violation.owner_name || 'Unknown')
      .replaceAll('{address}', violation.address)
      .replaceAll('{date}', today)
      .replaceAll('{officer_name}', violation.officer_name || 'BBMP Official');

    // Generate AI notice
    const aiResult = await generateAINotice(violation);

    res.json({
      violationId,
      templateNotice: templateContent,
      aiNotice: aiResult.content,
      comparison: {
        templateLength: templateContent.length,
        aiLength: aiResult.content.length,
        templateSections: templateContent.split('\n\n').length,
        aiSections: aiResult.content.split('\n\n').length,
      },
    });
  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({
      error: 'Failed to compare notices',
      details: error.message,
    });
  }
});

router.get('/templates', requireRole('commissioner', 'admin'), (req, res) => {
  const db = getDb();
  const templates = db.prepare('SELECT * FROM notice_templates ORDER BY id ASC').all();
  res.json({ templates });
});

// PUT /api/notices/templates/:id
router.put('/templates/:id', requireRole('commissioner', 'admin'), (req, res) => {
  const db = getDb();
  const { name, body } = req.body;

  const updates = [];
  const params = [];
  if (name) {
    updates.push('name = ?');
    params.push(name);
  }
  if (body) {
    updates.push('body = ?');
    params.push(body);
  }
  updates.push("updated_at = datetime('now')");

  db.prepare(`UPDATE notice_templates SET ${updates.join(', ')} WHERE id = ?`).run(...params, req.params.id);

  const updated = db.prepare('SELECT * FROM notice_templates WHERE id = ?').get(req.params.id);
  res.json({ template: updated });
});

export default router;
