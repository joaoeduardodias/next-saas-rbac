import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from 'zod/v4';
export async function createAccount(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/users',
    {
      schema: {
        body: z.object({
          name: z.string().min(1, "Name is required"),
          email: z.string(),
          password: z.string().min(6, "Password must be at least 6 characters long"),
        })
      }
    },
    async (request, reply) => {
      const { name, email, password } = request.body
      const userWithSameEmail = await prisma.user.findUnique({
        where: { email }
      })

      if (userWithSameEmail) {
        return reply.status(400).send({ error: "User with same e-mail already exists." });
      }
      const passwordHash = await hash(password, 6);

      await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
        }
      })
      return reply.status(201).send()
    })
}