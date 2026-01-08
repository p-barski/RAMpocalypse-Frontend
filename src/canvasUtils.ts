export function drawImageToCanvas(
  ctx: CanvasRenderingContext2D,
  image: ImageBitmap,
  x: number,
  y: number,
  scale: number,
) {
  // Ensure image smoothing is disabled for pixel art
  ctx.imageSmoothingEnabled = false;

  // Round dimensions to avoid sub-pixel rendering
  const drawWidth = Math.round(image.width * scale);
  const drawHeight = Math.round(image.height * scale);
  const drawX = Math.round(x);
  const drawY = Math.round(y);

  // Draw the image
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
