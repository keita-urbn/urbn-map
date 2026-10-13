const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const vm = require('node:vm'); const ts = require('typescript');
function load(path, dependencies) {
  const fixture = { exports: {} };
  const jsx = (type, props) => ({ type, props });
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { module: fixture, exports: fixture.exports, require: name => name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : dependencies[name] ?? {} });
  return fixture.exports;
}
function nodes(tree) { return [tree, ...(Array.isArray(tree?.props?.children) ? tree.props.children : [tree?.props?.children]).filter(Boolean).flatMap(c => typeof c === 'object' ? nodes(c) : [])]; }
test('existing article detail mask applies only to Body; Abstract stays complete for free and Premium', () => {
  const { StructuredPostCard } = load('components/InfoChatFeed.tsx', { 'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', StyleSheet: { create: s => s } }, 'expo-linear-gradient': { LinearGradient: 'Gradient' } });
  const post = { id: 'a', title: 'title', hashtags: [], abstract: 'complete abstract', body: 'premium body' };
  for (const canReadBody of [false, true]) {
    const tree = StructuredPostCard({ post, canReadBody, isAdmin: false, isDark: true, colors: {} });
    const abstract = nodes(tree).find(n => n.props?.children === post.abstract);
    assert.ok(abstract); assert.equal(abstract.props.style[0].opacity, undefined);
    const body = nodes(tree).find(n => n.props?.children === post.body);
    assert.ok(body);
    assert.equal(body.props.style[0].opacity, canReadBody ? undefined : .35);
    assert.equal(nodes(tree).some(n => n.type === 'Gradient'), !canReadBody);
  }
});
test('native startup overlay and artwork fill absolutely even without removed absoluteFillObject API', () => {
  class Value { interpolate(config) { return config; } }
  const { default: Splash } = load('components/BrandedStartupSplash.tsx', {
    react: { useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}], useRef: initial => ({ current: initial }), useEffect: () => {} },
    'react-native': { Animated: { Value, View: 'AnimatedView' }, Easing: {}, Image: 'Image', Platform: { OS: 'ios' }, StyleSheet: { create: s => s }, useWindowDimensions: () => ({ width: 390, height: 844 }) },
    '../context/auth': { useAuth: () => ({ loading: false }) }, '../theme/typography': { useTypography: () => ({ settled: true }) }, '../hooks/useReducedMotion': { useReducedMotion: () => false },
  });
  const tree = Splash();
  assert.equal(tree.props.style[0].position, 'absolute');
  for (const edge of ['top', 'right', 'bottom', 'left']) assert.equal(tree.props.style[0][edge], 0);
  const image = nodes(tree).find(n => n.type === 'Image');
  assert.equal(image.props.style.position, 'absolute');
  const frame = tree.props.children.props.style[1];
  assert.ok(frame.width <= 390 && frame.height <= 844);
});
