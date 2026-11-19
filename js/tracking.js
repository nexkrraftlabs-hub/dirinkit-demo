// DRINKIT Live Order Tracking & Map Simulator

let trackingTimerInterval = null;
let riderProgress = 0.25; // 0 to 1
let remainingSeconds = 480; // 8 minutes

function initTrackingEngine() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId') || 'DRK-98421';

  let orderData = null;
  const activeOrderStr = localStorage.getItem('drinkit_active_order');
  if (activeOrderStr) {
    try {
      orderData = JSON.parse(activeOrderStr);
    } catch(e) {}
  }

  if (!orderData || orderData.orderId !== orderId) {
    // Fallback to sample order
    orderData = SAMPLE_ORDERS[0];
    orderData.orderId = orderId;
  }

  renderOrderDetails(orderData);
  startLiveCountdown();
  initMapCanvas();
}

function renderOrderDetails(order) {
  const idEl = document.getElementById('trackOrderId');
  const itemsContainer = document.getElementById('trackItemsList');
  const otpEl = document.getElementById('deliveryOtpDisplay');
  const addressEl = document.getElementById('trackDeliveryAddress');

  if (idEl) idEl.textContent = order.orderId;
  if (otpEl) otpEl.textContent = (order.deliveryPartner && order.deliveryPartner.otp) ? order.deliveryPartner.otp : '4892';
  if (addressEl) addressEl.textContent = order.deliveryAddress;

  if (itemsContainer && order.items) {
    let html = '';
    order.items.forEach(item => {
      html += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f1f5f9; font-size:13px;">
          <div>
            <strong>${item.name}</strong>
            <div style="font-size:11px; color:#64748b;">Qty: ${item.qty}</div>
          </div>
          <div style="font-weight:700;">₹${item.price * item.qty}</div>
        </div>
      `;
    });
    itemsContainer.innerHTML = html;
  }
}

function startLiveCountdown() {
  const timerEl = document.getElementById('liveTimerCountdown');
  if (!timerEl) return;

  if (trackingTimerInterval) clearInterval(trackingTimerInterval);

  trackingTimerInterval = setInterval(() => {
    remainingSeconds--;
    if (remainingSeconds <= 0) {
      clearInterval(trackingTimerInterval);
      timerEl.textContent = 'Arrived!';
      updateStepToDelivered();
      return;
    }

    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    // Increment rider progress along map
    if (riderProgress < 0.95) {
      riderProgress += 0.005;
      drawMapRoute();
    }
  }, 1000);
}

function updateStepToDelivered() {
  const step4 = document.getElementById('step-node-4');
  if (step4) {
    step4.classList.add('completed');
    const badge = document.getElementById('deliveryStatusBadge');
    if (badge) {
      badge.textContent = 'Delivered';
      badge.style.background = '#21a038';
    }
  }
  if (typeof DRINKIT_APP !== 'undefined') {
    DRINKIT_APP.showToast('🎉 Your Drinkit order has reached your doorstep!');
  }
}

// Interactive Canvas Map Engine
let canvas, ctx;
const storePoint = { x: 80, y: 190, name: 'Drinkit Gomti Hub' };
const customerPoint = { x: 540, y: 70, name: 'Your Location' };

// Road waypoints
const waypoints = [
  { x: 80, y: 190 },
  { x: 180, y: 190 },
  { x: 240, y: 120 },
  { x: 380, y: 120 },
  { x: 440, y: 70 },
  { x: 540, y: 70 }
];

function initMapCanvas() {
  canvas = document.getElementById('trackingCanvasMap');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  function resizeCanvas() {
    const parentWidth = canvas.parentElement.clientWidth;
    canvas.width = parentWidth;
    canvas.height = window.innerWidth <= 768 ? 190 : 260;
    drawMapRoute();
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
}

function drawMapRoute() {
  if (!ctx || !canvas) return;
  const w = canvas.width;
  const h = canvas.height;

  // Background map texture
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, w, h);

  // Draw simulated city roads grid
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Scale points relative to canvas width
  const scaleX = w / 640;
  const scaleY = h / 260;

  // Draw main delivery road
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  waypoints.forEach((pt, i) => {
    if (i === 0) ctx.moveTo(pt.x * scaleX, pt.y * scaleY);
    else ctx.lineTo(pt.x * scaleX, pt.y * scaleY);
  });
  ctx.stroke();

  // Draw active route highlight in green
  ctx.strokeStyle = '#21a038';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Dark Store Hub marker
  const startX = storePoint.x * scaleX;
  const startY = storePoint.y * scaleY;
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(startX, startY, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '10px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HUB', startX, startY + 3);

  // Destination Customer House marker
  const endX = customerPoint.x * scaleX;
  const endY = customerPoint.y * scaleY;
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(endX, endY, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '12px Outfit, sans-serif';
  ctx.fillText('YOU', endX, endY + 4);

  // Calculate current rider coordinates along waypoints
  const riderCoord = getCoordinatesAlongPolyline(waypoints, riderProgress, scaleX, scaleY);

  // Pulsing circle around rider
  const pulseSize = 16 + Math.sin(Date.now() / 200) * 4;
  ctx.fillStyle = 'rgba(33, 160, 56, 0.25)';
  ctx.beginPath();
  ctx.arc(riderCoord.x, riderCoord.y, pulseSize, 0, Math.PI * 2);
  ctx.fill();

  // Rider Icon/Dot
  ctx.fillStyle = '#16a34a';
  ctx.beginPath();
  ctx.arc(riderCoord.x, riderCoord.y, 11, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Rider label
  ctx.fillStyle = '#14532d';
  ctx.font = 'bold 11px Outfit, sans-serif';
  ctx.fillText('🏍️ Ramesh (Rider)', riderCoord.x, riderCoord.y - 16);
}

function getCoordinatesAlongPolyline(pts, prog, sx, sy) {
  const totalSegments = pts.length - 1;
  const totalIndex = prog * totalSegments;
  const segIndex = Math.min(Math.floor(totalIndex), totalSegments - 1);
  const segFraction = totalIndex - segIndex;

  const p1 = pts[segIndex];
  const p2 = pts[segIndex + 1];

  return {
    x: (p1.x + (p2.x - p1.x) * segFraction) * sx,
    y: (p1.y + (p2.y - p1.y) * segFraction) * sy
  };
}

// Continuous subtle animation loop for pulsating rider radar
function animateMapLoop() {
  drawMapRoute();
  requestAnimationFrame(animateMapLoop);
}

document.addEventListener('DOMContentLoaded', () => {
  initTrackingEngine();
  animateMapLoop();
});
