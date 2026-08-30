import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { contentService } from './content.service';

const getAllContents = catchAsync(async (req: Request, res: Response) => {
  const contents = await contentService.getAllContents();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Content items retrieved successfully',
    data: { contents },
  });
});

const createContent = catchAsync(async (req: Request, res: Response) => {
  const authorId = req.user!.id;
  const { title, body } = req.body;
  const content = await contentService.createContent(authorId, title, body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Content item created successfully',
    data: { content },
  });
});

const updateContent = catchAsync(async (req: Request, res: Response) => {
  const contentId = parseInt(req.params.id, 10);
  const { title, body } = req.body;
  const content = await contentService.updateContent(contentId, title, body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Content item updated successfully',
    data: { content },
  });
});

const deleteContent = catchAsync(async (req: Request, res: Response) => {
  const contentId = parseInt(req.params.id, 10);
  const result = await contentService.deleteContent(contentId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
  });
});

export const contentController = {
  getAllContents,
  createContent,
  updateContent,
  deleteContent,
};
