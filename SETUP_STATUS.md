# JovenSTP - Estrutura MVP Implementada

## ✅ O que foi criado

### 1. **Estrutura de Pastas** 
```
src/
├── pages/               # 5 páginas principais
│   ├── LoginPage.jsx    # ✅ Login com email/senha
│   ├── SignupPage.jsx   # ✅ Cadastro com seleção de tipo (Young/Company)
│   ├── HomePage.jsx     # Placeholder - Feed (a implementar)
│   ├── JobsPage.jsx     # Placeholder - Vagas (a implementar)
│   ├── CommunitiesPage.jsx # Placeholder - Comunidades (a implementar)
│   ├── ChatPage.jsx     # Placeholder - Chat (a implementar)
│   └── ProfilePage.jsx  # ✅ Perfil com logout
├── components/
│   ├── Header.jsx       # ✅ Header com logo JovenSTP + search + notificações
│   ├── BottomNav.jsx    # ✅ Navegação inferior com 5 abas
│   ├── ProtectedRoute.jsx # ✅ Wrapper para rotas protegidas
├── contexts/
│   └── AuthContext.jsx  # ✅ Context + Provider com lógica de auth
├── hooks/
│   └── useAuth.js       # ✅ Hook customizado para acessar auth
├── services/
│   ├── firebase.js      # ✅ Inicialização Firebase + Auth
│   └── getstream.js     # ✅ Funções para conectar GetStream
└── App.jsx              # ✅ Router completo + integração
```

### 2. **Autenticação (Firebase)**
- ✅ Login com email/senha
- ✅ Signup com validação de senha (min 6 caracteres)
- ✅ Seleção de tipo de usuário (Young Person / Company)
- ✅ Persistência de user no Firestore
- ✅ Protected routes com redirecionamento
- ✅ Logout com limpeza de estado

### 3. **UI Components**
- ✅ Header com logo JovenSTP (verde + amarelo)
- ✅ Bottom navigation com 5 abas (Inicio, Vagas, Comunidades, Mensagens, Perfil)
- ✅ Profile page com stats (conexões, posts, comunidades)
- ✅ Notificações com toast (react-hot-toast)

### 4. **Configurações**
- ✅ Tailwind CSS com content paths configurado
- ✅ .env.example com variáveis Firebase + GetStream
- ✅ Router (React Router v7.9.5)
- ✅ Form validation (react-hook-form)

---

## 📋 Próximos Passos (Não feito ainda)

### 1. **HomePage (Feed + Stories)**
- [ ] Carousel de stories (avatares dos amigos com "+" button)
- [ ] PostCard component
- [ ] Query em tempo real do Firestore para posts
- [ ] Like/unlike posts
- [ ] Comentários em posts

### 2. **JobsPage (Vagas)**
- [ ] Filtros: Todas, Estágios, Tempo integral, Remoto
- [ ] JobCard component com dados da vaga
- [ ] Botão "Candidatar" (só para Young People)
- [ ] Query backend para vagas (com filtros)
- [ ] FAB (floating action button) para empresas criarem vagas

### 3. **CommunitiesPage**
- [ ] Lista de comunidades com ícones
- [ ] Botão "Entrar" para cada comunidade
- [ ] Contador de membros
- [ ] GetStream channels para cada comunidade

### 4. **ChatPage**
- [ ] GetStream Chat integration
- [ ] Lista de conversas
- [ ] GetStream Channel component
- [ ] Real-time messaging

### 5. **Notificações**
- [ ] Firebase Cloud Messaging (FCM) setup
- [ ] Push notifications para novas mensagens
- [ ] Push notifications para novas vagas
- [ ] Service Worker

---

## 🚀 Como Rodar

### 1. **Configurar Firebase**
- Criar projeto no Firebase Console
- Ativar Authentication (Email/Password)
- Ativar Firestore Database
- Copiar credenciais para `.env` (use `.env.example` como template)

### 2. **Configurar GetStream**
- Criar conta em getstream.io
- Gerar API key
- Adicionar à `.env` como `VITE_STREAM_API_KEY`

### 3. **Instalar dependências**
```bash
npm install
```

### 4. **Criar .env**
```bash
# Copie .env.example e preencha com seus valores
cp .env.example .env
```

### 5. **Rodar dev server**
```bash
npm run dev
```

Acesse: `http://localhost:5173`

---

## 🎨 Design Notes

- **Cores:** Verde primário (#22c55e), Amarelo secundário (Tailwind yellow)
- **Font:** Sistema default (sans-serif do Tailwind)
- **Layout:** Mobile-first com Tailwind CSS
- **Bottom Navigation:** Fixed, aparece só quando autenticado
- **Header:** Sticky no topo

---

## 📝 Environment Variables Template

```env
# Firebase
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx

# GetStream
VITE_STREAM_API_KEY=xxx
```

---

## 🔗 Firestore Collections (A criar manualmente ou via backend)

```
users/{uid}
├── email
├── displayName
├── type: 'young' | 'company'
├── avatar (URL)
├── bio
├── location
└── createdAt (timestamp)

jobs/{jobId}
├── companyId (uid)
├── title
├── description
├── location
├── type: 'estágio' | 'tempo integral' | 'remoto'
├── salary
├── requirements: []
├── applicants: []
└── createdAt

stories/{storyId}
├── author (uid)
├── content
├── images: []
├── timestamp
└── type: 'young' | 'company'

notifications/{userId}/{notifId}
├── type: 'message' | 'job_match' | 'accepted'
├── message
├── read
├── timestamp
└── actionUrl
```

---

**Status:** MVP Foundation Done ✅ | Ready for feature development 🚀
