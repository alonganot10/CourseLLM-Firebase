# CourseLLM (Coursewise)

## Purpose
CourseLLM (Coursewise) is an educational platform that leverages AI to provide personalized learning experiences. It is intended for undergraduate university courses and is being tested on Computer Science courses.

The project provides role-based dashboards for students and teachers, integrated authentication via Firebase, and AI-powered course assessment and tutoring.

### Core Goals
- Enable personalized learning assessment and recommendations for students
- Provide Socratic-style course tutoring through AI chat
- Track student interactions to enable teachers to monitor quality, intervene when needed, and obtain fine-grained analytics on learning trajectories
- Support both student and teacher workflows
- Ensure secure, role-based access control

## Tech Stack
- **Frontend Framework**: Next.js 15 with React 18 (TypeScript)
- **Styling**: Tailwind CSS with Radix UI components
- **Backend/Functions**: Firebase Cloud Functions, Firebase Admin SDK
- **Backend Services**: FastAPI Python microservices (Search Service)
- **Database**: Firestore (NoSQL document database)
- **Authentication**: Firebase Authentication (Google OAuth)
- **AI/ML**: Google Genkit 1.20.0 with Google GenAI models (default: gemini-2.5-flash)
- **Data Layer**: Firebase DataConnect (GraphQL layer with PostgreSQL)
- **Testing**: Playwright for E2E tests, pytest for Python services
- **Dev Tools**: TypeScript 5, pnpm workspace, Node.js
- **Deployment**: Firebase Hosting, App Hosting, Google Cloud Run

## Quick Start

### Prerequisites
- **Node.js**: 18.x or higher
- **pnpm**: 10.25.0 or higher
- **Python**: 3.11+ (for search-service)
- **Firebase CLI**: Install via `npm install -g firebase-tools`
- **Google Cloud account** with Firebase project configured

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CourseLLM-Firebase
   ```

2. **Install Node.js dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   # Firebase Configuration (from Firebase Console)
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   
   # Test Authentication (ONLY for development/testing)
   ENABLE_TEST_AUTH=true
   FIREBASE_SERVICE_ACCOUNT_PATH=./secrets/firebase-admin.json
   # OR use JSON directly:
   # FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
   ```

4. **Set up Search Service**
   ```bash
   cd search-service
   python -m venv .venv
   
   # Windows
   .venv\Scripts\activate
   
   # macOS/Linux
   source .venv/bin/activate
   
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   cd ..
   ```

### Running the Application

#### Option 1: Full Stack with Emulators (Recommended for Development)

1. **Start Firebase Emulators**
   ```bash
   firebase emulators:start
   ```
   This starts:
   - Firestore: localhost:8080
   - Auth: localhost:9099
   - Storage: localhost:9199
   - DataConnect: localhost:9399
   - Emulator UI: localhost:4000

2. **Start Next.js Frontend** (in a new terminal)
   ```bash
   pnpm dev
   ```
   Frontend runs on: http://localhost:9002

3. **Start Search Service** (in a new terminal)
   ```bash
   cd search-service
   .venv\Scripts\activate  # or source .venv/bin/activate
   TEST_AUTH_BYPASS=1 uvicorn app.main:app --host 127.0.0.1 --port 8080
   ```
   Search Service API: http://127.0.0.1:8080

4. **Start Genkit Development UI** (optional, in a new terminal)
   ```bash
   pnpm genkit:watch
   ```

#### Option 2: Production Build

```bash
pnpm build
pnpm start
```

### Firebase Console Configuration

1. **Enable Authentication Providers**
   - Go to Firebase Console → Authentication → Sign-in method
   - Enable **Google** provider
   - Add your domain to authorized domains

2. **Set up Firestore**
   - Create a Firestore database in `us-central1` region
   - Deploy security rules: `firebase deploy --only firestore:rules`

3. **Set up DataConnect**
   - Create a Cloud SQL PostgreSQL instance
   - Update `dataconnect/dataconnect.yaml` with your instance details
   - Deploy schema: `firebase deploy --only dataconnect`

4. **Service Account (for testing)**
   - Go to Project Settings → Service Accounts
   - Generate new private key
   - Save JSON file to `secrets/firebase-admin.json`

### Running Tests

#### E2E Tests (Playwright)
```bash
# Make sure the app is running first
pnpm test:e2e
```

#### Search Service Tests
```bash
cd search-service

# Unit tests
pytest

# With coverage
pytest --cov=app --cov-report=term-missing

# E2E tests (requires running server)
# Terminal 1:
TEST_AUTH_BYPASS=1 uvicorn app.main:app --host 127.0.0.1 --port 8080

# Terminal 2:
SEARCH_SERVICE_BASE_URL=http://127.0.0.1:8080 npx playwright test search-service/tests/search_service.e2e.spec.ts
```

## Project Structure

