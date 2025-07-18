import { auth } from "@/http/middlewares/auth";
import { prisma } from "@/lib/prisma";
import { getUserPermissions } from "@/utils/get-user-permissions";
import { projectSchema } from "@sass/auth";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { BadRequestError } from "../_errors/bad-request-error";
import { UnauthorizedError } from "../_errors/unauthorized-error";

export async function deleteProject(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().register(auth).delete('/organizations/:slug/projects/:projectId', {
    schema: {
      tags: ['Project'],
      summary: 'Delete a project.',
      security: [
        { bearerAuth: [] }
      ],

      params: z.object({
        slug: z.string(),
        projectId: z.uuid()
      }),
      response: z.object({
        204: z.null()
      })
    }
  }, async (request, reply) => {
    const { slug, projectId } = request.params
    const userId = await request.getCurrentUserId()
    const { membership, organization } = await request.getUserMembership(slug)
    const project = prisma.project.findUnique({
      where: {
        id: projectId,
        organizationId: organization.id
      }
    })
    if (!project) {
      throw new BadRequestError('Project not found.')
    }

    const { cannot } = getUserPermissions(userId, membership.role)
    const authProject = projectSchema.parse(project)


    if (cannot('delete', authProject)) {
      throw new UnauthorizedError(`You're not allowed to delete this project.`)
    }
    await prisma.project.delete({
      where: {
        id: projectId
      }
    })

    return reply.status(204).send()
  })
}