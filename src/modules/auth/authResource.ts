import {
  AuthenticationResponseJSON,
  AuthenticatorTransport,
  generateAuthenticationOptions,
  GenerateAuthenticationOptionsOpts,
  generateRegistrationOptions,
  GenerateRegistrationOptionsOpts,
  RegistrationResponseJSON,
  VerifiedAuthenticationResponse,
  VerifiedRegistrationResponse,
  verifyAuthenticationResponse,
  VerifyAuthenticationResponseOpts,
  verifyRegistrationResponse,
  VerifyRegistrationResponseOpts,
  WebAuthnCredential,
} from "@simplewebauthn/server";
import Router from "@koa/router";
import { getUserByUsername } from "../user/userPersistence";
import { LoggedInUser } from "./types";
import { getPasskeysByUserId } from "./authPersistence";

const {
  ENABLE_CONFORMANCE,
  ENABLE_HTTPS,
  RP_ID = "a2fd-185-72-75-57.ngrok-free.app",
} = process.env;

// Initialize Koa router
export const router = new Router();

/**
 * Human-readable title for your website
 */
const rpName = "SyncNotes";

/**
 * A unique identifier for your website. 'localhost' is okay for local dev
 */
export const rpID = RP_ID;

/**
 * The URL at which registrations and authentications should occur.
 * 'http://localhost' and 'http://localhost:PORT' are also valid.
 * Do NOT include any trailing /
 */
export let expectedOrigin = `https://${rpID}`;

/**
 * 2FA and Passwordless WebAuthn flows expect you to be able to uniquely identify the user that
 * performs registration or authentication. The user ID you specify here should be your internal,
 * _unique_ ID for that user (uuid, etc...). Avoid using identifying information here, like email
 * addresses, as it may be stored within the credential.
 *
 * Here, the example server assumes the following user has completed login:
 */
const loggedInUserId = "internalUserId";

const inMemoryUserDB: { [loggedInUserId: string]: LoggedInUser } = {
  [loggedInUserId]: {
    id: loggedInUserId,
    username: `user@${rpID}`,
    credentials: [],
  },
};

// Route to get specific configuration by ID
router.get("/hello", async (ctx) => {
  ctx.body = {
    message: "Hello, world!",
  };
});

/**
 * Registration (a.k.a. "Registration")
 */
router.get("/generate-registration-options", async (ctx) => {
  // const user = inMemoryUserDB[loggedInUserId];
  const userNameFromRequest = ctx.request.query.username as string | undefined;

  if (!userNameFromRequest) {
    ctx.status = 400;
    ctx.body = { error: "Missing user name" };
    return;
  }

  const user = await getUserByUsername(userNameFromRequest);

  if (user == null) {
    ctx.status = 400;
    ctx.body = { error: "User not found" };
    return;
  }

  const { id, username } = user;

  const passkeys = await getPasskeysByUserId(id);

  console.log("generate-registration-options user", user);

  const opts: GenerateRegistrationOptionsOpts = {
    rpName,
    rpID,
    userName: username,
    // Don't prompt users for additional information about the authenticator (Recommended for smoother UX)
    attestationType: "none",
    timeout: 60000,
    // preferredAuthenticatorType: "localDevice",
    /**
     * Passing in a user's list of already-registered credential IDs here prevents users from
     * registering the same authenticator multiple times. The authenticator will simply throw an
     * error in the browser if it's asked to perform registration when it recognizes one of the
     * credential ID's.
     */
    excludeCredentials: passkeys.map((cred) => ({
      id: cred.id,
      // type: "public-key",
      transports: cred.transports as unknown as AuthenticatorTransport[],
    })),
    authenticatorSelection: {
      // Defaults
      residentKey: "preferred",
      userVerification: "preferred",
      // Optional
      authenticatorAttachment: "platform",
    },
    /**
     * Support the two most common algorithms: ES256, and RS256
     */
    // supportedAlgorithmIDs: [-7, -257],
  };

  const options = await generateRegistrationOptions(opts);

  /**
   * The server needs to temporarily remember this value for verification, so don't lose it until
   * after you verify the registration response.
   */
  (ctx as any).session.currentChallenge = options.challenge;

  ctx.body = options;
});

