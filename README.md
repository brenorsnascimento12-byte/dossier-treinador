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
| **Importar** | Traz os planos de treino em PDF do Dossier do Treinador — vários de uma vez — e transforma-os em sessões e exercícios, sem repetidos. Ver secção própria. |

---

## Importar o que já tens

Menu **Importar**. Tudo é processado no teu dispositivo — nenhum ficheiro sai
dali.

### Planos de treino do Dossier do Treinador (PDF)

O caminho principal. Exporta os teus planos de treino para PDF e escolhe-os
**todos de uma vez** — dezenas, se for preciso.

A app reconhece o formato e percebe que cada PDF não é uma ficha por página mas
uma **sessão inteira**, com os exercícios em duas colunas e blocos que
continuam na página seguinte. De cada plano tira:

- **Uma sessão de treino** com a data, a hora, os objetivos gerais, o material,
  o microciclo, o mesociclo, o período e o volume.
- **Os exercícios** que lá estão, cada um com o nome, os objetivos específicos,
  a descrição e organização metodológica, a duração, o esquema de séries, o
  formato das equipas, o espaço — e o **desenho**, recortado da página.
- A sessão fica montada, com os blocos pela ordem certa a apontar para os
  exercícios da biblioteca.

Quando um exercício não traz duração total mas traz o esquema de séries
(`9 x 1'30" + 20"`), a duração é calculada a partir dele.

**Repetidos.** O mesmo exercício aparece em muitos planos — o aquecimento é
quase sempre o mesmo. A app deteta-os e importa cada um **uma só vez**; todas as
sessões apontam para essa cópia única, e vês num rótulo em quantas sessões cada
exercício é usado. Podes escolher o critério:

- **nome e conteúdo** (por omissão) — só conta como repetido o que é mesmo igual;
- **nome** — junta tudo o que se chama igual, mesmo que a descrição varie.

Exercícios que já estão na tua biblioteca também são detetados e não voltam a
entrar.

### Outros formatos

**Imagens** — capturas de ecrã dos exercícios. Escolhe-as todas de uma vez; cada
imagem vira um exercício, com o nome do ficheiro como nome inicial.

**Texto** — cola o texto (de um Word, de um PDF, de um site). A app procura
rótulos como `Objetivos:`, `Descrição:`, `Material:`, `Duração:` e arruma cada
parte no campo certo.

**Tabela** — copia as células de um Excel ou CSV, com o cabeçalho, e cola. As
colunas são associadas automaticamente e podes corrigir à mão.

Se abrires um PDF que não seja do Dossier do Treinador, cada página é tratada
como um exercício.

### Antes de importar

Há sempre um **ecrã de revisão**: vês o que foi detetado, corriges o que estiver
mal, desmarcas o que não queres, escolhes a pasta de destino e decides se as
sessões também são criadas. Em cada ficha podes abrir o texto original lido do
PDF para conferir.

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
