import { useEffect, useRef } from "react";
import "./AudioVisualizer.css";

interface AudioVisualizerProps {
  isRecording: boolean;
  isAiSpeaking: boolean;
}

export function AudioVisualizer({ isRecording, isAiSpeaking }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

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
    const barCount = 48;
    const barWidth = 3;
    const barGap = (width - barCount * barWidth) / (barCount - 1);

    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      phase += 0.03;

      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + barGap);

        let amplitude: number;
        let color: string;

        if (isRecording) {
          // Recording: energetic red waveform
          amplitude =
            Math.sin(phase * 2 + i * 0.3) * 0.4 +
            Math.sin(phase * 3.5 + i * 0.15) * 0.3 +
            0.15;
          amplitude *= height * 0.4;
          const r = 239, g = 68, b = 68;
          const alpha = 0.4 + Math.abs(Math.sin(phase + i * 0.2)) * 0.6;
          color = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        } else if (isAiSpeaking) {
          // AI speaking: purple/cyan waveform
          amplitude =
            Math.sin(phase * 1.5 + i * 0.25) * 0.35 +
            Math.sin(phase * 2.2 + i * 0.12) * 0.25 +
            0.1;
          amplitude *= height * 0.35;
          const t = (Math.sin(phase + i * 0.15) + 1) / 2;
          const r = Math.round(168 * (1 - t) + 6 * t);
          const g = Math.round(85 * (1 - t) + 182 * t);
          const b = Math.round(247 * (1 - t) + 212 * t);
          const alpha = 0.3 + Math.abs(Math.sin(phase * 0.8 + i * 0.2)) * 0.5;
          color = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        } else {
          // Idle: subtle breathing cyan
          amplitude =
            Math.sin(phase * 0.5 + i * 0.15) * 0.08 + 0.04;
          amplitude *= height * 0.25;
          color = `rgba(6, 182, 212, ${0.1 + Math.abs(Math.sin(phase * 0.3 + i * 0.1)) * 0.15})`;
        }

        const barHeight = Math.max(2, Math.abs(amplitude));
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
  }, [isRecording, isAiSpeaking]);

  return (
    <div className="audio-visualizer">
      <canvas ref={canvasRef} className="visualizer-canvas" />
    </div>
  );
}
