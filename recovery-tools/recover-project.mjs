#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { renderCompiledTemplate } from './render-compiled-template.mjs';

const [extractedRoot, projectRoot, appid] = process.argv.slice(2);
if (!extractedRoot || !projectRoot || !appid) throw new Error('Usage: node recover-project.mjs EXTRACTED_DIR PROJECT_DIR APPID');

function write(relativePath, content) {
  const destination = path.join(projectRoot, ...relativePath.split('/'));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content.endsWith('\n') ? content : content + '\n');
}

function repairMojibake(text) {
  const replacements = new Map([
    ['閬囩煶璁癆R骞诲', '遇石记AR幻境'],
    ['鑾峰彇妯″瀷鐘舵€?', '获取模型状态'],
    ['鑾峰彇澶村儚', '获取头像'],
    ['寰俊鎺堟潈', '微信授权'],
    ['璇嗗埆', '识别'],
    ['鎵弿鐩爣涓嶅湪鑼冨洿', '扫描目标不在范围'],
    ['瀹樻柟绀轰緥', '官方示例'],
  ]);
  for (const [bad, good] of replacements) text = text.replaceAll(bad, good);
  return text;
}

function extractDefinedModules(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const modules = [];
  const expression = /define\("([^"]+)",function\([^)]*\)\{\r?\n([\s\S]*?)\r?\n\},\{isPage:/g;
  for (const match of source.matchAll(expression)) modules.push({ path: match[1], source: match[2] });
  return modules;
}

function extractPageSource(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  if (lines.length < 2) throw new Error(`No recoverable source line in ${filePath}`);
  return lines[1];
}

function escapeXml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function serializeNodes(nodes, indent = '') {
  return nodes.map((node) => {
    if (Object.hasOwn(node, 'text')) return `${indent}${escapeXml(node.text)}`;
    const attributes = Object.entries(node.attributes || {}).map(([name, value]) => {
      const rendered = typeof value === 'boolean' ? `{{${value}}}` : value;
      return ` ${name}="${escapeXml(rendered)}"`;
    }).join('');
    if (!node.children?.length) return `${indent}<${node.tag}${attributes} />`;
    return `${indent}<${node.tag}${attributes}>\n${serializeNodes(node.children, indent + '  ')}\n${indent}</${node.tag}>`;
  }).join('\n');
}

function findNode(nodes, predicate) {
  for (const node of nodes) {
    if (predicate(node)) return node;
    const nested = findNode(node.children || [], predicate);
    if (nested) return nested;
  }
  return null;
}

function renderPageWxml(filePath, routeName) {
  if (routeName === 'pages/logs/logs') {
    return '<scroll-view class="scrollarea" scroll-y type="list">\n  <view wx:for="{{logs}}" wx:key="timeStamp" class="log-item">{{index + 1}}. {{item.date}}</view>\n</scroll-view>';
  }
  const rendered = renderCompiledTemplate(filePath, {
    isShowDolphin: '{{isShowDolphin}}',
    isModel: '{{isModel}}',
    show: true,
    smShow: true,
    renderWidth: 750,
    renderHeight: 1200,
    width: 375,
    height: 600,
    deflautWidth: '{{deflautWidth}}',
    logs: [{ date: '{{item.date}}' }],
  });
  const customAr = rendered.children.find((node) => /^xr-ar-/.test(node.tag));
  if (customAr) {
    customAr.attributes.width = '{{renderWidth}}';
    customAr.attributes.height = '{{renderHeight}}';
    customAr.attributes.style = 'width:{{width * 2}}rpx; height:{{height * 2 + 60}}rpx;';
  }
  for (const node of rendered.children) {
    if (node.attributes?.class === 'faceMask' && String(node.attributes.style).includes('saomiao.gif')) {
      node.attributes['wx:if'] = '{{smShow}}';
    } else if (node.attributes?.class === 'faceMask') {
      node.attributes['wx:if'] = '{{show}}';
    }
  }
  return serializeNodes(rendered.children);
}

function renderComponentWxml(filePath) {
  const common = renderCompiledTemplate(filePath, { isShow: false, isShowB: false }).children;
  const variantA = renderCompiledTemplate(filePath, { isShow: true, isShowB: false }).children;
  const variantB = renderCompiledTemplate(filePath, { isShow: false, isShowB: true }).children;
  const commonTracker = findNode(common, (node) => node.tag === 'xr-ar-tracker');
  const trackerA = findNode(variantA, (node) => node.tag === 'xr-ar-tracker');
  const trackerB = findNode(variantB, (node) => node.tag === 'xr-ar-tracker');
  if (commonTracker && trackerA && trackerB) {
    commonTracker.children = [
      { tag: 'block', attributes: { 'wx:if': '{{isShow}}' }, children: trackerA.children },
      { tag: 'block', attributes: { 'wx:if': '{{isShowB}}' }, children: trackerB.children },
    ];
  }
  return serializeNodes(common);
}

function extractCssArrays(source) {
  const results = [];
  let cursor = 0;
  while ((cursor = source.indexOf('setCssToHead(', cursor)) !== -1) {
    const arrayStart = source.indexOf('[', cursor);
    if (arrayStart === -1) break;
    let depth = 0;
    let quote = null;
    let escaped = false;
    let end = -1;
    for (let i = arrayStart; i < source.length; i += 1) {
      const char = source[i];
      if (quote) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === quote) quote = null;
      } else if (char === '"' || char === "'") quote = char;
      else if (char === '[') depth += 1;
      else if (char === ']') {
        depth -= 1;
        if (depth === 0) { end = i + 1; break; }
      }
    }
    if (end === -1) break;
    const array = vm.runInNewContext(source.slice(arrayStart, end), {}, { timeout: 1000 });
    const tail = source.slice(end, Math.min(source.length, end + 500));
    const pathMatch = tail.match(/path:\s*["']([^"']+\.wxss)["']/);
    results.push({ array, path: pathMatch?.[1] || null });
    cursor = end;
  }
  return results;
}

