"use client";

import { useEffect, useRef } from "react";

const ACCENT = { r: 79, g: 70, b: 229 };
const SKY = { r: 96, g: 165, b: 250 };

/**
 * Particle + wave backdrop from the previous login screen (canvas only; Ant Design stays for the form).
 *
 * @param {{ className?: string, isDark?: boolean }} props
 */
export default function AuthCanvasBackground({ className = "", isDark = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    let animationFrameId = 0;
    /** @type {{ x: number, y: number, size: number, speedX: number, speedY: number, alpha: number }[]} */
    let particles = [];

    const setCanvasDimensions = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const createParticles = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const count = Math.min(50, Math.floor((width * height) / 20000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 3 + 1,
        speedX: Math.random() * 0.5 - 0.25,
        speedY: Math.random() * 0.5 - 0.25,
        alpha: Math.random() * 0.5 + 0.1,
      }));
    };

    const drawWave = (time) => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      const a = isDark ? 0.22 : 0.3;
      gradient.addColorStop(0, `rgba(${ACCENT.r}, ${ACCENT.g}, ${ACCENT.b}, ${a})`);
      gradient.addColorStop(0.5, `rgba(${SKY.r}, ${SKY.g}, ${SKY.b}, ${isDark ? 0.08 : 0.1})`);
      gradient.addColorStop(1, `rgba(${ACCENT.r}, ${ACCENT.g}, ${ACCENT.b}, ${a})`);
      ctx.fillStyle = gradient;

      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        const amplitude = 20 + i * 10;
        const frequency = 0.005 - i * 0.001;
        const timeOffset = i * 1000;
        ctx.moveTo(0, height / 2);
        for (let x = 0; x < width; x += 1) {
          const y =
            Math.sin(x * frequency + (time + timeOffset) / 1000) * amplitude +
            height / 2 +
            i * 50;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();
      }
    };

    const drawFrame = (timestamp) => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const bg = ctx.createLinearGradient(0, 0, 0, height);
      if (isDark) {
        bg.addColorStop(0, "rgba(17, 24, 39, 1)");
        bg.addColorStop(1, "rgba(31, 41, 55, 1)");
      } else {
        bg.addColorStop(0, "rgba(249, 250, 251, 1)");
        bg.addColorStop(1, "rgba(243, 244, 246, 1)");
      }
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      drawWave(timestamp);

      particles.forEach((particle) => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        if (particle.x < 0 || particle.x > width) particle.speedX *= -1;
        if (particle.y < 0 || particle.y > height) particle.speedY *= -1;
        ctx.fillStyle = `rgba(${ACCENT.r}, ${ACCENT.g}, ${ACCENT.b}, ${particle.alpha})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    setCanvasDimensions();
    createParticles();

    const onResize = () => {
      setCanvasDimensions();
      createParticles();
    };
    window.addEventListener("resize", onResize);

    const animate = (timestamp) => {
      drawFrame(timestamp);
      animationFrameId = window.requestAnimationFrame(animate);
    };
    animationFrameId = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", onResize);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
