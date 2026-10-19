import assert from 'node:assert/strict';

// Math trig results can differ at the last bits across CPU/libm implementations.
// Preserve topology and vertex order; allow only sub-pixel numeric roundoff.
export function assertGeometryClose(actual: unknown, expected: unknown, path = 'geometry'): void {
  if (typeof actual === 'number' && typeof expected === 'number') {
    assert.ok(Number.isFinite(actual) && Number.isFinite(expected) && Math.abs(actual - expected) <= 1e-7, `${path}: ${actual} != ${expected}`);
  } else if (Array.isArray(actual) && Array.isArray(expected)) {
    assert.equal(actual.length, expected.length, `${path} length`);
    actual.forEach((value, index) => assertGeometryClose(value, expected[index], `${path}[${index}]`));
  } else if (actual !== null && expected !== null && typeof actual === 'object' && typeof expected === 'object') {
    const a = actual as Record<string, unknown>, b = expected as Record<string, unknown>;
    assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort(), `${path} keys`);
    for (const key of Object.keys(a)) assertGeometryClose(a[key], b[key], `${path}.${key}`);
  } else {
    assert.deepEqual(actual, expected, path);
  }
}
