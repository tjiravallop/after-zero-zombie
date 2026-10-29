const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const {chromium} = require('playwright');
const E=require('../engine.js');
const {run}=require('./engine.cjs');
const root=path.resolve(__dirname,'..'), results=[];
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
let browser;
async function test(name,fn,{width=1280,raw=null,file=false}={}){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
    if(!file)await page.addInitScript(raw=>{if(localStorage.getItem('awake-zombie-prototype-save-v1')===null)localStorage.setItem('awake-zombie-prototype-save-v1',raw);},raw??JSON.stringify(E.create(0)));
    await page.goto(file?require('node:url').pathToFileURL(path.join(root,'index.html')).href:`http://127.0.0.1:${server.address().port}/`);
    const detail=await fn(page);assert.deepEqual(errors,[]);results.push({name,passed:true,detail});console.log('PASS',name);
  }catch(error){results.push({name,passed:false,error:error.message,errors});console.error('FAIL',name,error.message);process.exitCode=1;}finally{await context.close();}
}
async function resolve(page){for(let i=0;i<8;i++){const pending=await page.evaluate(()=>window.__zombie.snapshot().pending);if(!pending)return;await page.locator('#event-choices button:not([disabled])').first().click();}}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 await test('intro and one-day action UI',async page=>{
   assert(await page.locator('#event-dialog').evaluate(e=>e.open));await resolve(page);assert.equal((await page.evaluate(()=>__zombie.snapshot())).day,1);
   await page.locator('[data-action="remember"]').click();await resolve(page);const s=await page.evaluate(()=>__zombie.snapshot());assert.equal(s.day,2);assert.equal(s.completedDays,1);
   assert(await page.locator('#world-canvas').evaluate(c=>c.getContext('2d').getImageData(65,90,1,1).data[3]>0));
 });
 await test('pending event reload is atomic',async page=>{
   await resolve(page);await page.locator('[data-action="remember"]').click();const before=await page.evaluate(()=>__zombie.snapshot());assert(before.pending.turn);
   await page.reload();const restored=await page.evaluate(()=>__zombie.snapshot());assert.deepEqual(restored,before);await resolve(page);const after=await page.evaluate(()=>__zombie.snapshot());assert.equal(after.day,2);assert.equal(after.stats.hunger,42);
 });
 await test('travel costs a day and location actions follow the body',async page=>{
   await resolve(page);await page.locator('[data-place="streets"]').click();await resolve(page);const s=await page.evaluate(()=>__zombie.snapshot());assert.equal(s.place,'streets');assert.equal(s.day,2);assert.equal(await page.locator('[data-action="research"]').count(),0);assert(await page.locator('[data-action="corpse"]').isEnabled());assert(await page.locator('[data-place="hospital"]').isEnabled());
 });
 await test('prey encounter waits for consent and permits retreat',async page=>{
   await resolve(page);await page.locator('[data-place="streets"]').click();await resolve(page);
   const before=await page.evaluate(()=>__zombie.snapshot());await page.locator('[data-action="hunt"]').click();
   const pending=await page.evaluate(()=>__zombie.snapshot());assert.equal(pending.pending.eventId,'prey');assert.equal(pending.stats.hunger,before.stats.hunger);assert.equal(pending.memory.killed,0);
   await page.reload();assert.equal((await page.evaluate(()=>__zombie.snapshot())).pending.eventId,'prey');
   await page.locator('[data-choice="2"]').click();const after=await page.evaluate(()=>__zombie.snapshot());assert.equal(after.stats.hunger,before.stats.hunger+8);assert.equal(after.memory.killed,0);
 });
 await test('hunger pressure is explained and enduring remains available',async page=>{
   assert((await page.locator('#body-note').textContent()).includes('สติเสียเพิ่ม 6'));
   assert(await page.locator('[data-action="endure"]').isEnabled());await page.locator('[data-action="endure"]').click();
   const s=await page.evaluate(()=>__zombie.snapshot());assert.equal(s.stats.hunger,98);assert.equal(s.memory.killed,0);assert.equal(s.memory.endured,1);
 },{raw:JSON.stringify((()=>{const s=E.create(0);E.choose(s,0);s.stats.hunger=90;return s;})())});
 await test('secondary actions and numbers stay accessible on demand',async page=>{
   await resolve(page);assert(!(await page.locator('[data-action="medicate"]').isVisible()));
   await page.locator('.other-actions summary').click();assert(await page.locator('[data-action="medicate"]').isVisible());
   assert(!(await page.locator('#secondary-stats').isVisible()));await page.locator('.evolution-panel summary').click();assert(await page.locator('#secondary-stats').isVisible());
 });
 await test('import displays untrusted journal as text',async page=>{
   await resolve(page);const s=E.create(1);E.choose(s,0);s.log[0].text='<img src=x onerror="window.__probe=42">';
   await page.locator('#import-file').setInputFiles({name:'save.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});
   await page.waitForFunction(()=>document.querySelector('#journal').textContent.includes('<img'));
   assert.equal(await page.locator('#journal img').count(),0);assert.equal(await page.evaluate(()=>window.__probe||0),0);
 });
 await test('corrupt save is backed up without touching sect storage',async page=>{
   assert.equal(await page.evaluate(()=>localStorage.getItem('awake-zombie-prototype-save-v1-recovery')),'broken-json');assert((await page.evaluate(()=>__zombie.snapshot())).pending);assert.equal(await page.evaluate(()=>localStorage.getItem('one-life-sect-save-v1')),null);
 },{raw:'broken-json'});
 const win=run('human').state;
 await test('earned ending survives reload and collection is idempotent',async page=>{
   assert(await page.locator('#ending-dialog').evaluate(e=>e.open));assert((await page.locator('#ending-title').textContent()).includes('หัวใจ'));assert.equal(await page.locator('.collection-item.unlocked').count(),1);await page.reload();assert.equal(await page.locator('.collection-item.unlocked').count(),1);await page.locator('#ending-close').click();assert(await page.locator('.action-card').first().isDisabled());
 },{raw:JSON.stringify(win)});
 for(const width of [320,390])await test(`mobile ${width}px`,async page=>{
   await resolve(page);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(root,`outputs/mobile-${width}.png`),fullPage:true,animations:'disabled'});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);assert(await page.locator('[data-action="remember"]').isVisible());
 },{width});
 await test('standalone file URL is playable',async page=>{await resolve(page);await page.locator('[data-action="remember"]').click();await resolve(page);assert.equal((await page.evaluate(()=>__zombie.snapshot())).day,2);},{file:true});
 await test('desktop pixel scene',async page=>{await resolve(page);await page.screenshot({path:path.join(root,'outputs/desktop.png'),fullPage:true,animations:'disabled'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),1280);});
 fs.writeFileSync(path.join(root,'outputs/browser-results.json'),JSON.stringify(results,null,2));console.log(`${results.filter(r=>r.passed).length}/${results.length} browser checks passed`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();});
