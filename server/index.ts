import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Trust the proxy (essential for Replit/Heroku/Vercel) to get correct user IPs
app.set("trust proxy", 1);

// Security Headers
// Note: We disable Content Security Policy (CSP) for now to ensure we don't block
// your generated images or UI styles. In a strict financial app, you would enable this.
app.use(helmet({
  contentSecurityPolicy: false, 
}));

// Performance: Compress responses (GZIP)
app.use(compression());

// Basic Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rate Limiting: Prevent abuse of your API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { message: "Too many requests, please try again later." },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to all API routes
app.use("/api", apiLimiter);

// Serve generated images from the public directory
// Note: In a scalable production environment (like AWS/GCP), you should move this 
// to S3 or Google Cloud Storage, as local files may be lost on deployment.
app.use('/generated-images', express.static(path.join(process.cwd(), 'public', 'generated-images')));

// Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Register the API routes first
  const server = await registerRoutes(app);

  // Then add the error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // In production, you might want to log the full error but send a generic message to the client
    console.error("Server error:", err);
    res.status(status).json({ message });
  });

  // Check if a request is an API request
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      // This is an API request but no route matched - return 404
      return res.status(404).json({ message: "API endpoint not found" });
    }
    // Not an API request, continue to the next middleware (Vite or static)
    next();
  });

  // Setup Vite in development, otherwise serve static files
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use dynamic port for production (process.env.PORT) or fallback to 5000
  // Replit often uses port 5000 or the PORT env var.
  const port = Number(process.env.PORT) || 5000;
  
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
