import express from "express";
import { login, logOut, signUp } from "../Controllers/auth.controller.js";
const authRouter = express.Router();
authRouter.post("/signUp", signUp);
authRouter.post("/signin", login);
authRouter.get("/logout", logOut);
export default authRouter;
