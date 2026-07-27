export function parseWardAccess(value) {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value;
  if (value === 'all') return 'all';

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed === 'all') return 'all';
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value === 'all' ? 'all' : [];
    }
  }

  return [];
}

export function getAccessibleWards(user) {
  if (!user) return [];
  if (user.role === 'admin' || user.role === 'commissioner') return 'all';
  return parseWardAccess(user.ward_access);
}

export function hasGlobalAccess(user) {
  return getAccessibleWards(user) === 'all';
}

export function canAccessWard(user, ward) {
  const wards = getAccessibleWards(user);
  return wards === 'all' || wards.includes(ward);
}

export function buildWardScope(user, column) {
  const wards = getAccessibleWards(user);
  if (wards === 'all') return { clause: null, params: [] };
  if (!wards.length) return { clause: '1 = 0', params: [] };

  const placeholders = wards.map(() => '?').join(', ');
  return {
    clause: `${column} IN (${placeholders})`,
    params: wards,
  };
}

export function intersectsWardScope(user, wardAccess) {
  const requesterWards = getAccessibleWards(user);
  const targetWards = parseWardAccess(wardAccess);

  if (requesterWards === 'all' || targetWards === 'all') return true;
  return targetWards.some((ward) => requesterWards.includes(ward));
}
