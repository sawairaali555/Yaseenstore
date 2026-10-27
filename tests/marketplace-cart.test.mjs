import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCart, readSavedValue, saveValue } from '../src/cart.js';

const products = [{ id: 'shirt', name: 'Shirt', price: 100, stock: 4, variants: [
  { name: 'Size', values: ['S', 'M'] }, { name: 'Color', values: ['Blue'] },
] }];

test('cart recovery rejects corrupt lines and refreshes catalog prices', () => {
  for (const invalid of [null, {}, 'cart']) assert.deepEqual(normalizeCart(invalid, products), []);
  const cart = normalizeCart([null, { id: 'missing', qty: 1 }, { id: 'shirt', qty: -1 },
    { id: 'shirt', qty: 1.5 }, { id: 'shirt', qty: 2, price: 1, name: 'stale' }], products);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].price, 100);
  assert.equal(cart[0].name, 'Shirt');
});

test('stock is shared across variant lines and canonical variants merge', () => {
  const cart = normalizeCart([
    { id: 'shirt', qty: 1, variant: { Size: 'S', Color: 'Blue' } },
    { id: 'shirt', qty: 1, variant: { Color: 'Blue', Size: 'S' } },
    { id: 'shirt', qty: 9, variant: { Size: 'M', Unknown: 'value' } },
  ], products);
  assert.equal(cart.length, 2);
  assert.deepEqual(cart.map(item => item.qty), [2, 2]);
  assert.deepEqual(cart[1].variant, { Size: 'M' });
  assert.deepEqual(normalizeCart(cart, products), cart);
});

test('unavailable browser storage does not break shopping', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
  try {
    assert.deepEqual(readSavedValue('cart', []), []);
    assert.doesNotThrow(() => saveValue('cart', []));
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});
