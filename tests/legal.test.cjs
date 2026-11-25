const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(path, dependencies = {}, globals = {}) {
  const fixture = { exports: {} };
  const jsx = (type, props) => ({ type, props });
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: false },
  }).outputText;
  vm.runInNewContext(code, { exports: fixture.exports, module: fixture, __DEV__: false, ...globals,
    require: (name) => name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : dependencies[name] ?? {} });
  return fixture.exports;
}

function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  return node?.props ? [node, ...nodes(node.props.children)] : [];
}

function hooks() {
  const state = [];
  let cursor = 0;
  return {
    render(component, props) { cursor = 0; return component(props); },
    react: {
      useState(initial) {
        const key = cursor++;
        if (!(key in state)) state[key] = initial;
        return [state[key], value => { state[key] = value; }];
      },
      useCallback: callback => callback,
      useMemo: callback => callback(),
      useRef(initial) {
        const key = cursor++;
        if (!(key in state)) state[key] = { current: initial };
        return state[key];
      },
    },
  };
}

const meta = load('content/legal/metadata.ts', {
  './terms': load('content/legal/terms.ts'),
  './privacy': load('content/legal/privacy.ts'),
  './communityGuidelines': load('content/legal/communityGuidelines.ts'),
});
const { legalDocuments, legalLinks, activeVersion, legalBlocks, supportEmailLink } = meta;
const native = {
  StyleSheet: { create: styles => styles, absoluteFill: {}, flatten: styles => Object.assign({}, ...styles.filter(Boolean)) },
  Platform: { OS: 'ios' },
  Keyboard: { dismiss() {} },
  ScrollView: 'ScrollView', TextInput: 'TextInput', Pressable: 'Pressable', Text: 'Text', View: 'View',
};
const insets = { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) };
const theme = { useTheme: () => ({ colors: {} }) };

const snapshots = {
  terms: { headings: 19, lines: 115 },
  privacy: { headings: 17, lines: 138 },
  community: { headings: 10, lines: 86 },
};

for (const [key, document] of Object.entries(legalDocuments)) {
  test(`${document.id} preserves all section headings, text blocks and draft metadata`, () => {
    const blocks = legalBlocks(document.source);
    assert.equal(blocks.filter(block => block.kind === 'heading').length, snapshots[key].headings);
    assert.equal(blocks.length, snapshots[key].lines);
    assert.equal(blocks.at(-1).text, 'Version 1.0');
    assert.match(document.source, /\[公式メールアドレス\]/);
    assert.match(document.source, /\[正式公開日\]/);
    assert.equal(activeVersion(document), null);
  });
  test(`${document.id} is a standalone public route bound to its document`, () => {
    const route = load(`app/legal/${document.id}.tsx`, {
      '../../components/legal/LegalDocumentScreen': { default: 'Document' },
      '../../content/legal/metadata': meta,
    }).default;
    assert.equal(route().props.document, document);
  });
}

test('approval requires a valid final version, valid dates and JST effective day', () => {
  const published = { ...legalDocuments.terms, status: 'published', version: '1.1',
    effectiveDate: '2027-03-01', lastUpdatedDate: '2027-02-28' };
  const start = Date.parse('2027-03-01T00:00:00+09:00');
  assert.equal(activeVersion(published, start - 1), null);
  assert.equal(activeVersion(published, start), '1.1');
  assert.equal(activeVersion({ ...published, effectiveDate: '2027-02-30' }, start), null);
  assert.equal(activeVersion({ ...published, version: 'TBD' }, start), null);
});

test('support keeps an unconfigured address inactive and encodes a configured email subject', () => {
  assert.equal(supportEmailLink(meta.supportConfig.email, 'お問い合わせ'), null);
  assert.equal(supportEmailLink('bad@example.org?bcc=x', ''), null);
  assert.equal(supportEmailLink('help@example.org', '店舗掲載情報の訂正'),
    'mailto:help@example.org?subject=' + encodeURIComponent('店舗掲載情報の訂正'));
});

test('guest, member, beta Premium and admin see the same account destinations', () => {
  for (const profile of [null, { uid: 'member' }, { uid: 'beta', premium: true }, { uid: 'admin', admin: true }]) {
    const { react } = hooks();
    const Account = load('components/AccountScreen.tsx', {
      react, 'react-native': native, 'react-native-safe-area-context': insets,
      'expo-router': { Link: 'Link', useLocalSearchParams: () => ({}) },
      './legal/AccountAgreement': { default: 'AccountAgreement' },
      '../context/auth': { useAuth: () => ({ user: profile, isPremium: profile?.premium, isAdmin: profile?.admin }) },
      '../hooks/useTabContentInsets': { useTabContentInsets: () => ({}) },
      '../content/legal/metadata': meta, '../theme': theme,
    }).default;
    assert.deepEqual(nodes(Account()).filter(node => node.type === 'Link').map(node => node.props.href),
      Array.from(legalLinks, link => link.href));
  }
});

