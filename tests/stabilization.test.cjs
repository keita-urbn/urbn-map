const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(path, dependencies) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => dependencies[name], console: { log() {}, error() {} } });
  return exports;
}

test('favorites completes signed-out initialization and drops previous account results immediately', () => {
  let authChanged;
  const feeds = new Map();
  const api = load('lib/favorites.ts', {
    'firebase/auth': { onAuthStateChanged: (_auth, callback) => { authChanged = callback; } },
    'firebase/firestore': {
      collection: (_db, path) => path,
      onSnapshot: (path, receive) => {
        feeds.set(path, receive);
        return () => {};
      },
    },
    'react': { useCallback: fn => fn, useSyncExternalStore: (_subscribe, read) => read() },
    'expo-router': {},
    'react-native': {},
    './firebase': { auth: {}, db: {}, isFirebaseConfigured: true },
    './usageLimits': { FAVORITES_LIMIT: 3 },
  });

  assert.equal(api.useFavorites().loading, true);
  authChanged(null);
  assert.equal(api.useFavorites().loading, false);
  authChanged({ uid: 'first' });
  const first = feeds.get('users/first/favorites');
  first({ docs: [{ id: 'first-shop' }] });
  assert.equal(api.useFavorites().isFavorite('first-shop'), true);
  authChanged({ uid: 'second' });
  assert.equal(api.useFavorites().loading, true);
  assert.equal(api.useFavorites().isFavorite('first-shop'), false);
  first({ docs: [{ id: 'stale-shop' }] });
  assert.equal(api.useFavorites().isFavorite('stale-shop'), false);
  feeds.get('users/second/favorites')({ docs: [{ id: 'second-shop' }] });
  assert.equal(api.useFavorites().loading, false);
  assert.equal(api.useFavorites().isFavorite('second-shop'), true);
});

test('reviews ignore older shop responses and older requests for the same shop', async () => {
  const requests = [];
  const hooks = [];
  let cursor = 0;
  let pendingEffect;
  let cleanup;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = initial;
      return [hooks[index], next => { hooks[index] = typeof next === 'function' ? next(hooks[index]) : next; }];
    },
    useRef(initial) {
      const index = cursor++;
      hooks[index] ??= { current: initial };
      return hooks[index];
    },
    useCallback: fn => fn,
    useEffect: effect => { pendingEffect = effect; },
  };
  const { useReviews } = load('hooks/useReviews.ts', {
    react,
    '../lib/reviews': {
      getReviews: shop => new Promise(resolve => { requests.push({ shop, resolve }); }),
    },
  });
  function ReviewsHarness(id) {
    cursor = 0;
    return useReviews(id);
  }
  const commit = () => {
    cleanup?.();
    cleanup = pendingEffect();
  };
  ReviewsHarness('first');
  commit();
  assert.equal(ReviewsHarness('second').loading, true);
  commit();
  const reload = ReviewsHarness('second').reload();
  assert.deepEqual(requests.map(({ shop }) => shop), ['first', 'second', 'second']);
  requests[2].resolve([{ id: 'latest' }]);
  await reload;
  requests[0].resolve([{ id: 'wrong-shop' }]);
  requests[1].resolve([{ id: 'older-request' }]);
  await Promise.resolve();
  assert.equal(ReviewsHarness('second').reviews[0].id, 'latest');
  cleanup();
});
