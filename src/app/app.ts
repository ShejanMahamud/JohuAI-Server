import { generateText } from 'ai';
import CookieParser from 'cookie-parser';
import cors from 'cors';
import type { Application, NextFunction, Request, Response } from 'express';
import express from 'express';
import passport from 'passport';
import { ZodError } from 'zod';
import config from '../config';
import { google, groq } from '../helpers/constants';
import aiAssistantRoutes from '../routes/ai-assistant.routes';
import authRoutes from '../routes/auth.routes';
import botsRoutes from '../routes/bots.routes';
import toolsRoutes from '../routes/tools.routes';
import userRoutes from '../routes/user.routes';
import { ErrorWithStatus } from '../types/global';
import { CustomError } from '../utils/customError';
const app: Application = express();
app.use(express.json());
app.use(CookieParser());

app.use(passport.initialize());
app.use(
  cors({
    origin: [config.clientUrl],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.get('/v1/api', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'Server is Running! 🏃' });
});

app.get('/image-info', async (req: Request, res: Response) => {
  const chatCompletion = await groq.chat.completions.create({
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: "What's in this image?",
          },
          {
            type: 'image_url',
            image_url: {
              url: 'https://i.ibb.co.com/BNsGYwB/frontend-shejan-mahamud-resume-2-page-0001.jpg',
            },
          },
        ],
      },
    ],
    model: 'llama-3.2-11b-vision-preview',
    temperature: 1,
    max_tokens: 1024,
    top_p: 1,
    stream: false,
    stop: null,
  });

  console.log(chatCompletion);
  res.json({
    success: true,
    message: chatCompletion.choices[0].message.content,
  });
});

app.post('/gemini', async (req: Request, res: Response) => {
  try {
    const { text } = await generateText({
      model: google('gemini-1.5-pro-latest'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'What is an embedding model?',
            },
          ],
        },
      ],
    });
    console.log(text);
    res.json(text);
  } catch (err) {
    console.log(err);
  }
});

app.use('/v1/api/auth', authRoutes);
app.use('/v1/api/user', userRoutes);
app.use('/v1/api/bots', botsRoutes);
app.use('/v1/api/tools', toolsRoutes);
app.use('/v1/api/ai-assistant', aiAssistantRoutes);

// Handle 404 errors
app.use((req, res, next) => {
  const error = new CustomError('Requested URL Not Found', 404);
  next(error);
});
//Global Error Handler
app.use(
  (
    error: ErrorWithStatus,
    _req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    let errorMessage = error.message || 'Internal Server Error!';

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      errorMessage = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('; ');
    }

    console.error('🛑 Error: ' + errorMessage);
    console.error('🛑 Error Stack: ' + error.stack);
    if (res.headersSent) {
      return next(error);
    }

    res.status(error.status || 500).json({
      success: false,
      message: errorMessage,
    });
  },
);

app.all('*', (_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Page Not Found' });
});

export default app;
