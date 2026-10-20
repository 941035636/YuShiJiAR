#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

export function renderCompiledTemplate(filePath, data = {}) {
  const firstLine = fs.readFileSync(filePath, 'utf8').split(/\r?\n/, 1)[0];
  let factory;
  vm.runInNewContext(firstLine, {
    __wxCodeSpace__: {
      batchAddCompiledTemplate(value) { factory = value; },
    },
  }, { timeout: 5000 });
  if (!factory) throw new Error(`No compiled template factory in ${filePath}`);
  const table = factory({}, {}, data, {}, {}, (value) => value, (value) => String(value), (object, key) => object?.[key], {});
  const route = Object.keys(table)[0];
  const template = table[route]('');
  const nodeMap = new WeakMap();
  const root = { tag: '#root', attributes: {}, children: [] };
  const stack = [root];
  const runtime = {
    c(nodeId, value) { nodeMap.get(nodeId).attributes.class = value; },
    m() {},
    r(nodeId, name, value) { nodeMap.get(nodeId).attributes[name] = value; },
    v(nodeId, event, handler) { nodeMap.get(nodeId).attributes[`bind:${event}`] = handler; },
    i(nodeId, value) { nodeMap.get(nodeId).attributes.id = value; },
    y(nodeId, value) { nodeMap.get(nodeId).attributes.style = value; },
  };
  const addText = (value) => stack.at(-1).children.push({ text: String(value) });
  const branch = (condition, callback) => {
    if (condition) callback(false, addText, create, branch, loop);
  };
  const loop = (items, _key, _old, _path, callback) => {
    for (const [index, item] of (Array.isArray(items) ? items : []).entries()) {
      callback(item, index, item, false, false, false, addText, create, branch, loop);
    }
  };
  const slot = (name = '') => create('slot', {}, (nodeId) => {
    if (name) runtime.r(nodeId, 'name', name);
  });
  function create(tag, _options, attributeCallback, childCallback) {
    const nodeId = {};
    const node = { tag, attributes: {}, children: [] };
    nodeMap.set(nodeId, node);
    stack.at(-1).children.push(node);
    if (attributeCallback) attributeCallback(nodeId, true);
    if (childCallback) {
      stack.push(node);
      childCallback(false, addText, create, branch, loop, slot);
      stack.pop();
    }
  }
  const rendered = template(runtime, null, data, false);
  rendered.C(false, addText, create, branch, loop, slot);
  return { route, children: root.children };
}

if (import.meta.url === `file:///${process.argv[1].replaceAll('\\', '/')}` || import.meta.url === `file://${process.argv[1].replaceAll('\\', '/')}`) {
  const [filePath] = process.argv.slice(2);
  const data = {
    isShow: true,
    isShowB: true,
    isModel: '{{isModel}}',
    isShowDolphin: '{{isShowDolphin}}',
    show: true,
    smShow: true,
    deflautWidth: '{{deflautWidth}}',
    renderWidth: 750,
    renderHeight: 1200,
    width: 375,
    height: 600,
    logs: [{ date: '{{item.date}}' }],
  };
  console.log(JSON.stringify(renderCompiledTemplate(filePath, data), null, 2));
}
