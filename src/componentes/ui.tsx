import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';

export function Campo({
  label,
  children,
  largo,
}: {
  label: string;
  children: ReactNode;
  largo?: boolean;
}) {
  return (
    <div className={'campo' + (largo ? ' largo' : '')}>
      <label>{label}</label>
      {children}
    </div>
  );
}

export function Texto({
  label,
  valor,
  aoMudar,
  largo,
  tipo = 'text',
  ...rest
}: {
  label: string;
  valor: string | number | undefined;
  aoMudar: (v: string) => void;
  largo?: boolean;
  tipo?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <Campo label={label} largo={largo}>
      <input
        type={tipo}
        value={valor ?? ''}
        onChange={(e: ChangeEvent<HTMLInputElement>) => aoMudar(e.target.value)}
        {...rest}
      />
    </Campo>
  );
}

export function Area({
  label,
  valor,
  aoMudar,
  linhas = 3,
  placeholder,
}: {
  label: string;
  valor?: string;
  aoMudar: (v: string) => void;
  linhas?: number;
  placeholder?: string;
}) {
  return (
    <Campo label={label} largo>
      <textarea
        rows={linhas}
        value={valor ?? ''}
        placeholder={placeholder}
        onChange={(e) => aoMudar(e.target.value)}
      />
    </Campo>
  );
}

export function Escolha<T extends string>({
  label,
  valor,
  opcoes,
  aoMudar,
  largo,
}: {
  label: string;
  valor: T;
  opcoes: readonly T[] | { v: T; t: string }[];
  aoMudar: (v: T) => void;
  largo?: boolean;
}) {
  const norm = (opcoes as unknown[]).map((o) =>
    typeof o === 'string' ? { v: o as T, t: o } : (o as { v: T; t: string }),
  );
  return (
    <Campo label={label} largo={largo}>
      <select value={valor} onChange={(e) => aoMudar(e.target.value as T)}>
        {norm.map((o) => (
          <option key={o.v} value={o.v}>
            {o.t}
          </option>
        ))}
      </select>
    </Campo>
  );
}

export function Modal({
  titulo,
  aoFechar,
  children,
  rodape,
  largo,
}: {
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
  rodape?: ReactNode;
  largo?: boolean;
}) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', f);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', f);
      document.body.style.overflow = overflow;
    };
  }, [aoFechar]);

  return (
    <div
      className="veu"
      onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}
    >
      <div className={'modal' + (largo ? ' largo' : '')} role="dialog">
        <div className="modal-topo">
          <h2>{titulo}</h2>
          <button className="btn fantasma icone" onClick={aoFechar} aria-label="Fechar">
            ✕
          </button>
        </div>
        <div className="modal-corpo">{children}</div>
        {rodape && <div className="modal-fundo">{rodape}</div>}
      </div>
    </div>
  );
}

export function Vazio({
  emo,
  titulo,
  texto,
  acao,
}: {
  emo: string;
  titulo: string;
  texto?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="vazio">
      <span className="emo">{emo}</span>
      <h3>{titulo}</h3>
      {texto && (
        <p className="mudo" style={{ maxWidth: 380, margin: '6px auto 14px' }}>
          {texto}
        </p>
      )}
      {acao}
    </div>
  );
}

export function Estat({
  v,
  r,
  cor,
}: {
  v: ReactNode;
  r: string;
  cor?: string;
}) {
  return (
    <div className="cartao estat">
      <div className="v" style={cor ? { color: cor } : undefined}>
        {v}
      </div>
      <div className="r">{r}</div>
    </div>
  );
}

export function Abas<T extends string>({
  abas,
  ativa,
  aoMudar,
}: {
  abas: readonly T[];
  ativa: T;
  aoMudar: (a: T) => void;
}) {
  return (
    <div className="abas">
      {abas.map((a) => (
        <button
          key={a}
          className={a === ativa ? 'ativo' : ''}
          onClick={() => aoMudar(a)}
        >
          {a}
        </button>
      ))}
    </div>
  );
}

