import assert from 'node:assert/strict';
import test from 'node:test';
import { getPayOnDeliveryEligibility, isInsideNairobiCounty } from './nairobiCounty.js';

const INSIDE = {
  CBD: { lat: -1.2864, lng: 36.8172 },
  Westlands: { lat: -1.2676, lng: 36.8108 },
  Karen: { lat: -1.3197, lng: 36.7073 },
  JKIA: { lat: -1.3192, lng: 36.9278 },
  'Kahawa West': { lat: -1.1856, lng: 36.897 },
  Ruai: { lat: -1.277, lng: 36.994 },
  Kamulu: { lat: -1.2825, lng: 37.0637 },
};

const OUTSIDE = {
  Ruaka: { lat: -1.2044, lng: 36.7797 },
  Kitengela: { lat: -1.4766, lng: 36.9606 },
  'Ongata Rongai': { lat: -1.3964, lng: 36.7447 },
  Syokimau: { lat: -1.3647, lng: 36.9436 },
  Ruiru: { lat: -1.1466, lng: 36.9608 },
  Kikuyu: { lat: -1.2463, lng: 36.6629 },
  Joska: { lat: -1.2841, lng: 37.0974 },
  Mombasa: { lat: -4.0435, lng: 39.6682 },
};

test('places inside Nairobi County are inside the boundary', () => {
  for (const [name, point] of Object.entries(INSIDE)) {
    assert.equal(isInsideNairobiCounty(point), true, name);
  }
});

test('places outside Nairobi County are outside the boundary', () => {
  for (const [name, point] of Object.entries(OUTSIDE)) {
    assert.equal(isInsideNairobiCounty(point), false, name);
  }
});

test('missing or malformed coordinates are never inside', () => {
  assert.equal(isInsideNairobiCounty(null), false);
  assert.equal(isInsideNairobiCounty({ lat: 'x', lng: 36.8 }), false);
});

test('pay on delivery needs a Nairobi pin or a Nairobi zone', () => {
  const nairobiZone = { inNairobiCounty: true };
  const outsideZone = { inNairobiCounty: false };
  const allowed = (args) => getPayOnDeliveryEligibility({ fulfillmentType: 'delivery', ...args }).allowed;

  assert.equal(allowed({ customerLocation: INSIDE.CBD }), true);
  assert.equal(allowed({ customerLocation: OUTSIDE.Kitengela }), false);
  assert.equal(allowed({ deliveryZone: nairobiZone }), true);
  assert.equal(allowed({ deliveryZone: outsideZone }), false);
  // A zone outside Nairobi blocks it even with a Nairobi pin, and vice versa.
  assert.equal(allowed({ deliveryZone: outsideZone, customerLocation: INSIDE.CBD }), false);
  assert.equal(allowed({ deliveryZone: nairobiZone, customerLocation: OUTSIDE.Ruaka }), false);
  assert.equal(allowed({}), false);
});

test('store pickup can pay at the counter; SACCO drop-offs cannot pay later', () => {
  assert.equal(getPayOnDeliveryEligibility({ fulfillmentType: 'pickup' }).allowed, true);
  assert.equal(getPayOnDeliveryEligibility({ fulfillmentType: 'sacco_pickup', customerLocation: INSIDE.CBD }).allowed, false);
});
