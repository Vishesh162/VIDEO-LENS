import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const root = path.resolve('out');
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
assert(fs.existsSync(path.join(root, 'index.html')), 'Build the static export before testing.');
const profiles = path.resolve('.taste-skill');
fs.mkdirSync(profiles, { recursive: true });
const profile = fs.mkdtempSync(path.join(profiles, 'chrome-interactions-'));
const mime = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.svg':'image/svg+xml', '.jpg':'image/jpeg', '.mp4':'video/mp4', '.ttf':'font/ttf' };
const server = http.createServer((request, response) => {
  const target = path.resolve(root, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
  if (target !== root && !target.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
  let file = target;
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    const stat = fs.statSync(file);
    response.writeHead(200, { 'Content-Type':mime[path.extname(file)] || 'application/octet-stream', 'Content-Length':stat.size });
    fs.createReadStream(file).pipe(response);
  } catch { response.writeHead(404); response.end('not found'); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = spawn(chrome, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide:true, stdio:'ignore' });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
let downloads;
const pending = new Map();
let nextId = 0;
let checks = 0;
const failures = [];
const send = (method, params={}) => new Promise((resolve,reject) => { const id=++nextId; const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`Chrome timed out: ${method}`));},15000); pending.set(id,{resolve:(result)=>{clearTimeout(timer);resolve(result);},reject:(error)=>{clearTimeout(timer);reject(error);}}); socket.send(JSON.stringify({id,method,params})); });
async function evaluate(expression) { const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true}); if(result.exceptionDetails) throw new Error(result.exceptionDetails.text + ': ' + (result.exceptionDetails.exception?.description || expression)); return result.result.value; }
async function waitFor(expression, message) { for(let i=0;i<100;i++){if(await evaluate(expression)) return; await sleep(100);} throw new Error(message); }
async function navigate(route) { await send('Page.navigate',{url:base+route}); await waitFor('document.readyState === "complete"','Page did not load'); await sleep(1000); }
async function check(name, fn) { checks++; try {await fn(); console.log(`PASS ${name}`);} catch(error){failures.push(name); console.error(`FAIL ${name}: ${error.message}`);} }

