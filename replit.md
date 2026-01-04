# StoryWonder - AI-Powered Children's Storybook Generator

## Overview

StoryWonder is a full-stack web application that generates personalized, illustrated children's storybooks using AI. Users can create custom stories by specifying characters, themes, age ranges, and art styles. The application uses OpenAI's GPT models for story generation and Google's Gemini AI (gemini-2.5-flash-preview-05-20) for image generation, producing multi-page storybooks with consistent character appearances and downloadable PDF outputs.

The application is built as a modern React single-page application with an Express backend, featuring a multi-step story creation wizard (6 steps including character approval), real-time preview capabilities, PDF export functionality, and a credits-based usage system.

## Key Features

- **Replit Auth Integration**: User authentication supporting Google, GitHub, and email/password login
- **Credits System**: Each user starts with 3 free credits; 1 credit = 1 story generation
- **Age-Appropriate Content**: Stories tailored for 4 age ranges (0-2, 3-5, 6-8, 9-12) with vocabulary, complexity, themes, and visual styles adjusted accordingly
- **Character Review System**: Users can approve/regenerate character illustrations before story generation
- **Scene Variety**: Each page gets unique camera angles, poses, and compositions to prevent repetitive images
- **Text-Free Images**: Explicit instructions prevent AI from rendering text/labels in generated illustrations

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack**: React 18 with TypeScript, Vite build system, Wouter for routing

**UI Framework**: Radix UI component library with shadcn/ui design system, Tailwind CSS for styling

**State Management**: TanStack Query (React Query) for server state management and data fetching

**Key Design Patterns**:
- Component-based architecture with reusable UI primitives
- Form validation using React Hook Form with Zod schema validation
- Multi-step wizard pattern for story creation workflow (6 steps)
- Responsive design with mobile-first approach

**Page Structure**:
- Home page: Landing page with feature showcase
- Create Story: Multi-step wizard for story generation
- My Stories: Library view of created stories
- View Story: Individual story reader with PDF export

**Routing**: Client-side routing using Wouter, with routes defined in `App.tsx`

### Backend Architecture

**Framework**: Express.js with TypeScript running on Node.js

**API Design**: RESTful API with JSON responses

**Key Endpoints**:
- `GET /api/stories` - Fetch all stories
- `GET /api/stories/:id` - Fetch single story by ID
- `POST /api/stories` - Create new story (triggers AI generation)
- `DELETE /api/stories/:id` - Delete story

**Server Architecture**:
- `server/index.ts` - Express application setup and middleware
- `server/routes.ts` - API route definitions and handlers
- `server/storage.ts` - Data access layer abstraction
- `server/db.ts` - Database connection configuration
- `server/openai.ts` - AI service integration layer
- `server/vite.ts` - Vite development server integration

**Middleware**:
- JSON body parsing
- Request/response logging for API endpoints
- Static file serving for generated images
- Error handling middleware

### Data Storage

**Database**: PostgreSQL via Neon serverless database

**ORM**: Drizzle ORM with type-safe schema definitions

**Schema Design** (defined in `shared/schema.ts`):
- `users` table: User authentication (id, username, password)
- `stories` table: Story metadata and content
  - Basic info: id, title, description, storyType, ageRange
  - Configuration: artStyle, layoutType, numberOfPages
  - Content: pages (JSONB array), entities (JSONB array)
  - Timestamps: createdAt

**Type Safety**: Shared schema between frontend and backend using Zod validation schemas

**Migrations**: Drizzle Kit for database schema migrations (`npm run db:push`)

### AI Integration Layer

**Text Generation**: OpenAI GPT-4o model for story narrative generation
- Generates multi-page story content with consistent narratives
- Creates detailed image prompts for each page
- Identifies and tracks story entities (characters, locations, objects)

**Image Generation**: Google Gemini AI (Nano Banana model) for illustrations
- Generates images based on AI-created prompts
- Maintains visual consistency for recurring entities
- Stores generated images in `public/generated-images/` directory

**Entity Tracking System**:
- Identifies characters, locations, and objects in stories
- Tracks which pages each entity appears on
- Uses generation IDs to maintain visual consistency across pages
- Supports optional user-provided character images

**Generation Pipeline**:
1. User submits story parameters (title, description, type, age range, art style, layout)
2. Backend calls OpenAI to generate story text and image prompts
3. Backend calls Gemini AI to generate images for each page
4. Images saved to filesystem with unique filenames
5. Complete story saved to database with image URLs
6. Frontend displays completed story

### PDF Generation

**Library**: @react-pdf/renderer for client-side PDF creation

**Architecture**:
- `StoryBook.tsx` component renders full PDF document
- `StoryPage.tsx` component renders individual pages
- Supports two layout modes: side-by-side and picture-top
- Includes cover page with story metadata

**Features**:
- Download PDF for offline reading
- Live preview mode in browser
- Preserves image quality and layout

### Build and Deployment

**Development**:
- Vite dev server with HMR for frontend
- tsx for TypeScript execution in development
- Concurrent frontend/backend development

**Production Build**:
- Vite builds optimized React bundle to `dist/public`
- esbuild bundles Express server to `dist/index.js`
- Static assets served from build directory

**Scripts**:
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm start` - Production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Database migrations

## External Dependencies

**AI Services**:
- OpenAI API (GPT-4o model) - Story text generation and image prompt creation
- Google Gemini AI - Image generation (Nano Banana model)
- Requires `OPENAI_API_KEY` and `GEMINI_API_KEY` environment variables

**Database**:
- Neon PostgreSQL serverless database
- Requires `DATABASE_URL` environment variable
- WebSocket connection support for serverless environments

**Core Libraries**:
- Drizzle ORM with PostgreSQL dialect for database operations
- React Hook Form + Zod for form validation and type safety
- TanStack Query for API data fetching and caching
- Radix UI for accessible component primitives
- @react-pdf/renderer for PDF generation

**Development Tools**:
- Replit-specific plugins for enhanced development experience
- Vite for fast development and optimized builds
- TypeScript for type safety across the stack

**File Storage**:
- Local filesystem storage for generated images in `public/generated-images/`
- Images served via Express static middleware at `/generated-images` route