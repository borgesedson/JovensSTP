# Copilot Instructions for jovensstp-pwa

## Project Overview

**STP Networking App** - A Progressive Web App (PWA) designed for young professionals in São Tomé e Príncipe to connect, share opportunities, and network. The app serves two user types: **Young People** (job seekers/professionals) and **Companies** (employers publishing job opportunities).

**Key Tech Stack:**
- React 19.2.0 with Vite 7.2.2 for ultra-fast HMR and build
- Tailwind CSS 4.1 for styling and responsive design
- Firebase 12.5.0 for authentication, Firestore database, Cloud Messaging, and hosting
- GetStream Chat 13.11.0 for real-time messaging and group conversations
- React Router 7.9.5 for client-side routing between modules (auth, profile, feed, groups, chat, jobs)
- React Hook Form 7.66.0 for forms (login, signup, create posts, job listings)
- Lucide React 0.553.0 for UI icons
- Date-fns 4.1.0 for date formatting (posts, events, notifications)

## Architecture & Data Flow

**Entry Point:** `src/main.jsx` renders the React app into the root DOM element

**Module Structure:**
```
src/
  ├── components/          # Reusable UI components
  │   ├── Navbar.jsx
  │   ├── ProfileCard.jsx
  │   ├── PostCard.jsx
  │   └── ...
  ├── pages/               # Route-level pages (Auth, Feed, Groups, Chat, Jobs, Profile)
  │   ├── LoginPage.jsx
  │   ├── FeedPage.jsx
  │   ├── GroupsPage.jsx
  │   ├── ChatPage.jsx
  │   ├── JobsPage.jsx
  │   └── ProfilePage.jsx
  ├── services/            # External integrations
  │   ├── firebase.js      # Firebase config, auth, Firestore queries
  │   ├── getstream.js     # GetStream Chat client initialization
  │   └── api.js           # API helpers (if needed)
  ├── contexts/            # React Context providers
  │   ├── AuthContext.jsx  # User auth state (type: 'young'|'company')
  │   ├── StreamContext.jsx# GetStream Chat client
  │   └── NotificationContext.jsx # Push notifications
  ├── hooks/               # Custom React hooks
  │   ├── useAuth.js       # Auth state management
  │   ├── useStream.js     # GetStream client access
  │   └── useNotifications.js
  ├── App.jsx              # Root component with Router setup
  ├── main.jsx             # Entry point
  └── index.css            # Global styles (Tailwind base)
```

**Data Model (Firestore Collections) - MVP:**
- `users/{uid}` - User profiles (name, bio, type: 'young'|'company', avatar, location, email, education)
- `stories/{storyId}` - Posts/stories (author: uid, content, images[], timestamp, type: 'young'|'company')
- `jobs/{jobId}` - Job listings (companyId: uid, title, description, location, type: 'estágio'|'tempo integral'|'remoto', salary, requirements[], createdAt, applicants: [])
- `notifications/{userId}/{notifId}` - User notifications (type: 'message'|'job_match'|'accepted', message, read, timestamp, actionUrl)
- Stream Chat channels auto-created for: 1-on-1 (young-company, young-young), group discussions

**Authentication Flow:**
1. User selects type (Young Person or Company) on signup
2. Firebase Auth creates account (email/password)
3. `AuthContext` stores user type, Firebase UID, and profile data
4. Protected routes check auth state via `useAuth()` hook
5. GetStream Chat initialized with Firebase UID after auth

**User Permissions (MVP):**
- **Young Person:** 
  - Can view stories + feed
  - Can view & filter jobs (Todas, Estágios, Tempo integral, Remoto)
  - Can apply to jobs (add to `jobs/{jobId}/applicants[]`)
  - Can post stories
  - Can message companies + other young people
  - Can join communities (view discussions)

- **Company:**
  - Can post stories
  - Can publish job listings (create in `jobs/`)
  - Can view applicants for their jobs
  - Can message young people
  - Can view community members

**Real-Time Communication:**
- GetStream Chat handles: 1-on-1 messages (young-company, young-young), real-time notifications
- Firebase Firestore: `onSnapshot()` for stories, jobs, applicants updates
- Notifications: Sent when new message arrives, job match found, or application accepted

## Developer Workflows

**Build & Development:**
```bash
npm run dev       # Start Vite dev server with HMR (http://localhost:5173)
npm run build     # Production build to dist/
npm run preview   # Preview production build locally
npm run lint      # Run ESLint on all .js/.jsx files
```

**HMR & Fast Refresh:** The project uses `@vitejs/plugin-react` (Babel-based Fast Refresh). Editing `.jsx` files will trigger instant reload without losing component state.

## Code Conventions & Patterns

**React & Component Practices:**
- Use functional components exclusively (React 19 with no class components)
- ESLint enforces: `no-unused-vars` with PascalCase exception for constants/types
- ESLint plugin `react-hooks` enforces Hook rules (dependency arrays, etc.)
- React Refresh integrates with Vite for Hot Module Replacement

**Authentication & User Context Pattern:**
```jsx
// src/hooks/useAuth.js
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context // { user, userType, loading, logout }
}

// Protect routes with middleware
const ProtectedRoute = ({ element }) => {
  const { user, loading } = useAuth()
  return loading ? <div>Loading...</div> : user ? element : <Navigate to="/login" />
}
```

