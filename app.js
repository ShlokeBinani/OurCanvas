import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ⚠️ YOUR FIREBASE CONFIG HERE ⚠️
const firebaseConfig = {
  apiKey: "AIzaSyAaPDs3P_T96kygXhaGoN842oADXncjyLw",
  authDomain: "ourcanvas-faa6e.firebaseapp.com",
  databaseURL: "https://ourcanvas-faa6e-default-rtdb.firebaseio.com",
  projectId: "ourcanvas-faa6e",
  storageBucket: "ourcanvas-faa6e.firebasestorage.app",
  messagingSenderId: "432796795597",
  appId: "1:432796795597:web:092fa2d272f960ee845f84"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const sessionRef = ref(db, 'workspace');

// Setup Dual Canvases
const paintCanvas = document.getElementById('paintBoard');
const pCtx = paintCanvas.getContext('2d');
const fxCanvas = document.getElementById('fxBoard');
const fCtx = fxCanvas.getContext('2d');

// UI Elements
const chatBox = document.getElementById('chatBox');
const textInput = document.getElementById('textInput');
const sendTextBtn = document.getElementById('sendTextBtn');
const photoInput = document.getElementById('photoInput');
const clearBtn = document.getElementById('clearBtn');

// Secret Topic for Free Real-Time Notifications
const NTFY_TOPIC = "ourcanvas_shloke_ananta_privatespace";

let width, height;
let particles = [];
let hue = 0;

function resize() {
  width = paintCanvas.width = fxCanvas.width = window.innerWidth;
  height = paintCanvas.height = fxCanvas.height = window.innerHeight;
  pCtx.lineWidth = 5;
  pCtx.lineCap = 'round';
  pCtx.lineJoin = 'round';
}
window.addEventListener('resize', resize);
resize();

let isDrawing = false;
let lastX = 0, lastY = 0;

function getCoordinates(e) {
  if (e.touches && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

// Drawing Logic
paintCanvas.addEventListener('mousedown', (e) => { isDrawing = true; const c = getCoordinates(e); lastX = c.x; lastY = c.y; });
paintCanvas.addEventListener('touchstart', (e) => { isDrawing = true; const c = getCoordinates(e); lastX = c.x; lastY = c.y; }, {passive:false});

paintCanvas.addEventListener('mousemove', drawAction);
paintCanvas.addEventListener('touchmove', (e) => { e.preventDefault(); drawAction(e); }, {passive:false});

window.addEventListener('mouseup', () => isDrawing = false);
window.addEventListener('touchend', () => isDrawing = false);

function drawAction(e) {
  if (!isDrawing) return;
  const c = getCoordinates(e);
  
  push(sessionRef, {
    type: 'draw',
    x0: lastX, y0: lastY,
    x1: c.x, y1: c.y,
    color: `hsl(${hue}, 100%, 60%)`
  });
  
  lastX = c.x;
  lastY = c.y;
}

// Send Realtime Push Notification via ntfy.sh (100% Free)
function triggerNotification(messageText) {
  fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
    method: 'POST',
    body: messageText,
    headers: { 'Title': 'Our Canvas ✨' }
  }).catch(err => console.log("Notification delay: ", err));
}

// Send Text Message
sendTextBtn.addEventListener('click', sendTextMessage);
textInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendTextMessage(); });

function sendTextMessage() {
  const msg = textInput.value.trim();
  if(!msg) return;
  push(sessionRef, { type: 'text', text: msg });
  textInput.value = '';
  triggerNotification("Sent a new message! 💬");
}

// Photo Processing & Compression to keep it free
photoInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      // Compress picture dimensions to save database limits
      const maxW = 800;
      const scale = maxW / img.width;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = maxW;
      tempCanvas.height = img.height * scale;
      const tCtx = tempCanvas.getContext('2d');
      tCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
      
      const compressedBase64 = tempCanvas.toDataURL('image/jpeg', 0.6);
      push(sessionRef, { type: 'photo', data: compressedBase64 });
      triggerNotification("Dropped a new photo on your screen! 📷");
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

// Sync Incoming Cloud Events
onChildAdded(sessionRef, (snapshot) => {
  const data = snapshot.val();
  
  if (data.type === 'draw') {
    pCtx.strokeStyle = data.color;
    pCtx.beginPath();
    pCtx.moveTo(data.x0, data.y0);
    pCtx.lineTo(data.x1, data.y1);
    pCtx.stroke();
    
    // Spawn 3D floating particles on the FX layer
    for (let i = 0; i < 2; i++) {
      particles.push({
        x: data.x1, y: data.y1,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 1, color: data.color
      });
    }
  } 
  else if (data.type === 'text') {
    const el = document.createElement('div');
    el.className = 'chat-msg';
    el.innerText = data.text;
    chatBox.appendChild(el);
    chatBox.scrollTop = chatBox.scrollHeight;
    setTimeout(() => el.remove(), 8000); // Messages gently vanish after 8 seconds
  } 
  else if (data.type === 'photo') {
    const img = new Image();
    img.onload = function() {
      // Draw centered photo as background
      const hRatio = paintCanvas.width / img.width;
      const vRatio = paintCanvas.height / img.height;
      const ratio = Math.min(hRatio, vRatio);
      const centerShift_x = (paintCanvas.width - img.width * ratio) / 2;
      const centerShift_y = (paintCanvas.height - img.height * ratio) / 2;  
      pCtx.drawImage(img, 0, 0, img.width, img.height, centerShift_x, centerShift_y, img.width*ratio, img.height*ratio);
    };
    img.src = data.data;
  }
});

// Clear Button
clearBtn.addEventListener('click', () => set(sessionRef, null));
onValue(sessionRef, (snapshot) => {
  if (!snapshot.exists()) {
    pCtx.clearRect(0, 0, width, height);
    fCtx.clearRect(0, 0, width, height);
    chatBox.innerHTML = '';
    particles = [];
  }
});

// Independent Particles Rendering Loop (The FX Layer)
function animateFX() {
  fCtx.clearRect(0, 0, width, height);
  hue += 0.8;
  
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.02;
    
    if (p.life <= 0) {
      particles.splice(i, 1);
    } else {
      fCtx.shadowBlur = 10;
      fCtx.shadowColor = p.color;
      fCtx.beginPath();
      fCtx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
      fCtx.fillStyle = p.color;
      fCtx.fill();
    }
  }
  fCtx.shadowBlur = 0;
  requestAnimationFrame(animateFX);
}
animateFX();
