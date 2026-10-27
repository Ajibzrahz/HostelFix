import * as z from "zod";
import { objectId } from "../../common/utils/objectId";

export const createUserSchema = z.object({
  body: z
    .strictObject({
      email: z
        .email({
          error: (issue) =>
            issue.input === undefined
              ? "Email is required"
              : "Invalid email address",
        })
        .toLowerCase(),

      name: z
        .string({ error: "Name is required" })
        .trim()
        .min(1, "Name cannot be empty"),

      password: z
        .string({ error: "Password is required" })
        .min(8, "Password must be at least 8 characters"),

      passwordConfirmation: z.string({
        error: "Password confirmation is required",
      }),
    })
    .refine((data) => data.password === data.passwordConfirmation, {
      message: "Passwords do not match",
      path: ["passwordConfirmation"],
    }),
});

export type CreateUserInput = Omit<
  z.infer<typeof createUserSchema>["body"],
  "passwordConfirmation"
>;

export const verifyEmailSchema = z.object({
  query: z.strictObject({
    email: z.email({ error: "Invalid email address" }).toLowerCase(),
    token: z.string().min(1, "Token is required"),
  }),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>["query"];

export const loginSchema = z.object({
  body: z.strictObject({
    email: z.email({ error: "Invalid email address" }).toLowerCase(),
    password: z
      .string({ error: "Password is required" })
      .min(1, "Password is required"),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>["body"];

export const resendVerificationSchema = z.object({
  body: z.strictObject({
    email: z.email({ error: "Invalid email address" }).toLowerCase(),
  }),
});

export type ResendVerificationInput = z.infer<
  typeof resendVerificationSchema
>["body"];

export const updateUserSchema = z.object({
  body: z
    .strictObject({
      email: z.email({ error: "Invalid email address" }).toLowerCase(),

      name: z
        .string({ error: "Name must be a string" })
        .trim()
        .min(1, "Name cannot be empty"),
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: "Provide at least one field to update",
    }),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>["body"];

export const getUserSchema = z.object({
  params: z.object({ userId: objectId }),
});

export type GetUserInput = z.infer<typeof getUserSchema>["params"];
