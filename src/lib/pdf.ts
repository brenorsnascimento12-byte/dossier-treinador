import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PDFPageProxy } from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/** Um fragmento de texto do PDF, com a posição onde aparece na página. */
export interface ItemTexto {
  str: string;
  /** Origem no canto inferior esquerdo da página, em pontos. */
  x: number;
  y: number;
  largura: number;
}

export interface PaginaPdf {
  numero: number;
  texto: string;
  /** Fragmentos com coordenadas — necessários para ler layouts em colunas. */
  itens: ItemTexto[];
  /** Dimensões da página em pontos, para converter coordenadas. */
  largura: number;
  altura: number;
  /** Melhor candidata a desenho do exercício, como data URL. */
  imagem?: string;
  /** A página inteira renderizada, alternativa ao recorte. */
  pagina: string;
  /** Nome do ficheiro de origem, para o utilizador se orientar. */
  ficheiro?: string;
}

/**
 * Reconstrói as linhas de texto de uma página a partir dos fragmentos do PDF,
 * agrupando por altura (os fragmentos vêm soltos e fora de ordem).
 */
async function textoDaPagina(
  page: PDFPageProxy,
): Promise<{ texto: string; itens: ItemTexto[] }> {
  const conteudo = await page.getTextContent();
  const linhas = new Map<number, { x: number; s: string }[]>();
  const itens: ItemTexto[] = [];

  for (const item of conteudo.items) {
    if (!('str' in item) || !item.str.trim()) continue;
    const t = item.transform as number[];
    itens.push({ str: item.str, x: t[4], y: t[5], largura: item.width ?? 0 });
    const y = Math.round(t[5] / 4) * 4; // tolerância vertical
    if (!linhas.has(y)) linhas.set(y, []);
    linhas.get(y)!.push({ x: t[4], s: item.str });
  }

  const texto = [...linhas.entries()]
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

  return { texto, itens };
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
function obterObjeto(page: PDFPageProxy, nome: string, msTimeout = 1200) {
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
  for (const nome of nomes.slice(0, 6)) {
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

/** Quantas renderizações decorrem, para só repor o rAF no fim de todas. */
let aRenderizar = 0;
let rafOriginal: typeof window.requestAnimationFrame | null = null;
let cancelOriginal: typeof window.cancelAnimationFrame | null = null;

/**
 * Com o separador em segundo plano o browser deixa de disparar
 * `requestAnimationFrame`, e o pdf.js fica à espera dele para desenhar.
 * Importar dezenas de planos demora, e é natural mudar de separador entretanto
 * — por isso, enquanto desenhamos, trocamos o rAF por um temporizador.
 */
function abrirModoSegundoPlano() {
  if (aRenderizar++ > 0) return;
  rafOriginal = window.requestAnimationFrame;
  cancelOriginal = window.cancelAnimationFrame;
  window.requestAnimationFrame = ((cb: FrameRequestCallback) =>
    window.setTimeout(() => cb(performance.now()), 16)) as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame = ((id: number) =>
    window.clearTimeout(id)) as typeof window.cancelAnimationFrame;
}

function fecharModoSegundoPlano() {
  if (--aRenderizar > 0) return;
  if (rafOriginal) window.requestAnimationFrame = rafOriginal;
  if (cancelOriginal) window.cancelAnimationFrame = cancelOriginal;
  rafOriginal = null;
  cancelOriginal = null;
}

async function renderizarPagina(page: PDFPageProxy, larguraAlvo = 1000): Promise<string> {
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: larguraAlvo / base.width });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);

  abrirModoSegundoPlano();
  try {
    // Passar `canvas` e `canvasContext` ao mesmo tempo bloqueia o pdf.js: o
    // contexto só pode ser usado quando `canvas` é null. Damos só o canvas.
    await page.render({ canvas, viewport, background: '#ffffff' }).promise;
  } finally {
    fecharModoSegundoPlano();
  }
  return canvas.toDataURL('image/jpeg', 0.8);
}

/** Lê um PDF e devolve uma entrada por página. */
export async function lerPdf(
  ficheiro: File,
  aoProgredir?: (feito: number, total: number) => void,
  /**
   * Procurar a maior imagem incorporada em cada pagina. E lento (obriga a
   * percorrer a lista de operadores e a esperar por cada objeto), por isso so
   * se usa quando o formato do PDF e desconhecido e nao ha recorte melhor.
   */
  extrairImagens = false,
): Promise<PaginaPdf[]> {
  const buffer = await ficheiro.arrayBuffer();
  // `destroy()` pertence à tarefa de carregamento, não ao documento.
  const tarefa = pdfjs.getDocument({ data: buffer });
  const paginas: PaginaPdf[] = [];

  try {
    const doc = await tarefa.promise;
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      try {
        const { texto, itens } = await textoDaPagina(page);
        const vista = page.getViewport({ scale: 1 });
        paginas.push({
          numero: n,
          ficheiro: ficheiro.name,
          texto,
          itens,
          largura: vista.width,
          altura: vista.height,
          pagina: await renderizarPagina(page),
          imagem: extrairImagens ? await maiorImagem(page) : undefined,
        });
      } finally {
        page.cleanup();
      }
      aoProgredir?.(n, doc.numPages);
    }
  } finally {
    // Liberta o worker mesmo que uma página rebente a meio.
    await tarefa.destroy().catch(() => {});
  }

  return paginas;
}

/** Lê vários PDFs de seguida, mantendo a ordem dos ficheiros escolhidos. */
export async function lerPdfs(
  ficheiros: File[],
  aoProgredir?: (info: {
    ficheiro: string;
    indice: number;
    total: number;
    pagina: number;
    paginas: number;
  }) => void,
): Promise<PaginaPdf[]> {
  const todas: PaginaPdf[] = [];
  const erros: string[] = [];

  for (let i = 0; i < ficheiros.length; i++) {
    const f = ficheiros[i];
    try {
      const paginas = await lerPdf(f, (pagina, paginas_) =>
        aoProgredir?.({
          ficheiro: f.name,
          indice: i + 1,
          total: ficheiros.length,
          pagina,
          paginas: paginas_,
        }),
      );
      todas.push(...paginas);
    } catch (e) {
      // Um PDF corrompido não deve impedir a importação dos restantes.
      erros.push(`${f.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (erros.length && !todas.length) throw new Error(erros.join('\n'));
  if (erros.length) console.warn('PDFs ignorados:\n' + erros.join('\n'));
  return todas;
}

/**
 * Recorta uma área da página já renderizada.
 * A caixa vem em pontos do PDF, com a origem no canto superior esquerdo.
 */
export function recortar(
  paginaDataUrl: string,
  larguraPdf: number,
  caixa: { x: number; y: number; w: number; h: number },
): Promise<string | undefined> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = () => resolve(undefined);
    img.onload = () => {
      const escala = img.width / larguraPdf;
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(caixa.w * escala));
      c.height = Math.max(1, Math.round(caixa.h * escala));
      const ctx = c.getContext('2d');
      if (!ctx) return resolve(undefined);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(
        img,
        caixa.x * escala,
        caixa.y * escala,
        caixa.w * escala,
        caixa.h * escala,
        0,
        0,
        c.width,
        c.height,
      );
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.src = paginaDataUrl;
  });
}
