import { auth } from "@/http/middlewares/auth";
import { prisma } from "@/lib/prisma";
import { getUserPermissions } from "@/utils/get-user-permissions";
import { organizationSchema } from '@sass/auth';
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { BadRequestError } from "../_errors/bad-request-error";
import { UnauthorizedError } from "../_errors/unauthorized-error";

export async function transferOrganization(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().register(auth).patch('/organizations/:slug/owner', {
    schema: {
      tags: ['Organization'],
      summary: 'Transfer organization ownership.',
      security: [
        { bearerAuth: [] }
      ],
      body: z.object({
        transferToUserId: z.uuid(),
      }),
      params: z.object({
        slug: z.string()
      }),
      response: {
        204: z.null()
      }
    }
  }, async (request, reply) => {
    const { slug } = request.params
    const userId = await request.getCurrentUserId()
    const { organization, membership } = await request.getUserMembership(slug)

    const authOrganization = organizationSchema.parse(organization)
    const { cannot } = getUserPermissions(userId, membership.role)

    if (cannot('transfer_ownership', authOrganization)) {
      throw new UnauthorizedError(`You're not allowed to transfer this organization ownership.`)
    }
    const { transferToUserId } = request.body
    const transferToMembership = await prisma.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: transferToUserId
        }
      }
    })
    if (!transferToMembership) {
      throw new BadRequestError('Target user is not a member of this organization.')
    }




    await prisma.$transaction([
      prisma.member.update({
        where: {
          organizationId_userId: {
            organizationId: organization.id,
            userId: transferToUserId
          }
        },
        data: {
          role: 'ADMIN'
        }
      }),
      prisma.organization.update({
        where: {
          id: organization.id
        },
        data: {
          ownerId: transferToUserId
        }
      })
    ])

    return reply.status(204).send()
  })
}