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
const linesRef = ref(db, 'drawing');

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const clearBtn = document.getElementById('clearBtn');
const pingBtn = document.getElementById('pingBtn');

let width, height;
let particles = [];
let hue = 0; // Dynamic color shifting

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

let isDrawing = false;
let lastX = 0;
let lastY = 0;

function getCoordinates(e) {
  if (e.touches && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

function startDrawing(e) {
  isDrawing = true;
  const coords = getCoordinates(e);
  lastX = coords.x;
  lastY = coords.y;
}

function stopDrawing() {
  isDrawing = false;
}

function draw(e) {
  if (!isDrawing) return;
  e.preventDefault(); 
  
  const coords = getCoordinates(e);
  const currentX = coords.x;
  const currentY = coords.y;

  // Sync core coordinates to Firebase
  push(linesRef, { 
    x0: lastX, 
    y0: lastY, 
    x1: currentX, 
    y1: currentY,
    h: hue 
  });
  
  lastX = currentX;
  lastY = currentY;
}

// Intense Neon Rendering & Particle Generation
function renderLine(x0, y0, x1, y1, lineHue) {
  // Glow Effect
  ctx.shadowBlur = 15;
  ctx.shadowColor = `hsl(${lineHue}, 100%, 60%)`;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.strokeStyle = `hsl(${lineHue}, 100%, 70%)`;

  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  
  // Reset shadow for performance
  ctx.shadowBlur = 0;

  // Generate 3D flying particles
  for (let i = 0; i < 3; i++) {
    particles.push({
      x: x1,
      y: y1,
      vx: (Math.random() - 0.5) * 8, // Intense velocity
      vy: (Math.random() - 0.5) * 8,
      life: 1,
      color: `hsl(${lineHue}, 100%, 60%)`
    });
  }
}

// Animation Loop for Physics & Trails
function animate() {
  // Creates a fading trail effect instead of a hard clear
  ctx.fillStyle = 'rgba(5, 5, 5, 0.05)';
  ctx.fillRect(0, 0, width, height);

  // Slowly shift the color of the pen over time
  hue += 0.5;
  if (hue > 360) hue = 0;

  // Update and draw particles
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.02; // Fade out speed

    if (p.life <= 0) {
      particles.splice(i, 1);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2 * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
  }
  requestAnimationFrame(animate);
}
animate(); // Start the engine

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);
canvas.addEventListener('touchstart', startDrawing, { passive: false });
canvas.addEventListener('touchmove', draw, { passive: false });
canvas.addEventListener('touchend', stopDrawing);

onChildAdded(linesRef, (data) => {
  const line = data.val();
  renderLine(line.x0, line.y0, line.x1, line.y1, line.h);
});

clearBtn.addEventListener('click', () => {
  set(linesRef, null);
});

onValue(linesRef, (snapshot) => {
  if (!snapshot.exists()) {
    // Hard wipe if the database is cleared
    ctx.clearRect(0, 0, width, height);
    particles = []; 
  }
});

pingBtn.addEventListener('click', () => {
  const textMessage = "I just left a neon surprise for you, Ananta! ✨ Go check our canvas.";
  window.location.href = `https://wa.me/?text=${encodeURIComponent(textMessage)}`;
});