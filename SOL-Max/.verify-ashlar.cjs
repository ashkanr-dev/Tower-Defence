const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { chromium } = require('D:/Code/calmnix/node_modules/playwright');
const exe = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const temp = os.tmpdir();
const source = path.resolve('Ashlar-Bastion.html');
const content = fs.readFileSync(source, 'utf8');
const debug = path.join(temp, 'ashlar-diagnostics.html');
fs.writeFileSync(debug, content.replace('  resize();\n  reset();', `
  window.__ashlar = {
    state: () => ({ wave, gold, health, defeated, time, ending, towers: towers.length, upgraded: towers.filter(t=>t.level>1).length,
      active: enemies.length, liveKinds: [...new Set(enemies.map(e=>e.kind))], shotIndex, renderer: {...renderer.info.render} }),
    fast: (seconds) => {
      const waves = [];
      let lastWave = wave;
      for (let i=0; i<seconds*60 && !ending; i++) {
        worldTime+=fixedStep;
        advance(fixedStep);
        if (wave!==lastWave) { waves.push([wave,health,gold,towers.length,defeated,towers.filter(t=>t.level>1).length]); lastWave=wave; }
      }
      return { ...window.__ashlar.state(), waves };
    },
    pendingReset: () => { ending=3.27; },
    forceLeak: () => { health=4; addEnemy('scout',roadLength-0.0001); },
    shots: () => ({ projectiles: shots.map(s=>s.type), lightning: beams.length }),
    disableAnimation: () => { window.requestAnimationFrame = () => 0; },
    frameAt: (seconds) => { renderFrame(last+1000*seconds); },
    seek: (seconds) => {
      for(let i=0;i<seconds*60;i++) { worldTime+=fixedStep; advance(fixedStep); animateWorld(fixedStep); moveCamera(fixedStep); }
      draw(0);
    },
  };
  resize();
  reset();`));

async function main() {
  const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  try {
    const display=await browser.newContext({viewport:{width:1440,height:900}, offline:true});
    const page=await display.newPage();
    const errors=[];
    const requests=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
    page.on('request',request=>requests.push(request.url()));
    await page.goto(pathToFileURL(source).href);
    await page.locator('canvas').waitFor();
    await page.screenshot({path:'.ashlar-overview.png',timeout:45000});
    const audit = () => ({hud:[...document.querySelectorAll('dd')].map(el=>el.textContent),w:document.querySelector('canvas').width,h:document.querySelector('canvas').height,error:document.querySelector('#error').hidden,controls:document.querySelectorAll('button, input, a, select').length});
    console.log('offline launch',await page.evaluate(audit),errors, requests.filter(url=>!url.startsWith('file:')));
    await page.setViewportSize({width:880,height:880});
    await page.waitForFunction(()=>document.querySelector('canvas').width===880);
    await page.screenshot({path:'.ashlar-square.png',timeout:45000});
    console.log('square',await page.evaluate(audit));
    await page.setViewportSize({width:1720,height:720});
    await page.waitForFunction(()=>document.querySelector('canvas').width===1720);
    await page.screenshot({path:'.ashlar-wide.png',timeout:45000});
    console.log('ultrawide',await page.evaluate(audit));
    await page.close();
    const variant=await display.newPage();
    variant.on('pageerror',error=>errors.push(error.message));
    variant.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
    await variant.goto(pathToFileURL(debug).href);
    await variant.waitForFunction(()=>!!window.__ashlar);
    console.log('opening states',await variant.evaluate(()=>{__ashlar.disableAnimation();return [__ashlar.state(),__ashlar.shots()];}));
    await variant.evaluate(()=>__ashlar.seek(8.2));
    await variant.screenshot({path:'.ashlar-close.png',timeout:45000});
    console.log('natural outcome',await variant.evaluate(()=>__ashlar.fast(400)));
    console.log('restart',await variant.evaluate(()=>{ __ashlar.pendingReset(); __ashlar.frameAt(0.04); return __ashlar.state(); }));
    console.log('defeat',await variant.evaluate(()=>{ __ashlar.forceLeak(); __ashlar.frameAt(0.04); return __ashlar.state(); }));
    console.log('restart after defeat',await variant.evaluate(()=>{ __ashlar.pendingReset(); __ashlar.frameAt(0.04); return __ashlar.state(); }));
    console.log('second outcome',await variant.evaluate(()=>__ashlar.fast(400)));
    console.log('dusk',await variant.evaluate(()=>{__ashlar.pendingReset();__ashlar.frameAt(0.04);__ashlar.seek(9.4);return document.querySelector('#sky').style.background;}));
    console.log('browser errors',errors);
    if (errors.length) throw Error(errors.join('\n'));
  } finally { await browser.close(); }
}

main().catch(error=>{ console.error(error); process.exitCode=1; });
