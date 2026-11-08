import { z } from "zod";

export const AuthReadSchema = z.object({
  id: z.string(),
  publicKey: z.instanceof(Uint8Array),
  user_id: z.number(),
  webauthn_user_id: z.string(),
  counter: z.number(),
  backup_eligible: z.boolean(),
  backed_status: z.boolean(),
  transports: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  last_used: z.string().datetime(),
  device_type: z.string(),
  // Foreign key to an instance of your internal user model
  user: z.object({
    id: z.string(),
    username: z.string(),
  }),
});

export type AuthResponseSchema = z.infer<typeof AuthReadSchema>;
