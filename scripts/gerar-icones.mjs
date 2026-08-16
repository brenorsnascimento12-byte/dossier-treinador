/**
 * Gera os ícones PNG da PWA sem dependências externas.
 * Desenha um campo verde com uma bola, pixel a pixel, e codifica em PNG
 * com o zlib do Node.
 *
 *   node scripts/gerar-icones.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

function crc32(buf) {
  let c;
  const tabela = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabela[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = tabela[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pedaco(tipo, dados) {
  const comp = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const tam = Buffer.alloc(4);
  tam.writeUInt32BE(dados.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(comp));
  return Buffer.concat([tam, comp, crc]);
}

function png(largura, altura, rgba) {
  const linhas = [];
  for (let y = 0; y < altura; y++) {
    linhas.push(Buffer.from([0])); // filtro "none"
    linhas.push(rgba.subarray(y * largura * 4, (y + 1) * largura * 4));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8; // profundidade
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pedaco('IHDR', ihdr),
    pedaco('IDAT', deflateSync(Buffer.concat(linhas), { level: 9 })),
    pedaco('IEND', Buffer.alloc(0)),
  ]);
}

/** Cobertura anti-aliased de um disco, por super-amostragem 3x3. */
function cobertura(px, py, cx, cy, r) {
  let n = 0;
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      const x = px + (i + 0.5) / 3;
      const y = py + (j + 0.5) / 3;
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) n++;
    }
  return n / 9;
}

function misturar(dados, i, [r, g, b], a) {
  dados[i] = Math.round(dados[i] * (1 - a) + r * a);
  dados[i + 1] = Math.round(dados[i + 1] * (1 - a) + g * a);
  dados[i + 2] = Math.round(dados[i + 2] * (1 - a) + b * a);
  dados[i + 3] = 255;
}

function desenhar(tamanho) {
  const d = Buffer.alloc(tamanho * tamanho * 4);
  const c = tamanho / 2;

  for (let y = 0; y < tamanho; y++) {
    for (let x = 0; x < tamanho; x++) {
      const i = (y * tamanho + x) * 4;
      // Fundo verde com faixas de relva, como um campo.
      const faixa = Math.floor((y / tamanho) * 6) % 2;
      misturar(d, i, faixa ? [22, 138, 65] : [26, 156, 74], 1);
    }
  }

  // Linha de meio-campo e círculo central, subtis.
  for (let y = 0; y < tamanho; y++) {
    for (let x = 0; x < tamanho; x++) {
      const i = (y * tamanho + x) * 4;
      const dist = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      const anel = Math.abs(dist - tamanho * 0.38);
      if (anel < tamanho * 0.012) misturar(d, i, [255, 255, 255], 0.28);
      if (Math.abs(y + 0.5 - c) < tamanho * 0.008) misturar(d, i, [255, 255, 255], 0.22);
    }
  }

  // Bola central.
  const rBola = tamanho * 0.26;
  for (let y = 0; y < tamanho; y++) {
    for (let x = 0; x < tamanho; x++) {
      const i = (y * tamanho + x) * 4;
      const a = cobertura(x, y, c, c, rBola);
      if (a > 0) misturar(d, i, [255, 255, 255], a);
    }
  }

  // Pentágonos da bola: um central e cinco à volta.
  const manchas = [[c, c, rBola * 0.34]];
  for (let k = 0; k < 5; k++) {
    const ang = (k / 5) * Math.PI * 2 - Math.PI / 2;
    manchas.push([
      c + Math.cos(ang) * rBola * 0.66,
      c + Math.sin(ang) * rBola * 0.66,
      rBola * 0.2,
    ]);
  }
  for (const [mx, my, mr] of manchas) {
    for (let y = 0; y < tamanho; y++) {
      for (let x = 0; x < tamanho; x++) {
        const a = cobertura(x, y, mx, my, mr);
        if (a > 0) misturar(d, (y * tamanho + x) * 4, [15, 23, 42], a);
      }
    }
  }

  return png(tamanho, tamanho, d);
}

mkdirSync(join(raiz, 'public'), { recursive: true });
for (const t of [192, 512]) {
  writeFileSync(join(raiz, 'public', `icone-${t}.png`), desenhar(t));
  console.log(`public/icone-${t}.png`);
}
