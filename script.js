/* -------------------------
  Utilities & small data
----------------------------*/
const flavors = [
  {id:'floral',label:'Floral',seed:['floral','jasmine','tea']},
  {id:'choc',label:'Chocolate',seed:['choco','chocolate','brown sugar']},
  {id:'fruity',label:'Fruity',seed:['fruit','berry','citrus']},
  {id:'earthy',label:'Earthy',seed:['earth','herbal','tobacco']}
];
const sampleProducts = [
  {id:'p1',name:'Mamba Peak — Bright',flavors:['floral'],notes:'Pour-over • 92°C • 1:16',price:13,daysSupply:10},
  {id:'p2',name:'Andes Dark — Comfort',flavors:['choc'],notes:'Espresso/Aeropress • fine grind',price:12,daysSupply:18},
  {id:'p3',name:'Sumatra — Deep',flavors:['earthy'],notes:'French press • coarse',price:12,daysSupply:20},
  {id:'p4',name:'Nitro Cold — Chill',flavors:['fruity'],notes:'Cold brew nitro • 18hr steep',price:14,daysSupply:25}
];

/* -------------------------
  Beans animation (immersive)
----------------------------*/
const beansLayer = document.getElementById('beansLayer');
// create 8 beans at random positions
// for(let i=0;i<8;i++){
//   const b = document.createElement('div');
//   b.className = 'bean';
//   b.style.left = `${10 + Math.random()*80}%`;
//   b.style.top = `${5 + Math.random()*75}%`;
//   b.style.transform = `rotate(${Math.random()*40-20}deg) scale(${0.8+Math.random()*0.6})`;
//   beansLayer.appendChild(b);
// }
// parallax on mouse
document.addEventListener('mousemove', e=>{
  const ww = window.innerWidth, wh = window.innerHeight;
  const cx = (e.clientX/ww - 0.5)*2, cy = (e.clientY/wh - 0.5)*2;
  document.querySelectorAll('.bean').forEach((b, idx)=>{
    const depth = 6 + (idx%4);
    b.style.transform = `translate(${cx*depth}px, ${cy*depth}px) rotate(${(idx*12)%360}deg)`;
  });
});

/* -------------------------
  Greeting & name storage
----------------------------*/
const greeting = document.getElementById('greeting');
function updateGreeting(){
  const now = new Date();
  const hr = now.getHours();
  let part = 'Hello';
  if(hr<12) part='Good morning';
  else if(hr<18) part='Good afternoon';
  else part='Good evening';
  const name = localStorage.getItem('ai_coffee_name') || '';
  greeting.textContent = name ? `${part}, ${name}. Discover a cup for your moment.` : `${part} — discover a cup for your moment.`;
}
updateGreeting();
document.getElementById('nameBtn').addEventListener('click', ()=>{
  const n = prompt('What should I call you?', localStorage.getItem('ai_coffee_name')||'');
  if(n!==null){ localStorage.setItem('ai_coffee_name', n.trim()); updateGreeting(); }
});

/* -------------------------
  Flavor wheel interactivity
----------------------------*/
const wheel = document.getElementById('wheel');
const wheelCenter = document.getElementById('wheelCenter');
function pickFlavorByAngle(angle){
  // angle in radians; map to 4 sectors
  const deg = (angle*180/Math.PI + 360) % 360;
  const sector = Math.floor(deg / 90);
  return flavors[sector].id;
}
wheel.addEventListener('click', (e)=>{
  // compute angle from center
  const rect = wheel.getBoundingClientRect();
  const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
  const dx = e.clientX - cx, dy = e.clientY - cy;
  const angle = Math.atan2(dy, dx);
  const picked = pickFlavorByAngle(angle);
  wheelCenter.textContent = flavors.find(f=>f.id===picked).label;
  announceAI(`Flavor focus set to ${flavors.find(f=>f.id===picked).label}`);
});

/* -------------------------
  Assistant: conversation and voice mood detection
----------------------------*/
const messages = document.getElementById('messages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');

function appendMessage(text, who='ai'){
  const d = document.createElement('div');
  d.className = 'msg '+(who==='user'?'user':'ai');
  d.textContent = text;
  messages.appendChild(d);
  messages.scrollTop = messages.scrollHeight;
}
function announceAI(text){ appendMessage(text,'ai'); }

sendBtn.addEventListener('click', ()=>{ const t=chatInput.value.trim(); if(!t) return; appendMessage(t,'user'); handleQuery(t); chatInput.value=''; });
chatInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ sendBtn.click(); }});

