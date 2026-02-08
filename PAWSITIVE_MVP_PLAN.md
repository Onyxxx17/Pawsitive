# PAWSITIVE - MVP Development Plan

> **AI-powered pet health companion** that tracks pet health profiles through computer vision to analyze digestion, comfort levels, and physical condition -- enabling smart care assessments and recommendations without reliance on integrated hardware.

---

## Table of Contents

1. [Problem Research & Validation](#1-problem-research--validation)
2. [Feature Breakdown](#2-feature-breakdown)
3. [Tech Stack](#3-tech-stack)
4. [Task Breakdown](#4-task-breakdown)
5. [MVP Roadmap](#5-mvp-roadmap)
6. [Risk Mitigation](#6-risk-mitigation)
7. [Success Metrics](#7-success-metrics)

---

## 1. Problem Research & Validation

### 1.1 Core Problem Statement

Pet owners (especially busy young adults, students, and working professionals) lack veterinary expertise to detect early health changes in their pets. Critical signs such as stool consistency changes, pain expressions, and gradual weight fluctuations go unnoticed until they become serious and expensive issues.

### 1.2 Research Tasks

| # | Task | Purpose | Status |
|---|------|---------|--------|
| R1 | Conduct 15-20 additional user interviews beyond initial 10 | Validate pain points at scale | Pending |
| R2 | Research existing pet health AI models and datasets | Assess technical feasibility of each AI check | Pending |
| R3 | Benchmark competitor apps (Furbo, Petcube, Dogo, Woofz) | Identify UX patterns and feature gaps | Pending |
| R4 | Interview 3-5 veterinarians | Validate AI health check categories and scoring rubrics | Pending |
| R5 | Identify publicly available pet image datasets | Training data for coat, fit, teeth, poop, face checks | Pending |
| R6 | Research Singapore pet ownership regulations and telehealth laws | Ensure legal compliance for TeleVet feature (MVP) | Pending |
| R9 | Identify and approach 2-3 pilot veterinary clinics for TeleVet partnerships | Secure initial vet partners for MVP launch | Pending |
| R10 | Evaluate video call SDKs (Twilio Video vs Agora) for React Native compatibility and pricing | Select optimal real-time communication provider | Pending |
| R7 | Define minimum viable AI accuracy thresholds per check type | Set go/no-go criteria for each AI feature | Pending |
| R8 | Survey willingness-to-pay among target demographics | Validate $10 one-time and $4/month pricing | Pending |

### 1.3 Key Hypotheses to Validate

- **H1:** Owners equipped with AI diagnostic tools will reduce uncertainty and enable earlier intervention.
- **H2:** Owners are more likely to trust insights derived from their own pet's historical data and professional vets than generic online advice.
- **H3:** Photo-based AI analysis can achieve clinically useful accuracy for coat, body condition, dental, stool, and mood assessments.

### 1.4 Datasets & Research Resources

| Category | Potential Sources |
|----------|-------------------|
| Stool classification | Bristol Stool Scale adapted for pets; veterinary stool grading charts |
| Body condition scoring | WSAVA Body Condition Score charts (1-9 scale for dogs/cats) |
| Coat condition | Veterinary dermatology literature; custom dataset collection |
| Dental health | Veterinary dental grading systems (Grade 0-4 periodontal disease) |
| Facial expression / mood | Animal facial action coding systems (e.g., CatFACS, DogFACS) |

---

## 2. Feature Breakdown

### 2.1 MVP Features (Must-Have)

#### Frontend Features

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| FE-01 | **User Authentication** | Sign up, login, password reset, session management | P0 |
| FE-02 | **Pet Profile Creation** | Add pet with breed, age, weight, existing conditions, profile photo | P0 |
| FE-03 | **Pet Profile Card View** | Dashboard showing all pets with health summary cards | P0 |
| FE-04 | **Camera / Photo Upload** | In-app camera capture and gallery upload for health checks | P0 |
| FE-05 | **AI Health Check UI** | Guided flow for 5 check types (Coat, Fit, Teeth, Poop, Face) with results display | P0 |
| FE-06 | **Health Score Dashboard** | Visual scores (e.g., 8/10) per check category with trend indicators | P0 |
| FE-07 | **Health Log Input** | Manual logging for diet (food type, amount, time), activity (walk duration), biological markers (urination, defecation, vomiting) | P0 |
| FE-08 | **Health History / Timeline** | Chronological view of all health checks and logs per pet | P0 |
| FE-09 | **AI Recommendations Display** | Show diet, activity, and care recommendations from the AI engine | P1 |
| FE-10 | **Reminders & Notifications** | Create, edit, and manage reminders for feeding, walking, medication | P1 |
| FE-11 | **Health Trend Charts** | Line/bar charts showing score progression over weeks/months | P1 |
| FE-12 | **Onboarding Flow** | First-time user walkthrough explaining features and baseline setup | P1 |
| FE-13 | **Settings & Preferences** | App settings, notification preferences, account management | P1 |
| FE-14 | **TeleVet Booking UI** | Browse available vets, view profiles, book consultation slots | P1 |
| FE-15 | **TeleVet Consultation Screen** | Video/voice call interface with in-call pet profile sharing and chat | P1 |
| FE-16 | **TeleVet History & Notes** | View past consultations, vet notes, and treatment plans per pet | P1 |

#### Backend Features

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| BE-01 | **User Authentication API** | JWT-based auth with signup, login, token refresh, password reset | P0 |
| BE-02 | **Pet Profile CRUD API** | Create, read, update, delete pet profiles with multi-pet support | P0 |
| BE-03 | **Image Upload & Storage** | Secure image upload pipeline with compression, storage (cloud bucket), and CDN delivery | P0 |
| BE-04 | **Health Check Processing Pipeline** | Orchestrate image submission -> AI inference -> score storage -> response | P0 |
| BE-05 | **Health Log API** | CRUD operations for diet logs, activity logs, biological markers | P0 |
| BE-06 | **Health History API** | Paginated retrieval of historical health data with filtering | P0 |
| BE-07 | **AI Recommendation Engine API** | Endpoint to request and serve AI-generated recommendations | P1 |
| BE-08 | **Push Notification Service** | Schedule and deliver push notifications for reminders | P1 |
| BE-09 | **Analytics & Trend Computation** | Background jobs to compute health trends, averages, and anomaly detection | P1 |
| BE-10 | **Rate Limiting & Abuse Prevention** | Protect AI endpoints from excessive usage | P1 |
| BE-11 | **Admin Dashboard API** | Basic admin endpoints for user/content management | P2 |
| BE-12 | **TeleVet Booking API** | Vet profile listing, availability slots, appointment CRUD, booking confirmation | P1 |
| BE-13 | **TeleVet Video/Voice Service** | WebRTC or third-party (Twilio/Agora) integration for real-time video/voice calls | P1 |
| BE-14 | **TeleVet Session Management** | Handle consultation lifecycle (scheduled, in-progress, completed), vet notes storage, treatment plan upload | P1 |
| BE-15 | **Pet Profile Sharing API** | Generate shareable pet health snapshot (scores, trends, logs) for vet review during consultation | P1 |

#### AI Features

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| AI-01 | **Poop Check Model** | Classify stool by consistency (Bristol-like scale) and color; flag abnormalities (blood, mucus, parasites) | P0 |
| AI-02 | **Coat Check Model** | Assess coat condition on roughness-to-smoothness scale; detect bald patches, excessive shedding, skin irritation | P0 |
| AI-03 | **Fit Check Model** | Estimate body condition score (1-9 scale); track weight trajectory over time | P0 |
| AI-04 | **Teeth Check Model** | Evaluate dental cleanliness, tartar buildup, gum color/inflammation | P1 |
| AI-05 | **Face Check Model** | Analyze facial cues for mood estimation (alertness, discomfort, lethargy) | P1 |
| AI-06 | **RAG-based Recommendation System** | Retrieval-Augmented Generation for personalized diet and activity recommendations based on pet profile, health history, breed-specific guidelines, and owner constraints (schedule, budget) | P1 |
| AI-07 | **Anomaly Detection Engine** | Compare current scores against pet's historical baseline to flag concerning trends | P1 |
| AI-08 | **Confidence Scoring** | Provide confidence scores for each AI evaluation; flag low-confidence results for manual review | P0 |
| AI-09 | **Image Quality Validator** | Pre-check uploaded images for blur, lighting, framing before running health analysis | P0 |
| AI-10 | **Multi-breed Support** | Ensure models are calibrated for different dog and cat breeds | P1 |

### 2.2 Post-MVP Features (Nice-to-Have)

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| PM-01 | **Pet Lessons** | Bite-sized educational content tailored to pet age, breed, routine | P2 |
| PM-02 | **Community / Knowledge Sharing** | Forum for verified pet owners to share tips and experiences | P3 |
| PM-03 | **Vet Treatment Plan Sync** | Vets upload treatment plans; AI integrates into recommendations | P3 |
| PM-04 | **Multi-Pet Household Analytics** | Cross-pet insights for households with multiple pets | P3 |
| PM-05 | **Subscription & Payment System** | In-app purchases for Essentials ($10) and Plus ($4/mo) tiers | P2 |
| PM-06 | **Export Health Report PDF** | Generate shareable health report for vet visits | P2 |

---

## 3. Tech Stack

### 3.1 Frontend (Mobile)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | React Native (Expo) | Cross-platform (iOS + Android); large community; aligns with team familiarity; fast iteration with Expo Go |
| **Language** | TypeScript | Type safety, better DX, fewer runtime errors |
| **State Management** | Zustand or Redux Toolkit | Lightweight global state; Redux Toolkit if complex state needed |
| **Navigation** | React Navigation v6+ | Industry standard for React Native; deep linking support |
| **UI Component Library** | NativeWind (Tailwind for RN) + Custom Components | Rapid styling with utility classes; consistent design system |
| **Camera** | expo-camera / expo-image-picker | Native camera access and gallery selection |
| **Charts** | react-native-chart-kit or Victory Native | Health trend visualizations |
| **Push Notifications** | expo-notifications + Firebase Cloud Messaging | Cross-platform push notification delivery |
| **HTTP Client** | Axios or TanStack Query (React Query) | API calls with caching, retry, and optimistic updates |
| **Local Storage** | AsyncStorage / MMKV | Cache tokens, preferences, offline data |
| **Image Handling** | expo-image-manipulator | Client-side image compression before upload |
| **Video/Voice Calls** | Twilio Video SDK or Agora RN SDK | Real-time video/voice for TeleVet consultations |
| **Form Management** | React Hook Form + Zod | Validated forms for health logs and pet profiles |

### 3.2 Backend

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Runtime** | Node.js (v20 LTS) | JavaScript ecosystem consistency with frontend |
| **Framework** | Express.js or Fastify | Lightweight, well-documented; Fastify for better performance |
| **Language** | TypeScript | Shared types with frontend; type safety |
| **Database** | PostgreSQL (via Supabase or Neon) | Relational data for users, pets, health records; JSON support for flexible schemas |
| **ORM** | Prisma | Type-safe database queries; migration management; excellent DX |
| **Authentication** | Supabase Auth or Firebase Auth | Managed auth with social logins; JWT token handling |
| **File Storage** | Supabase Storage / AWS S3 / Cloudflare R2 | Scalable image storage with CDN delivery |
| **Background Jobs** | BullMQ (Redis-backed) | Queue AI processing jobs, notification scheduling, trend computation |
| **Caching** | Redis (Upstash) | Cache frequent queries, rate limiting, session data |
| **API Documentation** | Swagger / OpenAPI via express-openapi | Auto-generated API docs for team collaboration |
| **Video/Voice Service** | Twilio Video / Agora | WebRTC-based real-time communication for TeleVet calls |
| **Validation** | Zod | Shared validation schemas with frontend |
| **Logging** | Pino | Structured logging for production debugging |
| **Hosting** | Railway / Render / AWS (ECS or Lambda) | Managed deployment; auto-scaling for AI workloads |

### 3.3 AI / ML Pipeline

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **LLM Provider** | Groq API (Llama 3 / Mixtral) | Ultra-fast inference for real-time recommendations; cost-effective |
| **Vision Models** | OpenAI GPT-4o Vision / Google Gemini Pro Vision | Multimodal analysis for pet health photos |
| **Custom CV Models** | Python + PyTorch / TensorFlow | Fine-tuned models for specific checks (stool, coat, BCS) if needed |
| **RAG Framework** | LangChain or LlamaIndex | Build retrieval-augmented generation for personalized recommendations |
| **Vector Database** | Pinecone / Weaviate / pgvector | Store embeddings for veterinary knowledge base, breed-specific guidelines |
| **ML Serving** | FastAPI (Python) | Serve custom CV models as microservice |
| **Image Processing** | OpenCV / Pillow | Pre-processing pipeline (resize, normalize, quality check) |
| **Orchestration** | LangGraph or custom pipeline | Chain multiple AI steps (quality check -> classification -> scoring -> recommendation) |
| **Knowledge Base** | Curated veterinary content (WSAVA, AAHA guidelines) | Ground truth for RAG system |
| **Evaluation** | Custom eval harness + human-in-the-loop | Track model accuracy, precision, recall per check type |

### 3.4 DevOps & Infrastructure

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Version Control** | Git + GitHub | Collaboration, PR reviews, CI/CD triggers |
| **CI/CD** | GitHub Actions | Automated testing, linting, deployment pipelines |
| **Containerization** | Docker + Docker Compose | Consistent dev environments; microservice deployment |
| **Mobile Builds** | EAS Build (Expo) | Cloud-based iOS/Android builds without local setup |
| **Monitoring** | Sentry (error tracking) + Mixpanel (analytics) | Crash reporting, user behavior analytics |
| **Environment Management** | dotenv + GitHub Secrets | Secure configuration management |

### 3.5 Architecture Diagram (High-Level)

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE APP (React Native / Expo)          │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────┐ ┌─────────┐  │
│  │ Auth Flow│ │Pet Profiles│ │AI Checks │ │Health Logger │ │ TeleVet │  │
│  └────┬─────┘ └────┬──────┘ └────┬─────┘ └──────┬───────┘ └────┬────┘  │
│       └─────────────┴────────────┴──────────────┴─────────────┘       │
│                          │ HTTPS / REST API                  │
└──────────────────────────┼───────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────┐
│                  BACKEND (Node.js / Fastify)                 │
│  ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌────────────┐ ┌──────────┐  │
│  │ Auth API │ │ Pet API │ │Health API│ │Notification│ │TeleVet   │  │
│  └────┬─────┘ └────┬────┘ └────┬─────┘ │  Service   │ │  API     │  │
│       │             │           │        └─────┬──────┘ └────┬─────┘  │
│  ┌────┴─────────────┴───────────┴──────────────┴────────────┘        │
│  │              Job Queue (BullMQ / Redis)                            │
│  └──────────────────────┬────────────────────────────────────────┘   │
│                          │                                   │
│  ┌──────────┐  ┌────────┴────────┐  ┌──────────────────┐   │
│  │PostgreSQL│  │ Cloud Storage   │  │  Redis Cache     │   │
│  │(Supabase)│  │ (S3/R2)        │  │  (Upstash)       │   │
│  └──────────┘  └─────────────────┘  └──────────────────┘   │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────┐
│              AI / ML SERVICE (Python / FastAPI)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Image Quality│  │  CV Models   │  │  RAG Engine      │   │
│  │  Validator   │  │ (Health Chk) │  │  (LangChain +    │   │
│  └──────┬───────┘  └──────┬───────┘  │   Groq API)      │   │
│         │                 │          └──────┬───────────┘   │
│  ┌──────┴─────────────────┴─────────────────┘              │
│  │           AI Orchestration Pipeline                      │
│  └──────────────────────┬────────────────────────────────┘  │
│                          │                                   │
│  ┌──────────────────┐  ┌┴─────────────────┐                │
│  │  Vision API      │  │  Vector DB       │                │
│  │ (GPT-4o/Gemini)  │  │ (Pinecone/pgvec) │                │
│  └──────────────────┘  └──────────────────┘                │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Task Breakdown

### Phase 0: Project Setup (Week 1)

| # | Task | Owner | Est. Hours |
|---|------|-------|------------|
| T0.1 | Initialize Git repository with branching strategy (main, develop, feature/*) | DevOps | 2 |
| T0.2 | Set up monorepo structure: `/mobile`, `/backend`, `/ai-service`, `/shared` | DevOps | 3 |
| T0.3 | Initialize React Native (Expo) project with TypeScript template | Frontend | 3 |
| T0.4 | Initialize Node.js/Fastify backend with TypeScript | Backend | 3 |
| T0.5 | Initialize Python FastAPI service for AI | AI | 3 |
| T0.6 | Set up PostgreSQL database (Supabase) and Prisma schema | Backend | 4 |
| T0.7 | Set up Redis instance (Upstash) | Backend | 1 |
| T0.8 | Set up cloud storage bucket (S3/R2/Supabase Storage) | Backend | 2 |
| T0.9 | Configure ESLint, Prettier, Husky pre-commit hooks | DevOps | 2 |
| T0.10 | Set up CI/CD pipeline (GitHub Actions) for lint + test | DevOps | 3 |
| T0.11 | Create shared Zod validation schemas package | Full Stack | 3 |
| T0.12 | Set up environment variable management (.env templates) | DevOps | 1 |
| T0.13 | Design and agree on API contract (OpenAPI spec) | Full Stack | 4 |
| **Total** | | | **~34 hrs** |

### Phase 1: Core Backend APIs (Weeks 2-3)

| # | Task | Owner | Est. Hours |
|---|------|-------|------------|
| T1.1 | Implement user authentication (signup, login, JWT, refresh tokens) | Backend | 8 |
| T1.2 | Design and implement database schema (Users, Pets, HealthChecks, HealthLogs, Recommendations, Veterinarians, Appointments) | Backend | 6 |
| T1.3 | Build Pet Profile CRUD API (create, read, update, delete, list) | Backend | 6 |
| T1.4 | Build image upload endpoint with presigned URL flow | Backend | 6 |
| T1.5 | Build Health Check submission API (trigger AI pipeline, store results) | Backend | 8 |
| T1.6 | Build Health Log CRUD API (diet, activity, biological markers) | Backend | 6 |
| T1.7 | Build Health History/Timeline API with pagination and filtering | Backend | 5 |
| T1.8 | Set up BullMQ job queue for async AI processing | Backend | 4 |
| T1.9 | Implement rate limiting middleware | Backend | 3 |
| T1.10 | Design and implement TeleVet database schema (Veterinarians, Appointments, ConsultationNotes) | Backend | 5 |
| T1.11 | Build Veterinarian profile and availability listing API | Backend | 6 |
| T1.12 | Build Appointment booking CRUD API (create, reschedule, cancel, list) | Backend | 6 |
| T1.13 | Integrate video/voice call service (Twilio Video / Agora SDK) | Backend | 10 |
| T1.14 | Build TeleVet session lifecycle API (start, end, vet notes, treatment plan upload) | Backend | 6 |
| T1.15 | Build pet profile sharing endpoint (generate health snapshot for vet review) | Backend | 4 |
| T1.16 | Write unit tests for all API endpoints (>80% coverage target) | Backend | 10 |
| T1.17 | Write API documentation (Swagger/OpenAPI) | Backend | 4 |
| **Total** | | | **~100 hrs** |

### Phase 2: AI Pipeline (Weeks 2-4)

| # | Task | Owner | Est. Hours |
|---|------|-------|------------|
| T2.1 | Build image quality validation service (blur, lighting, framing detection) | AI | 8 |
| T2.2 | Research and select base vision model for pet health analysis | AI | 6 |
| T2.3 | Implement Poop Check module (consistency + color classification) | AI | 12 |
| T2.4 | Implement Coat Check module (roughness-smoothness scale, anomaly detection) | AI | 12 |
| T2.5 | Implement Fit Check module (body condition score estimation) | AI | 12 |
| T2.6 | Implement confidence scoring system for all AI outputs | AI | 6 |
| T2.7 | Build AI orchestration pipeline (quality check -> model inference -> scoring) | AI | 8 |
| T2.8 | Set up FastAPI endpoints for AI service | AI | 4 |
| T2.9 | Collect and curate evaluation dataset (100+ labeled images per check type) | AI | 10 |
| T2.10 | Build evaluation harness and benchmark models against thresholds | AI | 8 |
| T2.11 | Implement Teeth Check module | AI | 10 |
| T2.12 | Implement Face Check / Mood module | AI | 10 |
| T2.13 | Set up RAG system for diet/activity recommendations (LangChain + Groq + vector DB) | AI | 12 |
| T2.14 | Curate veterinary knowledge base for RAG (breed guidelines, WSAVA, AAHA) | AI | 8 |
| T2.15 | Build anomaly detection engine (baseline comparison, trend alerts) | AI | 8 |
| T2.16 | Write integration tests for AI pipeline | AI | 6 |
| **Total** | | | **~140 hrs** |

### Phase 3: Frontend Core (Weeks 3-5)

| # | Task | Owner | Est. Hours |
|---|------|-------|------------|
| T3.1 | Design system setup (colors, typography, spacing, component library) | Frontend | 6 |
| T3.2 | Build authentication screens (Welcome, Sign Up, Login, Forgot Password) | Frontend | 8 |
| T3.3 | Build onboarding flow (app intro, pet setup wizard) | Frontend | 8 |
| T3.4 | Build main tab navigation (Home, Health, Log, TeleVet, Profile) | Frontend | 4 |
| T3.5 | Build Pet Profile creation/edit form | Frontend | 6 |
| T3.6 | Build Pet Profile Card component with health summary | Frontend | 6 |
| T3.7 | Build Home Dashboard (pet cards, quick actions, recent alerts) | Frontend | 8 |
| T3.8 | Build Camera/Photo upload flow with guided prompts per check type | Frontend | 10 |
| T3.9 | Build AI Health Check results screen (score display, confidence, explanation) | Frontend | 8 |
| T3.10 | Build Health Score Dashboard with category breakdown | Frontend | 6 |
| T3.11 | Build Health Log input forms (diet, activity, biological markers) | Frontend | 8 |
| T3.12 | Build Health History/Timeline screen | Frontend | 6 |
| T3.13 | Build Health Trend Charts (line charts for score progression) | Frontend | 8 |
| T3.14 | Build AI Recommendations display screen | Frontend | 6 |
| T3.15 | Build Reminders/Notification management screen | Frontend | 6 |
| T3.16 | Build Settings screen | Frontend | 4 |
| T3.17 | Implement push notification handling (foreground + background) | Frontend | 6 |
| T3.18 | Build TeleVet vet listing and booking screen (browse vets, view availability, book slots) | Frontend | 8 |
| T3.19 | Build TeleVet video/voice consultation screen (call UI, in-call pet profile sharing, chat) | Frontend | 10 |
| T3.20 | Build TeleVet consultation history and vet notes screen | Frontend | 6 |
| T3.21 | Implement error states, loading states, empty states throughout | Frontend | 6 |
| T3.22 | Write component tests (React Native Testing Library) | Frontend | 8 |
| **Total** | | | **~152 hrs** |

### Phase 4: Integration & Testing (Weeks 5-6)

| # | Task | Owner | Est. Hours |
|---|------|-------|------------|
| T4.1 | Integrate frontend auth with backend auth API | Full Stack | 4 |
| T4.2 | Integrate pet profile frontend with backend API | Full Stack | 4 |
| T4.3 | Integrate camera flow with image upload + AI pipeline | Full Stack | 8 |
| T4.4 | Integrate health log frontend with backend API | Full Stack | 4 |
| T4.5 | Integrate health history and trend charts with backend data | Full Stack | 4 |
| T4.6 | Integrate recommendation display with RAG API | Full Stack | 4 |
| T4.7 | Integrate push notifications end-to-end | Full Stack | 6 |
| T4.8 | Integrate TeleVet booking flow with backend API | Full Stack | 6 |
| T4.9 | Integrate TeleVet video/voice call end-to-end (Twilio/Agora + frontend) | Full Stack | 8 |
| T4.10 | Integrate pet profile sharing into TeleVet consultation flow | Full Stack | 4 |
| T4.11 | End-to-end testing of complete user journey (onboard -> check -> log -> recommend -> consult vet) | QA | 10 |
| T4.12 | Performance testing (API response times, image upload speed, AI latency, call quality) | QA | 6 |
| T4.13 | Security audit (auth flows, data access, image permissions, call privacy) | Backend | 5 |
| T4.14 | Bug fixing and polish | All | 14 |
| **Total** | | | **~91 hrs** |

### Phase 5: MVP Launch Prep (Week 7)

| # | Task | Owner | Est. Hours |
|---|------|-------|------------|
| T5.1 | Set up production environment (backend, AI service, database) | DevOps | 6 |
| T5.2 | Configure production monitoring and alerting (Sentry, uptime) | DevOps | 4 |
| T5.3 | Build EAS preview/production builds for iOS and Android | Frontend | 4 |
| T5.4 | Write user-facing documentation / help screens | All | 4 |
| T5.5 | Internal QA testing on physical devices (iOS + Android) | All | 8 |
| T5.6 | Prepare demo script and presentation materials | All | 4 |
| T5.7 | Final bug fixes and release candidate build | All | 8 |
| **Total** | | | **~38 hrs** |

---

## 5. MVP Roadmap

### Timeline Overview (7 Weeks)

```
Week 1          Week 2          Week 3          Week 4          Week 5          Week 6          Week 7
┌───────────┐   ┌───────────────────────────┐                                   ┌───────────┐
│  Phase 0  │   │       Phase 1             │                                   │  Phase 5  │
│  Project  │   │    Core Backend APIs      │                                   │   Launch  │
│   Setup   │   │                           │                                   │    Prep   │
└───────────┘   └───────────────────────────┘                                   └───────────┘
                ┌───────────────────────────────────────────┐
                │           Phase 2                         │
                │        AI Pipeline                        │
                │  (Vision Models + RAG + Orchestration)    │
                └───────────────────────────────────────────┘
                                ┌───────────────────────────────────────┐
                                │           Phase 3                     │
                                │       Frontend Core                   │
                                │  (All screens + components)           │
                                └───────────────────────────────────────┘
                                                        ┌───────────────────────┐
                                                        │       Phase 4         │
                                                        │  Integration & Test   │
                                                        └───────────────────────┘
```

### Week-by-Week Breakdown

#### Week 1: Foundation

**Goal:** All team members can develop independently with shared infrastructure.

- [x] Git repo + branching strategy
- [ ] Monorepo structure initialized
- [ ] Expo project bootstrapped
- [ ] Backend project bootstrapped
- [ ] AI service bootstrapped
- [ ] Database schema v1 designed
- [ ] Cloud services provisioned (DB, storage, Redis)
- [ ] API contract (OpenAPI spec) drafted
- [ ] CI/CD pipeline operational

**Milestone:** All three services (mobile, backend, AI) run locally with Docker Compose.

---

#### Week 2: Backend Core + AI Research

**Goal:** Core APIs functional; AI models selected and first prototype running.

**Backend Team:**
- [ ] Authentication API complete (signup, login, JWT)
- [ ] Pet Profile CRUD API complete
- [ ] Image upload pipeline functional
- [ ] Health Log CRUD API started
- [ ] TeleVet database schema designed (Veterinarians, Appointments, ConsultationNotes)

**AI Team:**
- [ ] Image quality validator prototype
- [ ] Base vision model selected and evaluated
- [ ] Poop Check model v1 prototype
- [ ] Evaluation dataset collection started

**Frontend Team:**
- [ ] Design system finalized
- [ ] Auth screens built (UI only, mock data)
- [ ] Pet profile form built (UI only)

**Milestone:** Can create a user, add a pet, and upload an image via API.

---

#### Week 3: Feature Build Sprint

**Goal:** All major features have working prototypes.

**Backend Team:**
- [ ] Health Check processing pipeline complete
- [ ] Health History API complete
- [ ] Job queue operational
- [ ] Health Log CRUD complete
- [ ] Vet listing and availability API complete
- [ ] Appointment booking CRUD API complete

**AI Team:**
- [ ] Poop Check model validated against threshold
- [ ] Coat Check model v1 prototype
- [ ] Fit Check model v1 prototype
- [ ] AI orchestration pipeline functional

**Frontend Team:**
- [ ] Onboarding flow complete
- [ ] Home dashboard complete
- [ ] Camera/upload flow complete
- [ ] Health check results screen complete
- [ ] TeleVet vet browsing and booking UI started

**Milestone:** End-to-end Poop Check works: take photo -> upload -> AI analyzes -> see score.

---

#### Week 4: Feature Completion

**Goal:** All P0 and P1 features implemented (may need polish).

**Backend Team:**
- [ ] Recommendation API complete
- [ ] Push notification service complete
- [ ] Analytics/trend computation jobs running
- [ ] Rate limiting active
- [ ] Twilio/Agora video call integration complete
- [ ] TeleVet session lifecycle API complete (start, end, vet notes, treatment plan)
- [ ] Pet profile sharing endpoint for vet consultations complete

**AI Team:**
- [ ] All 5 check models implemented (Coat, Fit, Teeth, Poop, Face)
- [ ] Confidence scoring operational
- [ ] RAG recommendation system v1 complete
- [ ] Anomaly detection engine v1 complete

**Frontend Team:**
- [ ] Health log forms complete
- [ ] Health history/timeline screen complete
- [ ] Trend charts implemented
- [ ] Recommendation display screen complete
- [ ] Reminders screen complete
- [ ] TeleVet booking screen complete
- [ ] TeleVet video/voice consultation screen complete
- [ ] TeleVet consultation history and vet notes screen complete

**Milestone:** All 5 AI health checks return scores; recommendations generated from RAG; TeleVet booking and call flow functional.

---

#### Week 5: Integration Sprint

**Goal:** Frontend connected to real backend and AI; full user journey works including TeleVet.

- [ ] All frontend screens connected to live APIs
- [ ] Image upload -> AI analysis -> results display works end-to-end
- [ ] Health logging -> trend computation -> chart display works
- [ ] Push notifications delivered on schedule
- [ ] TeleVet booking -> video call -> vet notes flow works end-to-end
- [ ] Pet profile sharing works during TeleVet consultation
- [ ] Begin E2E testing

**Milestone:** Complete user journey functional (onboard -> baseline checks -> daily logging -> get recommendations -> book and complete vet consultation).

---

#### Week 6: Testing & Polish

**Goal:** App is stable, performant, and handles edge cases.

- [ ] E2E test suite passing
- [ ] Performance benchmarks met (API < 500ms, AI < 5s, upload < 3s, call setup < 3s)
- [ ] Security audit complete
- [ ] All critical and high bugs resolved
- [ ] Loading/error/empty states polished
- [ ] Offline handling graceful

**Milestone:** Release candidate build on physical devices with no critical bugs.

---

#### Week 7: Launch Preparation

**Goal:** MVP ready for demo/soft launch.

- [ ] Production environment deployed and stable
- [ ] Monitoring and alerting configured
- [ ] iOS and Android builds generated
- [ ] Demo script rehearsed
- [ ] User documentation complete

**Milestone:** MVP demo-ready with real AI health checks, personalized recommendations, and TeleVet consultations.

---

## 6. Risk Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| AI model accuracy below useful threshold | High | Medium | Use GPT-4o Vision as fallback; clearly label outputs as "estimates"; require confidence scores |
| Poor image quality from users | High | High | Implement image quality validator (AI-09); provide in-app guidance with example photos |
| AI inference latency too slow | Medium | Medium | Use Groq for LLM (fast inference); async processing with job queue; show loading states |
| Scope creep beyond MVP | High | High | Strict P0/P1/P2 prioritization; defer Community, Lessons, Payment to post-MVP |
| TeleVet vet partner onboarding | Medium | High | Start with 2-3 pilot vet partners; use mock vet profiles for demo if partnerships delayed |
| Video call reliability across devices | Medium | Medium | Use established SDK (Twilio/Agora) with proven RN support; test on multiple devices early; implement graceful fallback to voice-only |
| Data privacy concerns with pet health photos | Medium | Low | Clear privacy policy; encrypt at rest and in transit; user data deletion capability |
| React Native performance issues with image-heavy UI | Medium | Medium | Optimize image caching (FastImage); lazy loading; pagination for history views |
| Team bandwidth constraints | High | Medium | Parallelize backend/AI/frontend work; use managed services (Supabase) to reduce ops burden |
| Model hallucination in recommendations | High | Medium | Ground RAG in veterinary literature; always include disclaimer; confidence scoring |

---

## 7. Success Metrics

### Technical Metrics (MVP)

| Metric | Target |
|--------|--------|
| API response time (p95) | < 500ms |
| AI health check latency (end-to-end) | < 8 seconds |
| TeleVet call setup time | < 3 seconds |
| TeleVet call drop rate | < 5% |
| Image upload time | < 3 seconds |
| App crash rate | < 1% of sessions |
| AI confidence score accuracy (correlation with vet assessment) | > 70% |
| Backend uptime | > 99% |

### Product Metrics (Post-Launch)

| Metric | Target (Month 1) |
|--------|-------------------|
| Daily active users performing at least 1 health check | 50+ |
| Average health checks per user per week | 3+ |
| User retention (Day 7) | > 40% |
| User-reported anxiety reduction (survey) | > 60% positive |
| Feature adoption: reminders set up | > 50% of users |
| TeleVet consultation bookings | 20+ in first month |
| TeleVet user satisfaction (post-call survey) | > 4.0 / 5.0 |
| NPS score | > 30 |

---

## Appendix: Database Schema (Draft)

```sql
-- Core tables for MVP

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(100) NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pets (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id          UUID REFERENCES users(id) ON DELETE CASCADE,
    name              VARCHAR(100) NOT NULL,
    species           VARCHAR(20) NOT NULL,  -- 'dog' or 'cat'
    breed             VARCHAR(100),
    date_of_birth     DATE,
    weight_kg         DECIMAL(5,2),
    profile_photo_url TEXT,
    existing_conditions TEXT[],
    created_at        TIMESTAMP DEFAULT NOW(),
    updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE TABLE health_checks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID REFERENCES pets(id) ON DELETE CASCADE,
    check_type      VARCHAR(20) NOT NULL,  -- 'coat', 'fit', 'teeth', 'poop', 'face'
    image_url       TEXT NOT NULL,
    score           DECIMAL(3,1),          -- e.g., 8.5 out of 10
    confidence      DECIMAL(3,2),          -- e.g., 0.85
    analysis_json   JSONB,                 -- detailed AI output
    status          VARCHAR(20) DEFAULT 'pending',  -- pending, processing, complete, failed
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE health_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID REFERENCES pets(id) ON DELETE CASCADE,
    log_type        VARCHAR(20) NOT NULL,  -- 'diet', 'activity', 'biological'
    log_data        JSONB NOT NULL,        -- flexible schema per log type
    logged_at       TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE recommendations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID REFERENCES pets(id) ON DELETE CASCADE,
    category        VARCHAR(30) NOT NULL,  -- 'diet', 'activity', 'care', 'vet_visit'
    content         TEXT NOT NULL,
    severity        VARCHAR(10),           -- 'info', 'warning', 'urgent'
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reminders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    pet_id          UUID REFERENCES pets(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    type            VARCHAR(20) NOT NULL,  -- 'feeding', 'walking', 'medication', 'grooming', 'checkup'
    recurrence      JSONB,                 -- cron-like recurrence pattern
    next_trigger_at TIMESTAMP,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- TeleVet tables

CREATE TABLE veterinarians (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    clinic_name     VARCHAR(200),
    specializations TEXT[],                -- e.g., ['dermatology', 'dentistry', 'general']
    bio             TEXT,
    profile_photo_url TEXT,
    license_number  VARCHAR(50),
    years_experience INTEGER,
    consultation_fee DECIMAL(6,2),         -- per-session fee in SGD
    rating          DECIMAL(2,1),          -- average rating (1.0-5.0)
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE vet_availability (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vet_id          UUID REFERENCES veterinarians(id) ON DELETE CASCADE,
    day_of_week     INTEGER NOT NULL,      -- 0=Sunday, 6=Saturday
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    slot_duration_min INTEGER DEFAULT 30,  -- consultation slot length
    is_active       BOOLEAN DEFAULT TRUE
);

CREATE TABLE appointments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    pet_id          UUID REFERENCES pets(id) ON DELETE CASCADE,
    vet_id          UUID REFERENCES veterinarians(id) ON DELETE CASCADE,
    scheduled_at    TIMESTAMP NOT NULL,
    duration_min    INTEGER DEFAULT 30,
    status          VARCHAR(20) DEFAULT 'scheduled',  -- scheduled, in_progress, completed, cancelled, no_show
    call_type       VARCHAR(10) DEFAULT 'video',      -- 'video' or 'voice'
    call_room_id    VARCHAR(200),          -- Twilio/Agora room identifier
    cancellation_reason TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE consultation_notes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id  UUID REFERENCES appointments(id) ON DELETE CASCADE,
    vet_id          UUID REFERENCES veterinarians(id) ON DELETE CASCADE,
    pet_id          UUID REFERENCES pets(id) ON DELETE CASCADE,
    summary         TEXT,                  -- vet's consultation summary
    diagnosis       TEXT,
    treatment_plan  JSONB,                 -- structured treatment plan
    follow_up_date  DATE,
    attachments     TEXT[],                -- URLs to uploaded documents/images
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

---

## Appendix: Team Role Suggestions

Based on a 6-person team (Aung Ye Thant Hein, Chue Myat Sandy, Darrius Ng, Lin Khant, Pe Thein, Rayner Sim, Win Lei Thawdar):

| Role | Suggested Allocation | Key Responsibilities |
|------|---------------------|---------------------|
| **Frontend Lead** (1 person) | Full-time frontend | Architecture decisions, component library, complex screens |
| **Frontend Dev** (1 person) | Full-time frontend | Screens, forms, integration with APIs |
| **Backend Lead** (1 person) | Full-time backend | API design, database schema, auth, infrastructure |
| **AI/ML Lead** (1 person) | Full-time AI | Vision models, RAG system, evaluation pipeline |
| **AI/ML Dev** (1 person) | Full-time AI | Data collection, model training, knowledge base curation |
| **Full Stack / DevOps** (1 person) | Split backend + DevOps | CI/CD, deployment, monitoring, integration support |

> **Note:** Roles should be flexible. During integration phases, everyone contributes to testing and bug fixes.

---

*Last updated: February 8, 2026*
*Project: PAWSITIVE - G4T1 - CS206 Software Product Management*