try {
  const portFile=path.join(profile,'DevToolsActivePort');
  for(let i=0;i<100&&!fs.existsSync(portFile);i++) await sleep(100);
  assert(fs.existsSync(portFile),'Headless Chrome did not start.');
  const port=fs.readFileSync(portFile,'utf8').split('\n')[0];
  const targets=await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  socket=new WebSocket(targets.find((item)=>item.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  socket.addEventListener('message',(event)=>{const message=JSON.parse(event.data);const request=pending.get(message.id);if(request){pending.delete(message.id);message.error?request.reject(new Error(message.error.message)):request.resolve(message.result);}});
  await send('Page.enable'); await send('Runtime.enable');
  downloads = fs.mkdtempSync(path.resolve('.taste-skill', 'interaction-downloads-'));
  fs.mkdirSync(downloads, { recursive:true });
  await send('Browser.setDownloadBehavior', { behavior:'allow', downloadPath:downloads });
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await navigate('/');
  await check('landing assets and navigation',async()=>{assert.equal(await evaluate('document.querySelector("h1").textContent'),'AI video notes for busy minds.');assert(await evaluate('document.fonts.check("400 16px Onest")'));assert(await evaluate('[...document.querySelectorAll("img")].every(image=>image.complete&&image.naturalWidth>0)'));assert(await evaluate('document.querySelector("a[href=\\"/workspace/\\"]") !== null'));});
  await check('preview panel visibility and tab relationships',async()=>{assert(await evaluate('[...document.querySelectorAll(".notes-tab")].every(tab=>document.getElementById(tab.getAttribute("aria-controls")))'));assert(await evaluate('!document.querySelector(".notes-scroll").hidden && document.querySelector(".notes-scroll").getBoundingClientRect().height > 100'));await evaluate('[...document.querySelectorAll(".notes-tab")].find(tab=>tab.textContent==="Transcript").click()');await waitFor('!!document.querySelector(".transcript-search") && !document.querySelector(".notes-scroll").hidden','Transcript panel stayed hidden');});
  await check('notes keyboard navigation',async()=>{await evaluate('[...document.querySelectorAll(".notes-tab")].find(tab=>tab.textContent==="Transcript").focus()');await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight'});await waitFor('document.querySelector(".notes-tab[aria-selected=true]")?.textContent === "Actions" && !!document.querySelector(".action-item")','Arrow key did not open Actions');assert(await evaluate('!document.querySelector(".notes-scroll").hidden'));});
  await navigate('/workspace/');
  await check('upload validation',async()=>{await evaluate('document.querySelector(".analyze-button").click()');await waitFor('document.querySelector(".upload-error")?.textContent.includes("Choose a recording")','Empty upload did not show an error');});
  await check('YouTube validation',async()=>{await evaluate('document.querySelectorAll(".source-tabs button")[1].click()');await sleep(100);await evaluate('(()=>{const input=document.querySelector("#youtube-url");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,"https://unrelated.example/video");input.dispatchEvent(new Event("input",{bubbles:true}));})()');await evaluate('document.querySelector(".analyze-button").click()');await waitFor('document.querySelector(".upload-error")?.textContent.includes("valid HTTPS YouTube")','Invalid YouTube link was accepted');});
  await check('walkthrough opens',async()=>{await evaluate('document.querySelector(".walkthrough-prompt button").click()');await waitFor('document.querySelector(".session-toolbar h1")?.textContent.includes("Field notes")','Walkthrough did not open');});
  await check('transcript search',async()=>{await evaluate('[...document.querySelectorAll(".notes-tab")].find(button=>button.textContent==="Transcript").click()');await sleep(250);await evaluate('(()=>{const input=document.querySelector(".transcript-search input");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,"petals");input.dispatchEvent(new Event("input",{bubbles:true}));})()');await sleep(250);assert.equal(await evaluate('document.querySelectorAll(".transcript-segment").length'),1);assert(await evaluate('document.querySelector(".transcript-segment").textContent.includes("petals")'));});
  await check('task completion',async()=>{await evaluate('[...document.querySelectorAll(".notes-tab")].find(button=>button.textContent==="Actions").click()');await sleep(250);await evaluate('document.querySelector(".action-item input").click()');assert(await evaluate('document.querySelector(".action-item").classList.contains("is-complete")'));});
  await check('grounded walkthrough chat',async()=>{await evaluate('document.querySelector(".chat-suggestions button").click()');await waitFor('document.querySelector(".chat-message--assistant") !== null','Assistant did not answer');assert(await evaluate('document.querySelector(".chat-message--assistant").textContent.includes("observe before interpreting")'));assert(await evaluate('document.querySelector(".chat-message-footer").textContent.includes("00:00")'));});
  await check('video playback',async()=>{await evaluate('document.querySelector(".video-play-disc").click()');await sleep(1000);assert(await evaluate('document.querySelector("video").currentTime > 0'));await evaluate('document.querySelector("video").pause()');});
  await check('notes download creates a PDF',async()=>{
    await evaluate('[...document.querySelectorAll(".session-toolbar-actions button")].find(button=>button.getAttribute("aria-label")==="Download notes as PDF").click()');
    await waitFor('document.querySelector(".studio-toast")?.textContent.includes("PDF downloaded")','PDF download did not run');
    for(let i=0;i<30&&!fs.readdirSync(downloads).some(file=>file.endsWith('.pdf'));i++) await sleep(100);
    const file=fs.readdirSync(downloads).find(name=>name.endsWith('.pdf'));
    assert(file,'PDF file was not downloaded');
    assert.equal(fs.readFileSync(path.join(downloads,file)).subarray(0,5).toString(),'%PDF-');
  });
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await navigate('/workspace/?walkthrough=1');
  await check('mobile notes and chat switch',async()=>{assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'));await evaluate('document.querySelectorAll(".session-mobile-tabs button")[1].click()');assert(await evaluate('getComputedStyle(document.querySelector(".session-columns > .assistant-chat")).display !== "none"'));await evaluate('document.querySelectorAll(".session-mobile-tabs button")[0].click()');assert(await evaluate('getComputedStyle(document.querySelector(".session-document")).display !== "none"'));});
  await check('no video library, legacy browser notes are cleared', async () => {
    const key = 'ai-video-assistant:library:v1';
    await evaluate(`localStorage.setItem(${JSON.stringify(key)}, '[{"title":"old saved notes"}]')`);
    await navigate('/workspace/');
    assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(key)})`), null);
    assert.equal(await evaluate('document.querySelectorAll(".studio-sidebar, .library-item, .mobile-library-toggle").length'), 0);
  });
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await navigate('/');
  await check('mobile layout and reduced motion',async()=>{assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'));assert(await evaluate('getComputedStyle(document.querySelector("h1")).opacity !== "0"'));assert(await evaluate('document.querySelector(".hero__cta .btn").getBoundingClientRect().bottom <= innerHeight'));});
  await check('mobile navigation and video touch targets',async()=>{assert(await evaluate('[...document.querySelectorAll(".hero-video .video-controls button, .hero-video .video-controls input")].every(control=>control.getBoundingClientRect().height >= 44)'));await evaluate('document.querySelector(".nav__toggle").click()');assert(await evaluate('document.querySelector(".nav__toggle").getAttribute("aria-expanded") === "true"'));await evaluate('document.querySelector(".nav__toggle").click()');assert(await evaluate('document.querySelector(".nav__toggle").getAttribute("aria-expanded") === "false"'));});
  console.log(`\n${checks-failures.length}/${checks} interaction checks passed.`);
  if(failures.length) process.exitCode=1;
} finally {
  try {await send('Browser.close');} catch {}
  socket?.close(); browser.kill(); await new Promise((resolve)=>server.close(resolve));
  const resolved=path.resolve(profile);
  if(resolved.startsWith(profiles+path.sep)) {for(let i=0;i<10;i++){try{fs.rmSync(resolved,{recursive:true,force:true});break;}catch{await sleep(200);}}}
  const resolvedDownloads=path.resolve(downloads || profiles);
  if(resolvedDownloads.startsWith(profiles+path.sep)) {for(let i=0;i<10;i++){try{fs.rmSync(resolvedDownloads,{recursive:true,force:true});break;}catch{await sleep(200);}}}
}
