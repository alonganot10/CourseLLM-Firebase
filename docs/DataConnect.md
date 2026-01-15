# Firebase DataConnect Documentation

## Overview

Firebase DataConnect provides a strongly-typed GraphQL API layer over Cloud SQL (PostgreSQL), enabling complex relational queries with type safety. It automatically generates TypeScript/JavaScript SDKs with React hooks for seamless frontend integration.

## What is DataConnect?

DataConnect bridges the gap between Firebase's real-time capabilities and the need for relational data structures. It offers:

- **GraphQL Schema**: Define your data model in `.gql` files
- **PostgreSQL Backend**: Structured relational database with ACID guarantees
- **Auto-Generated SDKs**: Type-safe client libraries for TypeScript/JavaScript
- **Firebase Auth Integration**: Built-in authentication at the query level
- **React Hooks**: Pre-built hooks for data fetching with loading/error states

## Architecture

```
┌─────────────────────────────────────────────────┐
│           Next.js Application                   │
│  ┌───────────────────────────────────────────┐ │
│  │  Auto-Generated SDK                       │ │
│  │  @dataconnect/generated                   │ │
│  │  - Type-safe functions                    │ │
│  │  - React hooks (useQuery, useMutation)    │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
                      │
                      │ GraphQL over HTTPS
                      ▼
┌─────────────────────────────────────────────────┐
│      Firebase DataConnect Service               │
│  ┌───────────────────────────────────────────┐ │
│  │  GraphQL Schema (schema.gql)              │ │
│  │  Queries (queries.gql)                    │ │
│  │  Mutations (mutations.gql)                │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
                      │
                      │ SQL
                      ▼
┌─────────────────────────────────────────────────┐
│      Cloud SQL (PostgreSQL)                     │
│  - Relational tables                            │
│  - Foreign keys                                 │
│  - Transactions                                 │
│  - ACID compliance                              │
└─────────────────────────────────────────────────┘
```

## Project Structure

```
dataconnect/
├── dataconnect.yaml          # Service configuration
├── schema/
│   └── schema.gql            # Data model definitions
├── example/                  # Connector (queries + mutations)
│   ├── connector.yaml        # SDK generation config
│   ├── queries.gql           # GraphQL queries
│   └── mutations.gql         # GraphQL mutations
└── seed_data.gql             # Optional seed data
```

## Configuration

### Service Configuration (`dataconnect.yaml`)

```yaml
specVersion: "v1"
serviceId: "coursellm-service"
location: "us-central1"
schema:
  source: "./schema"
  datasource:
    postgresql:
      database: "fdcdb"
      cloudSql:
        instanceId: "coursellm-service-fdc"
        # schemaValidation: "STRICT"     # Enforce exact schema match
        # schemaValidation: "COMPATIBLE" # Allow compatible changes
connectorDirs: ["./example"]
```

**Key Fields**:
- `serviceId`: Unique identifier for your DataConnect service
- `location`: Google Cloud region (should match your Firebase project)
- `database`: PostgreSQL database name
- `instanceId`: Cloud SQL instance identifier
- `connectorDirs`: Directories containing query/mutation definitions

### Connector Configuration (`example/connector.yaml`)

```yaml
connectorId: example
generate:
  adminNodeSdk:
    - outputDir: ../../src/dataconnect-admin-generated
      package: "@dataconnect/admin-generated"
      packageJsonDir: ../..
  javascriptSdk:
    - outputDir: ../../src/dataconnect-generated
      package: "@dataconnect/generated"
      packageJsonDir: ../..
      react: true      # Generate React hooks
      angular: false
```

**SDK Generation**:
- `adminNodeSdk`: Server-side SDK with admin privileges
- `javascriptSdk`: Client-side SDK with auth restrictions
- `react: true`: Generates `useQuery` and `useMutation` hooks

## Schema Definition

### Basic Schema (`dataconnect/schema/schema.gql`)

The schema defines your data model using GraphQL SDL with special directives.

#### User Table

```graphql
# User table is keyed by Firebase Auth UID
type User @table {
  # @default(expr: "auth.uid") sets it to Firebase Auth UID during insert/upsert
  id: String! @default(expr: "auth.uid")
  username: String! @col(dataType: "varchar(50)")
  # Generated one-to-many field: reviews_on_user: [Review!]!
  # Generated many-to-many field: movies_via_Review: [Movie!]!
}
```

