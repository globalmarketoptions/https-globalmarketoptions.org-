import { useEffect, useRef } from 'react';

export function HeroMotionCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let width = 0;
    let height = 0;
    let animationFrame = 0;

    const draw = () => {
      context.clearRect(0, 0, width, height);
      const step = Math.max(38, width / 20);
      const phase = motionPreference.matches ? 0 : frame * 0.012;
      context.lineWidth = 1;
      context.strokeStyle = 'rgba(110, 191, 153, 0.23)';
      context.beginPath();
      for (let x = -step; x <= width + step; x += step) {
        const y = height * 0.58 + Math.sin(x * 0.012 + phase) * height * 0.055 + Math.sin(x * 0.027 - phase * 0.7) * height * 0.022;
        if (x === -step) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
      context.fillStyle = 'rgba(116, 204, 165, 0.5)';
      for (let x = ((frame * 0.45) % step) - step; x < width + step; x += step) {
        const y = height * 0.27 + Math.sin(x * 0.009 + phase) * height * 0.1;
        context.beginPath();
        context.arc(x, y, 1.5, 0, Math.PI * 2);
        context.fill();
      }
      if (!motionPreference.matches) {
        frame += 1;
        animationFrame = window.requestAnimationFrame(draw);
      }
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw();
    };

    resize();
    window.addEventListener('resize', resize);
    motionPreference.addEventListener('change', resize);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      motionPreference.removeEventListener('change', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="hero-motion-canvas" aria-hidden="true" />;
}
