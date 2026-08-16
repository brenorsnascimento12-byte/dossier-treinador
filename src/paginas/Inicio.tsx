import { Link } from 'react-router-dom';
import { useColecao, useDefinicoes } from '../lib/store';
import { formatar, hoje, maisDias } from '../lib/datas';
import type { Exercicio, Jogador, Jogo, Sessao } from '../lib/types';

export default function Inicio() {
  const defs = useDefinicoes();
  const plantel = useColecao<Jogador>('jogadores');
  const exs = useColecao<Exercicio>('exercicios');
  const sessoes = useColecao<Sessao>('sessoes');
  const jogos = useColecao<Jogo>('jogos');

  const h = hoje();
  const limite = maisDias(h, 21);
  const proximos = [
    ...sessoes
      .filter((s) => s.data >= h && s.data <= limite)
      .map((s) => ({
        id: s.id,
        data: s.data,
        hora: s.hora,
        tipo: 'Treino' as const,
        titulo: s.objetivoGeral || `Sessão ${s.numero ?? ''}`,
        para: '/treinos',
      })),
    ...jogos
      .filter((g) => g.data >= h && g.data <= limite && g.estado === 'agendado')
      .map((g) => ({
        id: g.id,
        data: g.data,
        hora: g.hora,
        tipo: 'Jogo' as const,
        titulo: `${g.casa ? 'vs' : 'em'} ${g.adversario || 'adversário'}`,
        para: '/jogos',
      })),
  ].sort((a, b) => a.data.localeCompare(b.data) || (a.hora ?? '').localeCompare(b.hora ?? ''));

  const lesionados = plantel.filter((j) => j.estado === 'Lesionado');
  const realizados = jogos.filter((g) => g.estado === 'realizado');
  const ultimos = [...realizados].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5);

  const vazio = !plantel.length && !exs.length && !sessoes.length && !jogos.length;

  return (
    <div className="coluna">
      <div className="cartao cartao-p">
        <h2>{defs.clube || 'Bem-vindo ao teu dossier'}</h2>
        <p className="mudo" style={{ marginBottom: 0 }}>
          {defs.equipa || defs.escalao
            ? `${[defs.equipa, defs.escalao].filter(Boolean).join(' · ')} — época ${defs.epoca}`
            : 'Começa por preencher os dados da equipa nas Definições.'}
        </p>
      </div>

      {vazio && (
        <div className="cartao cartao-p">
          <h3>Primeiros passos</h3>
          <ol className="mudo" style={{ paddingLeft: 18, lineHeight: 2 }}>
            <li>
              <Link to="/definicoes" style={{ color: 'var(--acento)', fontWeight: 600 }}>
                Definições
              </Link>{' '}
              — clube, escalão, época e sincronização com o telemóvel.
            </li>
            <li>
              <Link to="/plantel" style={{ color: 'var(--acento)', fontWeight: 600 }}>
                Plantel
              </Link>{' '}
              — adiciona os jogadores.
            </li>
            <li>
              <Link to="/importar" style={{ color: 'var(--acento)', fontWeight: 600 }}>
                Importar
              </Link>{' '}
              — traz os exercícios que já tens, sem escrever tudo à mão.
            </li>
            <li>
              <Link to="/periodizacao" style={{ color: 'var(--acento)', fontWeight: 600 }}>
                Periodização
              </Link>{' '}
              — monta o macrociclo da época.
            </li>
          </ol>
        </div>
      )}

      <div className="grelha g4">
        <Link to="/plantel" className="cartao estat clicavel">
          <div className="v">{plantel.length}</div>
          <div className="r">Jogadores</div>
        </Link>
        <Link to="/exercicios" className="cartao estat clicavel">
          <div className="v">{exs.length}</div>
          <div className="r">Exercícios</div>
        </Link>
        <Link to="/treinos" className="cartao estat clicavel">
          <div className="v">{sessoes.length}</div>
          <div className="r">Sessões de treino</div>
        </Link>
        <Link to="/jogos" className="cartao estat clicavel">
          <div className="v">{realizados.length}</div>
          <div className="r">Jogos realizados</div>
        </Link>
      </div>

      <div className="grelha g2">
        <div className="cartao cartao-p">
          <h3 style={{ marginBottom: 10 }}>Próximas 3 semanas</h3>
          {!proximos.length ? (
            <p className="mudo">Nada agendado.</p>
          ) : (
            <div className="coluna" style={{ gap: 6 }}>
              {proximos.slice(0, 8).map((e) => (
                <Link
                  key={e.tipo + e.id}
                  to={e.para}
                  className="linha"
                  style={{
                    padding: 8,
                    border: '1px solid var(--borda)',
                    borderRadius: 9,
                  }}
                >
                  <span className={'eti ' + (e.tipo === 'Jogo' ? 'amarelo' : 'verde')}>
                    {e.tipo}
                  </span>
                  <span className="truncar" style={{ flex: 1 }}>
                    {e.titulo}
                  </span>
                  <span className="mini">
                    {formatar(e.data).slice(0, 9)} {e.hora ?? ''}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="cartao cartao-p">
          <h3 style={{ marginBottom: 10 }}>Enfermaria</h3>
          {!lesionados.length ? (
            <p className="mudo">Plantel todo disponível. 👏</p>
          ) : (
            <div className="coluna" style={{ gap: 6 }}>
              {lesionados.map((j) => (
                <div key={j.id} className="linha">
                  <span className="eti vermelho">{j.numero ?? '–'}</span>
                  <b className="truncar" style={{ flex: 1 }}>
                    {j.nome}
                  </b>
                  <span className="mini truncar" style={{ maxWidth: 160 }}>
                    {j.notaLesao}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {ultimos.length > 0 && (
        <div className="cartao cartao-p">
          <h3 style={{ marginBottom: 10 }}>Últimos resultados</h3>
          <div className="linha envolve" style={{ gap: 6 }}>
            {ultimos.map((g) => {
              const r =
                (g.golosPro ?? 0) > (g.golosContra ?? 0)
                  ? 'verde'
                  : (g.golosPro ?? 0) === (g.golosContra ?? 0)
                    ? 'amarelo'
                    : 'vermelho';
              return (
                <Link key={g.id} to="/jogos" className={'eti ' + r}>
                  {g.adversario || '—'} {g.golosPro ?? 0}–{g.golosContra ?? 0}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
