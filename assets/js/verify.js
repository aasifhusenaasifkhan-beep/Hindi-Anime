// Verify page: Hold -> /api/go (har click par NAYA shortener) -> wapas token ke saath -> /api/unlock
let EP=null, POST=null;
const vg=id=>document.getElementById(id);
const vesc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

async function init(){
  const params=new URLSearchParams(location.search);
  const postId=params.get('id'), epId=params.get('ep'), token=params.get('t');

  if(!postId||!epId){ vg('msg').innerHTML='Invalid link. <a href="index.html">Go Home</a>'; return; }

  if(!token){
    const pending=localStorage.getItem('pending_ep');
    const ptime=parseInt(localStorage.getItem('pending_time')||'0');
    const ref=document.referrer||'';
    const allowedRef=ref.includes(location.hostname) || (pending===epId && (Date.now()-ptime)<15*60*1000);
    if(!allowedRef){
      vg('msg').innerHTML='⚠️ Direct link blocked. <br>Please open from our website.<br><a class="pill" href="index.html">Go Home</a>';
      return;
    }
  }

  let data;
  try{
    const r=await fetch('/api/data?'+Date.now(),{cache:'no-store'});
    data=await r.json();
  }catch(e){ vg('msg').textContent='Failed to load DB.'; return; }

  const post=(data.posts||[]).find(p=>p.id===postId);
  const ep=post ? (post.eps||[]).find(e=>e.id===epId) : null;
  if(!ep){ vg('msg').textContent='Episode not found'; return; }
  POST=post; EP=ep;

  if(token){
    vg('title').textContent=`Download: ${post.name}`;
    vg('msg').textContent='Link unlock ho raha hai...';
    return unlock(token);
  }
  vg('title').textContent=`Verify: ${post.name} S${ep.s} E${ep.n}`;
  vg('msg').textContent='Bot check required to generate link.';
  vg('human').style.display='block';
  setupHold();
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
  vg('human').style.display='none';
  const after=vg('after');
  after.style.display='block';
  after.innerHTML='<p class="mu">Link generate ho raha hai...</p>';
  try{
    const r=await fetch(`/api/go?id=${encodeURIComponent(POST.id)}&ep=${encodeURIComponent(EP.id)}`,{cache:'no-store'});
    const j=await r.json().catch(()=>({}));
    if(!j.url){
      after.innerHTML=`<p style="color:#ef4444">${vesc(j.error||'Link generate nahi hua')}</p><button class="pill" id="retryBtn" style="margin-top:10px">Retry</button>`;
      vg('retryBtn').onclick=()=>location.reload();
      return;
    }
    after.innerHTML=`
      <h3 style="color:#ff8c00">Link Generated!</h3>
      <p class="mu">Ad solve karne ke baad yahi page aayega aur Original link milega.</p>
      <button class="pill" id="goBtn" style="background:#ff8c00;color:#111;width:100%;margin-top:15px;padding:14px;font-size:16px;font-weight:900">Go to Download Link</button>`;
    vg('goBtn').onclick=()=>{ window.location.href=j.url; };
  }catch(e){
    after.innerHTML='<p style="color:#ef4444">Network error, dobara try karo.</p><button class="pill" id="retryBtn" style="margin-top:10px">Retry</button>';
    vg('retryBtn').onclick=()=>location.reload();
  }
}

async function unlock(token,tries){
  tries=tries||0;
  const after=vg('after');
  after.style.display='block';
  try{
    const r=await fetch('/api/unlock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({t:token})});
    const j=await r.json().catch(()=>({}));
    if(r.status===425 && tries<3){
      const w=Math.max(1,parseInt(j.wait)||1);
      vg('msg').innerHTML='<span style="color:#ff8c00">⏳ Verify ho raha hai... '+w+' sec</span>';
      await new Promise(res=>setTimeout(res,(w+1)*1000));
      return unlock(token,tries+1);
    }
    if(j.url && /^https?:\/\//i.test(j.url)){
      vg('msg').innerHTML='<span style="color:#22c55e">✅ Shortener Solved!</span>';
      after.innerHTML=`
        <div style="margin-top:10px;padding:20px;border:1px dashed #22c55e;border-radius:12px;background:#1a1d26">
          <h3 style="color:#22c55e;margin:0 0 10px">🎉 File Unlocked!</h3>
          <p class="mu" style="margin-bottom:15px">Aapka direct download link ready hai:</p>
          <a href="${vesc(j.url)}" target="_blank" rel="noopener" class="pill" style="display:inline-block;background:#22c55e;color:#111;padding:12px 20px;font-size:15px;font-weight:900;width:100%;text-align:center;">Click Here To Download</a>
        </div>`;
      localStorage.removeItem('pending_ep');
      return;
    }
    const why = j.error==='expired' ? 'Ye link expire ho gaya. Dobara generate karo.' : j.error==='shared' ? 'Ye link usi network par chalta hai jahan generate hua tha. Dobara generate karo.' : (j.error==='invalid' ? 'Invalid ya galat link.' : (j.error||'Unlock fail ho gaya.'));
    vg('msg').innerHTML=`<span style="color:#ef4444">${vesc(why)}</span>`;
    after.innerHTML='<button class="pill" id="retryBtn" style="margin-top:10px">Dobara Try Karo</button>';
    vg('retryBtn').onclick=()=>{ if(typeof setPending==='function') setPending(EP.id); location.href=`verify.html?id=${encodeURIComponent(POST.id)}&ep=${encodeURIComponent(EP.id)}`; };
  }catch(e){
    vg('msg').innerHTML='<span style="color:#ef4444">Network error. Page reload karo.</span>';
  }
}

init();
