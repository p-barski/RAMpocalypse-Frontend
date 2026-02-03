export function drawImageToCanvas(
  ctx: CanvasRenderingContext2D,
  image: ImageBitmap,
  x: number,
  y: number,
  scale: number,
  angle?: number,
): void {
  ctx.imageSmoothingEnabled = false;

  const drawWidth = Math.round(image.width * scale);
  const drawHeight = Math.round(image.height * scale);
  const drawX = Math.round(x);
  const drawY = Math.round(y);

  if (angle !== undefined && angle !== 0) {
    const centerX = drawX + drawWidth / 2;
    const centerY = drawY + drawHeight / 2;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    ctx.translate(-drawWidth / 2, -drawHeight / 2);
    ctx.drawImage(image, 0, 0, drawWidth, drawHeight);
    ctx.restore();
  } else {
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
