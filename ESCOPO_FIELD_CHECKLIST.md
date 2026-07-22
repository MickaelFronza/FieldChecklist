# Field Checklist — Escopo Técnico do Projeto

> App de checklist com foto para operadores de campo, relatório em tempo real para gestores, e funcionamento offline-first.

---

## 1. Visão Geral do Problema

A empresa Ágata opera tratores e maquinário pesado em campo. Durante auditorias, itens obrigatórios de segurança ambiental (ex: bacia de contenção de óleo) passam despercebidos pelos operadores, gerando pontuações negativas e riscos legais.

**Problemas identificados:**

- Checklist em papel permite fraude: operador preenche tudo retroativamente no mesmo horário
- Gestor não tem visibilidade em tempo real do que foi ou não conferido
- Campo tem internet instável — qualquer solução precisa funcionar offline
- Operadores têm baixa escolaridade, mas já usam WhatsApp e Pix (UX deve ser simples)

**Solução proposta:** App Android onde o operador abre o turno, marca cada item do checklist com uma foto comprobatória e envia o relatório. O gestor acompanha tudo em tempo real num painel web.

---

## 2. Atores do Sistema

| Ator | Descrição |
|------|-----------|
| **Admin** | Monta os checklists, cadastra máquinas, usuários e visualiza todos os relatórios |
| **Gestor** | Acompanha relatórios em tempo real, recebe alertas de não conformidade |
| **Operador (Peão)** | Usa o app Android para executar o checklist no início do turno |

---

## 3. Funcionalidades por Ator

### 3.1 Admin / Gestor (Web)

- **Gestão de Checklists:** criar, editar e versionar templates de checklist por tipo de máquina/função
- **Gestão de Itens:** cada item tem título, descrição, se foto é obrigatória ou opcional, e se é bloqueante (impede envio sem estar OK)
- **Gestão de Máquinas:** cadastro de tratores/equipamentos com código/placa
- **Gestão de Usuários:** cadastro de operadores com login simplificado (PIN de 4 dígitos + seleção de nome)
- **Painel de Relatórios:** visualização por data, máquina, operador — com status de cada item e foto anexada
- **Alertas:** notificação quando operador não iniciou checklist até determinado horário
- **Justificativas:** ver motivo preenchido quando operador marcou item como "não aplicável" ou não realizou checklist

### 3.2 Operador (App Android)

- **Login simplificado:** seleciona o próprio nome na lista + digita PIN de 4 dígitos
- **Seleção de máquina:** escolhe qual trator/equipamento vai operar
- **Checklist guiado:** um item por tela, com foto obrigatória para confirmar
- **Marcação de status:** OK com foto / Não Conforme / Não Aplicável (com campo de justificativa)
- **Modo offline:** todo o fluxo funciona sem internet — dados e fotos ficam em cache local
- **Sincronização automática:** quando internet retorna, envia tudo automaticamente em background
- **Indicador de status:** ícone visível mostrando se está online/offline/sincronizando

---

## 4. Regras de Negócio

### 4.1 Checklist

- Um checklist só pode ser enviado com **todos os itens obrigatórios preenchidos**
- Itens marcados como "obrigam foto" só podem ser confirmados como OK **após tirar foto**
- Foto deve ser tirada **na hora** (câmera abre direto, não permite upload da galeria)
- Cada checklist é vinculado a: operador + máquina + data + turno (manhã/tarde/noite)
- Não é possível editar um checklist após o envio (imutabilidade para fins de auditoria)
- Um operador só pode ter **um checklist aberto por turno** para a mesma máquina

### 4.2 Offline

- O app salva o checklist em andamento no **storage local (SQLite no device)**
- As fotos ficam em **cache local** até sincronização
- A fila de sincronização usa **timestamp do device** para rastrear quando o item foi marcado
- Ao sincronizar, o backend verifica se o checklist já foi recebido (idempotência por UUID)
- Conflito de dados: server-wins para metadados, device-wins para timestamps de marcação

### 4.3 Auditoria

- Todo registro tem: `created_at` (device), `synced_at` (server), `device_id`, `app_version`
- Fotos armazenadas com hash MD5 para detectar adulteração
- Log de todas as ações do operador (item visualizado, foto tirada, item confirmado)

### 4.4 Alertas

- Se às **08:30** (configurável) o operador não iniciou checklist → notificação para gestor
- Se item crítico marcado como "Não Conforme" → notificação imediata para gestor via Socket.IO

---