```
CourseLLM-Firebase/
├── src/                          # Next.js application source
│   ├── app/                      # App router pages and layouts
│   │   ├── api/                  # API routes
│   │   ├── login/                # Login page
│   │   ├── onboarding/           # User onboarding
│   │   ├── student/              # Student dashboard
│   │   └── teacher/              # Teacher dashboard
│   ├── components/               # React components
│   │   ├── ui/                   # Radix UI components
│   │   └── layout/               # Layout components
│   ├── lib/                      # Utilities and services
│   │   ├── firebase.ts           # Firebase initialization
│   │   ├── authService.ts        # Authentication helpers
│   │   └── types.ts              # TypeScript types
│   └── ai/                       # Genkit AI flows
│       ├── genkit.ts             # AI configuration
│       └── flows/                # AI flow definitions
├── search-service/               # FastAPI search microservice
│   ├── app/                      # Application code
│   │   ├── main.py               # FastAPI app and endpoints
│   │   ├── index.py              # BM25 indexing logic
│   │   ├── models.py             # Pydantic models
│   │   └── auth.py               # Authentication middleware
│   ├── tests/                    # Test suite
│   └── requirements.txt          # Python dependencies
├── dataconnect/                  # Firebase DataConnect
│   ├── schema/                   # GraphQL schema
│   │   └── schema.gql
│   ├── example/                  # Connector definitions
│   │   ├── connector.yaml
│   │   ├── queries.gql
│   │   └── mutations.gql
│   └── dataconnect.yaml          # DataConnect configuration
├── functions/                    # Firebase Cloud Functions
│   └── src/
│       └── index.ts
├── docs/                         # Documentation
│   ├── Architecture.md           # System architecture
│   ├── API.md                    # API documentation
│   └── Auth/                     # Authentication docs
├── openspec/                     # OpenSpec specifications
│   ├── AGENTS.md                 # AI agent instructions
│   └── project.md                # Project conventions
├── tests/                        # E2E tests
│   └── auth.spec.ts
└── firebase.json                 # Firebase configuration
```

## Key Features

### Authentication & Authorization
- Google OAuth integration via Firebase Authentication
- Role-based access control (Student/Teacher)
- First-time user onboarding flow
- Secure session management
- See: `docs/Auth/auth-implementation.md`

### Search Service
- BM25-based lexical search per course
- Document chunk indexing and retrieval
- RAG (Retrieval Augmented Generation) search endpoint
- REST API with FastAPI
- See: `search-service/README.md`

### AI-Powered Features
- **Socratic Course Chat**: AI tutoring using Socratic questioning method
- **Personalized Learning Assessment**: AI-driven knowledge assessment
- Powered by Google Genkit with Gemini models
- See: `src/ai/flows/`

### Data Layer
- **Firestore**: User profiles, course data, session storage
- **DataConnect**: Strongly-typed GraphQL queries over PostgreSQL
- Security rules for data isolation
- See: `docs/DataConnect.md`

## Deployment

### Frontend (Firebase Hosting)
```bash
firebase deploy --only hosting
```

### Search Service (Google Cloud Run)
```bash
cd search-service
gcloud run deploy search-service \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

### Cloud Functions
```bash
firebase deploy --only functions
```

### DataConnect
```bash
firebase deploy --only dataconnect
```

## Documentation

- **[Architecture Documentation](./docs/Architecture.md)** - System design and component integration
- **[API Documentation](./docs/API.md)** - Complete API reference
- **[Authentication Guide](./docs/Auth/auth-implementation.md)** - Auth implementation details
- **[Search Service README](./search-service/README.md)** - Search service documentation
- **[DataConnect Guide](./docs/DataConnect.md)** - DataConnect schema and usage
- **[OpenSpec Specifications](./openspec/)** - Technical specifications and proposals

## Development

### Code Style
- TypeScript strict mode enabled
- ESLint for code linting
- Prettier for code formatting (implicit via Tailwind)
- Follow conventions in `openspec/project.md`

### Git Workflow
- Main branch: `main`
- Feature branches: Create from main
- Commit messages: Descriptive and clear
- Pull requests: Required for merging to main

### Environment Variables
- All browser-accessible vars must have `NEXT_PUBLIC_` prefix
- Never commit `.env.local` or service account JSON files
- Use `.env.local.example` as template

## Troubleshooting

### Common Issues

1. **Port conflicts**
   - Frontend: Change port in `package.json` script: `next dev -p PORT`
   - Emulators: Update ports in `firebase.json`

2. **Firebase authentication errors**
   - Verify Firebase config in `.env.local`
   - Check Google OAuth provider is enabled in Firebase Console
   - Ensure authorized domains include your development domain

3. **Search service import errors**
   - Verify virtual environment is activated
   - Run from `search-service/` directory
   - Check `pytest.ini` has `pythonpath = .`

4. **DataConnect connection issues**
   - Verify Cloud SQL instance is running
   - Check connection settings in `dataconnect/dataconnect.yaml`
   - Ensure proper IAM permissions

## Contributing

1. Review the [OpenSpec guidelines](./openspec/AGENTS.md)
2. Create feature branch
3. Make changes following code style guidelines
4. Write/update tests
5. Submit pull request

## License

[Add license information]

## Contact

[Add contact information or links]

---

For detailed technical specifications, see `openspec/project.md`
