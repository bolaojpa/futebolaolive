# FutebolãoLive — Status do Projeto e Memória de Contexto

> **Documento de Continuidade entre Computadores**  
> Este documento registra o estado completo do projeto, decisões arquiteturais, bugs corrigidos, regras do usuário e histórico detalhado para que o agente (Antigravity) possa retomar o trabalho em qualquer máquina sem perda de contexto.

---

## 📌 Regras de Trabalho Mandatórias (Instruções do Usuário)

1. **Idioma dos Commits e Respostas:**
   - **Sempre em Português do Brasil (PT-BR)**: Toda mensagem de commit no Git e descrição/resumo detalhado deve ser redigida estritamente em PT-BR.
2. **Execução Autônoma:**
   - O usuário autorizou expressamente a execução direta: *"pode fazer a modificação sem ter que tá permitindo toda vez, eu confio em você. Faça."*
   - Realizar as alterações, validar com `npm run build` e enviar ao GitHub (`git push origin main`) com segurança e autonomia.
3. **Qualidade e Estabilidade:**
   - Sempre executar `npm run build` antes de commitar para garantir zero erros de TypeScript, Turbopack e Next.js.
4. **Atualização Contínua deste Documento:**
   - **Obrigatório:** A cada nova alteração, correção ou funcionalidade adicionada ao projeto, o arquivo `PROJECT_STATUS.md` **deve ser atualizado** com as novas instruções e detalhes técnicos, e commitado junto no GitHub para garantir continuidade perfeita entre diferentes computadores.

---

## 🛠️ Stack Tecnológica

- **Framework:** Next.js 16.3.8 (App Router, Turbopack)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS v4 (`@custom-variant dark (&:where(.dark, .dark *));`)
- **Gerenciamento de Estado de API:** `@tanstack/react-query` v5
- **Cliente HTTP:** Axios
- **Animações e Ícones:** `framer-motion`, `lucide-react`
- **Manipulação de Imagens:** `sharp`
- **Fonte de Dados:** API pública do ESPN Soccer (`https://site.api.espn.com/apis/site/v2/sports/soccer`)

---

## ⚽ Ligas Suportadas

1. **Home (Visão Geral):** Jogos ao vivo, próximos jogos e últimos jogos finalizados de todas as ligas.
2. **Champions League** (`uefa.champions`)
3. **Copa Libertadores** (`conmebol.libertadores`)
4. **Premier League** (`eng.1`)
5. **Brasileirão Série A** (`bra.1`)
6. **La Liga** (`esp.1`)
7. **Bundesliga** (`ger.1`)
8. **Serie A Italiana** (`ita.1`)

---

## 📖 Histórico Detalhado de Implementações e Correções

### 1. Correção da Anomalia do Tempo de Jogo / Falso "Intervalo"
- **Problema:** Em jogos ao vivo, o tempo em minutos alternava esporadicamente para o status "Intervalo" e logo depois voltava ao minuto correto (ex.: 3' -> Intervalo -> 5').
- **Causa Raiz:** O código anterior considerava `status.type.id === "2"` como intervalo. Na API da ESPN para futebol, o ID `"2"` é `STATUS_IN_PROGRESS` (estado regular de jogo em andamento emitido a cada lance). O ID real de intervalo é `"23"` (`STATUS_HALFTIME`).
- **Solução:** Em `MatchCard.tsx` e `MatchDetails.tsx`, a identificação de intervalo foi ajustada para aceitar estritamente `id === "23"`, `name === "STATUS_HALFTIME"`, `shortDetail === "INT"` ou `"HT"`.

### 2. Correção da Seção "Últimos Jogos" na Home
- **Problema:** A seção mostrava apenas 1 jogo antigo da Libertadores (22/10), ignorando os jogos finalizados de ontem e anteontem das outras ligas.
- **Causa Raiz:** O scoreboard da Home buscava apenas a rodada atual e o dia de amanhã. Como as ligas europeias e o Brasileirão já haviam virado para a próxima rodada, os jogos finalizados dos dias anteriores não vinham na resposta.
- **Solução:** Implementada busca retroativa em `fetchScoreboard("all")` em `src/services/espnApi.ts`, consultando em paralelo os últimos 5 dias com cache em memória de 5 minutos (`pastEventsCache`) para evitar overhead de requisições. A Home agora exibe os 9 jogos mais recentemente finalizados em ordem cronológica decrescente.

### 3. Sincronização em Tempo Real (Card Primário vs Modal)
- **Problema:** Quando saía um gol ou o tempo corria, o card principal e o modal secundário atualizavam em momentos diferentes.
- **Causa Raiz:** O card principal atualizava com polling de 30s enquanto o modal atualizava a cada 10s em timers descompassados.
- **Solução:**
  - O polling em `src/app/page.tsx` agora acelera dinamicamente para 10s sempre que houver jogos ao vivo.
  - No modal (`MatchDetails.tsx`), qualquer alteração no placar dispara imediatamente `queryClient.invalidateQueries({ queryKey: ["scoreboard"] })`, forçando atualização instantânea na listagem.

### 4. Textos e Contagem Regressiva para Jogos Agendados
- **Problema:** A frase *"Começa a qualquer momento"* quebrava linha em telas mobile estreitas e colidia com o título do campeonato.
- **Solução:**
  - Menos de 1h para o jogo: badge animado com contagem segundo a segundo `Começa em MM:SS`.
  - Horário atingido sem início oficial: badge conciso `Aguarde o início` com `whitespace-nowrap shrink-0`.
  - Entre 1h e 2h: `Daqui a pouco - HH:MM`.
  - Mais de 2h: data no padrão brasileiro `Hoje - HH:MM`, `Amanhã - HH:MM` ou `DD/MM - HH:MM`.

