# Project Context

## Purpose
CourseLLM-Firebase (Coursewise) is an educational platform that leverages AI to provide personalized learning experiences. The project provides role-based dashboards for students and teachers, integrated authentication via Firebase, and AI-powered course assessment and tutoring via Google Genkit. The core goals are to:
- Enable personalized learning assessment and recommendations
- Provide Socratic-style course tutoring through AI chat
- Support both student and teacher workflows
- Ensure secure, role-based access control

## Tech Stack
- **Frontend Framework**: Next.js 15 with React 18 (TypeScript)
- **Styling**: Tailwind CSS with Radix UI components
- **Backend/Functions**: Firebase Cloud Functions, Firebase Admin SDK
- **Database**: Firestore (NoSQL document database)
- **Authentication**: Firebase Authentication (Google OAuth)
- **AI/ML**: Google Genkit 1.20.0 with Google GenAI models (default: gemini-2.5-flash)
- **Data**: Firebase DataConnect (GraphQL layer over Firestore)
- **Testing**: Playwright for E2E tests
- **Dev Tools**: TypeScript 5, pnpm workspace, Node.js
- **Deployment**: Firebase Hosting, App Hosting

## Project Conventions

### Code Style
- **Language**: TypeScript (strict mode enabled)
- **Formatting**: Follows Next.js and Tailwind CSS conventions
- **Component Architecture**: Server and Client components (React 18+)
  - Suffix client components with `Client.tsx` (e.g., `AuthProviderClient.tsx`)
  - Use Server components by default; mark interactive components as `'use client'`
- **Naming Conventions**:
  - React hooks: `use*` prefix (e.g., `useAuth`, `useMobile`)
  - API routes: `src/app/api/{feature}/route.ts`
  - UI components: `src/components/ui/{component-name}.tsx`
  - Utilities: `src/lib/{feature}.ts` or `src/lib/utils.ts`
  - Types: defined in `src/lib/types.ts`
- **Path Aliases**: Use `@/*` to reference `./src/*` (configured in tsconfig.json)
- **CSS**: Tailwind utility-first with CSS variables for theming

### Architecture Patterns
- **Authentication Flow**:
  - Centralized auth state via React Context (`AuthProviderClient.tsx`)
  - Firebase Auth SDK on client, Admin SDK on server
  - Custom tokens for testing (via test-only `/api/test-token` route)
  - Role-based guards via `RoleGuardClient.tsx` component
- **UI Architecture**:
  - Radix UI primitives as the base component library
  - Shadcn-style component wrappers in `src/components/ui/`
  - App shell layout with sidebar navigation
  - Responsive design with mobile detection hooks
- **AI/ML Integration**:
  - Genkit flows defined in `src/ai/flows/` (e.g., `socratic-course-chat.ts`, `personalized-learning-assessment.ts`)
  - AI models configured in `src/ai/genkit.ts`
  - Server-side AI function execution
- **Data Layer**:
  - Firestore for persistent storage (user profiles, course data, etc.)
  - DataConnect for strongly-typed GraphQL queries (auto-generated into `src/dataconnect-generated/`)
  - Firestore security rules enforce role-based access
- **File Structure**:
  ```
  src/
    app/          → Next.js pages and layouts
    components/   → Reusable React components
    lib/          → Utilities, auth, firebase init, types
    ai/           → Genkit flows and model config
    dataconnect-generated/  → Auto-generated DataConnect types
  functions/    → Firebase Cloud Functions
  dataconnect/  → DataConnect schema and queries
  tests/        → Playwright E2E tests
  docs/         → Documentation (auth implementation, PRD, etc.)
  ```

### Testing Strategy
- **E2E Testing**: Playwright for user flows
  - Tests located in `tests/auth.spec.ts` (auth flows)
  - Configuration in `tests/playwright.config.ts`
  - Test-only API route (`/api/test-token`) uses Firebase custom tokens
  - Key scenarios: first-time login → onboarding, role-based redirects, logout
- **Unit Testing**: Not yet formalized; component testing via Playwright
- **Manual Testing**:
  - Dev server: `npm run dev` (runs on port 9002)
  - Genkit development: `npm run genkit:watch`
- **CI/CD**: Tests run via `npm run test:e2e`
- **Test Environment Variables**:
  - `ENABLE_TEST_AUTH=true` (enables test-only routes)
  - `FIREBASE_SERVICE_ACCOUNT_PATH` or `FIREBASE_SERVICE_ACCOUNT_JSON` (Admin SDK credentials)

### Git Workflow
- **Primary Branch**: `main` (default)
- **Branching Strategy**: Feature branching (implicit; no formal convention documented)
- **Commit Messages**: No strict convention enforced; keep messages descriptive
- **Pull Requests**: Code review expected before merge to main

## Domain Context
### Educational Platform
- **Users**: Students and Teachers
- **Student Workflow**: Authenticate → Onboarding (select role, department, courses) → Student dashboard → Access assessments and course materials
- **Teacher Workflow**: Authenticate → Onboarding → Teacher dashboard → Manage courses and student progress
- **Course Model**: Courses tracked in user profiles; DataConnect schema defines the data model
- **AI Features**:
  - **Socratic Course Chat**: AI-powered tutoring that guides students through course concepts using Socratic questioning
  - **Personalized Learning Assessment**: AI-driven assessment of student knowledge with recommendations

### Firebase/Google Cloud Ecosystem
- Project uses Firebase emulators locally for development (Firestore, Auth, Functions, DataConnect, Storage)
- Deployment targets: Firebase Hosting + App Hosting for full-stack
- Service account credentials required for server-side operations (testing, admin functions)

## Important Constraints
- **Authentication Security**:
  - Test-only token route (`ENABLE_TEST_AUTH`) must never be enabled in production
  - Firestore rules enforce user isolation (clients can only read/write their own profile)
  - Server-side Admin SDK writes bypass security rules (used for onboarding in tests)
- **Client SDK Limitations**:
  - Google OAuth popup flows can be blocked by browser policies (fallback to redirect)
  - IndexedDB persistence for Firestore is best-effort (may fail in some environments)
- **Model Configuration**:
  - Default AI model: `gemini-2.5-flash` (via Google GenAI plugin)
  - Can be overridden in `src/ai/genkit.ts`
- **Environment Variables**:
  - All Firebase config keys must be prefixed with `NEXT_PUBLIC_` to be accessible in browser
  - Service account JSON for Admin SDK should never be committed to repo

## External Dependencies
- **Google Cloud / Firebase**:
  - Firebase Authentication (Google OAuth provider)
  - Firestore Database
  - Firebase Storage
  - Firebase Cloud Functions
  - Firebase App Hosting
  - Google Genkit with Google GenAI models (Gemini)
  - Firebase DataConnect (GraphQL data layer)
- **Radix UI**: Accessible, unstyled component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **React Hook Form + Zod**: Form handling and validation
- **Recharts**: Data visualization library
- **Date-fns**: Date manipulation library
- **Lucide React**: Icon library
- **Playwright**: Browser automation for E2E testing
