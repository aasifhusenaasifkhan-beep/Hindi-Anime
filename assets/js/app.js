// Hindi Subbed Anime - Core JS - Cloudflare Edition
const $ = id => document.getElementById(id);
const esc = s => String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const kk = s => String(s||'').trim().toLowerCase();

const gens = p => {
  let raw = (p.gen||[]).join(',');
  raw = raw.replace(/#/g, ',');
  if(!raw.includes(',') && raw.includes(' ')) raw = raw.replace(/\s+/g, ',');
  return raw.split(/[,.;\/|]+/).map(s=>s.trim()).filter(Boolean);
};

const isUrl = u => /^https?:\/\//i.test(u);
const H = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('');

async function enc(t,p){
  const e=new TextEncoder();
  const s=crypto.getRandomValues(new Uint8Array(16));
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const k=await crypto.subtle.deriveKey({name:'PBKDF2',salt:s,iterations:100000,hash:'SHA-256'},await crypto.subtle.importKey('raw',e.encode(p),'PBKDF2',false,['deriveKey']),{name:'AES-GCM',length:256},false,['encrypt']);
  const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},k,e.encode(t)));
  const all=new Uint8Array(s.length+iv.length+ct.length);
  all.set(s,0); all.set(iv,s.length); all.set(ct,s.length+iv.length);
  return btoa(String.fromCharCode(...all));
}
async function dec(b,p){
  try{
    const a=Uint8Array.from(atob(b),c=>c.charCodeAt(0)), e=new TextEncoder();
    const k=await crypto.subtle.deriveKey({name:'PBKDF2',salt:a.slice(0,16),iterations:100000,hash:'SHA-256'},await crypto.subtle.importKey('raw',e.encode(p),'PBKDF2',false,['deriveKey']),{name:'AES-GCM',length:256},false,['decrypt']);
    return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:a.slice(16,28)},k,a.slice(28)));
  }catch(e){ return null; }
}

function inj(h,el){
  if(!h) return;
  const t=document.createElement('template'); t.innerHTML=h;
  t.content.querySelectorAll('script').forEach(s=>{
    const n=document.createElement('script'); [...s.attributes].forEach(a=>n.setAttribute(a.name,a.value)); n.text=s.text; s.replaceWith(n);
  });
  el.append(t.content);
}

// TELEGRAM PROXY FIX (Bug fixed)
function cdnImg(u){
  if(!u) return 'https://placehold.co/600x338/0d121c/00ff66?text=No+Image';
  if(u.includes('t.me') || u.includes('telegra.ph')) return `/api/proxy?url=${encodeURIComponent(u)}`;
  return u;
}

let CFG={};
async function load(){
  try{
    // GitHub data.json ki jagah ab humara Cloudflare DB call hoga
    const r=await fetch('/api/data?t='+Date.now(), {cache:'no-store'});
    if(!r.ok) throw new Error('Database loading failed');
    const d=await r.json();
    CFG=d.cfg||{};
    if(CFG.head) inj(CFG.head, document.head);
    if(CFG.body) inj(CFG.body, document.body);
    const ban=$('ban'); if(ban && CFG.ban) inj(CFG.ban, ban);
    const now=Date.now();
    if(d.posts) d.posts=d.posts.filter(p=>!p.expiry || p.expiry>now);
    return d;
  }catch(e){
    console.error(e);
    return {posts:[],vip:[],cfg:{}};
  }
}

function setPending(epId){
  localStorage.setItem('pending_ep', epId);
  localStorage.setItem('pending_time', Date.now().toString());
}
function isHumanVerified(){
  return localStorage.getItem('human_verified')==='1';
                           }