export function Segmentado<T extends string>({
  opcoes,
  valor,
  aoMudar,
}: {
  opcoes: readonly T[] | { v: T; t: string }[];
  valor: T;
  aoMudar: (v: T) => void;
}) {
  const norm = (opcoes as unknown[]).map((o) =>
    typeof o === 'string' ? { v: o as T, t: o } : (o as { v: T; t: string }),
  );
  return (
    <div className="segm">
      {norm.map((o) => (
        <button
          key={o.v}
          className={o.v === valor ? 'ativo' : ''}
          onClick={() => aoMudar(o.v)}
        >
          {o.t}
        </button>
      ))}
    </div>
  );
}

export function Avatar({
  nome,
  foto,
  grande,
}: {
  nome: string;
  foto?: string;
  grande?: boolean;
}) {
  const cls = 'avatar' + (grande ? ' g' : '');
  if (foto) return <img className={cls} src={foto} alt={nome} />;
  const iniciais = nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return <div className={cls}>{iniciais || '?'}</div>;
}

/** Confirmação inline: o botão pede confirmação antes de agir. */
export function BotaoApagar({
  aoConfirmar,
  texto = 'Eliminar',
}: {
  aoConfirmar: () => void;
  texto?: string;
}) {
  const [armado, setArmado] = useState(false);
  useEffect(() => {
    if (!armado) return;
    const t = setTimeout(() => setArmado(false), 4000);
    return () => clearTimeout(t);
  }, [armado]);
  return (
    <button
      className="btn perigo"
      onClick={() => (armado ? aoConfirmar() : setArmado(true))}
    >
      {armado ? 'Confirmar?' : texto}
    </button>
  );
}

/** Selector de imagem que reduz e guarda como data URL (fica dentro do Y.Doc). */
export function SelectorImagem({
  valor,
  aoMudar,
  label,
  max = 512,
}: {
  valor?: string;
  aoMudar: (v: string | undefined) => void;
  label: string;
  max?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);

  function escolher(f: File) {
    const leitor = new FileReader();
    leitor.onload = () => {
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * escala);
        c.height = Math.round(img.height * escala);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        aoMudar(c.toDataURL('image/jpeg', 0.8));
      };
      img.src = leitor.result as string;
    };
    leitor.readAsDataURL(f);
  }

  return (
    <Campo label={label}>
      <div className="linha">
        {valor && (
          <img
            src={valor}
            alt=""
            style={{
              width: 46,
              height: 46,
              borderRadius: 8,
              objectFit: 'cover',
              border: '1px solid var(--borda)',
            }}
          />
        )}
        <button className="btn pq" onClick={() => ref.current?.click()}>
          {valor ? 'Trocar' : 'Escolher'}
        </button>
        {valor && (
          <button className="btn pq fantasma" onClick={() => aoMudar(undefined)}>
            Remover
          </button>
        )}
        <input
          ref={ref}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) escolher(f);
            e.target.value = '';
          }}
        />
      </div>
    </Campo>
  );
}

export function Intensidade({
  valor,
  aoMudar,
  label = 'Intensidade',
}: {
  valor: number;
  aoMudar?: (n: 1 | 2 | 3 | 4 | 5) => void;
  label?: string;
}) {
  return (
    <Campo label={`${label}: ${valor}/5`}>
      <div className="linha" style={{ gap: 4 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            disabled={!aoMudar}
            onClick={() => aoMudar?.(n as 1 | 2 | 3 | 4 | 5)}
            style={{
              flex: 1,
              height: 26,
              borderRadius: 6,
              border: '1px solid var(--borda-forte)',
              cursor: aoMudar ? 'pointer' : 'default',
              background:
                n <= valor
                  ? `color-mix(in srgb, var(--acento) ${45 + n * 11}%, var(--superficie))`
                  : 'var(--superficie)',
            }}
            aria-label={`${label} ${n}`}
          />
        ))}
      </div>
    </Campo>
  );
}