// simple LLM-sim stub (replaceable)
function handleQuery(text){
  const t = text.toLowerCase();
  // mood detection keywords
  if(/tired|sleepy|exhausted|fatig/i.test(t)){ recommendFor('focus'); return; }
  if(/happy|relax|calm|chill/i.test(t)){ recommendFor('relax'); return; }
  if(/strong|wake|boost|energy/i.test(t)){ recommendFor('energetic'); return; }
  if(/cold|iced|chill/i.test(t)){ suggestProduct('p4'); return; }
  // ask for recipe
  if(/recipe|how|brew/i.test(t)){ const prod = lastOrdered() || sampleProducts[0]; appendMessage(`Brew recipe for ${prod.name}: ${prod.notes}`,'ai'); return; }
  // otherwise generic suggestion
  appendMessage(aiRespond(t),'ai');
}

// lightweight AI respond logic
function aiRespond(text){
  // check flavor wheel center for bias
  const focus = wheelCenter.textContent.toLowerCase();
  if(/smooth|mellow|relax/i.test(text)) return 'I suggest a mellow medium roast — try a latte or flat white for smooth texture.';
  if(/bold|strong|wake/i.test(text)) return 'Try a double espresso or a darker roast — Andes Dark will suit you.';
  if(focus.includes('floral') && /prefer|like|taste/i.test(text)) return 'With a floral focus, Mamba Peak pour-over highlights jasmine & citrus.';
  return 'A classic cappuccino is a safe balanced pick — want me to order and save this choice?';
}

/* Voice-based mood detection (Web Speech API) */
let recognition;
if(window.SpeechRecognition || window.webkitSpeechRecognition){
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.onresult = (ev)=>{
    const transcript = ev.results[0][0].transcript;
    appendMessage(transcript,'user');
    // simple keyword-based mood classification
    if(/tired|sleepy|exhausted|fatig/i.test(transcript)) recommendFor('focus');
    else if(/relax|calm|chill|chilled|rest/i.test(transcript)) recommendFor('relax');
    else if(/strong|pump|energy|awake/i.test(transcript)) recommendFor('energetic');
    else handleQuery(transcript);
  };
  recognition.onend = ()=>{ micBtn.textContent='🎙️'; micBtn.style.background=''; micBtn.dataset.listening='0'; }
  recognition.onerror = ()=>{ appendMessage('Voice capture error — try again or type.','ai'); micBtn.textContent='🎙️'; micBtn.dataset.listening='0'; }
} else {
  micBtn.title = 'Voice not supported';
}
micBtn.addEventListener('click', ()=>{
  if(!recognition) return alert('Voice not supported in this browser.');
  if(micBtn.dataset.listening==='1'){ recognition.stop(); micBtn.dataset.listening='0'; micBtn.textContent='🎙️'; micBtn.style.background=''; }
  else { recognition.start(); micBtn.dataset.listening='1'; micBtn.textContent='●'; micBtn.style.background='radial-gradient(circle, var(--accent), var(--accent2))'; }
});

/* -------------------------
  Recommendation, order saving & predictive refill
----------------------------*/
function recommendFor(intent){
  let pick;
  if(intent==='focus') pick = sampleProducts[0];
  else if(intent==='relax') pick = sampleProducts[2];
  else if(intent==='energetic') pick = sampleProducts[1];
  else pick = sampleProducts[0];
  appendMessage(`I recommend: ${pick.name} — ${pick.notes} (Price $${pick.price})`,'ai');
  // show quick order suggestion
  appendMessage(`Type "order ${pick.id}" to place it or click the button below.`, 'ai');
  // quick order button (in-line approach is simulated by instructing)
}
// handle typed order command
function handleOrderCommand(arg){
  const id = arg.trim();
  const p = sampleProducts.find(x=>x.id===id);
  if(!p){ appendMessage('Product not found.','ai'); return; }
  placeOrder(p);
}
function placeOrder(product){
  // store simple order history with timestamp and estimated days supply
  const orders = JSON.parse(localStorage.getItem('ai_coffee_orders')||'[]');
  const entry = {id:product.id,name:product.name,ts:Date.now(),daysSupply:product.daysSupply};
  orders.push(entry);
  localStorage.setItem('ai_coffee_orders', JSON.stringify(orders));
  appendMessage(`Order placed: ${product.name} — saved locally. We'll remind you before running out.`, 'ai');
  updateRefillHint();
}
function lastOrdered(){
  const orders = JSON.parse(localStorage.getItem('ai_coffee_orders')||'[]');
  return orders.length ? sampleProducts.find(p=>p.id===orders[orders.length-1].id) : null;
}
function updateRefillHint(){
  const orders = JSON.parse(localStorage.getItem('ai_coffee_orders')||'[]');
  const hintEl = document.getElementById('refillHint');
  if(!orders.length){ hintEl.textContent = 'No orders yet — make your first order to enable refill predictions.'; return; }
  // naive heuristic: use last order date + daysSupply to estimate days left
  const last = orders[orders.length-1];
  const product = sampleProducts.find(p=>p.id===last.id);
  const daysElapsed = Math.floor((Date.now() - last.ts)/(1000*60*60*24));
  const daysLeft = product.daysSupply - daysElapsed;
  if(daysLeft <= 4) hintEl.textContent = `Running low on ${product.name}. Estimated ${daysLeft} day(s) left — consider refill.`;
  else hintEl.textContent = `${product.name} — approx ${daysLeft} day(s) supply left.`;
}
updateRefillHint();

