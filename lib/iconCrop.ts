export function cropGeometry(width: number, height: number, size: number, zoom: number, x: number, y: number) {
  const scale = Math.max(size / width, size / height) * Math.max(1, zoom);
  const dx = Math.max(-(width * scale - size) / 2, Math.min((width * scale - size) / 2, x));
  const dy = Math.max(-(height * scale - size) / 2, Math.min((height * scale - size) / 2, y));
  const side = Math.min(width, height, size / scale);
  return { scale, x: dx, y: dy, crop: { originX: Math.max(0, Math.min(width - side, (width - side) / 2 - dx / scale)), originY: Math.max(0, Math.min(height - side, (height - side) / 2 - dy / scale)), width: side, height: side } };
}
