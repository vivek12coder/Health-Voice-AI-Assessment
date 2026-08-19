import { useEffect, useRef } from "react";
import "./AudioVisualizer.css";

interface AudioVisualizerProps {
  isListening?: boolean;
  isUserSpeaking?: boolean;
  isAiSpeaking: boolean;
  audioLevel?: number; // 0 to 100
}

export function AudioVisualizer({
  isListening = false,
  isUserSpeaking = false,
  isAiSpeaking,
  audioLevel = 0,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const smoothedLevelRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;
    const barCount = 42;
    const barWidth = 3.5;
    const barGap = (width - barCount * barWidth) / (barCount - 1);

    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      phase += 0.04;

      // Smooth audio level for natural fluid motion
      smoothedLevelRef.current += (audioLevel - smoothedLevelRef.current) * 0.25;
      const normalizedEnergy = Math.min(1, smoothedLevelRef.current / 60);

      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + barGap);
        // Distance from center factor (0 to 1) for bell-curve shaping
        const distFromCenter = 1 - Math.abs(i - barCount / 2) / (barCount / 2);

        let amplitude: number;
        let color: string;

        if (isUserSpeaking) {
          // User is speaking: dynamic emerald/teal waveform reactive to microphone volume!
          const dynamicBoost = 0.3 + normalizedEnergy * 0.7;
          amplitude =
            (Math.sin(phase * 3 + i * 0.35) * 0.5 +
              Math.sin(phase * 4.5 + i * 0.2) * 0.35 +
              0.2) *
            distFromCenter *
            dynamicBoost;
          amplitude *= height * 0.45;

          const alpha = 0.5 + Math.min(0.5, normalizedEnergy * 0.6);
          color = `rgba(52, 211, 153, ${alpha})`;
        } else if (isAiSpeaking) {
          // AI speaking: rhythmic purple/cyan waveform
          amplitude =
            (Math.sin(phase * 2 + i * 0.25) * 0.4 +
              Math.sin(phase * 2.8 + i * 0.15) * 0.3 +
              0.15) *
            distFromCenter;
          amplitude *= height * 0.38;

          const t = (Math.sin(phase * 1.2 + i * 0.15) + 1) / 2;
          const r = Math.round(168 * (1 - t) + 6 * t);
          const g = Math.round(85 * (1 - t) + 182 * t);
          const b = Math.round(247 * (1 - t) + 212 * t);
          const alpha = 0.4 + Math.abs(Math.sin(phase * 0.8 + i * 0.2)) * 0.5;
          color = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        } else if (isListening) {
          // Listening in ambient silence: subtle gentle cyan pulse
          amplitude =
            (Math.sin(phase * 0.8 + i * 0.18) * 0.12 + 0.06) * distFromCenter;
          amplitude *= height * 0.28;
          color = `rgba(6, 182, 212, ${
            0.2 + Math.abs(Math.sin(phase * 0.5 + i * 0.1)) * 0.25
          })`;
        } else {
          // Idle / processing: subtle calm breathing line
          amplitude = (Math.sin(phase * 0.4 + i * 0.1) * 0.05 + 0.03) * distFromCenter;
          amplitude *= height * 0.2;
          color = "rgba(148, 163, 184, 0.15)";
        }

        const barHeight = Math.max(3, Math.abs(amplitude));
        const radius = Math.min(barWidth / 2, barHeight / 2);

        ctx.beginPath();
        ctx.roundRect(x, centerY - barHeight / 2, barWidth, barHeight, radius);
        ctx.fillStyle = color;
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationRef.current);
  }, [isListening, isUserSpeaking, isAiSpeaking, audioLevel]);

  return (
    <div className="audio-visualizer">
      <canvas ref={canvasRef} className="visualizer-canvas" />
    </div>
  );
}
