import { bodyParser } from "@koa/bodyparser";
import cors from "@koa/cors";
import dotenv from "dotenv";
import Koa from "koa";
import session, { CreateSessionOptions } from "koa-session";
import MemoryStore from "koa-session-memory";
import { router as authRouter } from "./modules/auth/authResource";
import serve from "koa-static";

dotenv.config();

// Initialize Koa app
const app = new Koa();
const store = new MemoryStore();

const { ENABLE_CONFORMANCE, ENABLE_HTTPS, RP_ID = "localhost" } = process.env;

app.keys = ["some secret hurrrrr123090sdufiosiufg"];

const sessionConfig: CreateSessionOptions = {
  key: "koa.sess" /** (string) cookie key (default is koa.sess) */,
  /** (number || 'session') maxAge in ms (default is 1 days) */
  /** 'session' will result in a cookie that expires when session/browser is closed */
  /** Warning: If a session cookie is stolen, this cookie will never expire */
  maxAge: 86400000,
  autoCommit: true /** (boolean) automatically commit headers (default true) */,
  overwrite: true /** (boolean) can overwrite or not (default true) */,
  httpOnly: true /** (boolean) httpOnly or not (default true) */,
  signed: true /** (boolean) signed or not (default true) */,
  rolling:
    false /** (boolean) Force a session identifier cookie to be set on every response. The expiration is reset to the original maxAge, resetting the expiration countdown. (default is false) */,
  renew:
    false /** (boolean) renew session when session is nearly expired, so we can always keep user logged in. (default is false)*/,
  secure: false /** (boolean) secure cookie*/,
  // sameSite: null /** (string) session cookie sameSite options (default null, don't set it) */,1
  store,
};

app.use(session(sessionConfig, app));

app.use(serve("public"));

// Middleware to handle CORS
const corsOptions: cors.Options = {
  credentials: true,
};
app.use(cors(corsOptions));

// Add body parser
app.use(bodyParser());

// Add routes
app.use(authRouter.routes()).use(authRouter.allowedMethods());

// Start the Koa app
const port = 3000;
app.listen(port, () => {
  console.log(`Koa server running on http://localhost:${port}`);
});

console.log("Server is starting...");
