"use client";

import { QRCodeCanvas } from "qrcode.react";
import { useRef } from "react";

export function QRPreview({
  value,
  filename,
  size = 220,
}: {
  value: string;
  filename: string;
  size?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);

  function download() {
    const canvas = wrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={wrapRef}
        className="rounded-lg border border-slate-200 bg-white p-3"
      >
        <QRCodeCanvas
          value={value}
          size={size}
          level="M"
          includeMargin={false}
        />
      </div>
      <div className="break-all text-center text-xs text-slate-500">
        {value}
      </div>
      <button
        type="button"
        onClick={download}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
      >
        PNG 다운로드
      </button>
    </div>
  );
}
