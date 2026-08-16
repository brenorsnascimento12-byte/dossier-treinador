import { useState } from 'react';
import {
  Area,
  BotaoApagar,
  Escolha,
  Modal,
  Segmentado,
  Texto,
  Vazio,
} from '../componentes/ui';
import { novoId, observacoes, reunioes, useColecao } from '../lib/store';
import { formatar, hoje } from '../lib/datas';
import type { Observacao, Reuniao } from '../lib/types';

export default function Observacoes() {
  const [modo, setModo] = useState<'Observações' | 'Reuniões'>('Observações');
  return (
    <div className="coluna">
      <div className="linha sem-imprimir">
        <Segmentado
          opcoes={['Observações', 'Reuniões'] as const}
          valor={modo}
          aoMudar={setModo}
        />
      </div>
      {modo === 'Observações' ? <ListaObservacoes /> : <ListaReunioes />}
    </div>
  );
}

// ---------------------------------------------------------------------------

function ListaObservacoes() {
  const lista = useColecao<Observacao>('observacoes');
  const [edicao, setEdicao] = useState<Observacao | null>(null);

  function criar(tipo: Observacao['tipo']) {
    setEdicao({
      id: novoId(),
      tipo,
      titulo: '',
      data: hoje(),
      criadoEm: Date.now(),
    });
  }

  return (
    <>
      <div className="linha envolve sem-imprimir">
        <div className="espaco" />
        <button className="btn" onClick={() => criar('jogador')}>
          + Observar jogador
        </button>
        <button className="btn primario" onClick={() => criar('adversario')}>
          + Observar adversário
        </button>
      </div>

      {!lista.length ? (
        <Vazio
          emo="🔍"
          titulo="Sem observações"
          texto="Regista o que vês nos jogos do adversário ou em jogadores que estás a seguir."
          acao={
            <button className="btn primario" onClick={() => criar('adversario')}>
              Nova observação
            </button>
          }
        />
      ) : (
        <div className="grelha g2">
          {[...lista]
            .sort((a, b) => b.data.localeCompare(a.data))
            .map((o) => (
              <button
                key={o.id}
                className="cartao cartao-p clicavel"
                onClick={() => setEdicao(o)}
                style={{ textAlign: 'left', font: 'inherit', color: 'inherit', cursor: 'pointer' }}
              >
                <div className="linha">
                  <span className={'eti ' + (o.tipo === 'adversario' ? 'amarelo' : 'azul')}>
                    {o.tipo === 'adversario' ? 'Adversário' : 'Jogador'}
                  </span>
                  <div className="espaco" />
                  <span className="mini">{formatar(o.data)}</span>
                </div>
                <h3 style={{ marginTop: 8 }}>{o.titulo || 'Sem título'}</h3>
                {o.sistema && <span className="eti">{o.sistema}</span>}
                {o.conclusoes && (
                  <p className="mudo truncar" style={{ marginBottom: 0 }}>
                    {o.conclusoes}
                  </p>
                )}
              </button>
            ))}
        </div>
      )}

      {edicao && <EditorObservacao o={edicao} aoFechar={() => setEdicao(null)} />}
    </>
  );
}

