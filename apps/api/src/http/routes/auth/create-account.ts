import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from 'zod/v4';
import { BadRequestError } from "../_errors/bad-request-error";
export async function createAccount(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/users',
    {
      schema: {
        tags: ['Auth'],
        summary: "Create a new user account",
        body: z.object({
          name: z.string().min(1, "Name is required"),
          email: z.email(),
          password: z.string().min(6, "Password must be at least 6 characters long"),
        }),

      }
    },
    async (request, reply) => {
      const { name, email, password } = request.body
      const userWithSameEmail = await prisma.user.findUnique({
        where: { email }
      })

      if (userWithSameEmail) {
        throw new BadRequestError('User with same e-mail already exists.')
      }

      const [, domain] = email.split('@');

      const autoJoinOrganization = await prisma.organization.findFirst({
        where: {
          domain,
          shouldAttachUsersByDomain: true
        }
      })

      const passwordHash = await hash(password, 6);

      await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          member_on: autoJoinOrganization ? {
            create: {
              organizationId: autoJoinOrganization.id,
            }
          } : undefined,
        }
      })
      return reply.status(201).send()
    })
}