## 5. Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                        CAMPO (Offline-first)                │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              App Android (React Native)              │   │
│  │                                                      │   │
│  │  ┌─────────────┐    ┌──────────────────────────┐   │   │
│  │  │ SQLite Local│    │  Cache de Fotos (FS)     │   │   │
│  │  │ (dados)     │    │  (imagens pendentes)     │   │   │
│  │  └──────┬──────┘    └────────────┬─────────────┘   │   │
│  │         │                        │                   │   │
│  │         └──────────┬─────────────┘                   │   │
│  │                    │  Sync Worker (background)        │   │
│  └────────────────────┼────────────────────────────────-┘   │
└───────────────────────┼─────────────────────────────────────┘
                        │ HTTPS (quando online)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                             │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Node.js + Express + TypeScript          │   │
│  │                                                      │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │   │
│  │  │ REST API    │  │ Socket.IO    │  │ Bull Queue│  │   │
│  │  │ /api/v1     │  │ (real-time)  │  │(sync jobs)│  │   │
│  │  └──────┬──────┘  └──────┬───────┘  └─────┬─────┘  │   │
│  │         │                │                 │         │   │
│  │         └────────────────┼─────────────────┘         │   │
│  │                          │ Sequelize ORM             │   │
│  └──────────────────────────┼────────────────────────-──┘   │
│                             │                               │
│  ┌──────────────────────────┼─────────────────────────────┐ │
│  │          ┌───────────────┼─────────────────────────┐   │ │
│  │          │           MariaDB 11                    │   │ │
│  │          └───────────────────────────────────────--┘   │ │
│  │          ┌───────────────────────────────────────────┐  │ │
│  │          │           Redis 7 (Bull queues)           │  │ │
│  │          └───────────────────────────────────────────┘  │ │
│  │          ┌───────────────────────────────────────────┐  │ │
│  │          │      MinIO / S3 (armazenamento de fotos)  │  │ │
│  │          └───────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND WEB (Gestor/Admin)               │
│              React 18 + MUI + Vite + Zustand                │
│                    (Dashboard + Relatórios)                  │
└─────────────────────────────────────────────────────────────┘
```

### Por que Redis é necessário

O Redis é o coração da estratégia offline. Quando o operador sincroniza:

1. O app envia um batch de eventos (checklist + fotos) via POST
2. O backend coloca na fila Bull (Redis) e responde `202 Accepted` imediatamente
3. Workers processam em background: salvam no MariaDB, fazem upload das fotos para S3/MinIO
4. Se um worker falha (ex: S3 lento), Bull faz retry automático com backoff
5. Gestor recebe update via Socket.IO assim que worker conclui

Sem Redis: o POST do campo ficaria aberto por minutos esperando salvar tudo, e numa conexão instável a requisição cai e você perde os dados.

---

## 6. Modelo de Dados

### Tabela: `users`
```sql
id            UUID PRIMARY KEY
name          VARCHAR(100)
pin_hash      VARCHAR(64)       -- bcrypt do PIN de 4 dígitos
role          ENUM('admin', 'manager', 'operator')
active        BOOLEAN DEFAULT true
created_at    DATETIME
updated_at    DATETIME
```

### Tabela: `machines`
```sql
id            UUID PRIMARY KEY
code          VARCHAR(50) UNIQUE  -- ex: "TRATOR-01", "JD-7200"
name          VARCHAR(100)
type          VARCHAR(50)         -- ex: "Trator", "Colheitadeira"
active        BOOLEAN DEFAULT true
created_at    DATETIME
```

### Tabela: `checklist_templates`
```sql
id            UUID PRIMARY KEY
name          VARCHAR(100)        -- ex: "Inspeção Pré-Turno Trator"
machine_type  VARCHAR(50)         -- null = aplica a todos
version       INT DEFAULT 1
active        BOOLEAN DEFAULT true
created_at    DATETIME
created_by    UUID FK users
```

### Tabela: `template_items`
```sql
id              UUID PRIMARY KEY
template_id     UUID FK checklist_templates
order_index     INT
title           VARCHAR(200)      -- ex: "Bacia de contenção presente"
description     TEXT              -- instrução detalhada
photo_required  BOOLEAN DEFAULT true
is_blocking     BOOLEAN DEFAULT true  -- se false, pode enviar mesmo não conforme
category        VARCHAR(50)       -- ex: "Segurança", "Ambiental", "Mecânico"
```

### Tabela: `checklist_executions`
```sql
id              UUID PRIMARY KEY   -- gerado no device (UUIDv4)
template_id     UUID FK checklist_templates
machine_id      UUID FK machines
operator_id     UUID FK users
shift           ENUM('morning', 'afternoon', 'night')
status          ENUM('in_progress', 'completed', 'incomplete')
started_at      DATETIME           -- timestamp do device
completed_at    DATETIME           -- timestamp do device
synced_at       DATETIME           -- quando chegou no server
device_id       VARCHAR(100)
app_version     VARCHAR(20)
created_at      DATETIME           -- quando o server recebeu
```

### Tabela: `execution_items`
```sql
id              UUID PRIMARY KEY   -- gerado no device
execution_id    UUID FK checklist_executions
template_item_id UUID FK template_items
status          ENUM('ok', 'non_conformant', 'not_applicable', 'pending')
justification   TEXT               -- obrigatório se non_conformant ou not_applicable
photo_key       VARCHAR(500)       -- chave no S3/MinIO (null se sem foto)
photo_hash      VARCHAR(64)        -- MD5 da foto para integridade
marked_at       DATETIME           -- timestamp do device quando marcou
synced_at       DATETIME
```

### Tabela: `sync_queue` (controle de idempotência)
```sql
id              UUID PRIMARY KEY
device_id       VARCHAR(100)
execution_id    UUID
payload_hash    VARCHAR(64)
status          ENUM('pending', 'processing', 'done', 'failed')
attempts        INT DEFAULT 0
created_at      DATETIME
processed_at    DATETIME
```

### Tabela: `audit_log`
```sql
id              UUID PRIMARY KEY
user_id         UUID FK users
action          VARCHAR(100)      -- ex: "item_viewed", "photo_taken", "item_confirmed"
entity_type     VARCHAR(50)
entity_id       UUID
metadata        JSON
device_id       VARCHAR(100)
occurred_at     DATETIME          -- timestamp device
created_at      DATETIME          -- timestamp server
```

---

## 7. Endpoints REST

### Autenticação
```
POST /api/v1/auth/login          -- { name_id, pin } → token JWT
POST /api/v1/auth/refresh
```

### Operador (App)
```
GET  /api/v1/templates/active    -- templates disponíveis (com itens) — cacheável
GET  /api/v1/machines/active     -- lista de máquinas ativas — cacheável
POST /api/v1/sync/batch          -- envia batch de checklists + metadados
POST /api/v1/sync/photos         -- upload de fotos (multipart, em separado)
GET  /api/v1/sync/status/:execId -- verifica se sincronização foi processada
```

### Gestor/Admin (Web)
```
GET  /api/v1/executions          -- lista com filtros (data, máquina, operador, status)
GET  /api/v1/executions/:id      -- detalhe completo com itens e URLs das fotos
GET  /api/v1/reports/daily       -- resumo do dia
GET  /api/v1/reports/operator    -- histórico por operador
GET  /api/v1/templates           -- CRUD de templates
POST /api/v1/templates
PUT  /api/v1/templates/:id
GET  /api/v1/users               -- CRUD de usuários
POST /api/v1/users
PUT  /api/v1/users/:id
GET  /api/v1/machines            -- CRUD de máquinas
POST /api/v1/machines
```

### Socket.IO Events
```
// Server → Client (Gestor)
execution:completed   -- checklist finalizado e sincronizado
execution:alert       -- item não conforme em checklist crítico
operator:late         -- operador não iniciou checklist no horário configurado