**Directives**:
- `@table`: Marks type as a database table
- `@default(expr: "...")`: Sets default value using expressions
- `@col(dataType: "...")`: Specifies SQL column type
- `@unique`: Enforces uniqueness constraint

#### Movie Table

```graphql
type Movie @table {
  # Auto-generated UUID primary key (implicit)
  # id: UUID! @default(expr: "uuidV4()")
  
  title: String!
  imageUrl: String!
  genre: String
}
```

**Note**: If you don't specify a primary key with `@table(key: [...])`, DataConnect automatically adds an `id: UUID!` field.

#### One-to-One Relationship

```graphql
type MovieMetadata @table {
  movie: Movie! @unique     # One metadata per movie
  # movieId: UUID!          # Auto-generated foreign key
  
  rating: Float
  releaseYear: Int
  description: String
}
```

The `@unique` directive ensures each movie has at most one metadata record.

#### Many-to-Many Relationship (Join Table)

```graphql
type Review @table(name: "Reviews", key: ["movie", "user"]) {
  user: User!          # Foreign key to User
  # userId: String!    # Auto-generated
  
  movie: Movie!        # Foreign key to Movie
  # movieId: UUID!     # Auto-generated
  
  rating: Int
  reviewText: String
  reviewDate: Date! @default(expr: "request.time")
}
```

**Composite Key**: `key: ["movie", "user"]` makes (movieId, userId) the primary key.

### Server Value Expressions

DataConnect provides special expressions for default values:

| Expression | Description | Example |
|------------|-------------|---------|
| `auth.uid` | Firebase Auth user ID | `@default(expr: "auth.uid")` |
| `request.time` | Current timestamp | `@default(expr: "request.time")` |
| `uuidV4()` | Generate UUID v4 | `@default(expr: "uuidV4()")` |

## Queries

Queries are defined in `dataconnect/example/queries.gql`.

### List All Movies (Public)

```graphql
query ListMovies @auth(level: PUBLIC, insecureReason: "Anyone can list all movies.") {
  movies {
    id
    title
    imageUrl
    genre
  }
}
```

**Auth Levels**:
- `PUBLIC`: No authentication required
- `USER`: Authenticated user required
- `USER_EMAIL_VERIFIED`: Email verification required
- `NO_ACCESS`: Completely blocked

### Get Movie by ID

```graphql
query GetMovieById($id: UUID!) 
@auth(level: PUBLIC, insecureReason: "Anyone can get a movie by id.") {
  movie(id: $id) {
    id
    title
    imageUrl
    genre
    # One-to-one relationship
    metadata: movieMetadata_on_movie {
      rating
      releaseYear
      description
    }
    # One-to-many relationship
    reviews: reviews_on_movie {
      reviewText
      reviewDate
      rating
      user {
        id
        username
      }
    }
  }
}
```

**Generated Fields**:
- `movieMetadata_on_movie`: Access related metadata
- `reviews_on_movie`: Access all reviews for this movie

### User-Specific Query

```graphql
query ListUserReviews @auth(level: USER) {
  user(key: { id_expr: "auth.uid" }) {
    id
    username
    reviews: reviews_on_user {
      rating
      reviewDate
      reviewText
      movie {
        id
        title
      }
    }
  }
}
```

**Security**: `id_expr: "auth.uid"` ensures users can only query their own data.

### Search with Filters

```graphql
query SearchMovie($titleInput: String, $genre: String) 
@auth(level: PUBLIC, insecureReason: "Anyone can search for movies.") {
  movies(
    where: {
      _and: [
        { genre: { eq: $genre } },
        { title: { contains: $titleInput } }
      ]
    }
  ) {
    id
    title
    genre
    imageUrl
  }
}
```

**Filter Operators**:
- `eq`: Equals
- `ne`: Not equals
- `gt`, `gte`: Greater than (or equal)
- `lt`, `lte`: Less than (or equal)
- `contains`: String contains
- `startsWith`, `endsWith`: String matching
- `_and`, `_or`, `_not`: Logical operators

## Mutations

Mutations are defined in `dataconnect/example/mutations.gql`.

### Insert Data

