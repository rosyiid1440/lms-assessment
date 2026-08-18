import { JSDOM } from 'jsdom';
import fs from 'fs';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Image = dom.window.Image;
global.getComputedStyle = dom.window.getComputedStyle;
global.Blob = dom.window.Blob;
global.createImageBitmap = dom.window.createImageBitmap;

import pptx from './node_modules/pptx-preview/dist/pptx-preview.es.js';

const mount = document.createElement('div');
document.body.appendChild(mount);
mount.style.width = '960px';
mount.style.height = '540px';

const buf = fs.readFileSync('E:/project/SMA/lms-terbaru/storage/test-pptx.pptx');
const buf2 = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

console.log('init...');
const viewer = pptx.init(mount, { width: 960, height: 540 });
console.log('loading...');
const timeout = setTimeout(() => { console.log('TIMEOUT: load did not resolve in 5s'); process.exit(1); }, 5000);
await viewer.load(buf2);
clearTimeout(timeout);
console.log('load resolved. slideCount =', viewer.slideCount);
viewer.renderSingleSlide(0);
console.log('renderSingleSlide(0) OK, mount HTML length:', mount.innerHTML.length);
process.exit(0);