### 5. Animação de Gol e VAR Centralizados no Mobile
- **Problema:** O badge animado `⚽ GOL!` ficava no topo absoluto e colidia com o nome do torneio em smartphones.
- **Solução:**
  - Reposicionado para o centro exato logo acima dos números do placar (`absolute -top-6 left-1/2 -translate-x-1/2`).
  - Adicionado suporte a gols anulados pelo VAR: se o placar de um jogo ao vivo diminuir, exibe o alerta animado `🖥️ GOL ANULADO (VAR)`.

### 6. Sistema Completo de Temas: Modo Claro, Escuro e Automático
- **Implementação:**
  - `src/providers/ThemeProvider.tsx`: Gerencia `"light"`, `"dark"` e `"auto"` com persistência no `localStorage` (`futebolaolive-theme`) e escuta a mudanças no `prefers-color-scheme`.
  - `src/app/layout.tsx`: Script síncrono no `<head>` anti-FOUC (impede qualquer piscar de tela branca/escura antes da hidratação).
  - `src/app/globals.css`: Suporte nativo a Tailwind v4 via `@custom-variant dark (&:where(.dark, .dark *));`.
  - `src/components/Header.tsx`: Dropdown com opções ☀️ *Modo Claro*, 🌙 *Modo Escuro* e 💻 *Automático (Sistema)*.
  - Cores claras e escuras polidas em todos os componentes (`MatchCard`, `MatchDetails`, `Standings`, `LeagueSelector`, `page.tsx`).

### 7. Favicon Oficial com o Troféu Esmeralda
- **Implementação:**
  - Criado o ícone vetorial `icon.svg` composto pelo círculo verde esmeralda (`#059669`) e o troféu Lucide em branco, fiel ao logotipo do topo.
  - Gerados `favicon.ico` multi-resolução (16x16, 32x32, 48x48), `icon.png` (32x32 e 192x192) e `apple-icon.png` (180x180 para mobile/PWA).
  - Registrados em `metadata.icons` no `RootLayout`.

### 8. Alinhamento Simétrico de Pênaltis com `PK` Central
- **Problema:** A etiqueta `"Pên: 2 - 3"` era visualmente desbalanceada porque o prefixo ficava à esquerda.
- **Solução:**
  - O placar de pênaltis foi reorganizado em formato simétrico: `[ Mandante ]  PK  [ Visitante ]`.
  - O indicador `PK` fica perfeitamente alinhado sob o travessão central do placar principal, tanto no `MatchCard.tsx` quanto no modal `MatchDetails.tsx`.

### 9. Unificação Idêntica dos Status entre Card Primário e Secundário
- **Problema:** Ao abrir o modal de um jogo agendado, ele mostrava apenas texto estático (ex.: `29/10 às 14:30`), enquanto o card da home mostrava o timer dinâmico `Começa em 56:00`.
- **Solução:**
  - Toda a lógica de contagem regressiva ao vivo (`Começa em MM:SS`), `Aguarde o início`, `Intervalo` e relógio de tempo ao vivo foi replicada no placar gigante de `MatchDetails.tsx`, garantindo total consistência visual e de dados.

---

## 📁 Estrutura de Arquivos Principais

```
futebolaolive/
├── public/
│   ├── favicon.ico
│   ├── icon.svg
│   ├── icon.png
│   └── apple-icon.png
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Configuração raiz, metadata de ícones, script anti-flash e ThemeProvider
│   │   ├── page.tsx           # Página principal, abas por liga, listagem ao vivo, próximos e últimos jogos
│   │   └── globals.css        # Tailwind CSS v4 e declaração da variante dark
│   ├── components/
│   │   ├── Header.tsx         # Topo com logo e seletor de tema (Claro / Escuro / Auto)
│   │   ├── LeagueSelector.tsx # Seletor de campeonatos (desktop e drawer mobile)
│   │   ├── MatchCard.tsx      # Card principal da partida (ao vivo, countdown, placar, VAR, pênaltis)
│   │   ├── MatchDetails.tsx   # Modal de detalhes (placar gigante com status sincronizado, resumo, stats, escalações)
│   │   └── Standings.tsx      # Tabela de classificação com suporte a múltiplos grupos
│   ├── providers/
│   │   ├── ReactQueryProvider.tsx # TanStack Query Provider
│   │   └── ThemeProvider.tsx      # Contexto de temas claro/escuro/auto
│   ├── services/
│   │   └── espnApi.ts         # Integração com API da ESPN (scoreboard, summary, standings, cache retroativo)
│   └── types/
│       └── espn.ts            # Tipagens TypeScript dos dados da ESPN
├── PROJECT_STATUS.md          # Este arquivo (memória do projeto)
└── package.json
```

---

## 💻 Instruções para Continuar em Outro Computador

Quando você abrir o projeto no outro computador (em casa):

1. **Puxar as últimas alterações:**
   ```bash
   git pull origin main
   ```
2. **Iniciar o ambiente (se necessário):**
   ```bash
   npm install
   npm run dev
   ```
3. **No chat do Antigravity no outro PC, envie apenas:**
   > *"Leia o arquivo `PROJECT_STATUS.md` para lembrar de todo o contexto do projeto e continue de onde paramos."*

O agente lerá este arquivo e terá 100% das informações, decisões, regras e códigos prontos para prosseguir imediatamente!

