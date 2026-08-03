import React, { useEffect, useRef } from 'react';

/*
  Calm Government Background
  - Subtle gradient
  - Slow drifting grid
  - Faint contour rings for situational context
*/

const GRID_SIZE = 80;
const RAIN_COUNT = 180;
const RAIN_ANGLE = 0.18;

export default function AnimatedBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const bgImg = new Image();
    bgImg.src = '/radar_storm_bg.png';
    let imgLoaded = false;
    bgImg.onload = () => {
      imgLoaded = true;
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const rings = [
      { x: 0.15, y: 0.2, r: 0.28 },
      { x: 0.7, y: 0.35, r: 0.34 },
      { x: 0.45, y: 0.7, r: 0.4 },
    ];

    const mkDrop = (init = false) => ({
      x: Math.random() * (canvas.width + 200) - 100,
      y: init ? Math.random() * canvas.height : -40,
      speed: 10 + Math.random() * 16,
      length: 18 + Math.random() * 26,
      opacity: 0.12 + Math.random() * 0.2,
      width: 0.7 + Math.random() * 1.2,
    });

    let drops = Array.from({ length: RAIN_COUNT }, () => mkDrop(true));

    const draw = (ts) => {
      animId = requestAnimationFrame(draw);
      const W = canvas.width;
      const H = canvas.height;
      const t = ts * 0.00005;

      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0e1924');
      bg.addColorStop(0.6, '#121f2c');
      bg.addColorStop(1, '#162430');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      if (imgLoaded) {
        ctx.globalAlpha = 0.22;
        ctx.drawImage(bgImg, 0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      const glow = ctx.createRadialGradient(W * 0.2, H * 0.1, 0, W * 0.2, H * 0.1, W * 0.55);
      glow.addColorStop(0, 'rgba(110, 165, 200, 0.22)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      const offset = (t * GRID_SIZE * 1.2) % GRID_SIZE;
      ctx.strokeStyle = 'rgba(120, 150, 175, 0.08)';
      ctx.lineWidth = 0.8;
      for (let x = -GRID_SIZE; x < W + GRID_SIZE; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x + offset, 0);
        ctx.lineTo(x + offset, H);
        ctx.stroke();
      }
      for (let y = -GRID_SIZE; y < H + GRID_SIZE; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y - offset);
        ctx.lineTo(W, y - offset);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(120, 150, 175, 0.12)';
      ctx.lineWidth = 1;
      rings.forEach((ring, i) => {
        const pulse = 1 + Math.sin(t * 6 + i) * 0.02;
        ctx.beginPath();
        ctx.arc(W * ring.x, H * ring.y, Math.min(W, H) * ring.r * pulse, 0, Math.PI * 2);
        ctx.stroke();
      });

      ctx.lineCap = 'round';
      drops.forEach((d) => {
        d.x += Math.sin(RAIN_ANGLE) * d.speed * 0.6;
        d.y += Math.cos(RAIN_ANGLE) * d.speed;
        if (d.y > H + 10) {
          Object.assign(d, mkDrop(false));
          d.x = Math.random() * (W + 200) - 100;
        }

        const x0 = d.x - Math.sin(RAIN_ANGLE) * d.length;
        const y0 = d.y - Math.cos(RAIN_ANGLE) * d.length;
        const grad = ctx.createLinearGradient(x0, y0, d.x, d.y);
        grad.addColorStop(0, 'rgba(120, 190, 220, 0)');
        grad.addColorStop(1, `rgba(170, 215, 235, ${d.opacity})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = d.width;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(d.x, d.y);
        ctx.stroke();
      });
    };

    animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, width: '100%', height: '100%' }}
      aria-hidden="true"
    />
  );
}
