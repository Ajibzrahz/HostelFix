import {z} from "zod"

export const createSessionSchema = z.object({
    body: z.object({
        email: z.email({
            error: "Email is required"
        }), password: z.string({
            error: "password is required"
        })
    })
})