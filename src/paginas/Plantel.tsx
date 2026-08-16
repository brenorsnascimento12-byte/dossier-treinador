import { useMemo, useState } from 'react';
import {
  Abas,
  Area,
  Avatar,
  BotaoApagar,
  Escolha,
  Modal,
  SelectorImagem,
  Texto,
  Vazio,
} from '../componentes/ui';
import { useColecao, jogadores, novoId } from '../lib/store';
import { idade } from '../lib/datas';
import {
  POSICAO_NOME,
  POSICOES,
  type Jogador,
  type Posicao,
  type Pe,
} from '../lib/types';
import type { Jogo, Sessao } from '../lib/types';

const ESTADOS = ['Disponível', 'Lesionado', 'Castigado', 'Inativo'] as const;
const ESTADO_ETI: Record<string, string> = {
  Disponível: 'verde',
  Lesionado: 'vermelho',
  Castigado: 'amarelo',
  Inativo: '',
};

function novoJogador(): Jogador {
  return {
    id: novoId(),
    nome: '',
    posicao: 'MC',
    posicoesSec: [],
    pe: 'Direito',
    estado: 'Disponível',
    criadoEm: Date.now(),
  };
}

/** Agrupa as posições por linha, para o resumo do plantel. */
const LINHAS: { nome: string; pos: Posicao[] }[] = [
  { nome: 'Guarda-redes', pos: ['GR'] },
  { nome: 'Defesas', pos: ['DD', 'DC', 'DE'] },
  { nome: 'Médios', pos: ['MDC', 'MC', 'MOC'] },
  { nome: 'Avançados', pos: ['ED', 'EE', 'PL'] },
];

