import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../components/cartify/useCart.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText;

function cartStore(initial) {
  let saved = initial;
  let failWrites = false;
  const exports = {};
  vm.runInNewContext(code, {
    exports, Event, window: new EventTarget(),
    localStorage: {
      getItem: () => saved,
      setItem: (_key, value) => {
        if (failWrites) throw new Error('Storage full');
        saved = value;
      },
    },
    require: (id) => {
      assert.equal(id, 'react');
      return { useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot() };
    },
  });
  return {
    read: () => exports.useCart(),
    replace: value => { saved = value; },
    blockWrites: () => { failWrites = true; },
  };
}

test('cart keeps in-memory additions when storage writes fail', () => {
  const store = cartStore('{"shirt":1}');
  store.blockWrites();
  store.read().changeQuantity('shirt', 1);
  assert.equal(store.read().cart.shirt, 2);
  store.read().changeQuantity('shirt', 1);
  assert.equal(store.read().cart.shirt, 3);
});

test('cart rejects malformed storage and invalid quantity changes', () => {
  const store = cartStore('{"shirt":2}');
  store.read().changeQuantity('shirt', NaN);
  assert.equal(store.read().cart.shirt, 2);
  for (const value of ['null', '[3]', '{invalid']) {
    store.replace(value);
    assert.equal(Object.keys(store.read().cart).length, 0);
  }
  store.replace('{"shirt":3,"bad":-1,"fraction":1.5}');
  assert.deepEqual(Object.keys(store.read().cart), ['shirt']);
});
