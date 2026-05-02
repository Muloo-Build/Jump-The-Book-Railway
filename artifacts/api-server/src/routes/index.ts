import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scenesRouter from "./scenes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(scenesRouter);

export default router;
