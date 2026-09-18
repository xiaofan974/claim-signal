import express, { type Express } from "express";
import cors from "cors";
import pinoHttp, { type Options } from "pino-http";
import type { Logger } from "pino";
import router from "./routes";
import {
  createClaimAnalysisRouter,
  type ClaimAnalysisStore,
} from "./routes/claim-analysis";
import { logger } from "./lib/logger";

type AppOptions = {
  logger?: Logger;
  analysisStore?: ClaimAnalysisStore;
};

export function createApp(options: AppOptions = {}): Express {
  const app: Express = express();

  // The API is served behind Replit's proxy in deployed environments. Trusting
  // one proxy hop lets route-level protections use the originating client IP.
  app.set("trust proxy", 1);

  const loggingOptions: Options = {
    logger: options.logger ?? logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  };

  app.use(pinoHttp(loggingOptions));
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(
    "/api",
    options.analysisStore
      ? createClaimAnalysisRouter(options.analysisStore)
      : router,
  );

  return app;
}

export default createApp();
