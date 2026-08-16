import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PDFPageProxy } from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export interface PaginaPdf {
  numero: number;
  texto: string;
  /** Melhor candidata a desenho do exercício, como data URL. */
  imagem?: string;
  /** A página inteira renderizada, alternativa ao recorte. */
  pagina: string;
}

/**
 * Reconstrói as linhas de texto de uma página a partir dos fragmentos do PDF,
 * agrupando por altura (os fragmentos vêm soltos e fora de ordem).
 */
async function textoDaPagina(page: PDFPageProxy): Promise<string> {
  const conteudo = await page.getTextContent();
  const linhas = new Map<number, { x: number; s: string }[]>();

  for (const item of conteudo.items) {
    if (!('str' in item) || !item.str.trim()) continue;
    const t = item.transform as number[];
    const y = Math.round(t[5] / 4) * 4; // tolerância vertical
    if (!linhas.has(y)) linhas.set(y, []);
    linhas.get(y)!.push({ x: t[4], s: item.str });
  }

  return [...linhas.entries()]
    .sort((a, b) => b[0] - a[0]) // de cima para baixo
    .map(([, frag]) =>
      frag
        .sort((a, b) => a.x - b.x)
        .map((f) => f.s)
        .join('')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .join('\n');
}

/** Converte um bitmap do pdf.js num data URL. */
function bitmapParaDataUrl(
  dados: Uint8ClampedArray | Uint8Array,
  largura: number,
  altura: number,
  canais: number,
): string | undefined {
  const c = document.createElement('canvas');
  c.width = largura;
  c.height = altura;
  const ctx = c.getContext('2d');
  if (!ctx) return undefined;
  const img = ctx.createImageData(largura, altura);
  for (let i = 0, j = 0; i < largura * altura; i++) {
    if (canais === 3) {
      img.data[i * 4] = dados[j++];
      img.data[i * 4 + 1] = dados[j++];
      img.data[i * 4 + 2] = dados[j++];
      img.data[i * 4 + 3] = 255;
    } else {
      img.data[i * 4] = dados[j++];
      img.data[i * 4 + 1] = dados[j++];
      img.data[i * 4 + 2] = dados[j++];
      img.data[i * 4 + 3] = dados[j++];
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/jpeg', 0.85);
}

/** Espera que um objeto de imagem do pdf.js fique disponível. */
function obterObjeto(page: PDFPageProxy, nome: string, msTimeout = 4000) {
  return new Promise<unknown>((resolve) => {
    const t = setTimeout(() => resolve(null), msTimeout);
    try {
      (page.objs as unknown as { get(n: string, cb: (v: unknown) => void): void }).get(
        nome,
        (v) => {
          clearTimeout(t);
          resolve(v);
        },
      );
    } catch {
      clearTimeout(t);
      resolve(null);
    }
  });
}

/** Procura a maior imagem incorporada na página — normalmente o desenho. */
async function maiorImagem(page: PDFPageProxy): Promise<string | undefined> {
  let ops;
  try {
    ops = await page.getOperatorList();
  } catch {
    return undefined;
  }
  const nomes: string[] = [];
  for (let i = 0; i < ops.fnArray.length; i++) {
    if (ops.fnArray[i] === pdfjs.OPS.paintImageXObject) {
      const arg = ops.argsArray[i]?.[0];
      if (typeof arg === 'string') nomes.push(arg);
    }
  }

  let melhor: { area: number; url: string } | undefined;
  for (const nome of nomes.slice(0, 12)) {
    const obj = (await obterObjeto(page, nome)) as
      | { width: number; height: number; data?: Uint8ClampedArray; bitmap?: ImageBitmap }
      | null;
    if (!obj?.width || !obj.height) continue;
    const area = obj.width * obj.height;
    if (area < 10000) continue; // ícones e logótipos não interessam
    if (melhor && area <= melhor.area) continue;

    let url: string | undefined;
    if (obj.bitmap) {
      const c = document.createElement('canvas');
      c.width = obj.width;
      c.height = obj.height;
      c.getContext('2d')?.drawImage(obj.bitmap, 0, 0);
      url = c.toDataURL('image/jpeg', 0.85);
    } else if (obj.data) {
      const canais = obj.data.length / (obj.width * obj.height);
      if (canais === 3 || canais === 4)
        url = bitmapParaDataUrl(obj.data, obj.width, obj.height, Math.round(canais));
    }
    if (url) melhor = { area, url };
  }
  return melhor?.url;
}

async function renderizarPagina(page: PDFPageProxy, larguraAlvo = 1000): Promise<string> {
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: larguraAlvo / base.width });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: ctx, viewport } as never).promise;
  return canvas.toDataURL('image/jpeg', 0.8);
}

export async function lerPdf(
  ficheiro: File,
  aoProgredir?: (feito: number, total: number) => void,
): Promise<PaginaPdf[]> {
  const buffer = await ficheiro.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const paginas: PaginaPdf[] = [];

  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const [texto, pagina, imagem] = [
      await textoDaPagina(page),
      await renderizarPagina(page),
      await maiorImagem(page),
    ];
    paginas.push({ numero: n, texto, pagina, imagem });
    aoProgredir?.(n, doc.numPages);
    page.cleanup();
  }
  await (doc as unknown as { destroy(): Promise<void> }).destroy();
  return paginas;
}
