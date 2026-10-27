import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../lib/category-availability.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { categoryAvailability, productHasStock, visibleCategoryTree } = await import(`data:text/javascript,${encodeURIComponent(compiled)}`);

const category = (id, name, children = [], enabled = true) => ({ id, name, children, enabled });
const product = (categoryName, subcategory, stock, overrides = {}) => ({
  id: 'test', category: categoryName, subcategory, stock, status: 'Active', ...overrides,
});

test('empty and zero-stock categories are hidden, including direct children', () => {
  const tree = [category('parent', 'Clothing', [category('shirts', 'Shirts'), category('pants', 'Pants')])];
  const availability = categoryAvailability(tree, [product('Clothing', 'Shirts', 0)]);
  assert.deepEqual(visibleCategoryTree(tree, availability), []);
  assert.equal(tree[0].enabled, true);
  assert.equal(tree[0].children[0].enabled, true);
  assert.equal(availability.get('shirts'), false);
  assert.equal(availability.get('pants'), false);
});

test('stock in one child keeps its ancestors visible but not empty siblings', () => {
  const tree = [category('parent', 'Clothing', [category('shirts', 'Shirts'), category('pants', 'Pants')])];
  const availability = categoryAvailability(tree, [product('Clothing', 'Shirts', 3)]);
  assert.deepEqual(visibleCategoryTree(tree, availability)[0].children.map(node => node.id), ['shirts']);
  assert.equal(availability.get('parent'), true);
  assert.equal(availability.get('pants'), false);
});

test('drafts, hidden products, and zero-stock backorders do not activate categories', () => {
  assert.equal(productHasStock(product('Clothing', 'Shirts', 4, { status: 'Draft' })), false);
  assert.equal(productHasStock(product('Clothing', 'Shirts', 4, { storefront: { showOnStorefront: false } })), false);
  assert.equal(productHasStock(product('Clothing', 'Shirts', 0, { allowBackorders: true })), false);
  assert.equal(productHasStock(product('Clothing', 'Shirts', 0, { variants: [{ stock: 0 }, { stock: 2 }] })), true);
  assert.equal(productHasStock(product('Clothing', 'Shirts', 0, { sizeStock: { S: 0, M: 2 } })), true);
});

test('manually disabled parent hides its stocked child', () => {
  const tree = [category('parent', 'Clothing', [category('shirts', 'Shirts')], false)];
  const availability = categoryAvailability(tree, [product('Clothing', 'Shirts', 2)]);
  assert.equal(availability.get('shirts'), true);
  assert.deepEqual(visibleCategoryTree(tree, availability), []);
});

test('same-named categories only inherit stock from their own ancestors', () => {
  const tree = [category('women', 'Women', [category('women-shirts', 'Shirts')]),
    category('men', 'Men', [category('men-shirts', 'Shirts')])];
  const availability = categoryAvailability(tree, [product('Women', 'Shirts', 2)]);
  assert.equal(availability.get('women-shirts'), true);
  assert.equal(availability.get('men-shirts'), false);
  assert.deepEqual(visibleCategoryTree(tree, availability).map(node => node.id), ['women']);
});