**Firebase Queries Pattern:**
```jsx
// src/services/firebase.js - Firestore utility functions
export const getUser = (uid) => doc(db, 'users', uid)
export const createPost = (postData) => addDoc(collection(db, 'posts'), { ...postData, timestamp: serverTimestamp() })
export const watchUserPosts = (uid, callback) => onSnapshot(query(collection(db, 'posts'), where('author', '==', uid)), callback)
```

**GetStream Chat Pattern:**
```jsx
// src/contexts/StreamContext.jsx
const StreamProvider = ({ children }) => {
  const { user } = useAuth()
  const [streamClient, setStreamClient] = useState(null)
  
  useEffect(() => {
    if (!user) return
    const client = StreamChat.getInstance(STREAM_API_KEY)
    client.connectUser({ id: user.uid, name: user.displayName }, STREAM_TOKEN)
    setStreamClient(client)
  }, [user])
  
  return <StreamContext.Provider value={streamClient}>{children}</StreamContext.Provider>
}
```

**Form Handling (react-hook-form):**
```jsx
const LoginForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const onSubmit = async (data) => {
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password)
    } catch (err) {
      toast.error(err.message)
    }
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email', { required: 'Email is required' })} />
      {errors.email && <span>{errors.email.message}</span>}
      <button type="submit">Login</button>
    </form>
  )
}
```

**Styling:**
- Primary: Tailwind CSS utility classes - always use first
- Example: `<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">`
- Component-scoped: CSS modules or plain CSS in `components/ComponentName.css` if needed
- Dark mode: Configure in `tailwind.config.js` with `darkMode: 'media'` or `'class'`

**State Management:**
- Use `AuthContext` for user auth state (Firebase UID, user type, profile)
- Use `StreamContext` for GetStream Chat client
- Use `NotificationContext` for FCM tokens and notification handlers
- Local component state with `useState` for UI state (modals, filters, etc.)
- React Router for navigation state (`useParams`, `useNavigate`)

**Real-Time Features:**
- GetStream: Use `<Chat>` component wrapper, `<ChannelList>` for channels, `<Channel>` for UI
- Firebase Firestore: Use `onSnapshot()` for real-time listeners on posts, messages, notifications
- Push notifications: Service Worker listens for FCM messages, displays toast via `react-hot-toast`

## Critical Files & Patterns

| File | Purpose | Example |
|------|---------|---------|
| `eslint.config.js` | ESLint flat config (ES 2020+, React JSX parsing) | Enforces react-hooks rules |
| `tailwind.config.js` | Tailwind config - **NEEDS content paths added** | Currently empty content array |
| `tsconfig.json` | TypeScript config (JavaScript allowed via `allowJs: true`) | Target ES5, module ESNext |
| `vite.config.js` | Minimal Vite setup, just React plugin | No special optimizations yet |
| `src/index.css` | Global styles | Reset/base Tailwind imports likely needed |
| `package.json` | Scripts & dependencies | Note: `vite-plugin-pwa` is installed but not configured |

## Important Notes

1. **Tailwind CSS is not fully configured** - `content` array is empty. Add `["./index.html", "./src/**/*.{jsx,js}"]` to enable utility class compilation.

2. **PWA Plugin Installed but Unused** - `vite-plugin-pwa` is in devDependencies but not integrated in `vite.config.js`. When integrating PWA features:
   - Add PWA configuration to `vite.config.js`: `import { VitePWA } from 'vite-plugin-pwa'` and include in plugins array
   - Define `manifest.json` or inline PWA options (app name, icons, start URL, display mode, etc.)
   - Service Worker will be auto-generated for offline support, asset caching, and update strategies
   - This enables installable PWA capabilities on mobile and desktop

3. **Minimal ESLint Setup** - Only basic rules enabled. No TypeScript linting despite `tsconfig.json` presence. TypeScript files are not currently linted.

4. **Firebase & Stream Chat Unused** - Both are heavy dependencies installed but not visible in the codebase yet. Expect integration in component hierarchy.
   - Firebase: Initialize in `src/services/firebase.js`, create auth context/provider
   - Stream Chat: Initialize client with API key, wrap app in `<StreamChat>` context, use React components for UI

5. **Development Focus** - Project is scaffolded and ready for feature development; placeholder demo code in App.jsx should be replaced.

## Common Tasks for Agents

- **Adding a new page/route:** Create component in `src/pages/`, add route to Router config, use React Router hooks (`useParams`, `useNavigate`)
- **Creating forms:** Use `react-hook-form` with Tailwind styling (login, signup, create posts, job listings)
- **Setting up Firebase:** Initialize in `src/services/firebase.js`, create context provider with user type (young|company)
- **Adding GetStream Chat channels:** Create channel per group/job discussion, initialize StreamProvider after auth
- **Styling:** Use Tailwind utility classes (responsive breakpoints: `md:`, `lg:`, `xl:` for mobile-first design)
- **Publishing job listings:** Companies create jobs with title, description, requirements, location, salary range
- **Adding notifications:** Use Firebase FCM for push alerts (job matches, new messages, group updates)

---

**Last Updated:** 2025-11-11
