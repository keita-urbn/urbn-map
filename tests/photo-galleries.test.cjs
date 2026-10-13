const { test } = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const ts = require('typescript'); const vm = require('node:vm');
function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions:{ module:ts.ModuleKind.CommonJS } }).outputText, { exports, URL, console, require:name=>dependencies[name] ?? (name === "./reviewDiagnostics" ? diagnostics : undefined), ...globals });
  return exports;
}
const photos = load('lib/photoGallery.ts');
const diagnostics = load('lib/reviewDiagnostics.ts');
test('legacy single/multiple photos preserve order; explicit removal stays removed; private and invalid URLs excluded', () => {
  assert.equal(photos.readPhotos({imageUrl:'https://example.test/old.jpg'})[0].downloadURL,'https://example.test/old.jpg');
  assert.equal(photos.readPhotos({imageUrl:'https://example.test/old.jpg',galleryImages:[]}).length,0);
  const result=photos.readPhotos({imageUrls:['https://example.test/2.jpg','https://example.test/1.jpg','bad','https://example.test/1.jpg']});
  assert.deepEqual(Array.from(result,i=>i.downloadURL),['https://example.test/2.jpg','https://example.test/1.jpg']);
  assert.equal(photos.readPhotos({images:[{url:'https://example.test/private.jpg',access:'premium'}]}).length,0);
});
test('review stack advances once, clamps both ends, ignores small drags and preserves direction', () => {
  assert.equal(photos.nextPhotoIndex(0,-1000,5),1); assert.equal(photos.nextPhotoIndex(4,-80,5),4);
  assert.equal(photos.nextPhotoIndex(0,80,5),0); assert.equal(photos.nextPhotoIndex(3,80,5),2);
  assert.equal(photos.nextPhotoIndex(2,20,5),2);
});
function storageHarness({role='admin',uid='owner',failUpload=0}={}) {
  const uploads=[]; const deleted=[];
  const storage={ref:(_s,path)=>path,uploadBytes:async(path)=>{uploads.push(path);if(uploads.length===failUpload)throw Error('upload denied');},getDownloadURL:async path=>'https://example.test/'+path,deleteObject:async path=>deleted.push(path)};
  const api=load('lib/photoStorage.ts', {'./photoGallery':photos,'./firebase':{auth:{currentUser:{uid}},db:{},storage:{}},'firebase/storage':storage,'firebase/firestore':{doc:()=>({}),getDoc:async()=>({data:()=>({role})})},'react-native':{Platform:{OS:'web'}},'expo-file-system/legacy':{},'expo-image-manipulator':{SaveFormat:{JPEG:'jpg'},manipulateAsync:async()=>({uri:'compressed',width:1200,height:1600})}}, {fetch:async()=>({blob:async()=>({size:1000})})});
  return {api,uploads,deleted};
}
const old={id:'old',storagePath:'shops/shop/gallery/old.jpg',downloadURL:'https://example.test/old.jpg',width:3,height:4,createdAt:0};
const draft={...old,id:'new',storagePath:'',uri:'local',mimeType:'image/png'};
test('ordered staging uploads only new files and rollback never deletes retained images',async()=>{
  const h=storageHarness();const prepared=await h.api.preparePhotos('shops/shop/gallery/',[draft,old],10);
  assert.equal(h.uploads.length,1);assert.equal(prepared.images[0].id,'new');assert.equal(prepared.images[1].id,'old');
  await prepared.rollback();assert.deepEqual(h.deleted,h.uploads);assert.ok(!h.deleted.includes(old.storagePath));
});
test('partial upload failure cleans new objects; owner/admin and entity boundaries enforced',async()=>{
  const h=storageHarness({failUpload:2});await assert.rejects(h.api.preparePhotos('shops/shop/gallery/',[draft,{...draft,id:'other'}],10));assert.equal(h.deleted.length,1);
  await assert.rejects(storageHarness({role:'free'}).api.preparePhotos('shops/shop/gallery/',[draft],10));
  await assert.rejects(storageHarness().api.preparePhotos('reviews/shop/another/images/',[draft],5));
  const own=storageHarness();await assert.rejects(own.api.deletePhotos('shops/shop/gallery/',[{...old,storagePath:'shops/other/gallery/old.jpg'}]));assert.equal(own.deleted.length,0);
  await assert.rejects(own.api.preparePhotos('shops/shop/gallery/',Array(11).fill(draft),10));
});
test('review transaction keeps ratings and ordered photo refs atomic and rolls back on conflict',async()=>{
  const writes=[];let rollback=0;let conflict=false;
  const api=load('lib/reviews.ts',{'./photoGallery':photos,'./photoStorage':{reviewPhotoPrefix:(shop,uid)=>`reviews/${shop}/${uid}/images/`,preparePhotos:async()=>({images:[{...old,id:'r',storagePath:'reviews/shop/owner/images/r.jpg'}],rollback:async()=>rollback++})},'./firebase':{auth:{currentUser:{uid:'owner'}},db:{}},'firebase/firestore':{doc:(_db,...path)=>({path:path.join('/')}),getDoc:async()=>({exists:()=>false}),serverTimestamp:()=> 'time',runTransaction:async(_db,fn)=>fn({get:async ref=>ref.path.includes('/reviews/')?{exists:()=>conflict}:{data:()=>({ratingAverage:4,ratingCount:1})},set:(ref,data)=>writes.push(data),update:(ref,data)=>writes.push(data)})}});
  await api.addReview('shop',{rating:2,text:'review',images:[draft]});assert.equal(writes[0].images[0].id,'r');assert.equal(writes[1].ratingAverage,3);assert.equal(writes[1].ratingCount,2);
  conflict=true;await assert.rejects(api.addReview('shop',{rating:2,text:'review',images:[draft]}),/ALREADY_REVIEWED/);assert.equal(rollback,1);
});
test('shop update commits before deleting removed photos, retains map icon and reports post-commit cleanup failures',async()=>{
  const events=[]; let failCommit=false; let failDelete=false;
  const h=load('hooks/useShops.ts',{
    '../lib/photoGallery':photos,'../lib/photoStorage':{shopPhotoPrefix:id=>`shops/${id}/gallery/`,preparePhotos:async()=>({images:[],rollback:async()=>events.push('rollback')}),deletePhotos:async(_prefix,removed)=>{events.push('delete:'+removed.length);if(failDelete)throw Error('cleanup');}},
    '../lib/shopMapIcon':{},'../lib/businessHours':{validateBusinessHours:()=>null},'../lib/googleMapsUrl':{googleMapsUrlField:()=>({})},'../lib/firebase':{db:{}},'../lib/uploadImage':{},react:{},
    'firebase/firestore':{collection:()=>({}),orderBy:()=>({}),query:()=>({}),doc:()=>({}),serverTimestamp:()=>0,getDoc:async()=>({exists:()=>true,id:'shop',data:()=>({name:'shop',galleryImages:[old],mapIconUrl:'https://example.test/icon'})}),updateDoc:async(_ref,patch)=>{events.push('commit');assert.equal(patch.mapIconUrl,undefined);assert.equal(patch.galleryImages.length,0);if(failCommit)throw Error('denied');}}
  });
  await h.updateShop('shop',{name:'edited'},undefined,[]);assert.deepEqual(events,['commit','delete:1']);
  events.length=0;failCommit=true;await assert.rejects(h.updateShop('shop',{name:'edited'},undefined,[]));assert.deepEqual(events,['commit','rollback']);
  events.length=0;failCommit=false;failDelete=true;assert.equal((await h.updateShop('shop',{name:'edited'},undefined,[])).cleanupFailed,true);assert.deepEqual(events,['commit','delete:1']);
});