export default function Plantel() {
  const lista = useColecao<Jogador>('jogadores');
  const sessoes = useColecao<Sessao>('sessoes');
  const jogos = useColecao<Jogo>('jogos');
  const [procura, setProcura] = useState('');
  const [filtro, setFiltro] = useState<'Todos' | Posicao>('Todos');
  const [edicao, setEdicao] = useState<Jogador | null>(null);
  const [detalhe, setDetalhe] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const p = procura.trim().toLowerCase();
    return lista
      .filter((j) => (filtro === 'Todos' ? true : j.posicao === filtro))
      .filter(
        (j) =>
          !p ||
          j.nome.toLowerCase().includes(p) ||
          (j.alcunha ?? '').toLowerCase().includes(p) ||
          String(j.numero ?? '').includes(p),
      )
      .sort((a, b) => (a.numero ?? 999) - (b.numero ?? 999) || a.nome.localeCompare(b.nome));
  }, [lista, procura, filtro]);

  const jogadorDetalhe = lista.find((j) => j.id === detalhe);

  return (
    <div className="coluna">
      <div className="grelha g4">
        <div className="cartao estat">
          <div className="v">{lista.length}</div>
          <div className="r">Jogadores</div>
        </div>
        <div className="cartao estat">
          <div className="v" style={{ color: 'var(--perigo)' }}>
            {lista.filter((j) => j.estado === 'Lesionado').length}
          </div>
          <div className="r">Lesionados</div>
        </div>
        <div className="cartao estat">
          <div className="v">
            {(() => {
              const idades = lista.map((j) => idade(j.dataNascimento)).filter(Boolean) as number[];
              return idades.length
                ? (idades.reduce((a, b) => a + b, 0) / idades.length).toFixed(1)
                : '—';
            })()}
          </div>
          <div className="r">Idade média</div>
        </div>
        <div className="cartao estat">
          <div className="v">{lista.filter((j) => j.estado === 'Disponível').length}</div>
          <div className="r">Disponíveis</div>
        </div>
      </div>

      <div className="linha envolve sem-imprimir">
        <input
          placeholder="Procurar jogador…"
          value={procura}
          onChange={(e) => setProcura(e.target.value)}
          style={{ maxWidth: 260 }}
        />
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as 'Todos' | Posicao)}
          style={{ width: 'auto' }}
        >
          <option value="Todos">Todas as posições</option>
          {POSICOES.map((p) => (
            <option key={p} value={p}>
              {p} — {POSICAO_NOME[p]}
            </option>
          ))}
        </select>
        <div className="espaco" />
        <button className="btn primario" onClick={() => setEdicao(novoJogador())}>
          + Jogador
        </button>
      </div>

      {!lista.length ? (
        <Vazio
          emo="👥"
          titulo="Plantel vazio"
          texto="Adiciona os teus jogadores para começares a montar convocatórias, presenças e avaliações."
          acao={
            <button className="btn primario" onClick={() => setEdicao(novoJogador())}>
              Adicionar primeiro jogador
            </button>
          }
        />
      ) : (
        <div className="cartao rolar">
          <table className="tabela">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Jogador</th>
                <th>Pos.</th>
                <th>Idade</th>
                <th>Pé</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((j) => (
                <tr
                  key={j.id}
                  className="clicavel"
                  onClick={() => setDetalhe(j.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div className="dorsal">{j.numero ?? '–'}</div>
                  </td>
                  <td>
                    <div className="linha">
                      <Avatar nome={j.nome} foto={j.foto} />
                      <div style={{ minWidth: 0 }}>
                        <b className="truncar">{j.nome || 'Sem nome'}</b>
                        {j.alcunha && <div className="mini">"{j.alcunha}"</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="eti">{j.posicao}</span>
                  </td>
                  <td>{idade(j.dataNascimento) ?? '—'}</td>
                  <td className="mudo">{j.pe}</td>
                  <td>
                    <span className={'eti ' + ESTADO_ETI[j.estado]}>{j.estado}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtrados.length && <p className="vazio mudo">Nenhum jogador corresponde ao filtro.</p>}
        </div>
      )}

      <div className="grelha g2">
        {LINHAS.map((l) => {
          const n = lista.filter((j) => l.pos.includes(j.posicao));
          return (
            <div className="cartao cartao-p" key={l.nome}>
              <div className="linha">
                <h3>{l.nome}</h3>
                <div className="espaco" />
                <span className="eti">{n.length}</span>
              </div>
              <div className="linha envolve" style={{ marginTop: 8, gap: 5 }}>
                {n.length ? (
                  n.map((j) => (
                    <button
                      key={j.id}
                      className="eti clicavel"
                      onClick={() => setDetalhe(j.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      {j.numero ? `${j.numero} · ` : ''}
                      {j.alcunha || j.nome.split(' ')[0]}
                    </button>
                  ))
                ) : (
                  <span className="mini">Sem jogadores</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {edicao && (
        <EditorJogador
          jogador={edicao}
          aoFechar={() => setEdicao(null)}
          aoGuardar={(j) => {
            jogadores.guardar(j);
            setEdicao(null);
          }}
        />
      )}

      {jogadorDetalhe && (
        <FichaJogador
          jogador={jogadorDetalhe}
          sessoes={sessoes}
          jogos={jogos}
          aoFechar={() => setDetalhe(null)}
          aoEditar={() => {
            setEdicao(jogadorDetalhe);
            setDetalhe(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function EditorJogador({
  jogador,
  aoFechar,
  aoGuardar,
}: {
  jogador: Jogador;
  aoFechar: () => void;
  aoGuardar: (j: Jogador) => void;
}) {
  const [j, setJ] = useState(jogador);
  const p = <K extends keyof Jogador>(k: K, v: Jogador[K]) => setJ((a) => ({ ...a, [k]: v }));
  const [aba, setAba] = useState<'Identificação' | 'Contactos' | 'Avaliação'>('Identificação');

  return (
    <Modal
      titulo={jogador.nome ? `Editar ${jogador.nome}` : 'Novo jogador'}
      aoFechar={aoFechar}
      rodape={
        <>
          <button className="btn" onClick={aoFechar}>
            Cancelar
          </button>
          <button
            className="btn primario"
            disabled={!j.nome.trim()}
            onClick={() => aoGuardar(j)}
          >
            Guardar
          </button>
        </>
      }
    >
      <Abas
        abas={['Identificação', 'Contactos', 'Avaliação'] as const}
        ativa={aba}
        aoMudar={setAba}
      />

      {aba === 'Identificação' && (
        <div className="forma">
          <SelectorImagem
            label="Fotografia"
            valor={j.foto}
            aoMudar={(v) => p('foto', v)}
            max={320}
          />
          <Texto label="Nome completo" valor={j.nome} aoMudar={(v) => p('nome', v)} largo />
          <Texto label="Alcunha" valor={j.alcunha} aoMudar={(v) => p('alcunha', v)} />
          <Texto
            label="Número"
            tipo="number"
            valor={j.numero}
            aoMudar={(v) => p('numero', v === '' ? undefined : Number(v))}
            min={1}
            max={99}
          />
          <Escolha
            label="Posição principal"
            valor={j.posicao}
            opcoes={POSICOES.map((x) => ({ v: x, t: `${x} — ${POSICAO_NOME[x]}` }))}
            aoMudar={(v) => p('posicao', v)}
          />
          <Escolha
            label="Pé preferido"
            valor={j.pe}
            opcoes={['Direito', 'Esquerdo', 'Ambos'] as Pe[]}
            aoMudar={(v) => p('pe', v)}
          />
          <div className="campo largo">
            <label>Posições secundárias</label>
            <div className="linha envolve" style={{ gap: 5 }}>
              {POSICOES.filter((x) => x !== j.posicao).map((x) => {
                const on = j.posicoesSec.includes(x);
                return (
                  <button
                    key={x}
                    className={'eti clicavel' + (on ? ' azul' : '')}
                    style={{ cursor: 'pointer' }}
                    onClick={() =>
                      p(
                        'posicoesSec',
                        on ? j.posicoesSec.filter((y) => y !== x) : [...j.posicoesSec, x],
                      )
                    }
                  >
                    {x}
                  </button>
                );
              })}
            </div>
          </div>
          <Texto
            label="Data de nascimento"
            tipo="date"
            valor={j.dataNascimento}
            aoMudar={(v) => p('dataNascimento', v)}
          />
          <Texto
            label="Altura (cm)"
            tipo="number"
            valor={j.altura}
            aoMudar={(v) => p('altura', v === '' ? undefined : Number(v))}
          />
          <Texto
            label="Peso (kg)"
            tipo="number"
            valor={j.peso}
            aoMudar={(v) => p('peso', v === '' ? undefined : Number(v))}
          />
          <Escolha
            label="Estado"
            valor={j.estado}
            opcoes={ESTADOS}
            aoMudar={(v) => p('estado', v)}
          />
          {j.estado === 'Lesionado' && (
            <Area
              label="Nota da lesão"
              valor={j.notaLesao}
              aoMudar={(v) => p('notaLesao', v)}
              linhas={2}
              placeholder="Tipo de lesão, previsão de regresso…"
            />
          )}
        </div>
      )}

      {aba === 'Contactos' && (
        <div className="forma">
          <Texto label="Telemóvel" valor={j.contacto} aoMudar={(v) => p('contacto', v)} />
          <Texto label="Email" tipo="email" valor={j.email} aoMudar={(v) => p('email', v)} />
          <Texto
            label="Encarregado de educação"
            valor={j.encarregado}
            aoMudar={(v) => p('encarregado', v)}
          />
          <Texto
            label="Contacto do encarregado"
            valor={j.contactoEncarregado}
            aoMudar={(v) => p('contactoEncarregado', v)}
          />
        </div>
      )}

      {aba === 'Avaliação' && (
        <div className="forma">
          <Area
            label="Pontos fortes"
            valor={j.pontosFortes}
            aoMudar={(v) => p('pontosFortes', v)}
          />
          <Area
            label="Aspetos a melhorar"
            valor={j.pontosMelhorar}
            aoMudar={(v) => p('pontosMelhorar', v)}
          />
          <Area
            label="Observações gerais"
            valor={j.observacoes}
            aoMudar={(v) => p('observacoes', v)}
            linhas={4}
          />
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------

function FichaJogador({
  jogador: j,
  sessoes,
  jogos,
  aoFechar,
  aoEditar,
}: {
  jogador: Jogador;
  sessoes: Sessao[];
  jogos: Jogo[];
  aoFechar: () => void;
  aoEditar: () => void;
}) {
  const presencas = sessoes.filter((s) => s.presencas?.[j.id]);
  const presente = presencas.filter((s) => s.presencas[j.id] === 'presente').length;
  const taxa = presencas.length ? Math.round((presente / presencas.length) * 100) : null;

  const realizados = jogos.filter((g) => g.estado === 'realizado');
  const convocado = realizados.filter((g) => g.convocados?.includes(j.id)).length;
  const titular = realizados.filter((g) => g.onze?.includes(j.id)).length;
  const minutos = realizados.reduce((a, g) => a + (g.minutos?.[j.id] ?? 0), 0);
  const golos = realizados.reduce(
    (a, g) => a + (g.eventos ?? []).filter((e) => e.tipo === 'golo' && e.jogadorId === j.id).length,
    0,
  );
  const assist = realizados.reduce(
    (a, g) =>
      a + (g.eventos ?? []).filter((e) => e.tipo === 'assistencia' && e.jogadorId === j.id).length,
    0,
  );
  const amarelos = realizados.reduce(
    (a, g) =>
      a + (g.eventos ?? []).filter((e) => e.tipo === 'amarelo' && e.jogadorId === j.id).length,
    0,
  );
  const notas = realizados.map((g) => g.avaliacoes?.[j.id]).filter(Boolean) as number[];
  const media = notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1) : '—';

  return (
    <Modal
      titulo="Ficha de jogador"
      aoFechar={aoFechar}
      largo
      rodape={
        <>
          <BotaoApagar
            aoConfirmar={() => {
              jogadores.remover(j.id);
              aoFechar();
            }}
          />
          <div className="espaco" />
          <button className="btn" onClick={() => window.print()}>
            Imprimir
          </button>
          <button className="btn primario" onClick={aoEditar}>
            Editar
          </button>
        </>
      }
    >
      <div className="linha linha-topo" style={{ gap: 14, marginBottom: 16 }}>
        <Avatar nome={j.nome} foto={j.foto} grande />
        <div style={{ minWidth: 0 }}>
          <h2>{j.nome}</h2>
          <div className="linha envolve" style={{ marginTop: 6, gap: 5 }}>
            {j.numero != null && <span className="eti">#{j.numero}</span>}
            <span className="eti azul">{POSICAO_NOME[j.posicao]}</span>
            {j.posicoesSec.map((p) => (
              <span key={p} className="eti">
                {p}
              </span>
            ))}
            <span className={'eti ' + ESTADO_ETI[j.estado]}>{j.estado}</span>
          </div>
          <p className="mudo" style={{ marginTop: 8 }}>
            {[
              idade(j.dataNascimento) != null ? `${idade(j.dataNascimento)} anos` : null,
              j.altura ? `${j.altura} cm` : null,
              j.peso ? `${j.peso} kg` : null,
              `pé ${j.pe.toLowerCase()}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>

      {j.estado === 'Lesionado' && j.notaLesao && (
        <div
          className="cartao cartao-p"
          style={{ background: 'var(--perigo-suave)', borderColor: 'transparent', marginBottom: 14 }}
        >
          <b>Lesão:</b> {j.notaLesao}
        </div>
      )}

      <div className="grelha g4" style={{ marginBottom: 14 }}>
        <div className="cartao estat">
          <div className="v">{taxa != null ? `${taxa}%` : '—'}</div>
          <div className="r">Assiduidade ({presente}/{presencas.length})</div>
        </div>
        <div className="cartao estat">
          <div className="v">
            {titular}/{convocado}
          </div>
          <div className="r">Titular / convocado</div>
        </div>
        <div className="cartao estat">
          <div className="v">{minutos}'</div>
          <div className="r">Minutos jogados</div>
        </div>
        <div className="cartao estat">
          <div className="v">{golos}</div>
          <div className="r">Golos</div>
        </div>
        <div className="cartao estat">
          <div className="v">{assist}</div>
          <div className="r">Assistências</div>
        </div>
        <div className="cartao estat">
          <div className="v" style={{ color: 'var(--aviso)' }}>
            {amarelos}
          </div>
          <div className="r">Cartões amarelos</div>
        </div>
        <div className="cartao estat">
          <div className="v">{media}</div>
          <div className="r">Avaliação média</div>
        </div>
      </div>

      <div className="grelha g2">
        {(
          [
            ['Pontos fortes', j.pontosFortes],
            ['A melhorar', j.pontosMelhorar],
            ['Observações', j.observacoes],
            [
              'Contactos',
              [
                j.contacto,
                j.email,
                j.encarregado && `Enc.: ${j.encarregado}`,
                j.contactoEncarregado,
              ]
                .filter(Boolean)
                .join('\n'),
            ],
          ] as [string, string | undefined][]
        )
          .filter(([, v]) => v?.trim())
          .map(([t, v]) => (
            <div className="cartao cartao-p" key={t}>
              <h3 style={{ marginBottom: 6 }}>{t}</h3>
              <p className="mudo" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {v}
              </p>
            </div>
          ))}
      </div>
    </Modal>
  );
}
