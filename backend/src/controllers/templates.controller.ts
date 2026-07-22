import { Request, Response } from 'express';
import { z } from 'zod';
import { ChecklistTemplate, TemplateItem } from '../models';
import { redisClient } from '../config/redisClient';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';

const TEMPLATES_CACHE_KEY = 'templates:active';
const TEMPLATES_CACHE_TTL_SECONDS = 60 * 60;

async function invalidateTemplatesCache(): Promise<void> {
  await redisClient.del(TEMPLATES_CACHE_KEY);
}

export const getActiveTemplates = asyncHandler(async (_req: Request, res: Response) => {
  const cached = await redisClient.get(TEMPLATES_CACHE_KEY);
  if (cached) {
    res.json(JSON.parse(cached));
    return;
  }

  const templates = await ChecklistTemplate.findAll({
    where: { active: true },
    include: [{ model: TemplateItem, as: 'items', separate: true, order: [['orderIndex', 'ASC']] }],
  });

  await redisClient.set(TEMPLATES_CACHE_KEY, JSON.stringify(templates), 'EX', TEMPLATES_CACHE_TTL_SECONDS);
  res.json(templates);
});

export const listTemplates = asyncHandler(async (_req: Request, res: Response) => {
  const templates = await ChecklistTemplate.findAll({
    include: [{ model: TemplateItem, as: 'items', separate: true, order: [['orderIndex', 'ASC']] }],
    order: [['createdAt', 'DESC']],
  });
  res.json(templates);
});

const itemSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  photoRequired: z.boolean().default(true),
  isBlocking: z.boolean().default(true),
  category: z.string().optional(),
});

async function createItems(templateId: string, items: z.infer<typeof itemSchema>[]): Promise<void> {
  await TemplateItem.bulkCreate(
    items.map((item, index) => ({
      templateId,
      orderIndex: index,
      title: item.title,
      description: item.description ?? null,
      photoRequired: item.photoRequired,
      isBlocking: item.isBlocking,
      category: item.category ?? null,
    })),
  );
}

const createTemplateSchema = z.object({
  name: z.string().min(1),
  machineType: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

export const createTemplate = asyncHandler(async (req: Request, res: Response) => {
  const data = createTemplateSchema.parse(req.body);

  const template = await ChecklistTemplate.create({
    name: data.name,
    machineType: data.machineType ?? null,
    createdBy: req.user?.sub ?? null,
  });

  await createItems(template.id, data.items);
  await invalidateTemplatesCache();

  res.status(201).json(template);
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  active: z.boolean().optional(),
  items: z.array(itemSchema).min(1).optional(),
});

export const updateTemplate = asyncHandler(async (req: Request, res: Response) => {
  const template = await ChecklistTemplate.findByPk(req.params.id);
  if (!template) throw new ApiError(404, 'Template nao encontrado');

  const data = updateTemplateSchema.parse(req.body);

  if (data.items) {
    // Checklists ja executados referenciam os template_items originais
    // (imutabilidade para auditoria) - alterar itens cria uma NOVA versao do
    // template ao inves de editar/apagar os itens existentes.
    const newVersion = await ChecklistTemplate.create({
      name: data.name ?? template.name,
      machineType: template.machineType,
      version: template.version + 1,
      createdBy: req.user?.sub ?? null,
    });
    await createItems(newVersion.id, data.items);
    await template.update({ active: false });
    await invalidateTemplatesCache();
    res.status(201).json(newVersion);
    return;
  }

  await template.update({
    name: data.name ?? template.name,
    active: data.active ?? template.active,
  });
  await invalidateTemplatesCache();
  res.json(template);
});
