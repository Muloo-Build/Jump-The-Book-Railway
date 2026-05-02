import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scenesRouter from "./scenes";
import storageRouter from "./storage";
import meRouter from "./me";

const router: IRouter = Router();

router.use(healthRouter);
router.use(scenesRouter);
router.use(storageRouter);
router.use(meRouter);

export default router;