// Client → Server (App)
sync:heartbeat        -- app avisa que está online e tem dados pendentes
```

---

## 8. Fluxo Offline Detalhado

```
DEVICE                              REDIS/BULL              BACKEND/DB
  │                                      │                      │
  │── POST /sync/batch ─────────────────►│                      │
  │   (checklist JSON, sem fotos)        │── enqueue job ──────►│
  │◄── 202 Accepted ────────────────────│                      │
  │                                      │                      │── save execution ──►DB
  │── POST /sync/photos ────────────────►│                      │
  │   (multipart: foto1, foto2...)       │── enqueue upload ───►│
  │◄── 202 Accepted ────────────────────│                      │── upload S3 ────────►S3
  │                                      │                      │── update photo_key ─►DB
  │                                      │                      │── emit Socket.IO ───►Gestor
  │── GET /sync/status/:execId ─────────────────────────────────►│
  │◄── { status: "done" } ───────────────────────────────────────│
  │── limpa SQLite local ────────────────────────────────────────│
```

**Estratégia de retry no device:**
- Se POST falha: aguarda 30s, tenta novamente (exponential backoff até 10min)
- Fotos ficam em cache até confirmação de `done`
- UUID de execução garante idempotência: reenvio não duplica registros

---

## 9. App Android — Estrutura de Telas

```
Login
  └── Seleção de Máquina
        └── Checklist (1 item por tela)
              ├── [Tirar Foto] → Câmera nativa → Preview → Confirmar
              ├── [OK] — habilitado só após foto (se obrigatória)
              ├── [Não Conforme] → campo de justificativa
              └── [Não Aplicável] → campo de justificativa
                    └── Resumo Final
                          └── [Enviar] → Tela de Sincronização
                                └── Confirmação / Erro com retry