router.post("/verify-registration", async (ctx) => {
  const body = ctx.request.body as RegistrationResponseJSON;

  const user = inMemoryUserDB[loggedInUserId];

  console.log("verify-registration user", user);
  console.log("session", structuredClone((ctx as any).session));

  const expectedChallenge = (ctx as any).session.currentChallenge;

  let verification: VerifiedRegistrationResponse;
  try {
    const opts: VerifyRegistrationResponseOpts = {
      response: body,
      expectedChallenge: `${expectedChallenge}`,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: false,
    };
    verification = await verifyRegistrationResponse(opts);
  } catch (error) {
    const _error = error as Error;
    console.error(_error);

    ctx.status = 400;
    ctx.body = { error: _error.message };
    return;
    // return res.status(400).send({ error: _error.message });
  }

  const { verified, registrationInfo } = verification;

  if (verified && registrationInfo) {
    const { credential } = registrationInfo;

    const existingCredential = user.credentials.find(
      (cred) => cred.id === credential.id
    );

    if (!existingCredential) {
      /**
       * Add the returned credential to the user's list of credentials
       */
      const newCredential: WebAuthnCredential = {
        id: credential.id,
        publicKey: credential.publicKey,
        counter: credential.counter,
        transports: body.response.transports,
      };
      user.credentials.push(newCredential);
    }
  }

  (ctx as any).session.currentChallenge = undefined;

  ctx.body = { verified };
});

/**
 * Login (a.k.a. "Authentication")
 */
router.get("/generate-authentication-options", async (ctx) => {
  // You need to know the user by this point
  // const user = inMemoryUserDB[loggedInUserId];
  const userNameFromRequest = ctx.request.query.username as string | undefined;

  if (!userNameFromRequest) {
    ctx.status = 400;
    ctx.body = { error: "Missing user name" };
    return;
  }

  const user = await getUserByUsername(userNameFromRequest);

  if (user == null) {
    ctx.status = 400;
    ctx.body = { error: "User not found" };
    return;
  }

  const { id, username } = user;

  const passkeys = await getPasskeysByUserId(id);

  console.log("generate-authentication-options user", user);

  const opts: GenerateAuthenticationOptionsOpts = {
    timeout: 60000,
    allowCredentials: passkeys.map((cred) => ({
      id: cred.id,
      // type: "public-key",
      transports: cred.transports as unknown as AuthenticatorTransport[],
    })),
    /**
     * Wondering why user verification isn't required? See here:
     *
     * https://passkeys.dev/docs/use-cases/bootstrapping/#a-note-about-user-verification
     */
    userVerification: "preferred",
    rpID,
  };

  const options = await generateAuthenticationOptions(opts);

  /**
   * The server needs to temporarily remember this value for verification, so don't lose it until
   * after you verify the authentication response.
   */
  (ctx as any).session.currentChallenge = options.challenge;

  ctx.body = options;
});

router.post("/verify-authentication", async (ctx) => {
  const body = ctx.request.body as AuthenticationResponseJSON;

  const user = inMemoryUserDB[loggedInUserId];

  const expectedChallenge = (ctx as any).session.currentChallenge;

  let dbCredential: WebAuthnCredential | undefined;
  // "Query the DB" here for a credential matching `cred.id`
  for (const cred of user.credentials) {
    if (cred.id === body.id) {
      dbCredential = cred;
      break;
    }
  }

  if (!dbCredential) {
    ctx.status = 400;
    ctx.body = {
      error: "Authenticator is not registered with this site",
    };
    return;
    // return res.status(400).send({
    //   error: " Authenticator is not registered with this site",
    // });
  }

  let verification: VerifiedAuthenticationResponse;
  try {
    const opts: VerifyAuthenticationResponseOpts = {
      response: body,
      expectedChallenge: `${expectedChallenge}`,
      expectedOrigin,
      expectedRPID: rpID,
      credential: dbCredential,
      requireUserVerification: false,
    };
    verification = await verifyAuthenticationResponse(opts);
  } catch (error) {
    const _error = error as Error;
    console.error(_error);
    ctx.status = 400;
    ctx.body = { error: _error.message };
    return;
  }

  const { verified, authenticationInfo } = verification;

  if (verified) {
    // Update the credential's counter in the DB to the newest count in the authentication
    dbCredential.counter = authenticationInfo.newCounter;
  }

  (ctx as any).session.currentChallenge = undefined;

  ctx.body = { verified };
});
