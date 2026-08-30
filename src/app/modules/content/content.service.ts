import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";

class ContentService {
  async getAllContents() {
    return prisma.content.findMany({
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createContent(authorId: string, title: string, body: string) {
    if (!title || !body) {
      throw new AppError(status.BAD_REQUEST, "Title and body are required.");
    }

    return prisma.content.create({
      data: { title, body, authorId },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async updateContent(contentId: number, title?: string, body?: string) {
    const existing = await prisma.content.findUnique({ where: { id: contentId } });
    if (!existing) {
      throw new AppError(status.NOT_FOUND, `Content with ID ${contentId} not found.`);
    }

    return prisma.content.update({
      where: { id: contentId },
      data: {
        ...(title && { title }),
        ...(body && { body }),
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async deleteContent(contentId: number) {
    const existing = await prisma.content.findUnique({ where: { id: contentId } });
    if (!existing) {
      throw new AppError(status.NOT_FOUND, `Content with ID ${contentId} not found.`);
    }

    await prisma.content.delete({ where: { id: contentId } });
    return { message: "Content deleted successfully." };
  }
}

export const contentService = new ContentService();
export default contentService;
