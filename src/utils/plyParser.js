/**
 * PLY (Polygon File Format) Parser
 * Supports both ASCII and binary PLY files
 * Extracts vertex coordinates and colors for Three.js rendering
 */

/**
 * @typedef {Object} PLYBoundingBox
 * @property {[number,number,number]} min
 * @property {[number,number,number]} max
 * @property {[number,number,number]} size
 */

/**
 * @typedef {Object} PLYDimensions
 * @property {number} length
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Object} PLYInfo
 * @property {string} fileId
 * @property {string} filename
 * @property {number} pointCount
 * @property {number} validPointCount
 * @property {PLYBoundingBox} boundingBox
 * @property {[number,number,number]} centroid
 * @property {PLYDimensions|undefined} dimensions
 */

/**
 * @typedef {Object} ParsedPLY
 * @property {Float32Array} positions
 * @property {Float32Array} colors
 * @property {number} count
 * @property {PLYInfo} info
 */

function getPropertySize(type) {
  switch (type) {
    case 'float': case 'int': case 'uint': return 4;
    case 'uchar': case 'char': return 1;
    case 'ushort': case 'short': return 2;
    case 'float32': return 4;
    case 'float64': return 8;
    case 'int8': case 'uint8': return 1;
    case 'int16': case 'uint16': return 2;
    case 'int32': case 'uint32': return 4;
    case 'int64': case 'uint64': return 8;
    default: return 4;
  }
}

function readValue(buffer, offset, type, isLittleEndian) {
  const view = new DataView(buffer);
  switch (type) {
    case 'float': case 'float32': case 'single':
      return view.getFloat32(offset, isLittleEndian);
    case 'double': case 'float64':
      return view.getFloat64(offset, isLittleEndian);
    case 'int': case 'int32':
      return view.getInt32(offset, isLittleEndian);
    case 'uint': case 'uint32':
      return view.getUint32(offset, isLittleEndian);
    case 'short': case 'int16':
      return view.getInt16(offset, isLittleEndian);
    case 'ushort': case 'uint16':
      return view.getUint16(offset, isLittleEndian);
    case 'char': case 'int8':
      return view.getInt8(offset);
    case 'uchar': case 'uint8':
      return view.getUint8(offset);
    default:
      return view.getFloat32(offset, isLittleEndian);
  }
}

function parseHeader(text) {
  const lines = text.split('\n');
  const elements = [];
  let formatBinary = false;
  let littleEndian = true;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('comment')) continue;

    if (trimmed.startsWith('format')) {
      const parts = trimmed.split(/\s+/);
      formatBinary = parts[1] === 'binary_little_endian' || parts[1] === 'binary_big_endian';
      littleEndian = parts[1] === 'binary_little_endian';
      continue;
    }

    if (trimmed.startsWith('element')) {
      const parts = trimmed.split(/\s+/);
      elements.push({ name: parts[1], count: parseInt(parts[2], 10), properties: [] });
      continue;
    }

    if (trimmed.startsWith('property')) {
      const parts = trimmed.split(/\s+/);
      const last = parts[parts.length - 1];
      const type = parts.slice(1, -1).join(' ');
      if (elements.length > 0) {
        elements[elements.length - 1].properties.push({ name: last, type });
      }
      continue;
    }

    if (trimmed === 'end_header') break;
  }

  return { elements, format: { binary: formatBinary, littleEndian } };
}

function computeOBBDimensions(positions, count) {
  if (count < 10) return { length: 0, width: 0, height: 0 };

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < count; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  return {
    length: maxX - minX,
    width: maxY - minY,
    height: maxZ - minZ,
  };
}

export function voxelDownsample(positions, colors, count, voxelSize) {
  const map = new Map();

  for (let i = 0; i < count; i++) {
    const x = Math.floor(positions[i * 3] / voxelSize);
    const y = Math.floor(positions[i * 3 + 1] / voxelSize);
    const z = Math.floor(positions[i * 3 + 2] / voxelSize);
    const key = `${x},${y},${z}`;
    if (!map.has(key)) {
      map.set(key, {
        pos: [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]],
        color: [colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]],
      });
    }
  }

  const newCount = map.size;
  const newPositions = new Float32Array(newCount * 3);
  const newColors = new Float32Array(newCount * 3);
  let idx = 0;
  map.forEach(({ pos, color }) => {
    newPositions[idx * 3] = pos[0];
    newPositions[idx * 3 + 1] = pos[1];
    newPositions[idx * 3 + 2] = pos[2];
    newColors[idx * 3] = color[0];
    newColors[idx * 3 + 1] = color[1];
    newColors[idx * 3 + 2] = color[2];
    idx++;
  });

  return { positions: newPositions, colors: newColors, count: newCount };
}

