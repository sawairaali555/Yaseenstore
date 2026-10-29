import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import ts from 'typescript';
import {webcrypto} from 'node:crypto';
import {createRequire} from 'node:module';
test('local admin bypass is development-only and respects stored roles and account status', async () => {
  const saved = { NODE_ENV: process.env.NODE_ENV, LOCAL_ADMIN_BYPASS: process.env.LOCAL_ADMIN_BYPASS };
  try {
    const h = harness();
    const current = h.getCurrent();
    current.host = '127.0.0.1:5174';
    current.id = '';
    process.env.LOCAL_ADMIN_BYPASS = 'true';
    process.env.NODE_ENV = 'production';
    await assert.rejects(h.server.actor('settings.edit'), /Sign in/);
    assert.equal(h.db.prepare('SELECT count(*) n FROM access_users').get().n, 0);
    process.env.NODE_ENV = 'development';
    assert.equal((await h.server.actor('settings.edit')).id, 'local-dev-owner');
    h.db.prepare("UPDATE access_users SET role='member' WHERE id='local-dev-owner'").run();
    await assert.rejects(h.server.actor('settings.edit'), /role does not permit/);
    h.db.prepare("UPDATE access_users SET status='removed' WHERE id='local-dev-owner'").run();
    await assert.rejects(h.server.actor(), /inactive/);
    current.host = 'evil.example:5174';
    await assert.rejects(h.server.actor(), /Sign in/);
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('local write origins must match the request and are disabled in production', () => {
  const saved = process.env.NODE_ENV;
  const { origin } = harness().server;
  const request = value => new Request('http://localhost:5174/api/admin', { headers: { origin: value } });
  try {
    process.env.NODE_ENV = 'development';
    assert.doesNotThrow(() => origin(request('http://localhost:5174')));
    assert.throws(() => origin(request('http://localhost:5173')), /Invalid request origin/);
    process.env.NODE_ENV = 'production';
    assert.throws(() => origin(request('http://localhost:5174')), /Invalid request origin/);
    assert.doesNotThrow(() => origin(new Request(ORIGIN + '/api/admin', { headers: { origin: ORIGIN } })));
  } finally {
    if (saved === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = saved;
  }
});

test('admin requests preserve cancellation, disable caching and reject HTML session responses', async () => {
  const controller = new AbortController();
  let signal;
  const { adminFetch } = harness(async (_url, options) => {
    assert.equal(options.cache, 'no-store');
    signal = options.signal;
    return Response.json({ ok: true });
  }).load('lib/admin-request.ts');
  assert.equal((await adminFetch('/api/admin', { signal: controller.signal })).status, 200);
  controller.abort();
  assert.equal(signal.aborted, true);
  const html = harness(async () => new Response('<html>Login</html>', { status: 401, headers: { 'Content-Type': 'text/html' } })).load('lib/admin-request.ts');
  await assert.rejects(html.adminFetch('/api/admin'), /session expired/);
});
const require=createRequire(import.meta.url);
function stockProduct() {
  return { id: 'stock-test', name: 'Test shoes', category: 'Fashion', image: 'shoes',
    price: 1000, old: 1200, status: 'Active', stock: 5,
    variants: [{ id: 'red-m', color: 'Red', size: 'M', stock: 2, price: 1500, status: 'Active' },
      { id: 'blue-m', color: 'Blue', size: 'M', stock: 3, price: 1200, status: 'Active' }] };
}

test('cart validation rejects missing, mismatched and inactive variants, even on backorder', () => {
  const h = harness();
  const { validateCartItems } = h.load('lib/inventory-engine.ts');
  const product = stockProduct();
  const line = { id: product.id, size: 'M', color: 'Red', qty: 1 };
  for (const change of [{ color: 'Green' }, { variantId: 'missing' }, { variantId: 'blue-m' }, { size: 'XL' }, { qty: -1 }, { qty: 1.5 }]) {
    assert.equal(validateCartItems([{ ...line, ...change }], [{ ...product, allowBackorders: true }]).valid, false);
  }
  product.variants[0].status = 'Draft';
  assert.equal(validateCartItems([line], [product]).valid, false);
});

test('cart prices selected variants and shares stock across duplicate lines', () => {
  const { validateCartItems, getVariantAvailableStock } = harness().load('lib/inventory-engine.ts');
  const product = stockProduct();
  const line = { id: product.id, size: 'M', color: 'Red', qty: 2 };
  const result = validateCartItems([line, { ...line, variantId: 'red-m' }], [product]);
  assert.equal(result.valid, false);
  assert.equal(result.subtotal, 3000);
  assert.equal(result.itemCount, 2);
  assert.equal(getVariantAvailableStock(product, null, 'M', 'Blue'), 3);
  assert.equal(getVariantAvailableStock(product, null, 'M', 'Green'), 0);
});

test('saved shopping data tolerates corrupt JSON and rejects malformed items', () => {
  const { parseSavedCart, parseSavedWishlist } = harness().load('lib/shopping-storage.ts');
  for (const raw of ['broken', '{}', 'null', '[null,42,{"qty":-2}]']) assert.equal(parseSavedCart(raw).length, 0);
  const valid = { id: 'p1', size: 'Standard', qty: 2 };
  assert.equal(parseSavedCart(JSON.stringify([valid, { ...valid, qty: -1 }])).length, 1);
  assert.equal(parseSavedWishlist('["p1",null,4,"p1"]').length, 1);
});

test('product images retain uploaded paths and resolve legacy catalog names', () => {
  const { productImage } = harness().load('lib/product-image.ts');
  assert.equal(productImage('/api/media/abc'), '/api/media/abc');
  assert.equal(productImage('/images/shoes.jpg'), '/images/shoes.jpg');
  assert.equal(productImage('shoes'), '/images/shoes.jpg');
  assert.equal(productImage('https://example.com/shoes.jpg'), 'https://example.com/shoes.jpg');
  assert.equal(productImage('http://localhost:5173/api/media/green'), '/api/media/green');
  assert.equal(productImage('http://127.0.0.1:5174/api/media/peach'), '/api/media/peach');
  assert.equal(productImage('https://example.com/api/media/remote'), 'https://example.com/api/media/remote');
});

test('color listing images use the saved color galleries independently of the product cover', () => {
  const { getVariantEffectiveImage, getColorGalleryImages } = harness().load('lib/inventory-engine.ts');
  const product = {
    ...stockProduct(), image: '/api/media/product-cover',
    colorGalleries: {
      Green: { mainImage: '/api/media/green-main', images: ['/api/media/green-detail'] },
      ' Grey ': { images: ['/api/media/grey-main'] },
      Peach: { mainImage: '/api/media/peach-main', images: [] },
    },
  };
  for (const [color, expected] of [['green', '/api/media/green-main'], ['GREY', '/api/media/grey-main'], [' Peach ', '/api/media/peach-main']]) {
    assert.equal(getVariantEffectiveImage(product, null, color).url, expected);
    assert.equal(getColorGalleryImages(product, color)[0], expected);
  }
  assert.equal(getVariantEffectiveImage(product, { color: 'Green', image: '/api/media/size-specific' }).url, '/api/media/size-specific');
  assert.equal(getVariantEffectiveImage(product, null, 'Unassigned').url, '/api/media/product-cover');
  assert.equal(getVariantEffectiveImage({ ...product, colorGalleries: {} }, { color: 'Blue', image: '/api/media/blue' }).url, '/api/media/blue');
});

test('order API rejects customer overrides and persists correct variant stock and prices', async () => {
  const h = harness();
  await h.add('buyer@example.com');
  const product = stockProduct();
  h.load('app/catalog.ts').products.push(product);
  const api = h.load('app/api/orders/route.ts');
  const payload = { name: 'Test Buyer', phone: '03001234567', address: '123 Test Street', city: 'Lahore',
    items: [{ id: product.id, size: 'M', color: 'Red', qty: 1 }] };
  const send = data => api.POST(new Request(ORIGIN + '/api/orders', { method: 'POST', headers: { origin: ORIGIN, 'Content-Type': 'application/json' }, body: JSON.stringify(data) }));
  for (const override of [{ customDelivery: 0 }, { customDiscount: 9999 }, { status: 'Delivered' }, { csrStatus: 'Confirmed' }, { items: [{ ...payload.items[0], discount: 1000 }] }]) {
    assert.equal((await send({ ...payload, ...override })).status, 403);
  }
  assert.equal((await send({ ...payload, items: [{ ...payload.items[0], color: 'Green' }] })).status, 409);
  const response = await send(payload);
  const order = await response.json();
  assert.equal(response.status, 201, JSON.stringify(order));
  assert.equal(order.total, 1750);
  const saved = JSON.parse(h.db.prepare('SELECT data FROM catalog_records WHERE id=?').get(product.id).data);
  assert.equal(saved.variants[0].stock, 1);
  assert.equal(saved.variants[1].stock, 3);
  assert.equal(h.db.prepare('SELECT count(*) n FROM inventory_logs').get().n, 1);
  // Simulate another checkout committing after this request reads the catalog.
  const originalBatch = h.d1.batch;
  h.d1.batch = statements => {
    if (statements.some(statement => statement.query.startsWith('UPDATE catalog_records SET data='))) {
      h.db.prepare('UPDATE catalog_records SET data=? WHERE id=?').run(JSON.stringify({ ...saved, stock: 0 }), product.id);
    }
    return originalBatch(statements);
  };
  const conflict = await send(payload);
  assert.notEqual(conflict.status, 201);
  assert.equal(h.db.prepare('SELECT count(*) n FROM orders').get().n, 1);
  assert.equal(h.db.prepare('SELECT count(*) n FROM inventory_logs').get().n, 1);
  assert.equal(JSON.parse(h.db.prepare('SELECT data FROM catalog_records WHERE id=?').get(product.id).data).stock, 0);
});

test('staff order percentage discounts apply once after item discounts', async () => {
  const h = harness();
  await h.owner();
  const product = stockProduct();
  h.load('app/catalog.ts').products.push(product);
  const response = await h.load('app/api/orders/route.ts').POST(new Request(ORIGIN + '/api/orders', {
    method: 'POST', headers: { origin: ORIGIN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test Buyer', phone: '03001234567', address: '123 Test Street', city: 'Lahore',
      customDelivery: 250, customDiscount: 10, discountType: 'percentage',
      items: [{ id: product.id, size: 'M', color: 'Red', qty: 1, discount: 100 }] }),
  }));
  const order = await response.json();
  assert.equal(response.status, 201, JSON.stringify(order));
  assert.equal(order.total, 1510);
  assert.equal(order.details.orderDiscount, 140);
  assert.equal(order.details.discount, 240);
});
const ORIGIN='https://zeliy-pakistan.coateddavid.chatgpt.site';
function harness(fetcher=async()=>{throw Error("Unexpected network request")},bucket=undefined){const db=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+f,'utf8'));let current={email:'yaseenkhattak7@gmail.com',id:'auth-owner',cookie:''};const sessions={};const d1={prepare(q){let values=[];return {query:q,bind(...v){values=v;return this},first(){return db.prepare(q).get(...values)||null},all(){return {results:db.prepare(q).all(...values)}},execute(){const r=db.prepare(q).run(...values);return {meta:{changes:Number(r.changes)}}},run(){return Promise.resolve().then(()=>this.execute())}}},batch(statements){db.exec('BEGIN');try{const results=statements.map(s=>s.execute());db.exec('COMMIT');return results}catch(e){db.exec('ROLLBACK');throw e}}};const cache={};function load(file){file=path.resolve(file);if(cache[file])return cache[file].exports;const module={exports:{}};cache[file]=module;const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;function req(id){if(id.endsWith('.json'))return JSON.parse(fs.readFileSync(path.resolve(id.startsWith('@/')?id.slice(2):path.resolve(path.dirname(file),id)),'utf8'));if(id==='next/headers')return {headers:async()=>new Headers({host:current.host||'','oai-authenticated-user-id':current.id||'','cookie':current.cookie,'user-agent':'Integration test','cf-connecting-ip':'192.0.2.1'})};if(id==='@/app/chatgpt-auth')return {getChatGPTUser:async()=>current.id?{email:current.email,displayName:current.email.split('@')[0],fullName:null}:null};if(id==='@/lib/store-data')return {...load("lib/store-data.ts"),database:()=>d1,catalog:async()=>load('app/catalog.ts').products,settings:async()=>({deliveryCharge:250,freeThreshold:5000,supportEmail:'',whatsapp:''})};if(id==='cloudflare:workers')return {env:{DB:d1,ADMIN_MFA_KEY:'ab'.repeat(32),BUCKET:bucket}};if(id.startsWith('@/'))return load(fs.existsSync(id.slice(2)+'.ts')?id.slice(2)+'.ts':id.slice(2)+'/index.ts');if(id.startsWith('.'))return load(path.resolve(path.dirname(file),id)+'.ts');return require(id)}vm.runInNewContext(code,{module,exports:module.exports,require:req,fetch:fetcher,AbortSignal,Response,Request,Headers,URL,URLSearchParams,console,structuredClone,crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,DataView,BigInt,btoa,atob,Date,setTimeout,process,Buffer});return module.exports}const api=load('app/api/access/[resource]/route.ts');const policy=load('lib/access/policy.ts');const server=load('lib/access/server.ts');const crypto=load('lib/access/crypto.ts');async function call(resource,data,origin=ORIGIN){const r=await api[data?'POST':'GET'](new Request(ORIGIN+'/api/access/'+resource,data?{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(data)}:{}),{params:Promise.resolve({resource:resource.split('?')[0]})});const result={status:r.status,data:await r.json()};if(r.headers.get('set-cookie')){current.cookie=r.headers.get('set-cookie').split(';')[0];sessions[current.email]=current.cookie}return result}function as(email){current={email,id:email==='yaseenkhattak7@gmail.com'?'auth-owner':'auth-'+email,cookie:sessions[email]||''}}async function owner(){as('yaseenkhattak7@gmail.com');await call('me');assert.equal((await call('me',{action:'connect'})).status,200)}async function add(email,role='member'){await owner();const r=await call('users',{action:'add',email,name:email.split('@')[0],role,reason:'Integration test account'});assert.equal(r.status,201,JSON.stringify(r));as(email);assert.equal((await call('me',{action:'activate'})).status,200);return r.data.id}return {db,d1,call,as,owner,add,policy,server,crypto,getCurrent:()=>current,setCookie:c=>current.cookie=c,load};}
test('role hierarchy, self/peer protection and member privileges',async()=>{const h=harness();const a=await h.add('admin@example.com','admin');const m=await h.add('member@example.com');h.as('member@example.com');assert.equal((await h.call('users')).status,403);h.as('admin@example.com');assert.equal((await h.call('users',{action:'role',ids:[m],role:'super_admin',reason:'Attempt escalation'})).status,403);assert.equal((await h.call('users',{action:'remove',ids:[a],reason:'Attempt self edit'})).status,403);assert.equal((await h.call('users',{action:'add',email:'evil@example.com',name:'Evil',role:'admin',reason:'Attempt peer creation'})).status,403);await h.owner();assert.equal((await h.call('users',{action:'ban',ids:['owner'],reason:'Attempt owner ban',hours:null})).status,403)});
test('ban and unban invalidate an existing session, expiry checked live',async()=>{const h=harness();const id=await h.add('member@example.com');const old=h.getCurrent().cookie;await h.owner();assert.equal((await h.call('users',{action:'ban',ids:[id],reason:'Abuse investigation',hours:1})).status,200);h.as('member@example.com');await assert.rejects(h.server.actor(),/banned/);assert.equal((await h.call('me',{action:'connect'})).status,403);await h.owner();assert.equal((await h.call('users',{action:'unban',ids:[id],reason:'Review complete'})).status,200);h.as('member@example.com');h.setCookie(old);await assert.rejects(h.server.actor(),/revoked/);assert.equal((await h.call('me',{action:'connect'})).status,200);assert.equal((await h.server.actor()).id,id);await h.owner();await h.call('users',{action:'ban',ids:[id],reason:'Temporary restriction',hours:1});h.db.prepare('UPDATE access_bans SET expires_at=? WHERE user_id=?').run(Date.now()-1,id);h.as('member@example.com');assert.equal((await h.call('me',{action:'connect'})).status,200)});
test('role changes revoke sessions and member cannot read admin data',async()=>{const h=harness();const id=await h.add('admin@example.com','admin');await h.owner();assert.equal((await h.call('users',{action:'role',ids:[id],role:'member',reason:'Access reduced'})).status,200);h.as('admin@example.com');assert.equal((await h.call('users')).status,401);await h.call('me',{action:'connect'});assert.equal((await h.call('users')).status,403)});
test('email-bound invitation cannot be taken by another email, used twice or revived',async()=>{const h=harness();await h.owner();let r=await h.call('invites',{emails:['staff@example.com'],role:'admin',hours:24,maxUses:1,reason:'Staff onboarding'});assert.equal(r.status,201,JSON.stringify(r));const code=r.data.links[0].url.split('#')[1];assert.equal(h.db.prepare('SELECT code_hash FROM access_invites').get().code_hash===code,false);h.as('intruder@example.com');assert.equal((await h.call('accept',{code})).status,403);h.as('staff@example.com');assert.equal((await h.call('accept',{code})).status,200);assert.equal((await h.call('accept',{code})).status,410);await h.owner();r=await h.call('invites',{emails:[],role:'member',hours:24,maxUses:2,reason:'Member onboarding'});const link=r.data.links[0];await h.call('invites',{action:'revoke',id:link.id,reason:'Link no longer needed'});h.as('new@example.com');assert.equal((await h.call('accept',{code:link.url.split('#')[1]})).status,410)});
test('multi-use links enforce max uses and expired invites fail',async()=>{const h=harness();await h.owner();const r=await h.call('invites',{emails:[],role:'member',hours:24,maxUses:2,reason:'Community onboarding'});const code=r.data.links[0].url.split('#')[1];for(const mail of ['one@example.com','two@example.com']){h.as(mail);assert.equal((await h.call('accept',{code})).status,200)}h.as('three@example.com');assert.equal((await h.call('accept',{code})).status,410);await h.owner();const expired=await h.call('invites',{emails:[],role:'member',hours:1,maxUses:1,reason:'Temporary invitation'});h.db.prepare('UPDATE access_invites SET expires_at=0 WHERE id=?').run(expired.data.links[0].id);h.as('four@example.com');assert.equal((await h.call('accept',{code:expired.data.links[0].url.split('#')[1]})).status,410)});
test('bulk actions are atomic and stale permission guards rollback writes',async()=>{const h=harness();const id=await h.add('member@example.com');await h.owner();const before=h.db.prepare('SELECT count(*) n FROM access_audit').get().n;const r=await h.call('users',{action:'ban',ids:[id,'owner'],hours:null,reason:'Bulk protection test'});assert.equal(r.status,403);assert.equal(h.db.prepare('SELECT count(*) n FROM access_bans').get().n,0);assert.equal(h.db.prepare('SELECT count(*) n FROM access_audit').get().n,before);const u=await h.server.actor();h.db.prepare('UPDATE access_users SET version=version+1 WHERE id=?').run(u.id);assert.throws(()=>h.d1.batch([...h.server.actorGuard(u),h.server.sql("UPDATE access_users SET name='Changed' WHERE id=?",id)]),/Authorization changed/);assert.notEqual(h.db.prepare('SELECT name FROM access_users WHERE id=?').get(id).name,'Changed')});
test('immutable audit records and user removal/recovery',async()=>{const h=harness();const id=await h.add('member@example.com');await h.owner();assert.equal((await h.call('users',{action:'remove',ids:[id],reason:'Account closed'})).status,200);h.as('member@example.com');assert.equal((await h.call('me',{action:'connect'})).status,403);await h.owner();assert.equal((await h.call('users',{action:'restore',ids:[id],reason:'Recovery requested'})).status,200);assert.throws(()=>h.db.exec('DELETE FROM access_audit'),/immutable/);assert.throws(()=>h.db.exec("UPDATE access_audit SET reason='fake'"),/immutable/);const a=h.db.prepare("SELECT * FROM access_audit WHERE action='user.remove'").get();assert.equal(a.actor_id,'owner');assert.equal(a.ip,'192.0.2.1');assert.equal(a.reason,'Account closed');assert.ok(h.db.prepare('SELECT count(*) n FROM access_notices WHERE user_id=?').get(id).n>0)});
test('TOTP matches RFC vectors and encryption binds secrets to the user',async()=>{const h=harness();const secret=h.crypto.base32(new TextEncoder().encode('12345678901234567890'));assert.equal(await h.crypto.otp(secret,1,8),'94287082');assert.equal(await h.crypto.otp(secret,37037036,8),'07081804');const sealed=await h.crypto.seal(secret,'ab'.repeat(32),'u1');assert.notEqual(sealed,secret);assert.equal(await h.crypto.unseal(sealed,'ab'.repeat(32),'u1'),secret);await assert.rejects(h.crypto.unseal(sealed,'ab'.repeat(32),'u2'))});
test('sensitive promotion requires enrolled MFA and rejects replay',async()=>{const h=harness();const id=await h.add('admin@example.com','admin');await h.owner();assert.equal((await h.call('users',{action:'role',ids:[id],role:'super_admin',reason:'Leadership assignment',code:'000000'})).status,403);const setup=await h.call('mfa',{action:'setup'});assert.equal(setup.status,200,JSON.stringify(setup));const counter=Math.floor(Date.now()/30000);const code=await h.crypto.otp(setup.data.secret,counter);assert.equal((await h.call('mfa',{action:'enable',code})).status,200);assert.equal((await h.call('users',{action:'role',ids:[id],role:'super_admin',reason:'Leadership assignment',code})).status,403);const fresh=await h.crypto.otp(setup.data.secret,counter+1);assert.equal((await h.call('users',{action:'role',ids:[id],role:'super_admin',reason:'Leadership assignment',code:fresh})).status,200)});
test('rate limit and cross-origin writes are enforced',async()=>{const h=harness();await h.owner();assert.equal((await h.call('users',{action:'add'},'https://evil.example')).status,403);for(let i=0;i<20;i++)assert.equal((await h.call('invites',{emails:[],role:'member',hours:1,maxUses:1,reason:'Rate test'})).status,201);assert.equal((await h.call('invites',{emails:[],role:'member',hours:1,maxUses:1,reason:'Rate test'})).status,429)});

test('store APIs enforce separate content, order and settings permissions',async()=>{const h=harness();await h.add('mod@example.com','moderator');const store=h.load('app/api/admin/route.ts');const get=await store.GET();assert.equal(get.status,200);assert.equal((await get.json()).orders.length,0);const send=d=>store.POST(new Request(ORIGIN+'/api/admin',{method:'POST',headers:{origin:ORIGIN,'Content-Type':'application/json'},body:JSON.stringify(d)}));assert.equal((await send({action:'settings',settings:{deliveryCharge:10,freeThreshold:500,supportEmail:'',whatsapp:''}})).status,403);assert.equal((await send({action:'order',id:'x',status:'Processing'})).status,403);const p=h.load('app/catalog.ts').products[0];assert.equal((await send({action:'product',product:{...p,status:'Active'}})).status,200);assert.equal(h.db.prepare("SELECT count(*) n FROM access_audit WHERE action='content.product_saved'").get().n,1);await h.add('plain@example.com');assert.equal((await store.GET()).status,403)});
test('mute blocks content actions and recovery window closes after thirty days',async()=>{const h=harness();const id=await h.add('mod@example.com','moderator');await h.owner();await h.call('users',{action:'mute',ids:[id],hours:24,reason:'Content restriction'});h.as('mod@example.com');await h.call('me',{action:'connect'});await assert.rejects(h.server.actor('content.edit'),/restricted/);assert.equal((await h.call('users')).status,200);await h.owner();await h.call('users',{action:'remove',ids:[id],reason:'Account closed'});h.db.prepare('UPDATE access_users SET deleted_at=? WHERE id=?').run(Date.now()-31*86400000,id);assert.equal((await h.call('users',{action:'restore',ids:[id],reason:'Too late'})).status,409)});
test('hard deletion requires MFA and preserves audit records after recovery window',async()=>{const h=harness();const id=await h.add('member@example.com');await h.owner();await h.call('users',{action:'remove',ids:[id],reason:'Deletion request'});h.db.prepare('UPDATE access_users SET deleted_at=? WHERE id=?').run(Date.now()-31*86400000,id);assert.equal((await h.call('users',{action:'purge',ids:[id],reason:'Retention elapsed',code:'000000'})).status,403);const setup=await h.call('mfa',{action:'setup'});const counter=Math.floor(Date.now()/30000);await h.call('mfa',{action:'enable',code:await h.crypto.otp(setup.data.secret,counter)});assert.equal((await h.call('users',{action:'purge',ids:[id],reason:'Retention elapsed',code:await h.crypto.otp(setup.data.secret,counter+1)})).status,200);assert.equal(h.db.prepare('SELECT id FROM access_users WHERE id=?').get(id),undefined);assert.equal(h.db.prepare("SELECT count(*) n FROM access_audit WHERE action='user.purge' AND target_id=?").get(id).n,1)});

const emailInvite={emails:['recipient@example.com'],role:'member',hours:24,maxUses:1,sendEmail:true,reason:'Requested onboarding'};
const resendSettings={apiKey:'re_test_secret_123456789',sender:'invites@example.com'};
test('Resend setup is Super Admin only, secrets encrypted, unconfigured send fails without creating invites',async()=>{const h=harness();await h.owner();assert.equal((await h.call('invites',emailInvite)).status,409);assert.equal(h.db.prepare('SELECT count(*) n FROM access_invites').get().n,0);assert.equal((await h.call('email',resendSettings)).status,200);const row=h.db.prepare('SELECT * FROM email_config').get();assert.notEqual(row.secret,resendSettings.apiKey);assert.equal(JSON.stringify((await h.call('email')).data).includes(resendSettings.apiKey),false);assert.equal(JSON.stringify(h.db.prepare('SELECT * FROM access_audit').all()).includes(resendSettings.apiKey),false);await h.add('admin@example.com','admin');assert.equal((await h.call('email',resendSettings)).status,403);});
test('Resend sends exact recipient and invitation, accepted requests are never resent',async()=>{let calls=[];const h=harness(async(url,options)=>{calls.push({url,options});return Response.json({id:'resend-123'});});await h.owner();await h.call('email',resendSettings);const r=await h.call('invites',emailInvite);assert.equal(r.status,201,JSON.stringify(r));assert.equal(r.data.deliveries[0].state,'accepted');assert.equal(calls.length,1);assert.equal(calls[0].url,'https://api.resend.com/emails');const payload=JSON.parse(calls[0].options.body);assert.equal(payload.to[0],emailInvite.emails[0]);assert.ok(payload.text.includes(r.data.links[0].url));assert.ok(payload.html.includes(r.data.links[0].url));assert.equal(h.db.prepare('SELECT payload FROM invite_emails').get().payload,'');assert.equal((await h.call('invites',{action:'send',id:r.data.links[0].id})).status,200);assert.equal(calls.length,1);assert.equal(h.db.prepare("SELECT count(*) n FROM access_audit WHERE action='invite.email_accepted'").get().n,1);});
test('unknown delivery retries use identical payload and idempotency key; revoked and late retries blocked',async()=>{let calls=[];const h=harness(async(url,options)=>{calls.push(options);throw Error('network timeout');});await h.owner();await h.call('email',resendSettings);const r=await h.call('invites',emailInvite),id=r.data.links[0].id;assert.equal(r.data.deliveries[0].state,'unknown');assert.equal(h.db.prepare('SELECT payload FROM invite_emails').get().payload.includes(r.data.links[0].url),false);await h.call('invites',{action:'send',id});assert.equal(calls.length,2);assert.equal(calls[0].body,calls[1].body);assert.equal(calls[0].headers['Idempotency-Key'],calls[1].headers['Idempotency-Key']);h.db.prepare('UPDATE invite_emails SET first_attempt=?').run(Date.now()-23*3600000-1);assert.equal((await h.call('invites',{action:'send',id})).status,409);await h.call('invites',{action:'revoke',id,reason:'Cancel invitation'});assert.equal((await h.call('invites',{action:'send',id})).status,409);assert.equal(calls.length,2);});
test('provider rejection is safe and sending respects invitation ownership',async()=>{let calls=0;const h=harness(async()=>{calls++;return Response.json({message:'sensitive provider body'}, {status:403});});await h.owner();await h.call('email',resendSettings);const r=await h.call('invites',emailInvite);assert.equal(r.data.deliveries[0].state,'failed');assert.equal(JSON.stringify(r.data).includes('sensitive provider body'),false);await h.add('admin@example.com','admin');assert.equal((await h.call('invites',{action:'send',id:r.data.links[0].id})).status,403);assert.equal(calls,1);});


const loginPassword='My long unique passphrase 942!';
async function setupPassword(h){await h.owner();const r=await h.call('session',{action:'setup',password:loginPassword});assert.equal(r.status,200,JSON.stringify(r));}
const passwordLogin={action:'password-login',email:'yaseenkhattak7@gmail.com',password:loginPassword,next:'/admin'};
test('password enrollment is verified, one-time and salted; login works independently of platform identity',async()=>{const h=harness();await setupPassword(h);const row=h.db.prepare('SELECT hash FROM access_passwords').get();assert.ok(row.hash.startsWith('scrypt-v1$'));assert.equal(row.hash.includes(loginPassword),false);assert.equal((await h.call('session',{action:'setup',password:loginPassword})).status,409);assert.equal((await h.call('session',{action:'login'})).status,403);h.getCurrent().id='';assert.equal((await h.call('session',{action:'setup',password:loginPassword})).status,401);assert.equal((await h.call('session',{...passwordLogin,password:'wrong password'})).status,401);assert.equal((await h.call('session',passwordLogin)).status,200);assert.equal((await h.server.actor('users.read')).role,'super_admin');assert.equal((await h.call('users')).status,200);assert.equal((await h.call('me')).data.identity.email,passwordLogin.email);const cookie=h.getCurrent().cookie;await h.call('session',{action:'logout'});h.setCookie(cookie);await assert.rejects(h.server.actor());});
test('password login enforces account eligibility, generic errors, MFA and throttling',async()=>{const h=harness();await setupPassword(h);const invalid=await h.call('session',{...passwordLogin,password:'wrong password'}),unknown=await h.call('session',{...passwordLogin,email:'missing@example.com'});assert.equal(invalid.status,401);assert.equal(invalid.data.error,unknown.data.error);await h.call('session',passwordLogin);const setup=await h.call('mfa',{action:'setup'});const counter=Math.floor(Date.now()/30000);await h.call('mfa',{action:'enable',code:await h.crypto.otp(setup.data.secret,counter)});assert.equal((await h.call('session',passwordLogin)).status,403);const code=await h.crypto.otp(setup.data.secret,counter+1);assert.equal((await h.call('session',{...passwordLogin,code})).status,200);assert.equal((await h.call('session',{...passwordLogin,code})).status,403);assert.equal((await h.call('session',passwordLogin)).status,429);});
test('changing password revokes all sessions and blocks platform-session bypass',async()=>{const h=harness();await setupPassword(h);await h.call('session',passwordLogin);const oldCookie=h.getCurrent().cookie;const u=await h.server.actor();h.setCookie((await h.server.issueSession(u)).split(';')[0]);await assert.rejects(h.server.actor('users.read'),/email and password/);h.setCookie(oldCookie);const next='Another long passphrase 763!';assert.equal((await h.call('session',{action:'change',currentPassword:'wrong',password:next})).status,403);assert.equal((await h.call('session',{action:'change',currentPassword:loginPassword,password:next})).status,200);h.setCookie(oldCookie);await assert.rejects(h.server.actor());assert.equal((await h.call('session',passwordLogin)).status,401);assert.equal((await h.call('session',{...passwordLogin,password:next})).status,200);});
test('recovery links are hashed, expiring and single use; replay cannot reset password',async()=>{let payload;const h=harness(async(url,options)=>{payload=JSON.parse(options.body);return Response.json({id:'reset-email'});});await setupPassword(h);await h.call('session',passwordLogin);await h.call('email',resendSettings);const cookie=h.getCurrent().cookie;const request=await h.call('session',{action:'forgot',email:passwordLogin.email});assert.equal(request.status,200);const token=payload.text.match(/#reset=([a-f0-9]{64})/)[1];assert.equal(h.db.prepare('SELECT token_hash FROM password_resets').get().token_hash===token,false);const unknown=await h.call('session',{action:'forgot',email:'unknown@example.com'});assert.equal(unknown.data.message,request.data.message);const next='Replacement passphrase 582!';assert.equal((await h.call('session',{action:'reset',token,password:next})).status,200);h.setCookie(cookie);await assert.rejects(h.server.actor());assert.equal((await h.call('session',{action:'reset',token,password:loginPassword})).status,400);assert.equal((await h.call('session',{...passwordLogin,password:next})).status,200);await h.call('session',{action:'forgot',email:passwordLogin.email});const expired=payload.text.match(/#reset=([a-f0-9]{64})/)[1];h.db.prepare('UPDATE password_resets SET expires_at=0').run();assert.equal((await h.call('session',{action:'reset',token:expired,password:loginPassword})).status,400);});
test('password setup refuses members; banned staff cannot log in; redirect and CSRF validation hold',async()=>{const h=harness();await h.add('member@example.com');assert.equal((await h.call('session',{action:'setup',password:loginPassword})).status,403);const id=await h.add('staff@example.com','admin');assert.equal((await h.call('session',{action:'setup',password:loginPassword})).status,200);assert.equal((await h.call('session',{...passwordLogin,email:'staff@example.com'})).status,200);await h.owner();await h.call('users',{action:'ban',ids:[id],hours:null,reason:'Abuse prevention'});assert.equal((await h.call('session',{...passwordLogin,email:'staff@example.com'})).status,401);assert.equal((await h.call('session',{...passwordLogin,next:'https://evil.example'})).status,400);assert.equal((await h.call('session',passwordLogin,'https://evil.example')).status,403);});

test('new listing workflow saves drafts, validates options, publishes each color once',async()=>{const h=harness();await h.owner();const api=h.load('app/api/listings/route.ts');const send=async data=>{const r=await api.POST(new Request(ORIGIN+'/api/listings',{method:'POST',headers:{origin:ORIGIN,'Content-Type':'application/json'},body:JSON.stringify(data)}));return {status:r.status,data:await r.json()}};const data={category:'Accessories',subcategory:'Bags',sku:'BAG-01',catalogOwner:'Cartify Pakistan',variants:[{color:'Black',option:'Standard',image:ORIGIN+'/api/media/00000000-0000-4000-8000-000000000001'},{color:'Brown',option:'Pack of 2',image:ORIGIN+'/api/media/00000000-0000-4000-8000-000000000002'}]};assert.equal((await send({action:'draft',data:{...data,subcategory:'Skincare'}})).status,400);assert.equal((await send({action:'draft',data:{...data,variants:[data.variants[0],data.variants[0]]}})).status,400);const saved=await send({action:'draft',data});assert.equal(saved.status,201,JSON.stringify(saved));assert.equal(h.db.prepare('SELECT count(*) n FROM catalog_records').get().n,0);const get=await api.GET(new Request(ORIGIN+'/api/listings?id='+saved.data.id));assert.equal((await get.json()).data.sku,'BAG-01');const details={action:'finish',id:saved.data.id,name:'Everyday bag',description:'A practical bag for everyday use.',features:['Easy to carry'],price:2500,old:3000,status:'Active'};assert.equal((await send({...details,old:1000})).status,400);const finish=await send(details);assert.equal(finish.status,201,JSON.stringify(finish));assert.equal(h.db.prepare('SELECT count(*) n FROM catalog_records').get().n,2);const product=JSON.parse(h.db.prepare('SELECT data FROM catalog_records WHERE id=?').get(finish.data.ids[1]).data);assert.equal(product.color,'Brown');assert.equal(product.option,'Pack of 2');assert.equal(product.price,2500);assert.ok(product.name.includes('Brown'));assert.equal((await send(details)).status,200);assert.equal(h.db.prepare('SELECT count(*) n FROM catalog_records').get().n,2);await h.add('viewer@example.com');assert.equal((await send({action:'draft',data})).status,403);assert.equal((await api.GET(new Request(ORIGIN+'/api/listings'))).status,403);});
test('image uploads reject oversized and unsafe formats and enforce role checks',async()=>{const h=harness();await h.owner();const api=h.load('app/api/media/route.ts');const send=(body,headers={})=>api.POST(new Request(ORIGIN+'/api/media',{method:'POST',headers:{origin:ORIGIN,...headers},body}));assert.equal((await send('<svg onload="alert(1)"></svg>')).status,400);assert.equal((await send('x',{'content-length':String(4*1024*1024)})).status,413);await h.add('viewer@example.com');assert.equal((await send('anything')).status,403);});

test('authorized image upload persists bytes and serves the returned product image URL',async()=>{const objects=new Map();const bucket={async put(key,bytes,metadata){objects.set(key,{body:bytes,httpMetadata:metadata.httpMetadata})},async get(key){return objects.get(key)}};const h=harness(undefined,bucket);await h.owner();const api=h.load('app/api/media/route.ts');const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jS1sAAAAASUVORK5CYII=','base64');const r=await api.POST(new Request(ORIGIN+'/api/media',{method:'POST',headers:{origin:ORIGIN,'Content-Type':'image/png'},body:png}));assert.equal(r.status,201);const data=await r.json();assert.ok(data.url.startsWith(ORIGIN+'/api/media/'));const id=data.url.split('/').pop();const reader=h.load('app/api/media/[id]/route.ts');const image=await reader.GET(new Request(data.url),{params:Promise.resolve({id})});assert.equal(image.status,200);assert.equal(image.headers.get('Content-Type'),'image/png');assert.equal(image.headers.get('X-Content-Type-Options'),'nosniff');assert.equal((await image.arrayBuffer()).byteLength,png.length);});

async function adminFixture() {
  const h = harness();
  await h.owner();
  const store = h.load('lib/store-data.ts');
  await store.ensureInventoryTables();
  await store.ensureReturnTables();
  const product = stockProduct();
  h.db.prepare('INSERT INTO catalog_records (id,data,status) VALUES (?,?,?)').run(product.id, JSON.stringify(product), product.status);
  const details = { name: 'Test Buyer', phone: '03001234567', address: '123 Test Street', city: 'Lahore', codReceivedAmount: 0 };
  const items = [{ id: product.id, variantId: 'red-m', color: 'Red', size: 'M', qty: 1, unitPrice: 1500, totalPrice: 1500, name: product.name, sku: 'RED-M' }];
  h.db.prepare('INSERT INTO orders (id,token,details,items,total,status,created_at) VALUES (?,?,?,?,?,?,?)').run('ORDER-1', 'token', JSON.stringify(details), JSON.stringify(items), 1500, 'Pending', new Date().toISOString());
  const api = h.load('app/api/admin/route.ts');
  const send = async payload => {
    const response = await api.POST(new Request(ORIGIN + '/api/admin', { method: 'POST', headers: { origin: ORIGIN, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }));
    return { status: response.status, data: await response.json() };
  };
  const readProduct = () => JSON.parse(h.db.prepare('SELECT data FROM catalog_records WHERE id=?').get(product.id).data);
  return { ...h, store, product, items, send, readProduct };
}

test('empty returns stay empty and unavailable return storage never supplies demonstration records', async () => {
  const h = await adminFixture();
  assert.equal((await h.store.getReturnRequests()).length, 0);
  assert.equal(h.db.prepare('SELECT COUNT(*) n FROM return_requests').get().n, 0);
  h.db.prepare("UPDATE orders SET status='Delivered'").run();
  h.db.exec("CREATE TRIGGER fail_returns BEFORE INSERT ON return_requests BEGIN SELECT RAISE(ABORT,'write failed'); END");
  const result = await h.send({ action: 'create-return', orderId: 'ORDER-1', items: [{ ...h.items[0], orderedQty: 1, returnQty: 1 }], returnReason: 'Wrong size' });
  assert.equal(result.status, 503);
  assert.equal(h.db.prepare('SELECT COUNT(*) n FROM return_requests').get().n, 0);
  assert.equal(JSON.parse(h.db.prepare('SELECT details FROM orders').get().details).returnId, undefined);
});

test('cancellation restores the exact variant once and protects server-owned order details', async () => {
  const h = await adminFixture();
  let result = await h.send({ action: 'order', id: 'ORDER-1', status: 'Cancelled', details: { inventoryRestored: true, codReceivedAmount: 99999, name: 'Updated Buyer' } });
  assert.equal(result.status, 200, JSON.stringify(result));
  assert.equal(h.readProduct().variants[0].stock, 3);
  assert.equal(h.readProduct().variants[1].stock, 3);
  const details = JSON.parse(h.db.prepare('SELECT details FROM orders').get().details);
  assert.equal(details.codReceivedAmount, 0);
  assert.equal(details.name, 'Updated Buyer');
  result = await h.send({ action: 'order', id: 'ORDER-1', status: 'Cancelled' });
  assert.equal(result.status, 200);
  assert.equal(h.readProduct().variants[0].stock, 3);
  assert.equal((await h.send({ action: 'order', id: 'ORDER-1', status: 'Pending' })).status, 409);
});

test('cancellation rejects missing variants rather than restoring another colour', async () => {
  const h = await adminFixture();
  h.db.prepare('UPDATE orders SET items=?').run(JSON.stringify([{ ...h.items[0], variantId: 'missing' }]));
  const result = await h.send({ action: 'order', id: 'ORDER-1', status: 'Cancelled' });
  assert.equal(result.status, 409);
  assert.equal(h.readProduct().stock, 5);
  assert.equal(h.db.prepare('SELECT status FROM orders').get().status, 'Pending');
  assert.equal(h.db.prepare('SELECT COUNT(*) n FROM inventory_logs').get().n, 0);
});

test('concurrent stock changes abort cancellation without losing inventory or changing the order', async () => {
  const h = await adminFixture();
  const batch = h.d1.batch;
  let injected = false;
  h.d1.batch = statements => {
    if (!injected && statements.length > 5) {
      injected = true;
      const updated = h.readProduct();
      updated.variants[0].stock = 1; updated.stock = 4;
      h.db.prepare('UPDATE catalog_records SET data=? WHERE id=?').run(JSON.stringify(updated), h.product.id);
    }
    return batch(statements);
  };
  assert.equal((await h.send({ action: 'order', id: 'ORDER-1', status: 'Cancelled' })).status, 409);
  assert.equal(h.readProduct().variants[0].stock, 1);
  assert.equal(h.db.prepare('SELECT status FROM orders').get().status, 'Pending');
  assert.equal(h.db.prepare('SELECT COUNT(*) n FROM inventory_logs').get().n, 0);
});

test('stale product revisions are rejected and editor galleries and SEO slug persist', async () => {
  const h = await adminFixture();
  const revision = await h.crypto.digest(JSON.stringify(h.product));
  const product = { ...h.product, _revision: revision, colorGalleries: { Red: { mainImage: '/images/shoes.jpg', images: ['/images/shoes.jpg'] } }, seo: { slug: 'test-shoes' } };
  const saved = await h.send({ action: 'product', product });
  assert.equal(saved.status, 200, JSON.stringify(saved));
  assert.equal(h.readProduct().colorGalleries.Red.images[0], '/images/shoes.jpg');
  assert.equal(h.readProduct().seo.slug, 'test-shoes');
  assert.equal((await h.send({ action: 'product', product })).status, 409);
});

test('COD reversals cannot be replayed and invalid remittance batches do not partially settle orders', async () => {
  const h = await adminFixture();
  const settle = await h.send({ action: 'cod-settle', orderId: 'ORDER-1', amount: 500, settlementDate: '2026-10-08', courier: 'Test Courier', paymentMethod: 'Bank Transfer' });
  assert.equal(settle.status, 200);
  const transactionId = settle.data.details.codSettlementHistory[0].id;
  const reversal = { action: 'cod-reverse', orderId: 'ORDER-1', transactionId, reason: 'Duplicate payment' };
  assert.equal((await h.send(reversal)).status, 200);
  assert.equal((await h.send(reversal)).status, 409);
  const details = JSON.parse(h.db.prepare('SELECT details FROM orders').get().details);
  assert.equal(details.codReceivedAmount, 0);
  assert.equal(details.codCollected, false);
  const remittance = { action: 'cod-bulk-remittance', remittanceId: 'REM-1', courier: 'Test Courier', settlementDate: '2026-10-08', referenceId: 'REF-1', paymentMethod: 'Bank Transfer', receivedAmount: 1000, orderSettlements: [{ orderId: 'ORDER-1', amount: 500 }, { orderId: 'MISSING', amount: 500 }] };
  assert.equal((await h.send(remittance)).status, 404);
  assert.equal(JSON.parse(h.db.prepare('SELECT details FROM orders').get().details).codReceivedAmount, 0);
  assert.equal((await h.send({ ...remittance, orderSettlements: [{ orderId: 'ORDER-1', amount: 500 }, { orderId: 'ORDER-1', amount: 500 }] })).status, 400);
});

test('return quantities and prices derive from exact order lines and refunds commit atomically', async () => {
  const h = await adminFixture();
  h.db.prepare("UPDATE orders SET status='Delivered'").run();
  const item = { ...h.items[0], orderedQty: 1, returnQty: 1, unitPrice: 999999 };
  const create = { action: 'create-return', orderId: 'ORDER-1', items: [item], returnReason: 'Wrong size' };
  assert.equal((await h.send({ ...create, items: [item, item] })).status, 400);
  const created = await h.send(create);
  assert.equal(created.status, 200, JSON.stringify(created));
  assert.equal(created.data.returnRequest.totalRefundableAmount, 1500);
  const returnId = created.data.returnRequest.id;
  assert.equal((await h.send(create)).status, 400);
  assert.equal((await h.send({ action: 'update-return-status', returnId, status: 'Refunded' })).status, 400);
  assert.equal((await h.send({ action: 'update-return-status', returnId, status: 'Approved' })).status, 200);
  const refund = { action: 'process-refund', returnId, refundAmount: 1500, refundMethod: 'Cash', refundReference: 'REFUND-1' };
  h.db.exec("CREATE TRIGGER fail_order_write BEFORE UPDATE ON orders BEGIN SELECT RAISE(ABORT,'write failed'); END");
  assert.equal((await h.send(refund)).status, 503);
  assert.equal(h.db.prepare('SELECT refund_status FROM return_requests').get().refund_status, 'Pending');
  assert.equal(h.db.prepare("SELECT COUNT(*) n FROM access_audit WHERE action='return.refunded'").get().n, 0);
  h.db.exec('DROP TRIGGER fail_order_write');
  assert.equal((await h.send(refund)).status, 200);
  assert.equal((await h.send(refund)).status, 400);
  assert.equal(h.db.prepare('SELECT refund_status FROM return_requests').get().refund_status, 'Refunded');
  assert.equal(JSON.parse(h.db.prepare('SELECT details FROM orders').get().details).refundAmount, 1500);
});

test('return restock flags and inventory roll back together on write failure', async () => {
  const h = await adminFixture();
  h.db.prepare("UPDATE orders SET status='Delivered'").run();
  const created = await h.send({ action: 'create-return', orderId: 'ORDER-1', items: [{ ...h.items[0], orderedQty: 1, returnQty: 1 }], returnReason: 'Wrong size' });
  const returnId = created.data.returnRequest.id;
  assert.equal((await h.send({ action: 'restock-return-items', returnId })).status, 409);
  await h.send({ action: 'update-return-status', returnId, status: 'Received' });
  await h.send({ action: 'inspect-return', returnId, inspectionStatus: 'Good Condition' });
  h.db.exec("CREATE TRIGGER fail_return_write BEFORE UPDATE ON return_requests BEGIN SELECT RAISE(ABORT,'write failed'); END");
  assert.equal((await h.send({ action: 'restock-return-items', returnId })).status, 503);
  assert.equal(h.readProduct().variants[0].stock, 2);
  assert.equal(JSON.parse(h.db.prepare('SELECT items FROM return_requests').get().items)[0].restocked, false);
  h.db.exec('DROP TRIGGER fail_return_write');
  assert.equal((await h.send({ action: 'restock-return-items', returnId })).status, 200);
  assert.equal(h.readProduct().variants[0].stock, 3);
  assert.equal((await h.send({ action: 'restock-return-items', returnId })).status, 400);
});

test('categories reject cycles and preserve built-in deletions across reloads', async () => {
  const h = await adminFixture();
  const api = h.load('app/api/categories/route.ts');
  const send = async data => {
    const response = await api.POST(new Request(ORIGIN + '/api/categories', { method: 'POST', headers: { origin: ORIGIN }, body: JSON.stringify(data) }));
    return { status: response.status, data: await response.json() };
  };
  const roots = await h.store.categoryTreeForAdmins();
  const root = roots.find(node => node.children.length > 0);
  assert.equal((await send({ action: 'save', item: { ...root, parentId: root.children[0].id } })).status, 400);
  assert.equal((await send({ action: 'save', item: { name: 'Test', parentId: 'missing' } })).status, 400);
  const products = await h.store.catalog(true);
  const flatten = nodes => nodes.flatMap(node => [node, ...flatten(node.children)]);
  const unused = flatten(roots).find(node => !node.children.length && !products.some(product => [product.category, product.subcategory, product.childCategory].includes(node.name)));
  assert.ok(unused, 'an unused built-in category exists');
  assert.equal((await send({ action: 'delete', id: unused.id })).status, 200);
  assert.equal(flatten(await h.store.categoryTree()).some(node => node.id === unused.id), false);
});

test('settings reject unsafe links and invalid percentage discounts; internal errors stay private', async () => {
  const h = await adminFixture();
  const settings = { deliveryCharge: 250, freeThreshold: 5000, supportEmail: '', whatsapp: '' };
  assert.equal((await h.send({ action: 'settings', settings: { ...settings, heroButtonLink: 'javascript:alert(1)' } })).status, 400);
  assert.equal((await h.send({ action: 'settings', settings: { ...settings, coupons: [{ id: 'c1', code: 'SAVE', type: 'percentage', value: 101, status: 'Active' }] } })).status, 400);
  const response = h.server.fail(new Error('private database connection secret'));
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes('private database'), false);
});

test('CSV quoting preserves delimiters and neutralizes customer-supplied spreadsheet formulas', () => {
  const { csvCell } = harness().load('lib/csv-export.ts');
  assert.equal(csvCell('Lahore, Pakistan'), '"Lahore, Pakistan"');
  assert.equal(csvCell('Buyer "Name"'), '"Buyer ""Name"""');
  assert.equal(csvCell('=HYPERLINK("evil")'), '"\'=HYPERLINK(""evil"")"');
  assert.equal(csvCell('+923001234567'), '"\'+923001234567"');
  assert.equal(csvCell(-5), '-5');
});

test('standalone owner setup requires a server secret and cannot replace existing credentials', async () => {
  const saved = { VERCEL: process.env.VERCEL, ADMIN_SETUP_TOKEN: process.env.ADMIN_SETUP_TOKEN };
  try {
    process.env.VERCEL = '1';
    process.env.ADMIN_SETUP_TOKEN = 'ab'.repeat(32);
    const h = harness(); h.d1.provider = 'supabase'; h.getCurrent().id = '';
    const password = 'a unique owner passphrase 123';
    const payload = { action: 'setup', setupKey: 'bad-key', password };
    assert.equal((await h.call('session', payload)).status, 403);
    assert.equal(h.db.prepare('SELECT count(*) n FROM access_users').get().n, 0);
    assert.equal((await h.call('session', { ...payload, setupKey: process.env.ADMIN_SETUP_TOKEN })).status, 200);
    const hash = h.db.prepare("SELECT hash FROM access_passwords WHERE user_id='owner'").get().hash;
    assert.notEqual(hash, password);
    assert.equal((await h.call('session', { ...payload, setupKey: process.env.ADMIN_SETUP_TOKEN, password: 'another unique password' })).status, 409);
    assert.equal(h.db.prepare("SELECT hash FROM access_passwords WHERE user_id='owner'").get().hash, hash);
    assert.equal((await h.call('session', { action: 'password-login', email: 'yaseenkhattak7@gmail.com', password })).status, 200);
    assert.equal((await h.server.actor('settings.edit')).role, 'super_admin');
    // The real identity helper rejects visitor-supplied gateway headers on Vercel.
    h.getCurrent().id = 'forged';
    assert.equal(await h.load('app/chatgpt-auth.ts').getChatGPTUser(), null);
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('Supabase guest checkout enforces prices and limits and exposes only token-protected tracking', async () => {
  const h = harness();
  const store = h.load('lib/store-data.ts');
  await store.ensureInventoryTables(); await store.ensureCategoryTables();
  h.d1.provider = 'supabase'; h.getCurrent().id = ''; h.setCookie('');
  h.db.prepare("INSERT INTO access_users (id,email,name,role,status,created_at) VALUES ('storefront-guest','guest@store.invalid','Guest','member','active',?)").run(Date.now());
  const product = stockProduct(); h.load('app/catalog.ts').products.push(product);
  const api = h.load('app/api/orders/route.ts');
  const payload = { name: 'Guest Buyer', phone: '03001234567', address: '123 Test Street', city: 'Lahore', checkoutRequestId: crypto.randomUUID(), items: [{ id: product.id, size: 'M', color: 'Red', qty: 1 }] };
  const send = data => api.POST(new Request(ORIGIN + '/api/orders', { method: 'POST', headers: { origin: ORIGIN, 'Content-Type': 'application/json' }, body: JSON.stringify(data) }));
  assert.equal((await send({ ...payload, customDelivery: 0 })).status, 403);
  const created = await send(payload), order = await created.json();
  assert.equal(created.status, 201, JSON.stringify(order)); assert.equal(order.status, 'Pending'); assert.equal(order.total, 1750);
  const duplicate = await send(payload); assert.equal((await duplicate.json()).duplicate, true);
  assert.equal(h.db.prepare('SELECT count(*) n FROM orders').get().n, 1);
  assert.equal((await send({ ...payload, phone: '03009999999' })).status, 409);
  const lookup = token => api.GET(new Request(ORIGIN + '/api/orders?id=' + order.id + '&token=' + token));
  assert.equal((await lookup('wrong')).status, 404);
  const tracked = await (await lookup(order.token)).json();
  assert.equal(tracked.id, order.id); assert.ok(tracked.createdAt); assert.equal(tracked.details, undefined); assert.equal(tracked.token, undefined);
});
