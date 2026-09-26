import { z } from 'zod';

const text = z.string().trim().min(1);
const slug = z.string().regex(/^[a-z0-9-]+$/);

export const ChoiceIdSchema = z.enum(['a', 'b', 'c', 'd']);
export const SourceSchema = z.object({ url: z.url(), title: text, checkedOn: z.iso.date() });

const Tone = z.enum(['success', 'error', 'accent', 'neutral']);
export const DiagramSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('segmented-bar'),
    caption: text.optional(),
    segments: z
      .array(z.object({ label: text, sublabel: text.optional(), weight: z.number().positive(), tone: Tone }))
      .min(1),
  }),
  z.object({
    kind: z.literal('flow'),
    caption: text.optional(),
    steps: z.array(z.object({ label: text, sublabel: text.optional() })).min(2),
  }),
]);

export const SubSkillSchema = z.object({
  id: slug,
  name: text,
  weight: z.number().positive().optional(),
  official: z.boolean(),
});

export const DomainSchema = z.object({
  id: slug,
  name: text,
  shortName: text,
  weight: z.number().positive(),
  order: z.number().int().nonnegative(),
  subSkills: z.array(SubSkillSchema).min(1),
});
export const DomainsFileSchema = z.array(DomainSchema).min(1);

export const ChoiceSchema = z.object({ id: ChoiceIdSchema, text, reason: text });

export const QuestionSchema = z.object({
  id: z.string().regex(/^q-[a-z0-9-]+$/),
  domainId: text,
  subSkillId: text,
  topic: text,
  stem: text,
  choices: z
    .array(ChoiceSchema)
    .length(4)
    .refine((cs) => cs.map((c) => c.id).join('') === 'abcd', { message: 'choices must have ids a, b, c, d in order' }),
  answer: ChoiceIdSchema,
  takeaway: text,
  mnemonic: text.optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  diagram: DiagramSchema.optional(),
  source: SourceSchema,
  relatedCardIds: z.array(z.string()).default([]),
  lessonId: z.string().optional(),
});

export const CardSchema = z.object({
  id: z.string().regex(/^c-[a-z0-9-]+$/),
  domainId: text,
  subSkillId: text,
  term: text,
  definition: text,
  whyItMatters: text,
  example: text.optional(),
  source: SourceSchema,
  isVocab: z.boolean(),
});

export const LessonSectionSchema = z.object({ heading: text, body: text, diagram: DiagramSchema.optional() });

export const LessonSchema = z.object({
  id: z.string().regex(/^l-[a-z0-9-]+$/),
  domainId: text,
  subSkillId: text,
  title: text,
  summary: text,
  keyPoints: z.array(text).min(1),
  sections: z.array(LessonSectionSchema).min(1),
  checkQuestionIds: z.array(z.string()).length(3),
  sources: z.array(SourceSchema).min(1),
});

export type ChoiceId = z.infer<typeof ChoiceIdSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type Diagram = z.infer<typeof DiagramSchema>;
export type SubSkill = z.infer<typeof SubSkillSchema>;
export type Domain = z.infer<typeof DomainSchema>;
export type Choice = z.infer<typeof ChoiceSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Card = z.infer<typeof CardSchema>;
export type LessonSection = z.infer<typeof LessonSectionSchema>;
export type Lesson = z.infer<typeof LessonSchema>;

export interface Content {
  domains: Domain[];
  questions: Question[];
  cards: Card[];
  lessons: Lesson[];
  domainById: Map<string, Domain>;
  questionById: Map<string, Question>;
  cardById: Map<string, Card>;
  lessonById: Map<string, Lesson>;
}
