# Futsal Manager PWA

Aplicativo web progressivo para gestão de jogos de futsal semanais.

## Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Supabase (Auth via SMS OTP, PostgreSQL, Realtime)
- **PWA**: vite-plugin-pwa
- **Deploy**: Vercel

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar projeto no Supabase

Execute o conteúdo de `supabase/schema.sql` no SQL Editor do Supabase.

### 3. Configurar autenticação por telefone

No Supabase Dashboard: Authentication → Providers → Phone → Enable (configure Twilio).

### 4. Variáveis de ambiente

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

### 5. Criar primeiro Admin

Após o primeiro login pelo app:

```sql
UPDATE profiles SET level = 'core' WHERE phone = '+55SEU_NUMERO';
```

### 6. Rodar localmente

```bash
npm run dev
```

## Deploy na Vercel

1. Conecte o repositório na Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

## Sistema de Pontos

| Ação | Pontos |
|------|--------|
| Presença confirmada e realizada | +5 |
| Cancelamento com aviso (>24h) | +1 |
| Falta sem aviso ou cancelamento tardio (<24h) | -8 |

## Níveis

- 🔰 **Candidato** — Precisa de aprovação manual
- ✅ **Verificado** — Confirmação automática
- ⭐ **Admin (Core)** — Acesso total ao painel

## Banco de dados

Tabelas: `profiles`, `matches`, `match_participants`, `point_history`

Trigger `handle_cancellation`: quando alguém cancela, o próximo da fila (ordenado por nível e pontos) é promovido automaticamente.

Função `auto_close_matches()`: fechar jogos 24h antes. Chamar via Supabase Edge Function com cron.