function EditorObservacao({ o, aoFechar }: { o: Observacao; aoFechar: () => void }) {
  const [x, setX] = useState(o);
  const p = <K extends keyof Observacao>(k: K, v: Observacao[K]) =>
    setX((a) => ({ ...a, [k]: v }));
  const adversario = x.tipo === 'adversario';

  return (
    <Modal
      titulo={adversario ? 'Observação de adversário' : 'Observação de jogador'}
      aoFechar={aoFechar}
      largo
      rodape={
        <>
          <BotaoApagar
            aoConfirmar={() => {
              observacoes.remover(x.id);
              aoFechar();
            }}
          />
          <div className="espaco" />
          <button className="btn" onClick={() => window.print()}>
            Imprimir
          </button>
          <button
            className="btn primario"
            onClick={() => {
              observacoes.guardar(x);
              aoFechar();
            }}
          >
            Guardar
          </button>
        </>
      }
    >
      <div className="forma">
        <Texto
          label={adversario ? 'Equipa observada' : 'Jogador observado'}
          valor={x.titulo}
          aoMudar={(v) => p('titulo', v)}
          largo
        />
        <Texto label="Data" tipo="date" valor={x.data} aoMudar={(v) => p('data', v)} />
        <Escolha
          label="Tipo"
          valor={x.tipo}
          opcoes={[
            { v: 'adversario' as const, t: 'Adversário' },
            { v: 'jogador' as const, t: 'Jogador' },
          ]}
          aoMudar={(v) => p('tipo', v)}
        />
        <Texto
          label="Contexto"
          valor={x.contexto}
          aoMudar={(v) => p('contexto', v)}
          placeholder="ex.: jornada 12, em casa, relvado sintético"
        />
        <Texto
          label="Sistema tático"
          valor={x.sistema}
          aoMudar={(v) => p('sistema', v)}
          placeholder="ex.: 1-4-4-2"
        />
        <Area
          label="Organização ofensiva"
          valor={x.organizacaoOfensiva}
          aoMudar={(v) => p('organizacaoOfensiva', v)}
        />
        <Area
          label="Organização defensiva"
          valor={x.organizacaoDefensiva}
          aoMudar={(v) => p('organizacaoDefensiva', v)}
        />
        <Area label="Transições" valor={x.transicoes} aoMudar={(v) => p('transicoes', v)} />
        <Area
          label="Bolas paradas"
          valor={x.bolasParadas}
          aoMudar={(v) => p('bolasParadas', v)}
        />
        <Area
          label={adversario ? 'Jogadores em destaque' : 'Características observadas'}
          valor={x.jogadoresDestaque}
          aoMudar={(v) => p('jogadoresDestaque', v)}
        />
        <Area
          label="Conclusões e plano"
          valor={x.conclusoes}
          aoMudar={(v) => p('conclusoes', v)}
          linhas={5}
        />
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

function ListaReunioes() {
  const lista = useColecao<Reuniao>('reunioes');
  const [edicao, setEdicao] = useState<Reuniao | null>(null);

  return (
    <>
      <div className="linha sem-imprimir">
        <div className="espaco" />
        <button
          className="btn primario"
          onClick={() =>
            setEdicao({ id: novoId(), data: hoje(), titulo: '', criadoEm: Date.now() })
          }
        >
          + Reunião
        </button>
      </div>

      {!lista.length ? (
        <Vazio
          emo="🗒️"
          titulo="Sem reuniões registadas"
          texto="Guarda o que foi falado com a equipa técnica, direção ou jogadores."
        />
      ) : (
        <div className="coluna" style={{ gap: 8 }}>
          {[...lista]
            .sort((a, b) => b.data.localeCompare(a.data))
            .map((r) => (
              <button
                key={r.id}
                className="cartao cartao-p clicavel linha"
                onClick={() => setEdicao(r)}
                style={{ textAlign: 'left', font: 'inherit', color: 'inherit', cursor: 'pointer' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b className="truncar">{r.titulo || 'Sem título'}</b>
                  <div className="mini truncar">{r.participantes}</div>
                </div>
                <span className="mini">{formatar(r.data)}</span>
              </button>
            ))}
        </div>
      )}

      {edicao && (
        <Modal
          titulo="Reunião"
          aoFechar={() => setEdicao(null)}
          rodape={
            <>
              <BotaoApagar
                aoConfirmar={() => {
                  reunioes.remover(edicao.id);
                  setEdicao(null);
                }}
              />
              <div className="espaco" />
              <button className="btn" onClick={() => window.print()}>
                Imprimir
              </button>
              <button
                className="btn primario"
                onClick={() => {
                  reunioes.guardar(edicao);
                  setEdicao(null);
                }}
              >
                Guardar
              </button>
            </>
          }
        >
          <div className="forma">
            <Texto
              label="Assunto"
              valor={edicao.titulo}
              aoMudar={(v) => setEdicao({ ...edicao, titulo: v })}
              largo
            />
            <Texto
              label="Data"
              tipo="date"
              valor={edicao.data}
              aoMudar={(v) => setEdicao({ ...edicao, data: v })}
            />
            <Texto
              label="Participantes"
              valor={edicao.participantes}
              aoMudar={(v) => setEdicao({ ...edicao, participantes: v })}
            />
            <Area
              label="Assuntos tratados"
              valor={edicao.assuntos}
              aoMudar={(v) => setEdicao({ ...edicao, assuntos: v })}
              linhas={7}
            />
            <Area
              label="Decisões e ações"
              valor={edicao.decisoes}
              aoMudar={(v) => setEdicao({ ...edicao, decisoes: v })}
              linhas={5}
            />
          </div>
        </Modal>
      )}
    </>
  );
}