```graphql
mutation CreateMovie($title: String!, $genre: String!, $imageUrl: String!)
@auth(level: USER_EMAIL_VERIFIED, insecureReason: "Any email verified users can create a movie.") {
  movie_insert(data: { 
    title: $title, 
    genre: $genre, 
    imageUrl: $imageUrl 
  })
}
```

**Generated Mutations**:
- `<type>_insert`: Insert new record
- `<type>_upsert`: Insert or update
- `<type>_update`: Update existing record
- `<type>_delete`: Delete record

### Upsert (Insert or Update)

```graphql
mutation UpsertUser($username: String!) @auth(level: USER) {
  # The "auth.uid" server value ensures users can only register their own user
  user_upsert(data: { 
    id_expr: "auth.uid", 
    username: $username 
  })
}
```

**Use Case**: Perfect for "create or update profile" operations.

### Insert with Foreign Keys

```graphql
mutation AddReview($movieId: UUID!, $rating: Int!, $reviewText: String!)
@auth(level: USER) {
  review_upsert(
    data: {
      userId_expr: "auth.uid"    # Server-side value
      movieId: $movieId
      rating: $rating
      reviewText: $reviewText
      # reviewDate defaults to request.time in schema
    }
  )
}
```

### Delete with Composite Key

```graphql
mutation DeleteReview($movieId: UUID!) @auth(level: USER) {
  # Composite key: (userId, movieId)
  review_delete(key: { 
    userId_expr: "auth.uid", 
    movieId: $movieId 
  })
}
```

## Using the Generated SDK

### Setup

After defining your schema, queries, and mutations, generate the SDK:

```bash
firebase dataconnect:sdk:generate
```

This creates:
- `src/dataconnect-generated/`: Client SDK
- `src/dataconnect-admin-generated/`: Admin SDK (server-side)

### TypeScript Client Usage

#### Import Generated Functions

```typescript
import {
  listMovies,
  getMovieById,
  listUserReviews,
  createMovie,
  addReview,
  deleteReview
} from '@dataconnect/generated';
```

#### Query Data

```typescript
// List all movies
const { data, errors } = await listMovies();
if (data) {
  console.log(data.movies);
}

// Get specific movie
const { data: movieData } = await getMovieById({ id: 'movie-uuid' });
console.log(movieData.movie);

// Search movies
const { data: searchResults } = await searchMovie({
  titleInput: 'Inception',
  genre: 'Sci-Fi'
});
```

#### Mutate Data

```typescript
// Create movie
await createMovie({
  title: 'The Matrix',
  genre: 'Sci-Fi',
  imageUrl: 'https://example.com/matrix.jpg'
});

// Add review
await addReview({
  movieId: 'movie-uuid',
  rating: 5,
  reviewText: 'Amazing movie!'
});

// Delete review
await deleteReview({ movieId: 'movie-uuid' });
```

### React Integration

#### Query with Hook

```typescript
import { useListMoviesQuery } from '@dataconnect/generated';

function MovieList() {
  const { data, loading, error, refetch } = useListMoviesQuery();
  
  if (loading) return <div>Loading movies...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <button onClick={() => refetch()}>Refresh</button>
      {data.movies.map(movie => (
        <div key={movie.id}>
          <h3>{movie.title}</h3>
          <p>{movie.genre}</p>
        </div>
      ))}
    </div>
  );
}
```

#### Query with Variables

```typescript
import { useGetMovieByIdQuery } from '@dataconnect/generated';

function MovieDetail({ movieId }: { movieId: string }) {
  const { data, loading, error } = useGetMovieByIdQuery({ 
    variables: { id: movieId } 
  });
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data?.movie) return <div>Movie not found</div>;
  
  return (
    <div>
      <h1>{data.movie.title}</h1>
      <p>{data.movie.metadata?.description}</p>
      <div>
        <h2>Reviews</h2>
        {data.movie.reviews.map(review => (
          <div key={`${review.user.id}-${data.movie.id}`}>
            <p>{review.user.username}: {review.reviewText}</p>
            <p>Rating: {review.rating}/5</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### Mutation with Hook

```typescript
import { useAddReviewMutation } from '@dataconnect/generated';

