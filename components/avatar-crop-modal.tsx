"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, ZoomIn } from "lucide-react";
import { DButton, designStyles } from "@/components/design";
import {
  clampCropOffset,
  cropAvatarToBlob,
  type CropTransform,
} from "@/lib/cropAvatarImage";

const CROP_SIZE = 280;

type Props = {
  imageUrl: string;
  onCancel: () => void;
  onComplete: (file: File) => void;
};

export function AvatarCropModal({ imageUrl, onCancel, onComplete }: Props) {
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      setNatural({ width: image.naturalWidth, height: image.naturalHeight });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    image.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const clamped = natural.width
    ? clampCropOffset(offset.x, offset.y, natural.width, natural.height, CROP_SIZE, zoom)
    : offset;

  const scale =
    natural.width > 0
      ? Math.max(CROP_SIZE / natural.width, CROP_SIZE / natural.height) * zoom
      : 1;
  const scaledW = natural.width * scale;
  const scaledH = natural.height * scale;
  const imgLeft = (CROP_SIZE - scaledW) / 2 + clamped.x;
  const imgTop = (CROP_SIZE - scaledH) / 2 + clamped.y;

  const beginDrag = (clientX: number, clientY: number) => {
    dragging.current = true;
    dragStart.current = { x: clientX, y: clientY, ox: offset.x, oy: offset.y };
  };

  const moveDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!dragging.current || !natural.width) return;
      const dx = clientX - dragStart.current.x;
      const dy = clientY - dragStart.current.y;
      const next = clampCropOffset(
        dragStart.current.ox + dx,
        dragStart.current.oy + dy,
        natural.width,
        natural.height,
        CROP_SIZE,
        zoom,
      );
      setOffset(next);
    },
    [natural.height, natural.width, zoom],
  );

  const endDrag = () => {
    dragging.current = false;
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => moveDrag(e.clientX, e.clientY);
    const onUp = () => endDrag();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [moveDrag]);

  const handleZoom = (value: number) => {
    setZoom(value);
    if (!natural.width) return;
    setOffset((prev) =>
      clampCropOffset(prev.x, prev.y, natural.width, natural.height, CROP_SIZE, value),
    );
  };

  const handleConfirm = async () => {
    if (!natural.width) return;
    setSaving(true);
    try {
      const transform: CropTransform = {
        naturalWidth: natural.width,
        naturalHeight: natural.height,
        cropSize: CROP_SIZE,
        zoom,
        offsetX: clamped.x,
        offsetY: clamped.y,
      };
      const blob = await cropAvatarToBlob(imageUrl, transform);
      onComplete(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-crop-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onCancel}
        style={{
          position: "absolute",
          inset: 0,
          border: "none",
          background: "rgba(0,0,0,.55)",
          backdropFilter: "blur(4px)",
          cursor: "pointer",
        }}
      />
      <div
        className={designStyles.card}
        style={{
          position: "relative",
          zIndex: 1,
          width: "min(100%, 400px)",
          padding: 20,
          boxShadow: "0 24px 48px rgba(0,0,0,.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div>
            <h2 id="avatar-crop-title" className={designStyles.cardTitle} style={{ margin: 0 }}>
              Adjust photo
            </h2>
            <p className={designStyles.cardSub} style={{ margin: "4px 0 0" }}>
              Drag to reposition. Pinch or use the slider to zoom.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            style={{
              border: "none",
              background: "transparent",
              color: "var(--ink-mute)",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            position: "relative",
            width: CROP_SIZE,
            height: CROP_SIZE,
            margin: "0 auto",
            borderRadius: 12,
            overflow: "hidden",
            background: "#111",
            touchAction: "none",
            cursor: dragging.current ? "grabbing" : "grab",
          }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            beginDrag(e.clientX, e.clientY);
          }}
        >
          {natural.width > 0 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                left: imgLeft,
                top: imgTop,
                width: scaledW,
                height: scaledH,
                maxWidth: "none",
                userSelect: "none",
                pointerEvents: "none",
              }}
            />
          )}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              boxShadow: "0 0 0 9999px rgba(0,0,0,.45)",
              border: "2px solid rgba(255,255,255,.9)",
            }}
          />
        </div>

        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <ZoomIn size={16} style={{ color: "var(--ink-mute)", flexShrink: 0 }} />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => handleZoom(Number(e.target.value))}
            aria-label="Zoom"
            style={{ flex: 1 }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
          <DButton variant="quiet" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </DButton>
          <DButton
            variant="primary"
            size="sm"
            onClick={handleConfirm}
            disabled={saving || !natural.width}
          >
            {saving ? "Saving…" : "Use photo"}
          </DButton>
        </div>
      </div>
    </div>
  );
}
