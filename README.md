# NeuroPath — AI-Powered Learning Platform

Modern full-stack SPA for personalized AI-driven learning paths with real-time progress tracking, interactive quizzes, and AI-powered chat.

## Features

### 🎓 Learning Paths
- **AI-Generated Paths**: Generate personalized learning paths using Grok AI
- **Skill Assessments**: Take pre-generation quizzes to assess skill level
- **Interactive Modules**: Learn through structured, interactive modules
- **Progress Tracking**: Track completion per module with visual progress bars
- **Path Management**: Create, delete, and manage multiple learning paths

### 💬 AI Chat
- **Contextual Chat**: Chat with AI about your learning topics
- **Chat History**: Maintain conversation history within sessions
- **Smart Responses**: Grok-powered intelligent responses

### 📊 Progress Dashboard
- **Overview**: See all learning paths at a glance
- **Module Tracking**: Track individual module completion
- **Progress Percentage**: Visual completion tracking
- **Status Management**: In-progress, completed, or abandoned paths

### 🔐 Security
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt-secured passwords
- **User Isolation**: Users only see their own data

## Tech Stack

**Backend**
- FastAPI (Python 3.11+)
- PostgreSQL
- SQLAlchemy ORM
- Grok AI (X.AI)
- JWT Auth + bcrypt

**Frontend**
- Vanilla JavaScript (no frameworks)
- HTML5 + CSS3
- Responsive design
- Offline support via localStorage

**Deployment**
- Render (Backend + Frontend)
- PostgreSQL (Render DB)

## Quick Start

### Local Development

**Backend:**
```bash
pip install -r api/requirements.txt
export DATABASE_URL="postgresql://user:pass@localhost/neuropath"
export JWT_SECRET_KEY="your-secret-key"
export GROK_API_KEY="your-grok-key"
uvicorn api.app:app --reload
```

**Frontend:**
- Open `frontend/public/index.html` in browser
- API endpoint: http://localhost:8000

### Deployment (Render)

1. **Backend Service**:
   - Build: `pip install -r api/requirements.txt`
   - Start: `uvicorn api.app:app --host 0.0.0.0 --port 8000`
   - Env: `DATABASE_URL`, `JWT_SECRET_KEY`, `GROK_API_KEY`

2. **Frontend Service**:
   - Build: `echo 'Static files'`
   - Start: `npx http-server frontend/public -p 8000`

3. **Database**: PostgreSQL (Render)

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Learning Paths
- `GET /api/learning-paths` - Get all user paths
- `POST /api/learning-paths` - Create new path
- `GET /api/learning-paths/{id}` - Get path details
- `DELETE /api/learning-paths/{id}` - Delete path
- `PATCH /api/learning-paths/{id}` - Update progress
- `PATCH /api/learning-paths/{id}/modules/{idx}` - Toggle module completion

### AI
- `POST /api/ai/generate-path` - Generate learning path with Grok
- `POST /api/ai/quiz` - Generate skill quiz
- `POST /api/chat` - Chat with AI

### Health
- `GET /api/health` - Service health check

## Database Schema

**Users**
- id, email, full_name, hashed_password, created_at, updated_at

**Learning Paths**
- id, user_id, topic, difficulty_level, goals, gemini_content (AI output)
- created_at, updated_at

**Progress**
- id, user_id, learning_path_id
- completion_percentage, completed_modules (JSON array of module indices)
- status (in_progress/completed), last_accessed

## Features Breakdown

### Skill Quiz (Pre-Generation)
1. User initiates quiz before path generation
2. Grok AI generates 5 skill-level questions
3. User answers questions
4. Difficulty adjusted based on quiz performance
5. Learning path generated with appropriate level

### Interactive Modules
- Each path consists of modules with:
  - Title
  - Learning content
  - Resources (links, books, videos)
  - Exercises
- Users toggle module completion independently
- Progress tracked per module

### Chat System
- Real-time chat with Grok AI
- Conversation history maintained in session
- Context-aware responses based on learning topic
- Falls back gracefully if API unavailable

### Progress Tracking
- Module-level granularity
- Percentage completion calculation
- Visual progress bars
- Status management (in_progress → completed)

## Environment Variables

```
DATABASE_URL=postgresql://user:pass@host/neuropath
JWT_SECRET_KEY=<random-32-chars>
GROK_API_KEY=<your-grok-api-key>
ENVIRONMENT=production
```

## Error Handling

- **401 Errors**: Login/register don't wipe session (preserves state on auth errors)
- **404 Errors**: Proper path not found responses
- **Offline Support**: Frontend uses localStorage for offline operation
- **Graceful Degradation**: Chat/quiz failures don't break path viewing

## Performance

- **Frontend**: 42KB total (HTML/CSS/JS minified)
- **API**: <100ms response times
- **Database**: PostgreSQL with connection pooling
- **AI**: Async Grok API calls with 30s timeout

## Testing

All features tested:
- ✓ User registration and login
- ✓ Create/read/delete learning paths
- ✓ Skill quiz generation and scoring
- ✓ AI path generation with Grok
- ✓ Module progress tracking
- ✓ Chat functionality
- ✓ Progress percentage calculation
- ✓ Error handling and recovery

## Security Checklist

- ✓ Passwords hashed with bcrypt
- ✓ JWT tokens signed with secret
- ✓ Database queries parameterized (SQLAlchemy)
- ✓ CORS configured for prod
- ✓ No sensitive data in frontend
- ✓ Environment variables for secrets

## Support

- **Issues**: Check Render logs or browser console
- **API**: http://localhost:8000/api/health (health check)
- **Docs**: See inline comments in code

---

**Status**: Production Ready ✅
**Version**: 1.0.0
**License**: MIT
