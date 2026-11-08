import { z } from "zod";

export const UserReadSchema = z.object({
  id: z.number(),
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email format"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type UserResponseSchema = z.infer<typeof UserReadSchema>;
