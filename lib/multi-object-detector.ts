import { classifyImageHeuristic } from "./heuristic-classifier";
import {
  mapPlasticCode,
  getDecompositionTime,
  getMicroplasticRisk,
  getEcoAlternative,
  getPlasticDescription,
} from "./types";
import type { DetectedObject } from "./types";

export interface DetectedRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface MultiObjectResult {
  objects: DetectedObject[];
  regions: DetectedRegion[];
  totalDetected: number;
}

async function segmentImageIntoRegions(
  dataUrl: string
): Promise<DetectedRegion[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 200;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve([{ x: 0, y: 0, width: size, height: size, confidence: 0.5 }]);
        return;
      }

      ctx.drawImage(img, 0, 0, size, size);
      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;

      // Edge detection and region finding
      const edges: boolean[][] = [];
      for (let y = 0; y < size; y++) {
        edges[y] = [];
        for (let x = 0; x < size; x++) {
          const idx = (y * size + x) * 4;
          const nextIdx = idx + 4;

          if (x < size - 1 && y < size - 1) {
            const r1 = data[idx];
            const g1 = data[idx + 1];
            const b1 = data[idx + 2];
            const r2 = data[nextIdx];
            const g2 = data[nextIdx + 1];
            const b2 = data[nextIdx + 2];

            const diff =
              Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
            edges[y][x] = diff > 50;
          } else {
            edges[y][x] = false;
          }
        }
      }

      // Grid-based segmentation with edge-awareness
      const regions: DetectedRegion[] = [];
      const gridSize = 3; // 3x3 grid
      const cellWidth = size / gridSize;
      const cellHeight = size / gridSize;

      for (let gy = 0; gy < gridSize; gy++) {
        for (let gx = 0; gx < gridSize; gx++) {
          const x = gx * cellWidth;
          const y = gy * cellHeight;

          // Count edges in this cell
          let edgeCount = 0;
          let pixelCount = 0;
          for (
            let cy = Math.floor(y);
            cy < Math.min(y + cellHeight, size);
            cy++
          ) {
            for (
              let cx = Math.floor(x);
              cx < Math.min(x + cellWidth, size);
              cx++
            ) {
              if (edges[cy] && edges[cy][cx]) edgeCount++;
              pixelCount++;
            }
          }

          const edgeDensity = edgeCount / pixelCount;

          // Only add regions with significant edges (likely contain objects)
          if (edgeDensity > 0.05) {
            regions.push({
              x: Math.floor(x),
              y: Math.floor(y),
              width: Math.floor(cellWidth),
              height: Math.floor(cellHeight),
              confidence: Math.min(0.9, edgeDensity * 5),
            });
          }
        }
      }

      // If no regions detected, return center region as fallback
      if (regions.length === 0) {
        regions.push({
          x: size / 4,
          y: size / 4,
          width: size / 2,
          height: size / 2,
          confidence: 0.5,
        });
      }

      resolve(regions);
    };
    img.onerror = () => {
      resolve([{ x: 0, y: 0, width: 100, height: 100, confidence: 0.5 }]);
    };
    img.src = dataUrl;
  });
}

async function extractRegionImage(
  dataUrl: string,
  region: DetectedRegion
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = region.width;
      canvas.height = region.height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      // Draw the region
      const scaleFactor = img.width / 200;
      ctx.drawImage(
        img,
        region.x * scaleFactor,
        region.y * scaleFactor,
        region.width * scaleFactor,
        region.height * scaleFactor,
        0,
        0,
        region.width,
        region.height
      );

      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function dataUrlToImageData(
  dataUrl: string
): Promise<{ imageData: ImageData; imageEl: HTMLImageElement }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      resolve({ imageData, imageEl: img });
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

export async function detectMultipleObjects(
  dataUrl: string,
  filename?: string
): Promise<MultiObjectResult> {
  // 1. Segment image into regions
  const regions = await segmentImageIntoRegions(dataUrl);

  // 2. Classify each region
  const objects: DetectedObject[] = [];
  const seenTypes = new Set<string>();

  // Convert dataUrl to ImageData and HTMLImageElement
  const { imageData, imageEl } = await dataUrlToImageData(dataUrl);

  // First, analyze the full image for context
  const fullImageResult = await classifyImageHeuristic(imageData, imageEl);

  // Convert ClassificationResult to DetectedObject
  const detectedType = fullImageResult.material;
  objects.push({
    name: "Detected Plastic Waste",
    plasticType: detectedType,
    plasticCode: mapPlasticCode(detectedType),
    decompositionTime: getDecompositionTime(detectedType),
    microplasticRisk: getMicroplasticRisk(detectedType),
    ecoAlternative: getEcoAlternative(detectedType),
    description: getPlasticDescription(detectedType),
  });
  seenTypes.add(detectedType);

  // Limit to top 3 regions to avoid over-detection
  const topRegions = regions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  for (const region of topRegions) {
    try {
      const regionImage = await extractRegionImage(dataUrl, region);
      const { imageData: regionImageData, imageEl: regionImageEl } =
        await dataUrlToImageData(regionImage);
      const result = await classifyImageHeuristic(
        regionImageData,
        regionImageEl
      );

      // Only add if it's different from what we already detected and confidence is high enough
      if (!seenTypes.has(result.material) && result.confidence > 0.5) {
        const detectedMaterial = result.material;
        objects.push({
          name: `Detected Plastic Waste (Region)`,
          plasticType: detectedMaterial,
          plasticCode: mapPlasticCode(detectedMaterial),
          decompositionTime: getDecompositionTime(detectedMaterial),
          microplasticRisk: getMicroplasticRisk(detectedMaterial),
          ecoAlternative: getEcoAlternative(detectedMaterial),
          description: getPlasticDescription(detectedMaterial),
        });
        seenTypes.add(detectedMaterial);
      }
    } catch (err) {
      console.error("Region classification error:", err);
    }
  }

  return {
    objects,
    regions: topRegions,
    totalDetected: objects.length,
  };
}