```

**UX para baixa escolaridade:**
- Ícones grandes + texto curto
- Botão OK sempre verde, Não Conforme sempre vermelho
- Câmera abre automaticamente ao chegar no item com foto obrigatória
- Progresso visível: "3 de 8 itens" com barra de progresso
- Vibração ao confirmar cada item

---

## 10. Stack Técnica e Justificativas

### Backend: Node.js 20 + TypeScript + Express
- Sequelize ORM com MariaDB 11
- Bull para filas de jobs (sync, upload de fotos, notificações)
- Socket.IO para push de alertas ao gestor em tempo real
- Multer para recebimento de fotos
- JWT para autenticação (access token 8h + refresh token 30d)
- Bcrypt para hash de PINs

### Frontend Web: React 18 + Material UI + Vite
- Zustand para estado global (filtros de relatório, usuário logado)
- Axios com interceptors para refresh de token automático
- React Query para cache de listagens
- Socket.IO client para receber alertas em tempo real

### App Android
- **React Native** (recomendado — reaproveitamento de código com o frontend web)
- SQLite via `expo-sqlite` ou `react-native-sqlite-storage`
- Cache de fotos via `react-native-fs`
- Background sync via `react-native-background-fetch`
- Câmera via `react-native-camera` (abre diretamente, sem galeria)

### Infraestrutura (Docker Compose)
```yaml
services:
  mariadb:   image: mariadb:11
  redis:     image: redis:7-alpine
  minio:     image: minio/minio          # armazenamento de fotos (S3-compatible)
  backend:   build: ./backend
  frontend:  build: ./frontend
  worker:    build: ./backend            # mesmo build, entrypoint diferente (Bull workers)
```

---

## 11. Redis — Uso Detalhado

| Uso | Descrição |
|-----|-----------|
| **Fila `sync-checklist`** | Recebe batch do app, persiste no DB |
| **Fila `upload-photos`** | Upload assíncrono das fotos para MinIO/S3 |
| **Fila `notifications`** | Envia alertas de não conformidade ao gestor |
| **Fila `daily-alerts`** | Job agendado (cron 08:30) que verifica quem não iniciou checklist |
| **Cache de templates** | Templates cacheados por 1h — peão não precisa baixar toda vez |
| **Session store** | Refresh tokens armazenados no Redis com TTL |

**Conclusão:** Redis é **essencial**. Sem ele, a sincronização de campo seria frágil e as notificações em tempo real não funcionariam de forma confiável.

---

## 12. Fases de Desenvolvimento

### Fase 1 — MVP (8–10 semanas)
- [ ] Autenticação (login PIN, JWT)
- [ ] CRUD de templates, máquinas e usuários (admin web)
- [ ] App Android: checklist com foto, armazenamento local
- [ ] Sincronização básica (online-only primeiro)
- [ ] Painel do gestor: lista de execuções do dia

### Fase 2 — Offline e Alertas (4–6 semanas)
- [ ] Fila Bull completa (sync, upload, notifications)
- [ ] Modo offline no app (SQLite + retry automático)
- [ ] Socket.IO: alertas em tempo real no painel
- [ ] Job cron: alerta de operador atrasado

### Fase 3 — Relatórios e Auditoria (3–4 semanas)
- [ ] Relatórios por período, operador, máquina
- [ ] Exportação PDF/Excel
- [ ] Audit log completo
- [ ] Dashboard com métricas (% conformidade, itens mais problemáticos)

---

## 13. Considerações de Segurança

- Fotos com metadados EXIF preservados (data/hora do device, modelo)
- PIN de 4 dígitos com bloqueio após 5 tentativas erradas (15min)
- Comunicação apenas via HTTPS (certificado SSL obrigatório)
- Fotos armazenadas em bucket privado — URLs com expiração (presigned URLs S3)
- Device ID registrado no primeiro login — checklist de device desconhecido gera alerta

---

*Documento gerado em: julho/2026*
*Versão: 1.0*
