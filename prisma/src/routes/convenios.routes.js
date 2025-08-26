import { Router } from "express";
import { crearConvenio } from "../controllers/convenios.controller.js";

const router = Router();

router.post("/", crearConvenio);

export default router;