export function parsePLY(buffer, filename, fileId) {
  const uint8 = new Uint8Array(buffer);
  let headerEnd = 0;

  for (let i = 0; i < uint8.length - 10; i++) {
    if (
      uint8[i] === 101 &&
      uint8[i + 1] === 110 &&
      uint8[i + 2] === 100 &&
      uint8[i + 3] === 95 &&
      uint8[i + 4] === 104 &&
      uint8[i + 5] === 101 &&
      uint8[i + 6] === 97 &&
      uint8[i + 7] === 100 &&
      uint8[i + 8] === 101 &&
      uint8[i + 9] === 114
    ) {
      let j = i;
      while (j < uint8.length && uint8[j] !== 10 && uint8[j] !== 13) j++;
      const headerLine = String.fromCharCode(...uint8.slice(i, j));
      if (headerLine.trim() === 'end_header') {
        headerEnd = j + 1;
        if (uint8[j] === 13 && uint8[j + 1] === 10) headerEnd++;
        break;
      }
    }
  }

  if (headerEnd === 0) throw new Error('无法解析 PLY 文件头');

  const headerText = String.fromCharCode(...uint8.slice(0, headerEnd));
  const { elements, format } = parseHeader(headerText);

  const vertexEl = elements.find(e => e.name === 'vertex' || e.name === 'point');
  if (!vertexEl) throw new Error('未找到顶点数据');

  const numVertices = vertexEl.count;
  const props = vertexEl.properties;

  const xIdx = props.findIndex(p => /^x$/.test(p.name.toLowerCase()));
  const yIdx = props.findIndex(p => /^y$/.test(p.name.toLowerCase()));
  const zIdx = props.findIndex(p => /^z$/.test(p.name.toLowerCase()));
  const rIdx = props.findIndex(p => /^(red|r)$/i.test(p.name));
  const gIdx = props.findIndex(p => /^(green|g)$/i.test(p.name));
  const bIdx = props.findIndex(p => /^(blue|b)$/i.test(p.name));

  const positions = new Float32Array(numVertices * 3);
  const colors = new Float32Array(numVertices * 3);

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  let sumX = 0, sumY = 0, sumZ = 0;
  let validCount = 0;

  if (format.binary) {
    let offset = headerEnd;
    const propSizes = props.map(p => getPropertySize(p.type));

    for (let i = 0; i < numVertices; i++) {
      let px = 0, py = 0, pz = 0;
      let pr = 0.3, pg = 0.6, pb = 0.9;

      for (let j = 0; j < props.length; j++) {
        const val = readValue(buffer, offset, props[j].type, format.littleEndian);
        offset += propSizes[j];
        if (j === xIdx) px = val;
        else if (j === yIdx) py = val;
        else if (j === zIdx) pz = val;
        else if (j === rIdx) pr = val;
        else if (j === gIdx) pg = val;
        else if (j === bIdx) pb = val;
      }

      if (isFinite(px) && isFinite(py) && isFinite(pz)) {
        const i3 = validCount * 3;
        positions[i3] = px;
        positions[i3 + 1] = py;
        positions[i3 + 2] = pz;
        colors[i3] = pr / 255;
        colors[i3 + 1] = pg / 255;
        colors[i3 + 2] = pb / 255;

        if (px < minX) minX = px; if (px > maxX) maxX = px;
        if (py < minY) minY = py; if (py > maxY) maxY = py;
        if (pz < minZ) minZ = pz; if (pz > maxZ) maxZ = pz;
        sumX += px; sumY += py; sumZ += pz;
        validCount++;
      }
    }
  } else {
    const bodyText = String.fromCharCode(...uint8.slice(headerEnd));
    const lines = bodyText.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const tokens = trimmed.split(/\s+/);
      if (tokens.length < 3) continue;

      const px = parseFloat(tokens[xIdx >= 0 ? xIdx : 0]);
      const py = parseFloat(tokens[yIdx >= 0 ? yIdx : 1]);
      const pz = parseFloat(tokens[zIdx >= 0 ? zIdx : 2]);

      if (!isFinite(px) || !isFinite(py) || !isFinite(pz)) continue;

      const i3 = validCount * 3;
      positions[i3] = px;
      positions[i3 + 1] = py;
      positions[i3 + 2] = pz;

      if (rIdx >= 0 && gIdx >= 0 && bIdx >= 0) {
        const pr = parseFloat(tokens[rIdx]);
        const pg = parseFloat(tokens[gIdx]);
        const pb = parseFloat(tokens[bIdx]);
        colors[i3] = isFinite(pr) ? pr / 255 : 0.3;
        colors[i3 + 1] = isFinite(pg) ? pg / 255 : 0.6;
        colors[i3 + 2] = isFinite(pb) ? pb / 255 : 0.9;
      } else {
        colors[i3] = 0.3; colors[i3 + 1] = 0.6; colors[i3 + 2] = 0.9;
      }

      if (px < minX) minX = px; if (px > maxX) maxX = px;
      if (py < minY) minY = py; if (py > maxY) maxY = py;
      if (pz < minZ) minZ = pz; if (pz > maxZ) maxZ = pz;
      sumX += px; sumY += py; sumZ += pz;
      validCount++;
    }
  }

  const finalPositions = positions.slice(0, validCount * 3);
  const finalColors = colors.slice(0, validCount * 3);

  const centroid = validCount > 0
    ? [sumX / validCount, sumY / validCount, sumZ / validCount]
    : [0, 0, 0];

  const dimensions = computeOBBDimensions(finalPositions, validCount);

  const info = {
    fileId,
    filename,
    pointCount: numVertices,
    validPointCount: validCount,
    boundingBox: {
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
      size: [
        maxX === -Infinity ? 0 : maxX - minX,
        maxY === -Infinity ? 0 : maxY - minY,
        maxZ === -Infinity ? 0 : maxZ - minZ,
      ],
    },
    centroid,
    dimensions,
  };

  return { positions: finalPositions, colors: finalColors, count: validCount, info };
}

export function computeHeightColors(positions, count) {
  const colors = new Float32Array(count * 3);
  let minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < count; i++) {
    const z = positions[i * 3 + 2];
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  const range = maxZ - minZ || 1;
  for (let i = 0; i < count; i++) {
    const h = (positions[i * 3 + 2] - minZ) / range;
    let r, g, b;
    if (h < 0.25) {
      r = 0; g = 0; b = 1;
    } else if (h < 0.5) {
      const t = (h - 0.25) / 0.25;
      r = 0; g = t; b = 1;
    } else if (h < 0.75) {
      const t = (h - 0.5) / 0.25;
      r = t; g = 1; b = 1 - t;
    } else {
      const t = (h - 0.75) / 0.25;
      r = 1; g = 1 - t; b = 0;
    }
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  return colors;
}
