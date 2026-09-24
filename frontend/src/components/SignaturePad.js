import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

// Digital signature pad. value is a dataURL string. onChange(dataURL).
export default function SignaturePad({ label, value, onChange, testId }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasContent, setHasContent] = useState(!!value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = value;
      setHasContent(true);
    }
  }, []); // eslint-disable-line

  const pos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const client = e.touches ? e.touches[0] : e;
    return {
      x: ((client.clientX - rect.left) / rect.width) * canvasRef.current.width,
      y: ((client.clientY - rect.top) / rect.height) * canvasRef.current.height,
    };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setHasContent(true);
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange && onChange(canvasRef.current.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
    onChange && onChange("");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clear}
          className="h-7 text-xs text-slate-500"
          data-testid={`${testId}-clear`}
        >
          <Eraser className="w-3.5 h-3.5 mr-1" /> Hapus
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={140}
        data-testid={testId}
        className="sig-canvas w-full h-[140px] bg-white rounded-lg border-2 border-dashed border-slate-300"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      {!hasContent && (
        <p className="text-[11px] text-slate-400 mt-1">Tanda tangan di area di atas</p>
      )}
    </div>
  );
}
