import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Area, Campo, SelectorImagem, Texto } from '../componentes/ui';
import {
  aplicarConvite,
  arrancarSync,
  codigo,
  estadoSync,
  guardarConfigSync,
  lerConfigSync,
  pararSync,
  SERVIDORES_PADRAO,
  subscreverSync,
  testarServidor,
  type EstadoSync,
} from '../lib/doc';
import {
  exportarTudo,
  guardarDefinicoes,
  importarTudo,
  useColecao,
  useDefinicoes,
} from '../lib/store';
import type { Exercicio, Jogador, Jogo, Sessao } from '../lib/types';

export default function Definicoes() {
  const defs = useDefinicoes();
  const [cfg, setCfg] = useState(lerConfigSync());
  const [sync, setSync] = useState<EstadoSync>(estadoSync());
  const [qr, setQr] = useState<string | null>(null);
  const [convite, setConvite] = useState('');
  const [avancado, setAvancado] = useState(false);
  const [testes, setTestes] = useState<Record<string, boolean | null>>({});
  const [aTestar, setATestar] = useState(false);

  async function testarTodos() {
    setATestar(true);
    setTestes(Object.fromEntries(cfg.servidores.map((s) => [s, null])));
    const resultados = await Promise.all(
      cfg.servidores.map(async (s) => [s, await testarServidor(s)] as const),
    );
    setTestes(Object.fromEntries(resultados));
    setATestar(false);
  }

  const plantel = useColecao<Jogador>('jogadores');
  const exs = useColecao<Exercicio>('exercicios');
  const sessoes = useColecao<Sessao>('sessoes');
  const jogos = useColecao<Jogo>('jogos');

  useEffect(() => subscreverSync(setSync), []);

  const urlConvite =
    cfg.sala && cfg.chave
      ? `${location.origin}${location.pathname}#par=${cfg.sala}.${cfg.chave}`
      : '';

  useEffect(() => {
    if (!urlConvite) {
      setQr(null);
      return;
    }
    QRCode.toDataURL(urlConvite, { width: 320, margin: 1 }).then(setQr).catch(() => setQr(null));
  }, [urlConvite]);

  function criarLigacao() {
    const novo = { ...cfg, ativo: true, sala: codigo(8), chave: codigo(14) };
    setCfg(novo);
    guardarConfigSync(novo);
    arrancarSync(novo);
  }

  function desligar() {
    const novo = { ...cfg, ativo: false };
    setCfg(novo);
    guardarConfigSync(novo);
    pararSync();
  }

  function exportar() {
    const dados = exportarTudo();
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dossier-${defs.clube || 'equipa'}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importar(f: File, substituir: boolean) {
    const l = new FileReader();
    l.onload = () => {
      try {
        importarTudo(JSON.parse(l.result as string), substituir);
        alert('Backup importado.');
      } catch {
        alert('Ficheiro inválido.');
      }
    };
    l.readAsText(f);
  }

  const estadoTxt = sync.erro
    ? `Erro: ${sync.erro}`
    : !cfg.ativo
      ? 'Desligada — os dados ficam só neste dispositivo'
      : sync.pares > 0
        ? `Ligado a ${sync.pares} dispositivo(s)`
        : 'Ativa, à espera do outro dispositivo';

  return (
    <div className="coluna">
      <div className="cartao cartao-p">
        <h2 style={{ marginBottom: 12 }}>Equipa</h2>
        <div className="forma">
          <SelectorImagem
            label="Emblema"
            valor={defs.emblema}
            aoMudar={(v) => guardarDefinicoes({ emblema: v })}
            max={200}
          />
          <Texto
            label="Clube"
            valor={defs.clube}
            aoMudar={(v) => guardarDefinicoes({ clube: v })}
          />
          <Texto
            label="Equipa"
            valor={defs.equipa}
            aoMudar={(v) => guardarDefinicoes({ equipa: v })}
            placeholder="ex.: Equipa A"
          />
          <Texto
            label="Escalão"
            valor={defs.escalao}
            aoMudar={(v) => guardarDefinicoes({ escalao: v })}
            placeholder="ex.: Sub-15"
          />
          <Texto
            label="Época"
            valor={defs.epoca}
            aoMudar={(v) => guardarDefinicoes({ epoca: v })}
          />
          <Texto
            label="Treinador"
            valor={defs.treinador}
            aoMudar={(v) => guardarDefinicoes({ treinador: v })}
          />
          <Campo label="Cor principal">
            <input
              type="color"
              value={defs.corPrimaria}
              onChange={(e) => guardarDefinicoes({ corPrimaria: e.target.value })}
            />
          </Campo>
        </div>
      </div>

      {/* ------------------------------------------------ sincronização */}
      <div className="cartao cartao-p">
        <div className="linha" style={{ marginBottom: 6 }}>
          <h2>Sincronização entre dispositivos</h2>
          <div className="espaco" />
          <span className={'ponto ' + (sync.erro ? 'erro' : sync.pares ? 'on' : 'off')} />
        </div>
        <p className="mudo">{estadoTxt}</p>

        <div
          className="cartao cartao-p"
          style={{ background: 'var(--superficie-2)', marginBottom: 12 }}
        >
          <p className="mini" style={{ margin: 0, lineHeight: 1.6 }}>
            Os dados viajam <b>diretamente entre os teus dispositivos</b>, cifrados com a chave
            desta ligação. Nenhum servidor guarda o teu dossier. Para sincronizar, os dois
            dispositivos têm de estar com a app aberta ao mesmo tempo — o que editares offline
            junta-se automaticamente da próxima vez que se encontrarem.
          </p>
        </div>

        {!cfg.ativo ? (
          <div className="coluna">
            <button className="btn primario" onClick={criarLigacao} style={{ alignSelf: 'start' }}>
              Criar ligação neste dispositivo
            </button>
            <p className="mini">
              Já criaste a ligação noutro dispositivo? Cola aqui o código de emparelhamento:
            </p>
            <div className="linha">
              <input
                placeholder="SALA.CHAVE"
                value={convite}
                onChange={(e) => setConvite(e.target.value.toUpperCase())}
                className="mono"
                style={{ maxWidth: 300 }}
              />
              <button
                className="btn"
                disabled={!convite.includes('.')}
                onClick={() => {
                  if (aplicarConvite(convite.trim())) {
                    setCfg(lerConfigSync());
                    alert('Emparelhado.');
                  } else alert('Código inválido.');
                }}
              >
                Ligar
              </button>
            </div>
          </div>
        ) : (
          <div className="coluna">
            <div className="linha linha-topo envolve" style={{ gap: 16 }}>
              {qr && (
                <img
                  src={qr}
                  alt="QR de emparelhamento"
                  style={{
                    width: 190,
                    borderRadius: 10,
                    border: '1px solid var(--borda)',
                    background: '#fff',
                    padding: 6,
                  }}
                />
              )}
              <div className="coluna" style={{ flex: 1, minWidth: 220 }}>
                <b>Ligar outro dispositivo</b>
                <p className="mini" style={{ margin: 0 }}>
                  Abre a app no telemóvel e lê este QR code com a câmara. Ou introduz o código
                  manualmente nas Definições do outro dispositivo.
                </p>
                <Campo label="Código de emparelhamento">
                  <input readOnly value={`${cfg.sala}.${cfg.chave}`} className="mono" />
                </Campo>
                <div className="linha envolve">
                  <button
                    className="btn pq"
                    onClick={() => navigator.clipboard?.writeText(`${cfg.sala}.${cfg.chave}`)}
                  >
                    Copiar código
                  </button>
                  <button
                    className="btn pq"
                    onClick={() => navigator.clipboard?.writeText(urlConvite)}
                  >
                    Copiar link
                  </button>
                  <button className="btn pq perigo" onClick={desligar}>
                    Desligar sincronização
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          className="btn fantasma pq"
          onClick={() => setAvancado(!avancado)}
          style={{ marginTop: 10 }}
        >
          {avancado ? '▾' : '▸'} Avançado
        </button>
        {avancado && (
          <div className="coluna" style={{ marginTop: 8 }}>
            <Area
              label="Servidores de signaling (um por linha)"
              valor={cfg.servidores.join('\n')}
              aoMudar={(v) => {
                const novo = {
                  ...cfg,
                  servidores: v.split('\n').map((s) => s.trim()).filter(Boolean),
                };
                setCfg(novo);
                guardarConfigSync(novo);
                setTestes({});
              }}
              linhas={3}
            />

            <div className="linha envolve">
              <button className="btn pq" disabled={aTestar} onClick={testarTodos}>
                {aTestar ? 'A testar…' : 'Testar servidores'}
              </button>
              <button
                className="btn pq"
                onClick={() => {
                  const novo = { ...cfg, servidores: SERVIDORES_PADRAO };
                  setCfg(novo);
                  guardarConfigSync(novo);
                  setTestes({});
                }}
              >
                Repor padrão
              </button>
              <button
                className="btn pq"
                onClick={() => {
                  arrancarSync(cfg);
                  alert('Ligação reiniciada.');
                }}
              >
                Reiniciar ligação
              </button>
            </div>

            {Object.keys(testes).length > 0 && (
              <div className="coluna" style={{ gap: 4 }}>
                {cfg.servidores.map((s) => (
                  <div key={s} className="linha" style={{ gap: 6 }}>
                    <span
                      className={
                        'eti ' +
                        (testes[s] === true ? 'verde' : testes[s] === false ? 'vermelho' : '')
                      }
                    >
                      {testes[s] === true ? 'OK' : testes[s] === false ? 'Sem resposta' : '…'}
                    </span>
                    <span className="mini mono truncar">{s}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="cartao cartao-p" style={{ background: 'var(--superficie-2)' }}>
              <b>Servidor na tua rede (o mais fiável e sem depender de ninguém)</b>
              <p className="mini" style={{ lineHeight: 1.6 }}>
                No computador, corre <code>npx y-webrtc-signaling</code>. Depois põe aqui em cima{' '}
                <code>ws://IP-DO-PC:4444</code> (o IP aparece com <code>ipconfig</code>), nos dois
                dispositivos. Assim os teus dados nunca dependem de servidores de terceiros — só
                precisas do PC ligado quando quiseres sincronizar.
              </p>
              <p className="mini" style={{ marginBottom: 0 }}>
                Não queres nada disto? Continua a funcionar sem sincronização: usa a{' '}
                <b>cópia de segurança</b> aqui em baixo para passar o dossier entre dispositivos.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------ backup */}
      <div className="cartao cartao-p">
        <h2 style={{ marginBottom: 6 }}>Cópia de segurança</h2>
        <p className="mudo">
          {plantel.length} jogadores · {exs.length} exercícios · {sessoes.length} sessões ·{' '}
          {jogos.length} jogos
        </p>
        <div className="linha envolve">
          <button className="btn primario" onClick={exportar}>
            Exportar tudo (.json)
          </button>
          <label className="btn">
            Importar (juntar)
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importar(f, false);
                e.target.value = '';
              }}
            />
          </label>
          <label className="btn perigo">
            Importar (substituir tudo)
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && confirm('Isto apaga os dados atuais deste dispositivo. Continuar?'))
                  importar(f, true);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        <p className="mini" style={{ marginBottom: 0 }}>
          Guarda este ficheiro onde quiseres (Google Drive, pen, email). É o teu dossier completo.
        </p>
      </div>

      <div className="cartao cartao-p">
        <h2 style={{ marginBottom: 6 }}>Sobre</h2>
        <p className="mudo" style={{ marginBottom: 0 }}>
          Dossier do Treinador — aplicação livre e gratuita, funciona offline, sem contas e sem
          servidores. Os dados ficam guardados no teu dispositivo. Instala no telemóvel pelo menu
          do browser (“Adicionar ao ecrã principal”).
        </p>
      </div>
    </div>
  );
}
