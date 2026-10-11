const http = require('http');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3010;
const HISTORY_LIMIT = 100;
const MAX_NAME_LENGTH = 30;
const MAX_MESSAGE_LENGTH = 500;
const DATA_DIR = path.join(__dirname, 'data');
const LOG_FILE = path.join(DATA_DIR, 'papo.jsonl');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Histórico compartilhado por todos os clientes (antes era um array por socket,
// por isso uma aba não via as mensagens da outra).
const history = loadHistory();
// socket.id -> nome
const users = new Map();

function loadHistory() {
    try {
        return fs.readFileSync(LOG_FILE, 'utf-8')
            .split('\n')
            .filter(Boolean)
            .map((line) => JSON.parse(line))
            .slice(-HISTORY_LIMIT);
    } catch (err) {
        if (err.code !== 'ENOENT') console.error('Erro lendo histórico:', err);
        return [];
    }
}

function saveMessage(msg) {
    history.push(msg);
    if (history.length > HISTORY_LIMIT) history.shift();

    fs.mkdir(DATA_DIR, { recursive: true }, (err) => {
        if (err) return console.error(err);
        fs.appendFile(LOG_FILE, JSON.stringify(msg) + '\n', 'utf-8', (err) => {
            if (err) console.error(err);
        });
    });
}

function cleanText(value, maxLength) {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function onlineUsers() {
    return [...new Set(users.values())].sort((a, b) => a.localeCompare(b));
}

function systemMessage(text) {
    io.emit('system', { text, ts: Date.now() });
}

app.get('/', (req, res) => res.redirect('/chat'));

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'cliente.html'));
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', online: users.size, uptime: process.uptime() });
});

io.on('connection', (socket) => {
    console.log(`Socket conectado: ${socket.id} (${socket.conn.transport.name})`);

    socket.emit('history', history);
    socket.emit('users', onlineUsers());

    socket.on('join', (rawName, ack) => {
        const name = cleanText(rawName, MAX_NAME_LENGTH);
        if (!name) return typeof ack === 'function' && ack({ ok: false, error: 'Nome inválido' });

        const isRename = users.has(socket.id);
        const oldName = users.get(socket.id);
        users.set(socket.id, name);

        if (!isRename) systemMessage(`${name} entrou no chat`);
        else if (oldName !== name) systemMessage(`${oldName} agora é ${name}`);

        io.emit('users', onlineUsers());
        if (typeof ack === 'function') ack({ ok: true, name });
    });

    let lastMessageAt = 0;
    socket.on('message', (rawText) => {
        const name = users.get(socket.id);
        const text = cleanText(rawText, MAX_MESSAGE_LENGTH);
        if (!name || !text) return;

        // Anti-flood simples: no máximo 1 mensagem a cada 300ms por socket.
        const now = Date.now();
        if (now - lastMessageAt < 300) return;
        lastMessageAt = now;

        const msg = { id: `${now}-${socket.id}`, name, text, ts: now };
        saveMessage(msg);
        // io.emit envia para TODOS os clientes, inclusive quem mandou.
        io.emit('message', msg);
    });

    socket.on('typing', (isTyping) => {
        const name = users.get(socket.id);
        if (name) socket.broadcast.emit('typing', { name, isTyping: Boolean(isTyping) });
    });

    socket.on('disconnect', () => {
        const name = users.get(socket.id);
        if (!name) return;
        users.delete(socket.id);
        socket.broadcast.emit('typing', { name, isTyping: false });
        systemMessage(`${name} saiu do chat`);
        io.emit('users', onlineUsers());
    });
});

server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}/chat`);
});
