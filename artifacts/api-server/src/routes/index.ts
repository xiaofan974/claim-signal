import { Router, type IRouter } from "express";
import healthRouter from "./health";
import claimAnalysisRouter from "./claim-analysis";

const router: IRouter = Router();

router.use(healthRouter);
router.use(claimAnalysisRouter);

export default router;
