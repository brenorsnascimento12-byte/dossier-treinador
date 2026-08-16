# Dossier do Treinador

Aplicação de gestão para treinadores de futebol de 11. Plantel, biblioteca de
exercícios com quadro tático, sessões de treino, periodização (macro, meso e
microciclos), jogos com convocatória e relatório, observação de adversários e
registo de reuniões.

Funciona no computador e no telemóvel, **offline**, sem contas e sem servidores.
Os dados ficam guardados no dispositivo e sincronizam **diretamente** entre os
teus dispositivos. Custo: zero.

---

## Correr o projeto

```bash
npm install
```

```bash
npm run dev
```

Abre <http://localhost:5173>. O servidor também aceita ligações da rede local
(`--host` já está ligado), por isso podes abrir no telemóvel usando o IP do PC —
por exemplo `http://192.168.1.20:5173` (vê o teu com `ipconfig`).

Para gerar a versão final:

```bash
npm run build
```

O resultado fica em `dist/` — são ficheiros estáticos, servem-se de qualquer
lado (incluindo abrir sem servidor nenhum).

---

## O que a app tem

| Módulo | O que faz |
| --- | --- |
| **Plantel** | Ficha por jogador: foto, posições, dados físicos, contactos do atleta e do encarregado, estado (disponível/lesionado/castigado), pontos fortes e a melhorar. A ficha mostra estatísticas calculadas: assiduidade, titularidades, minutos, golos, assistências, cartões e avaliação média. |
| **Exercícios** | Biblioteca com pastas, categorias e etiquetas. Cada exercício tem quadro tático desenhável, objetivos, descrição, regras, variantes, critérios de êxito, duração, séries, espaço, material e intensidade. |
| **Quadro tático** | Campo inteiro, meio-campo, último terço, retângulo ou folha em branco. Jogadores de duas equipas + neutros com numeração automática, bolas, cones, postes, escadas, mini-balizas, zonas, texto e setas de movimento, passe, condução e remate. Funciona com rato e com o dedo. |
| **Sessões de treino** | Partes inicial, fundamental e final. Puxa exercícios da biblioteca ou cria blocos livres, com duração por bloco e total automático. Registo de presenças (presente/falta/justificada/lesionado) e balanço da sessão. |
| **Periodização** | Macrociclo da época → mesociclos (com tipo: pré-época, competitivo, recuperação…) → microciclos semanais. Barra temporal da época com marcador do dia de hoje e vista de semana com os treinos e jogos de cada dia. |
| **Jogos** | Agenda, convocatória, onze inicial arrastável no campo, suplentes, eventos ao minuto (golos, assistências, cartões, substituições), minutos e avaliação por jogador, e relatório pós-jogo. Estatísticas da época no topo. |
| **Observações** | Fichas de observação de adversário e de jogador, por momentos do jogo. Registo de reuniões. |
| **Importar** | Traz exercícios que já tens, sem escrever tudo à mão. Ver secção própria. |

---

## Importar exercícios que já tens

Menu **Importar**. Tudo é processado no teu dispositivo — nenhum ficheiro sai
dali. Há quatro formas, conforme o que consegues obter da aplicação que usas
hoje:

**PDF** — imprime ou exporta os exercícios para PDF (normalmente uma ficha por
página). A app lê cada página, procura o desenho e distribui o texto pelos
campos certos, reconhecendo rótulos como `Objetivos:`, `Descrição:`,
`Material:`, `Duração:`, `Espaço:`, `Regras:`, `Variantes:`.

**Imagens** — se tens os exercícios em capturas de ecrã, escolhe-as todas de
uma vez. Cada imagem vira um exercício, já com o desenho; o nome do ficheiro é
usado como nome inicial.

**Texto** — cola o texto (de um Word, de um PDF, de um site). Escolhe como
separar os exercícios uns dos outros e a app arruma cada parte no campo certo.

**Tabela** — se conseguires exportar uma lista para Excel ou CSV, copia as
células com o cabeçalho e cola. As colunas são associadas automaticamente e
podes corrigir à mão.

Em qualquer dos casos há sempre um **ecrã de revisão** antes de importar: vês o
que foi detetado, corriges o que estiver mal, desmarcas o que não queres e
escolhes a pasta de destino.

> A deteção de campos usa os rótulos mais comuns em português. Se a tua fonte
> usar nomes diferentes, os campos por reconhecer aparecem na descrição — nada
> se perde, e podes ver o texto original lido em cada ficha de revisão.

---

## Sincronizar o telemóvel com o computador

Nas **Definições → Sincronização**:

1. No computador, carrega em **Criar ligação neste dispositivo**. Aparece um QR
   code.
