import { chromium } from '@playwright/test'
const BASE='http://localhost:3100'
const browser = await chromium.launch({ executablePath: process.env.RVN_CHROMIUM })
const errors=[]
function track(page,tag){
  page.on('console',m=>{ if(m.type()==='error' && !/websocket|WebSocket/i.test(m.text())) errors.push(tag+': '+m.text().slice(0,200)) })
  page.on('pageerror',e=>errors.push(tag+' pageerror: '+String(e).slice(0,200)))
}
const session={access_token:'m.m.m',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'r',user:{id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated'}}
const val='base64-'+Buffer.from(JSON.stringify(session)).toString('base64url')

// 1) login flow: submit → redirect to /digital
{
  const ctx=await browser.newContext({viewport:{width:844,height:390},locale:'lt-LT'})
  const page=await ctx.newPage(); track(page,'login')
  await page.goto(BASE+'/digital/login',{waitUntil:'networkidle'})
  await page.fill('#rvn-email','vejobrolis@example.com')
  await page.fill('#rvn-pw','slaptazodis1')
  await page.click('button[type=submit]')
  await page.waitForTimeout(2500)
  console.log('after login url:', page.url())
  await ctx.close()
}
// 2) authed: nav + legacy routes + collection interactions + overflow check
{
  const ctx=await browser.newContext({viewport:{width:844,height:390},locale:'lt-LT'})
  await ctx.addCookies([{name:'sb-localhost-auth-token',value:val,url:BASE}])
  const page=await ctx.newPage(); track(page,'app')
  for (const r of ['/digital','/digital/collection','/digital/decks','/digital/more','/digital/ranked','/digital/pve','/digital/pvp','/digital/campaign','/digital/friends']) {
    await page.goto(BASE+r,{waitUntil:'domcontentloaded'})
    await page.waitForTimeout(1600)
    const overflow = await page.evaluate(()=>document.documentElement.scrollWidth - document.documentElement.clientWidth)
    console.log(r, 'ok', 'hOverflow:', overflow)
  }
  // collection interactions
  await page.goto(BASE+'/digital/collection',{waitUntil:'networkidle'}); await page.waitForTimeout(1800)
  await page.click('[data-testid="owned-toggle"]'); await page.waitForTimeout(300)
  await page.click('[data-testid="sort-cycle"]'); await page.waitForTimeout(300)
  await page.fill('input[aria-label]', 'Vilnė').catch(()=>{})
  await page.locator('[data-testid="card-browser"] button').first().click(); await page.waitForTimeout(600)
  const dialogVisible = await page.locator('[role=dialog]').count()
  await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  const dialogGone = await page.locator('[role=dialog]').count()
  console.log('modal open:',dialogVisible,'after esc:',dialogGone)
  // nav rail navigation
  await page.click('nav a[href="/digital"]'); await page.waitForTimeout(1200)
  console.log('nav to home url:', page.url())
  await ctx.close()
}
await browser.close()
console.log('CONSOLE ERRORS (non-ws):', JSON.stringify(errors.slice(0,10),null,1), 'count:',errors.length)