function cssFromArray(array) {
  return array.map((part) => {
    if (typeof part === 'string') return part;
    if (!Array.isArray(part)) return '';
    if (part[0] === 0) return `${part[1]}rpx`;
    if (part[0] === 1) return '';
    return '';
  }).join('');
}

fs.mkdirSync(projectRoot, { recursive: true });

for (const bundle of ['appservice.app.js', 'common.app.js']) {
  for (const module of extractDefinedModules(path.join(extractedRoot, bundle))) {
    if (module.path.endsWith('.js') && !module.path.startsWith('.')) write(module.path, repairMojibake(module.source));
  }
}

const appConfig = JSON.parse(fs.readFileSync(path.join(extractedRoot, 'app-config.json'), 'utf8'));
const pageRoutes = appConfig.pages.filter((route) => route.startsWith('pages/'));
const appJson = {
  pages: pageRoutes,
  window: {
    navigationBarTextStyle: 'black',
    navigationBarTitleText: '遇石记AR幻境',
    navigationBarBackgroundColor: '#ffffff',
  },
  style: appConfig.style || 'v2',
};
write('app.json', JSON.stringify(appJson, null, 2));
write('sitemap.json', JSON.stringify({ desc: 'Recovered from authorized release package', rules: [] }, null, 2));
write('project.config.json', JSON.stringify({
  description: '遇石记AR幻境 1.0.6 recovered project',
  packOptions: { ignore: [] },
  setting: { es6: true, enhance: true, postcss: true, minified: false, urlCheck: true },
  compileType: 'miniprogram',
  libVersion: 'trial',
  appid,
  projectname: '遇石记AR幻境-recovered',
  condition: {},
}, null, 2));

const webviewApp = fs.readFileSync(path.join(extractedRoot, 'webview.app.js'), 'utf8');
const appCss = extractCssArrays(webviewApp).filter((item) => item.path?.endsWith('app.wxss') && item.array.length).at(-1);
write('app.wxss', appCss ? cssFromArray(appCss.array) : '');

const appserviceFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.appservice.js')) appserviceFiles.push(full);
  }
}
walk(extractedRoot);

for (const filePath of appserviceFiles) {
  const relative = path.relative(extractedRoot, filePath).replaceAll('\\', '/');
  const base = relative.replace(/\.appservice\.js$/, '');
  write(`${base}.js`, repairMojibake(extractPageSource(filePath)));
  const webviewPath = filePath.replace(/\.appservice\.js$/, '.webview.js');
  if (fs.existsSync(webviewPath)) {
    const isXrComponent = base.startsWith('AR/components/xr-ar-');
    const wxml = isXrComponent ? renderComponentWxml(webviewPath) : renderPageWxml(webviewPath, base);
    write(`${base}.wxml`, wxml);
    const css = extractCssArrays(fs.readFileSync(webviewPath, 'utf8')).find((item) => item.path?.endsWith(`${base}.wxss`));
    write(`${base}.wxss`, css ? cssFromArray(css.array) : '');
  }
  let json;
  const extractedJson = path.join(extractedRoot, `${base}.json`);
  if (fs.existsSync(extractedJson)) json = JSON.parse(fs.readFileSync(extractedJson, 'utf8'));
  else if (base.startsWith('AR/components/')) json = { component: true, renderer: base.startsWith('AR/components/xr-ar-') ? 'xr-frame' : undefined };
  else json = { disableScroll: base.startsWith('pages/ar/') };
  if (base.startsWith('pages/ar/scene-ar-')) {
    const name = path.basename(path.dirname(base));
    const componentName = `xr-ar-${name.replace(/^scene-ar-/, '')}`;
    json.usingComponents = { [componentName]: `/AR/components/${componentName}/index` };
  }
  for (const key of Object.keys(json)) if (json[key] === undefined) delete json[key];
  write(`${base}.json`, JSON.stringify(json, null, 2));
}

for (const asset of ['images/bk.png', 'pages/image/按键底.png', 'pages/image/盲盒版.png', 'pages/image/收藏版.png']) {
  const source = path.join(extractedRoot, ...asset.split('/'));
  const destination = path.join(projectRoot, ...asset.split('/'));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

write('RECOVERY-NOTES.md', `# 恢复工程说明\n\n- AppID: ${appid}\n- JS 来自发布包逻辑模块拆分，仅修复了可确认的中文乱码。\n- WXML/WXSS 由发布包编译模板语义重建，不等同于原始排版、变量名和注释。\n- 远程素材 URL 保持发布版引用，离线归档位于同级 assets 目录，不直接塞入主包。\n- XR-Frame 组件使用 renderer=xr-frame；AR 页面通过 usingComponents 引用对应组件。\n- project.config.json 使用 trial 基础库，首次导入后请在开发者工具中按当前兼容版本锁定。\n`);

console.log(JSON.stringify({ projectRoot: path.resolve(projectRoot), pageCount: pageRoutes.length, sourceModuleCount: appserviceFiles.length }, null, 2));