test('signup starts unchecked, rejects direct submission and retries agreement without creating a second account', async () => {
  const fixture = hooks();
  const agreement = { id: 'signup-1.0-1.0', termsVersion: '1.0', privacyPolicyVersion: '1.0' };
  let authCalls = 0;
  let writes = 0;
  const redirects = [];
  const Signup = load('app/signup.tsx', {
    react: fixture.react, 'react-native': native, 'react-native-safe-area-context': insets,
    'expo-router': { router: { replace: path => redirects.push(path) }, useLocalSearchParams: () => ({}) },
    '../components/legal/SignupAgreement': { default: 'Agreement' },
    '../lib/legalAgreements': {
      currentSignupAgreement: () => agreement,
      recordAgreement: async (uid, accepted) => {
        assert.equal(uid, 'new-user');
        assert.equal(accepted, agreement);
        if (++writes === 1) throw new Error('denied');
      },
    },
    '../context/auth': { useAuth: () => ({ signUp: async () => { authCalls++; return { ok: true, uid: 'new-user' }; } }) },
    '../theme': theme,
  }).default;
  const form = () => nodes(fixture.render(Signup));
  const control = () => form().find(node => node.type === 'Agreement').props;
  const submit = () => form().find(node => node.type === 'Pressable').props;
  for (const input of form().filter(node => node.type === 'TextInput')) input.props.onChangeText('test@example.org');
  assert.equal(control().checked, false);
  assert.equal(submit().disabled, true);
  await submit().onPress();
  assert.equal(authCalls, 0);
  control().onChange(true);
  await submit().onPress();
  assert.equal(authCalls, 1);
  assert.deepEqual(redirects, []);
  await submit().onPress();
  assert.equal(authCalls, 1);
  assert.deepEqual(redirects, ['/(tabs)']);
});

test('signup links push public documents so the existing form remains in the stack', () => {
  const Control = load('components/legal/SignupAgreement.tsx', {
    'react-native': native, 'expo-router': { Link: 'Link' },
    '../../content/legal/metadata': meta, '../../theme': theme,
  }).default;
  const links = nodes(Control({ checked: false })).filter(node => node.type === 'Link');
  assert.deepEqual(links.map(({ props }) => [props.href, props.push]), [
    ['/legal/terms', true], ['/legal/privacy', true],
  ]);
});

test('review opens the same guidelines and keeps text, photo, rating and upload controls mounted', () => {
  const fixture = hooks();
  const Composer = load('components/ReviewComposer.tsx', {
    react: fixture.react, 'react-native': native, 'react-native-safe-area-context': insets,
    '../theme': theme, '../content/legal/metadata': meta,
    './PhotoManager': { default: 'Photos' }, './legal/LegalDocumentScreen': { default: 'Document' },
  }).default;
  const photos = [{ id: 'photo' }];
  const props = { visible: true, rating: 3, images: photos, text: 'draft', posting: false, guidelineState: 'required', onSubmit() {} };
  const tree = () => nodes(fixture.render(Composer, props));
  tree().find(node => node.type === 'Pressable' && node.props.accessibilityRole === 'link').props.onPress();
  const overlay = tree().find(node => node.type === 'Document');
  assert.equal(overlay.props.document, legalDocuments.community);
  assert.equal(tree().find(node => node.type === 'TextInput').props.value, 'draft');
  assert.equal(tree().find(node => node.type === 'Photos').props.images, photos);
  assert.equal(tree().find(node => node.props.accessibilityLabel === '3つ星').props.accessibilityState.selected, true);
  assert.equal(tree().find(node => node.props.onPress && node.props.accessibilityState?.disabled === true)?.type, 'Pressable');
  overlay.props.onBack();
  assert.equal(tree().some(node => node.type === 'Document'), false);
});

test('agreement writes use owner-scoped immutable version paths and server timestamp fields only', async () => {
  const documents = Object.fromEntries(Object.entries(legalDocuments).map(([key, document]) => [
    key, { ...document, status: 'published', effectiveDate: '2026-01-01', lastUpdatedDate: '2026-01-01' },
  ]));
  const records = new Map();
  let storedWrites = 0;
  const firebase = { db: {}, auth: { currentUser: { uid: 'owner' } } };
  const service = load('lib/legalAgreements.ts', {
    './firebase': firebase,
    '../content/legal/metadata': { ...meta, legalDocuments: documents, agreementRollout: { enabled: true } },
    'firebase/firestore': {
      doc: (_db, ...segments) => segments.join('/'),
      serverTimestamp: () => 'server-time-sentinel',
      runTransaction: async (_db, run) => run({
        get: async path => ({ exists: () => records.has(path), data: () => records.get(path) }),
        set: (path, data) => { storedWrites++; records.set(path, data); },
      }),
    },
  });
  const agreement = service.currentSignupAgreement();
  await assert.rejects(service.recordAgreement('other-user', agreement), /AUTH_REQUIRED/);
  await assert.rejects(service.recordAgreement('owner', { ...agreement, id: 'signup-2.0-1.0' }), /VERSION_CHANGED/);
  await service.recordAgreement('owner', { ...agreement, role: 'admin', premium: true });
  await service.recordAgreement('owner', agreement);
  assert.equal(storedWrites, 1);
  assert.deepEqual({ ...records.get('users/owner/legalAgreements/signup-1.0-1.0') }, {
    termsVersion: '1.0', termsAcceptedAt: 'server-time-sentinel',
    privacyPolicyVersion: '1.0', privacyPolicyAcknowledgedAt: 'server-time-sentinel',
  });
  const rules = fs.readFileSync('firestore-legal-agreements.rules', 'utf8');
  assert.match(rules, /request.auth.uid == uid/);
  assert.match(rules, /allow create: if owned\(\) && validAcceptance\(\)/);
  assert.match(rules, /allow list, update, delete: if false/);
  assert.match(rules, /keys\(\).hasOnly/);
});

test('Vercel resolves each public document to static HTML ahead of the existing app fallback', () => {
  const { rewrites } = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  assert.deepEqual(rewrites.slice(0, 4), Array.from(legalLinks, ({ href }) => ({
    source: href, destination: href + '.html',
  })));
  assert.deepEqual(rewrites.at(-1), { source: '/(.*)', destination: '/' });
});