/* watch for typed 'order p1' commands in chatInput */
function extractOrderCommand(text){
  const m = text.match(/order\s+([a-z0-9_-]+)/i);
  if(m) return m[1];
  return null;
}

/* enhance handleQuery to detect order text */
const originalHandleQuery = handleQuery;
handleQuery = function(text){
  const orderId = extractOrderCommand(text);
  if(orderId){ handleOrderCommand(orderId); return; }
  originalHandleQuery(text);
}

/* quick buttons */
document.getElementById('suggestBtn').addEventListener('click', ()=>{ recommendFor('focus'); });
document.getElementById('recipeBtn').addEventListener('click', ()=>{ const prod = lastOrdered()||sampleProducts[0]; appendMessage(`Recipe: ${prod.notes}`,'ai'); });

/* -------------------------
  Ambient sound (WebAudio) — subtle hum
----------------------------*/
let audioOn = false, audioCtx, osc, gain;
document.getElementById('soundToggle').addEventListener('click', ()=>{
  if(!audioOn){
    audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    osc = audioCtx.createOscillator();
    gain = audioCtx.createGain();
    osc.type = 'sine'; osc.frequency.value = 120; // low hum
    gain.gain.value = 0.0025;
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start();
    audioOn = true;
    document.getElementById('soundToggle').textContent = 'Ambient: on';
  } else {
    osc.stop(); audioCtx.close();
    audioOn = false;
    document.getElementById('soundToggle').textContent = 'Ambient: off';
  }
});

/* -------------------------
  AR Preview: camera feed + virtual cup overlay
----------------------------*/
const arModal = document.getElementById('arModal');
const camView = document.getElementById('camView');
let stream;
document.getElementById('arBtn').addEventListener('click', async ()=>{
  arModal.style.display = 'flex';
  arModal.setAttribute('aria-hidden','false');
  try{
    stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}, audio:false});
    const v = document.createElement('video');
    v.autoplay = true; v.playsInline = true; v.muted = true;
    v.srcObject = stream;
    v.style.width='100%'; v.style.height='100%'; v.style.objectFit='cover';
    // clear old children
    camView.querySelectorAll('video').forEach(n=>n.remove());
    camView.insertBefore(v, camView.firstChild);
  }catch(err){
    console.warn('Camera error',err); appendMessage('Camera access denied or unavailable.','ai');
  }
});
document.getElementById('closeAr').addEventListener('click', ()=>{
  arModal.style.display='none'; arModal.setAttribute('aria-hidden','true');
  if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; camView.querySelectorAll('video').forEach(n=>n.remove()); }
});
document.getElementById('capture').addEventListener('click', ()=>{
  // capture single frame from video and download (simple stub)
  const v = camView.querySelector('video');
  if(!v) return alert('Camera not active');
  const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
  const ctx = c.getContext('2d'); ctx.drawImage(v,0,0,c.width,c.height);
  // overlay virtual cup area (rudimentary)
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.ellipse(c.width/2, c.height*0.75, 160, 100, 0, 0, Math.PI*2); ctx.fill();
  const link = document.createElement('a'); link.href = c.toDataURL('image/png'); link.download = 'coffee-preview.png'; link.click();
});

/* -------------------------
  Initialize small welcome
----------------------------*/
setTimeout(()=>{ announceAI('Welcome — try voice or type your mood (e.g., "I want something smooth but strong").'); },300);