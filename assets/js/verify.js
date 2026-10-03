let EP=null, POST=null, SHORTS=[];

async function init(){
  const params = new URLSearchParams(location.search);
  const postId = params.get('id');
  const epId = params.get('ep');
  const isDone = params.get('done') === '1'; 
  const $ = id=>document.getElementById(id);

  if(!postId||!epId){
    $('msg').innerHTML='Invalid link. <a href="index.html">Go Home</a>';
    return;
  }

  // Security: Changed from SessionStorage to LocalStorage 
  if(!isDone) {
      const pending=localStorage.getItem('pending_ep');
      const ptime=parseInt(localStorage.getItem('pending_time')||'0');
      const ref=document.referrer||'';
      const allowedRef = ref.includes(location.hostname) || (pending===epId && (Date.now()-ptime)<15*60*1000);

      if(!allowedRef){
        $('msg').innerHTML='тЪая╕П Direct link blocked. <br>Please open from our website.<br><a class="pill" href="index.html">Go Home</a>';
        return;
      }
  }

  let data;
  try{
    const r=await fetch('/api/data?'+Date.now(),{cache:'no-store'});
    data=await r.json();
  }catch(e){
    $('msg').textContent='Failed to load DB.'; return;
  }

  const post=(data.posts||[]).find(p=>p.id===postId);
  const ep=post ? (post.eps||[]).find(e=>e.id===epId) : null;
  
  if(!ep){ $('msg').textContent='Episode not found'; return; }
  POST=post; EP=ep; SHORTS=ep.short||[];

  if (isDone) {
      // Return checking via LocalStorage
      if(localStorage.getItem('human_verified') !== '1') {
          $('msg').innerHTML = '<span style="color:#ef4444">тЪая╕П Verification Bypass Detected!</span><br>Please do not skip ads.<br><a href="index.html">Go Home</a>';
          return;
      }
      $('title').textContent = `Download: ${post.name}`;
      $('msg').innerHTML = '<span style="color:#22c55e">тЬЕ Shortener Solved!</span>';
      showRealLink();
  } else {
      $('title').textContent=`Verify: ${post.name} S${ep.s} E${ep.n}`;
      $('msg').textContent='Bot check required to generate link.';
      $('human').style.display='block';
      setupHold();
  }
}

function setupHold(){
  const btn=document.getElementById('holdBtn'), prog=document.getElementById('prog'), txt=document.getElementById('htxt');
  let holdTimer=null, progress=0, holding=false;

  function start(e){
    e.preventDefault(); if(holding) return; holding=true; progress=0;
    holdTimer=setInterval(()=>{
      progress+=2;
      if(progress>=100){ progress=100; clearInterval(holdTimer); success(); }
      prog.style.width=progress+'%'; txt.textContent=`Verifying ${Math.floor(progress/33.3)}/3s...`;
    },60);
  }
  function end(){
    if(!holding) return; holding=false; clearInterval(holdTimer);
    if(progress<100){ progress=0; prog.style.width='0%'; txt.textContent='Hold 3s to Verify'; }
  }
  btn.addEventListener('mousedown', start); btn.addEventListener('mouseup', end); btn.addEventListener('mouseleave', end);
  btn.addEventListener('touchstart', start,{passive:false}); btn.addEventListener('touchend', end);
}

async function success(){
  const $=id=>document.getElementById(id);
  $('human').style.display='none';
  const after=$('after');
  after.style.display='block';

  // SET to LocalStorage so shortener new tabs won't break it
  localStorage.setItem('human_verified','1'); 

  if(SHORTS.length){
    const rot=parseInt(localStorage.getItem('rot')||'0');
    localStorage.setItem('rot',(rot+1).toString());
    const shortUrl=SHORTS[rot % SHORTS.length];

    after.innerHTML=`
      <h3 style="color:#ff8c00">Link Generated!</h3>
      <p class="mu">Ad solve karne ke baad yahi page aayega aur Original link milega.</p>
      <button class="pill" style="background:#ff8c00;color:#111;width:100%;margin-top:15px;padding:14px;font-size:16px;font-weight:900" onclick="window.location.href='${shortUrl}'">Go to Download Link</button>
    `;
  }else{
    after.innerHTML='<p class="mu">No short links configured by admin.</p>';
  }
}

async function showRealLink() {
    const after = document.getElementById('after');
    after.style.display = 'block';
    try {
      const vk = await getGlobalVk();
      const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
      const real = await decV(EP.pd, vk);
      
      if(real && /^https?:\/\//i.test(real)){
        after.innerHTML = `
          <div style="margin-top:10px;padding:20px;border:1px dashed #22c55e;border-radius:12px;background:#1a1d26">
            <h3 style="color:#22c55e;margin:0 0 10px">ЁЯОЙ File Unlocked!</h3>
            <p class="mu" style="margin-bottom:15px">Aapka direct download link ready hai:</p>
            <a href="${esc(real)}" target="_blank" class="pill" style="display:inline-block;background:#22c55e;color:#111;padding:12px 20px;font-size:15px;font-weight:900;width:100%;text-align:center;">Click Here To Download</a>
          </div>
        `;
        localStorage.removeItem('human_verified');
        localStorage.removeItem('pending_ep');
      } else {
        after.innerHTML = '<p style="color:#ef4444">Decryption failed. Please contact admin.</p>';
      }
    } catch(e) { console.log(e); }
}

async function getGlobalVk(){
  const s='Hindi Subbed Anime_VK_BULLETPROOF_2024';
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function decV(b,p){
  return (async()=>{
    try{
      const a=Uint8Array.from(atob(b),c=>c.charCodeAt(0)), e=new TextEncoder();
      const k=await crypto.subtle.deriveKey({name:'PBKDF2',salt:a.slice(0,16),iterations:100000,hash:'SHA-256'},await crypto.subtle.importKey('raw',e.encode(p),'PBKDF2',false,['deriveKey']),{name:'AES-GCM',length:256},false,['decrypt']);
      return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:a.slice(16,28)},k,a.slice(28)));
    }catch(e){ return null; }
  })();
}

init();
