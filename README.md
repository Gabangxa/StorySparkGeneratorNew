# StoryWonder

StoryWonder is a full-stack AI-powered application that generates personalized children's storybooks. It combines OpenAI's GPT models for narrative generation and Google's Gemini AI for illustrations to create unique, illustrated stories based on user preferences.

## Features

- **Personalized Story Generation:** Create stories by specifying characters, themes, age ranges, and art styles.
- **AI-Powered Illustrations:** Automatically generates consistent illustrations for each page using Google Gemini.
- **PDF Export:** Download the generated story as a beautifully formatted PDF.
- **User Accounts:** Save and manage your stories.
- **Interactive Preview:** Read stories in a browser-based reader before downloading.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Shadcn UI
- **Backend:** Node.js, Express
- **Database:** PostgreSQL (Neon), Drizzle ORM
- **AI:** OpenAI API (GPT-4o), Google Gemini API
- **Deployment:** Replit (Autoscale)

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v20 or later recommended)
- PostgreSQL database (or use a provider like Neon)

You will also need API keys for:
- [OpenAI](https://platform.openai.com/)
- [Google Gemini](https://ai.google.dev/)

## Environment Variables

Create a `.env` file in the root directory (or set them in your environment) with the following variables:

```env
DATABASE_URL=postgresql://user:password@host:port/dbname
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
SESSION_SECRET=your_secret_session_key
```

Note: `SESSION_SECRET` is required if using persistent sessions.

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd storywonder
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Push the database schema:
   ```bash
   npm run db:push
   ```

## Running the Application

### Development

To start the development server with hot-reload:

```bash
npm run dev
```

The application will be available at `http://localhost:5000`.

### Production

To build and start for production:

```bash
npm run build
npm start
```

## Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the frontend and backend for production.
- `npm start`: Starts the production server.
- `npm run check`: Runs TypeScript type checking.
- `npm run db:push`: Pushes schema changes to the database using Drizzle Kit.

## Project Structure

- `client/`: React frontend code.
- `server/`: Express backend code.
- `shared/`: Shared types and Zod schemas.
- `public/`: Static assets.

## License

MIT
