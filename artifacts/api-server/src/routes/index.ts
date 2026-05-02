import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scenesRouter from "./scenes";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(scenesRouter);
router.use(storageRouter);

export default router;