function ReviewForm({ movieId }: { movieId: string }) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  
  const { mutate, loading, error } = useAddReviewMutation({
    onCompleted: () => {
      alert('Review submitted!');
      setText('');
    },
    onError: (err) => {
      alert(`Error: ${err.message}`);
    }
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({
      variables: {
        movieId,
        rating,
        reviewText: text
      }
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <select value={rating} onChange={e => setRating(+e.target.value)}>
        {[1, 2, 3, 4, 5].map(n => (
          <option key={n} value={n}>{n} stars</option>
        ))}
      </select>
      <textarea 
        value={text} 
        onChange={e => setText(e.target.value)}
        placeholder="Write your review..."
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
      {error && <p>Error: {error.message}</p>}
    </form>
  );
}
```

### Server-Side Usage (Admin SDK)

```typescript
import { listMovies, createMovie } from '@dataconnect/admin-generated';

// API route or server component
export async function GET() {
  const { data } = await listMovies();
  return Response.json(data.movies);
}

export async function POST(request: Request) {
  const body = await request.json();
  
  await createMovie({
    title: body.title,
    genre: body.genre,
    imageUrl: body.imageUrl
  });
  
  return Response.json({ success: true });
}
```

## Authentication & Security

### Query-Level Authentication

```graphql
# Public access
query PublicQuery @auth(level: PUBLIC, insecureReason: "Explain why") {
  # ...
}

# Authenticated users only
query UserQuery @auth(level: USER) {
  # ...
}

# Email-verified users only
mutation VerifiedUserMutation @auth(level: USER_EMAIL_VERIFIED) {
  # ...
}

# Admin only (no public access)
query AdminQuery @auth(level: NO_ACCESS) {
  # ...
}
```

### Row-Level Security

Use server expressions to enforce data isolation:

```graphql
query GetMyProfile @auth(level: USER) {
  user(key: { id_expr: "auth.uid" }) {
    id
    username
    email
  }
}
```

This ensures users can only access their own profile.

### Mutation Security

```graphql
mutation CreateMyPost($title: String!, $content: String!) @auth(level: USER) {
  post_insert(data: {
    authorId_expr: "auth.uid"   # Force author to be current user
    title: $title
    content: $content
  })
}
```

## Local Development

### Start DataConnect Emulator

```bash
firebase emulators:start
```

DataConnect emulator runs on `localhost:9399` with a local PostgreSQL database (PGLite).

### View Data

Access the Firebase Emulator UI:
```
http://localhost:4000
```

Navigate to DataConnect section to:
- View tables and data
- Run GraphQL queries
- Test mutations
- Inspect schema

### Seed Data

Create `dataconnect/seed_data.gql` for development data:

```graphql
# Insert seed users
mutation {
  user_insert(data: { id: "user1", username: "alice" })
}

# Insert seed movies
mutation {
  movie_insert(data: { 
    title: "The Matrix", 
    genre: "Sci-Fi",
    imageUrl: "https://example.com/matrix.jpg"
  })
}
```

## Deployment

### Deploy Schema and Queries

```bash
# Deploy everything
firebase deploy --only dataconnect

# Deploy schema only
firebase deploy --only dataconnect:schema

# Deploy connector only
firebase deploy --only dataconnect:example
```

### Production Setup

1. **Create Cloud SQL Instance**:
   ```bash
   gcloud sql instances create coursellm-service-fdc \
     --database-version=POSTGRES_15 \
     --tier=db-f1-micro \
     --region=us-central1
   ```

2. **Create Database**:
   ```bash
   gcloud sql databases create fdcdb \
     --instance=coursellm-service-fdc
   ```

3. **Update `dataconnect.yaml`**:
   ```yaml
   datasource:
     postgresql:
       database: "fdcdb"
       cloudSql:
         instanceId: "coursellm-service-fdc"
   ```

4. **Deploy**:
   ```bash
   firebase deploy --only dataconnect
   ```

### Schema Validation Modes

```yaml
cloudSql:
  instanceId: "coursellm-service-fdc"
  schemaValidation: "STRICT"    # or "COMPATIBLE"
```

- **STRICT**: PostgreSQL schema must exactly match DataConnect schema
- **COMPATIBLE**: PostgreSQL schema must be compatible (allows extra columns)

## Best Practices

### 1. Schema Design

- **Use meaningful names**: `User`, `CourseEnrollment`, not `u`, `ce`
- **Leverage relationships**: Define foreign keys in schema
- **Add indices**: For frequently queried fields
- **Use proper types**: `Date` for dates, `UUID` for IDs, `Float` for decimals

### 2. Query Optimization

- **Request only needed fields**: Don't fetch entire objects if you only need a few fields
- **Use pagination**: For large result sets
- **Batch queries**: Combine related queries when possible
- **Cache results**: Use React Query or SWR for client-side caching

### 3. Security

- **Always set auth levels**: Never leave queries without `@auth` directive
- **Use server expressions**: `auth.uid`, `request.time` for security
- **Validate on server**: Don't trust client input
- **Limit query depth**: Prevent deeply nested queries

### 4. Development Workflow

1. Design schema in `schema.gql`
2. Define queries/mutations in `queries.gql` and `mutations.gql`
3. Generate SDK: `firebase dataconnect:sdk:generate`
4. Test with emulator
5. Deploy to production

## Troubleshooting

### SDK Not Generating

**Problem**: Changes to `.gql` files don't update SDK

**Solution**:
```bash
firebase dataconnect:sdk:generate --force
```

### Authentication Errors

**Problem**: `UNAUTHENTICATED` errors in production

**Solution**:
- Verify Firebase Auth is configured
- Ensure user is signed in before making queries
- Check auth level matches user state

### Schema Validation Failures

**Problem**: Deployment fails with schema mismatch

**Solution**:
```bash
# View diff
firebase dataconnect:sql:diff

# Apply migrations
firebase dataconnect:sql:migrate
```

### Connection Errors (Local)

**Problem**: Cannot connect to emulator

**Solution**:
- Restart emulator: `firebase emulators:start`
- Check port 9399 is not in use
- Clear emulator data: `firebase emulators:start --import=./emulator-data --export-on-exit`

## Migration from Firestore

If you're migrating from Firestore to DataConnect:

### Data Model Comparison

| Firestore | DataConnect |
|-----------|-------------|
| Collections | Tables |
| Documents | Rows |
| Document ID | Primary key (UUID or custom) |
| Subcollections | Separate tables with foreign keys |
| References | Foreign key relationships |
| Queries | GraphQL queries |

### Migration Strategy

1. **Design relational schema**: Map collections to tables
2. **Define relationships**: Use foreign keys instead of references
3. **Export Firestore data**: Use Firebase CLI or scripts
4. **Transform data**: Convert to SQL format
5. **Import to Cloud SQL**: Use `psql` or Cloud Console
6. **Test thoroughly**: Verify data integrity
7. **Update application code**: Replace Firestore SDK calls with DataConnect

## Examples for CourseLLM

### Course Schema (Example)

```graphql
type User @table {
  id: String! @default(expr: "auth.uid")
  email: String!
  role: String! @col(dataType: "varchar(20)")  # 'student' | 'teacher'
  displayName: String
}

type Course @table {
  title: String!
  description: String
  teacherId: String!
  teacher: User!
}

type Enrollment @table(key: ["user", "course"]) {
  user: User!
  course: Course!
  enrolledAt: Date! @default(expr: "request.time")
  progress: Float
}

type CourseMaterial @table {
  course: Course!
  title: String!
  fileUrl: String!
  uploadedAt: Date! @default(expr: "request.time")
}
```

### Course Queries

```graphql
# Get student's enrolled courses
query GetMyEnrollments @auth(level: USER) {
  enrollments(where: { userId: { eq_expr: "auth.uid" } }) {
    course {
      id
      title
      description
      teacher {
        displayName
      }
    }
    progress
    enrolledAt
  }
}

# Get teacher's courses
query GetTeacherCourses @auth(level: USER) {
  courses(where: { teacherId: { eq_expr: "auth.uid" } }) {
    id
    title
    description
    materials: courseMaterials_on_course {
      title
      fileUrl
      uploadedAt
    }
  }
}
```

---

## Resources

- [Firebase DataConnect Documentation](https://firebase.google.com/docs/data-connect)
- [GraphQL SDL Specification](https://spec.graphql.org/)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Architecture Documentation](./Architecture.md)

---

**Last Updated**: 2026-01-15  
**Version**: 1.0  
**Maintainer**: CourseLLM Development Team
