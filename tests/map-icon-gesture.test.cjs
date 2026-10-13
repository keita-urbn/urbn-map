const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { cropGeometry } = require('../lib/iconCrop.ts');

test('editor snapshots event coordinates, batches moves, releases, zooms and saves latest crop', async () => {
  const slots = []; let cursor = 0; let pending; let output;
  let frameCount = 0;
  const react = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
    useRef(initial) { const index = cursor++; return slots[index] ?? (slots[index] = { current: initial }); },
    useEffect() {},
  };
  const jsx = (type, props) => ({ type, props });
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('components/MapIconEditor.tsx', 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const dependencies = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { Image: 'Image', Modal: 'Modal', Platform: { OS: 'ios' }, Pressable: 'Pressable', Text: 'Text', View: 'View', useWindowDimensions: () => ({ width: 390 }) },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    'expo-file-system/legacy': { getInfoAsync: async () => ({ exists: true, size: 100 }) },
    'expo-image-picker': { launchImageLibraryAsync: async () => ({ canceled: false, assets: [{ uri: 'file:///image.jpg', width: 1000, height: 500, mimeType: 'image/jpeg', fileSize: 100 }] }) },
    'expo-image-manipulator': { SaveFormat: { JPEG: 'jpeg' }, manipulateAsync: async (_uri, actions) => { output = actions[0].crop; return { uri: 'file:///cropped.jpg' }; } },
    '../lib/iconCrop': { cropGeometry }, '../theme': { useTheme: () => ({ colors: {} }) },
  };
  vm.runInNewContext(code, { module, exports: module.exports, require: name => dependencies[name], requestAnimationFrame: callback => { pending = callback; frameCount++; return frameCount; }, cancelAnimationFrame: () => { pending = null; }, console });
  let saved; let disabled = false;
  const render = () => { cursor = 0; return module.exports.default({ onChange: v => { saved = v; }, disabled }); };
  const nodes = tree => [tree, ...(Array.isArray(tree?.props?.children) ? tree.props.children : [tree?.props?.children]).filter(Boolean).flatMap(child => typeof child === 'object' ? nodes(child) : [])];
  const button = (tree, predicate) => nodes(tree).find(n => typeof n.props?.label === 'string' && predicate(n.props.label));
  const crop = tree => nodes(tree).find(n => n.props?.onResponderMove);
  const image = tree => nodes(tree).find(n => n.type === 'Image' && n.props?.resizeMode === 'stretch');
  button(render(), () => true).props.onPress();
  await new Promise(resolve => setImmediate(resolve));
  let tree = render(); let area = crop(tree);
  area.props.onResponderGrant({ nativeEvent: { pageX: 10, pageY: 20 } });
  const event = { nativeEvent: { pageX: 70, pageY: 80 } };
  area.props.onResponderMove(event); event.nativeEvent = null;
  area.props.onResponderMove({ nativeEvent: { pageX: 90, pageY: 90 } });
  assert.equal(frameCount, 1);
  pending(); pending = null;
  tree = render(); const beforeRelease = image(tree).props.style.left;
  crop(tree).props.onResponderRelease({ nativeEvent: null });
  tree = render(); assert.equal(image(tree).props.style.left, beforeRelease);
  await button(tree, label => label.startsWith('+') || label.codePointAt(0) === 0xff0b).props.onPress();
  tree = render(); area = crop(tree);
  area.props.onResponderGrant({ nativeEvent: { pageX: 0, pageY: 0 } });
  area.props.onResponderMove({ nativeEvent: { pageX: -40, pageY: 10 } });
  area.props.onResponderTerminate({ nativeEvent: { touches: [], changedTouches: [] } });
  const terminated = image(render()).props.style.left;
  crop(render()).props.onResponderMove({ nativeEvent: { pageX: 999, pageY: 999 } });
  assert.equal(image(render()).props.style.left, terminated);
  area = crop(render()); area.props.onResponderGrant({ nativeEvent: { pageX: 0, pageY: 0 } });
  area.props.onResponderMove({ nativeEvent: { pageX: 25, pageY: 0 } });
  // Confirm before the pending preview frame: saved crop uses latest transform.
  await button(render(), label => label.includes('\u78ba\u5b9a')).props.onPress();
  const finalPreview = image(render()).props.style;
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(saved.uri, 'file:///cropped.jpg');
  assert.ok(Math.abs(output.originX - (-finalPreview.left / (finalPreview.width / 1000))) < 1e-8);
  disabled = true;
  assert.equal(crop(render()).props.onStartShouldSetResponder(), false);
});
