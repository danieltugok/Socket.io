# Express + Socket.io Chat

Chat em tempo real: abra em dois navegadores (ou em uma aba anônima) e as mensagens aparecem nos dois na hora, sem refresh.

## Funcionalidades

- Mensagens em tempo real para todos os clientes conectados
- Histórico das últimas 100 mensagens (enviado a quem entra; salvo em `data/papo.jsonl`)
- Lista de usuários online
- Indicador "fulano está digitando…"
- Avisos de entrada/saída do chat
- Indicador de conexão mostrando o transporte (`websocket` ou `polling`)
- Contador de não lidas no título da aba
- Nome lembrado no navegador (localStorage) e reentrada automática ao reconectar
- Mensagens renderizadas como texto (sem injeção de HTML), limite de tamanho e anti-flood

## Rodando localmente

Requer Node.js 18+.

    npm install
    npm start          # ou: npm run dev (reinicia ao salvar)

Acesse http://localhost:3010/chat

A porta pode ser trocada com a variável `PORT`. Health check: `GET /health`.

## Eventos Socket.io

| Direção | Evento | Payload |
|---|---|---|
| cliente → servidor | `join` | `nome` (com ack `{ ok, name }`) |
| cliente → servidor | `message` | `texto` |
| cliente → servidor | `typing` | `true`/`false` |
| servidor → cliente | `history` | `[{ id, name, text, ts }]` |
| servidor → cliente | `message` | `{ id, name, text, ts }` |
| servidor → cliente | `system` | `{ text, ts }` |
| servidor → cliente | `users` | `[nome]` |
| servidor → cliente | `typing` | `{ name, isTyping }` |

## Deploy na Hostinger

Precisa de um plano com Node.js (Business, Cloud ou VPS).

**Business/Cloud (hPanel → Websites → Add Website → Node.js Apps):**

1. Importe pelo GitHub (este repositório, branch `master`) ou envie um `.zip` do projeto **sem** a pasta `node_modules`.
2. Configuração: Node.js 22.x, entry file `index.js`, comando de start `npm start` (o padrão de install, `npm install`, serve).
3. Deploy. A Hostinger define a variável `PORT`; o app já a usa.
4. Abra `https://seu-dominio/chat` em dois navegadores.

**VPS (Ubuntu):** instale Node 22, clone o repo, `npm install`, rode com `pm2 start index.js --name chat` e coloque um Nginx na frente com os headers de upgrade de WebSocket (`proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";`).

Observação: se a hospedagem não liberar WebSocket, o Socket.io usa long-polling HTTP automaticamente. O chat continua funcionando, e o indicador no topo mostra qual transporte está sendo usado.