2. No telemóvel, abre a app e lê o QR code com a câmara. (Ou copia o código e
   cola-o nas Definições do telemóvel.)
3. Fica emparelhado para sempre. A partir daí ligam-se sozinhos.

Como funciona: os dados viajam **diretamente entre os teus dispositivos**
(WebRTC), cifrados com a chave da ligação. Nenhum servidor guarda o teu dossier.

Duas coisas a saber:

- **Os dois têm de estar com a app aberta ao mesmo tempo** para sincronizar. O
  que editares offline junta-se automaticamente da próxima vez que se
  encontrarem — não há conflitos nem "qual versão fica", porque os dados usam
  CRDTs (Yjs).
- Para os dispositivos se encontrarem, é preciso um pequeno **servidor de
  signaling**. Ele só troca endereços; não vê nem guarda dados. Por omissão a
  app usa servidores públicos gratuitos, que podem desaparecer sem aviso.

### Se a sincronização deixar de funcionar

Em **Definições → Sincronização → Avançado** há um botão **Testar servidores**
que diz quais estão vivos.

A opção mais fiável, e que não depende de ninguém, é correres o teu próprio
servidor no PC quando quiseres sincronizar:

```bash
npx y-webrtc-signaling
```

Depois põe `ws://IP-DO-PC:4444` na lista de servidores, nos dois dispositivos.

E há sempre a alternativa sem sincronização nenhuma: **Definições → Cópia de
segurança → Exportar tudo**, e importar o ficheiro no outro dispositivo.

---

## Instalar no telemóvel e no computador

A app é uma PWA: instala-se a partir do browser, sem loja de aplicações.

- **Android (Chrome)** — menu ⋮ → *Adicionar ao ecrã principal*.
- **iPhone (Safari)** — Partilhar → *Adicionar ao ecrã principal*.
- **Computador (Chrome/Edge)** — ícone de instalação na barra de endereço.

Depois de instalada funciona offline, sem browser à volta.

Para instalar no telemóvel a app precisa de estar acessível por HTTPS (ou pelo
IP do PC em desenvolvimento). O caminho gratuito é publicar no GitHub Pages —
ver a secção seguinte.

---

## Publicar de graça (GitHub Pages)

O repositório já traz um workflow em `.github/workflows/deploy.yml`. Depois de
fazeres push para o GitHub:

1. **Settings → Pages → Source: GitHub Actions**.
2. Cada push para `main` publica a versão nova.

O endereço fica `https://<utilizador>.github.io/<repositório>/`. Como a app usa
caminhos relativos, funciona em qualquer subpasta.

---

## Gerar um APK

Duas hipóteses, ambas gratuitas.

**PWABuilder (sem instalar nada).** Publica primeiro no GitHub Pages, depois vai
a <https://www.pwabuilder.com>, mete o endereço e descarrega o pacote Android.
Gera um APK/AAB assinado a partir da PWA.

**Capacitor (local, mais controlo).** Precisa do Android Studio e do JDK
instalados:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

```bash
npx cap init "Dossier do Treinador" pt.dossiertreinador.app --web-dir=dist
```

```bash
npm run build && npx cap add android && npx cap sync
```

Depois `npx cap open android` e, no Android Studio, *Build → Build APK(s)*.

---

## Imprimir

Todas as fichas têm botão **Imprimir**, que abre a caixa de impressão do
sistema — daí podes escolher *Guardar como PDF*. Os menus e botões não saem no
papel. Com uma ficha aberta, imprime-se a ficha; nas listagens, imprime-se a
lista.

---

## Cópia de segurança

**Definições → Cópia de segurança → Exportar tudo** gera um `.json` com o dossier
completo (incluindo desenhos e fotos). Guarda-o onde quiseres — Drive, pen,
email. Na importação podes **juntar** ao que já tens ou **substituir** tudo.

---

## Como está feito

- **React + TypeScript + Vite**, sem framework de UI — o CSS é próprio e usa
  variáveis, com tema claro e escuro automáticos.
- **Yjs** guarda todo o estado como CRDT. É o que permite editar offline em dois
  dispositivos e juntar sem conflitos.
- **y-indexeddb** persiste localmente; **y-webrtc** trata da ligação direta.
- **pdf.js** faz a leitura dos PDFs na importação (carregado só quando é
  preciso).
- **vite-plugin-pwa** gera o service worker e o manifest.

```
src/
  lib/        dados (Yjs), tipos do domínio, datas, importação, pdf
  componentes/ UI reutilizável, campo de futebol, quadro tático
  paginas/    um ficheiro por módulo
```

Nenhuma parte da app faz pedidos de rede além do signaling da sincronização (e
esse só se a ligares).
