import { z } from 'zod';

const text = z.string().trim().min(1);
const slug = z.string().regex(/^[a-z0-9-]+$/);
const upTo = (n: number) => text.max(n);

export const CHOICE_IDS = ['a', 'b', 'c', 'd', 'e', 'f'] as const;
export const ChoiceIdSchema = z.enum(CHOICE_IDS);
/** What a learner picked: one id for a single-answer question, a list for a multiple-response one. */
export const ChosenSchema = z.union([ChoiceIdSchema, z.array(ChoiceIdSchema)]);
export const SourceSchema = z.object({ url: z.url({ protocol: /^https$/ }), title: text, checkedOn: z.iso.date() });

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

export const ChoiceSchema = z.object({ id: ChoiceIdSchema, text: upTo(140), reason: upTo(220) });

/**
 * Single-answer questions have 4 choices and `answer: "b"`. Multiple-response questions (the exam's "select TWO" items)
 * have 5 or 6 choices and `answer: ["b", "e"]`: 2 or 3 ids, sorted, all of which must be picked to score.
 */
export const QuestionSchema = z.object({
  id: z.string().regex(/^q-[a-z0-9-]+$/),
  domainId: text,
  subSkillId: text,
  topic: text,
  stem: upTo(320),
  choices: z
    .array(ChoiceSchema)
    .min(4)
    .max(6)
    .refine((cs) => cs.every((c, i) => c.id === CHOICE_IDS[i]), { message: 'choices must have ids a, b, c, … in order' }),
  answer: z.union([ChoiceIdSchema, z.array(ChoiceIdSchema).min(2).max(3)]),
  takeaway: upTo(170),
  /** The reasoning in a few sentences: the principle, the detail in the stem that decides it, and the tempting trap. */
  explanation: upTo(600).optional(),
  mnemonic: upTo(100).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  diagram: DiagramSchema.optional(),
  source: SourceSchema,
  relatedCardIds: z.array(z.string()).default([]),
  lessonId: z.string().optional(),
}).superRefine((q, ctx) => {
  const ids = q.choices.map((c) => c.id);
  if (typeof q.answer === 'string') {
    if (q.choices.length !== 4) ctx.addIssue({ code: 'custom', path: ['choices'], message: 'a single-answer question has exactly 4 choices' });
    if (!ids.includes(q.answer)) ctx.addIssue({ code: 'custom', path: ['answer'], message: `answer "${q.answer}" is not a choice` });
    return;
  }
  if (q.choices.length < 5) ctx.addIssue({ code: 'custom', path: ['choices'], message: 'a multiple-response question has 5 or 6 choices' });
  if (q.answer.some((a) => !ids.includes(a))) ctx.addIssue({ code: 'custom', path: ['answer'], message: 'every answer must be a choice' });
  if (q.answer.join('') !== [...new Set(q.answer)].sort().join('')) {
    ctx.addIssue({ code: 'custom', path: ['answer'], message: 'answer ids must be distinct and sorted' });
  }
});

/**
 * Card text limits: a card back must fit a phone screen without scrolling. The e2e "every flashcard's text fits" is the
 * real check: fit depends on line wraps (code spans, word breaks), so no combined character count predicts it.
 */
export const CARD_LIMITS = { definition: 160, definitionCodeSpans: 2, whyItMatters: 170, example: 120 } as const;
const codeSpans = (s: string) => s.match(/`[^`]+`/g)?.length ?? 0;

export const CardSchema = z.object({
  id: z.string().regex(/^c-[a-z0-9-]+$/),
  domainId: text,
  subSkillId: text,
  term: text,
  definition: text
    .max(CARD_LIMITS.definition)
    .refine((d) => codeSpans(d) <= CARD_LIMITS.definitionCodeSpans, {
      message: `definition may use at most ${CARD_LIMITS.definitionCodeSpans} code spans`,
    }),
  whyItMatters: text.max(CARD_LIMITS.whyItMatters),
  example: text.max(CARD_LIMITS.example).optional(),
  source: SourceSchema,
  isVocab: z.boolean(),
});

export const LessonSectionSchema = z.object({
  heading: upTo(60),
  body: upTo(1400),
  /** A concrete worked example, shown as a callout under the body. */
  example: upTo(700).optional(),
  diagram: DiagramSchema.optional(),
});

export const LessonSchema = z.object({
  id: z.string().regex(/^l-[a-z0-9-]+$/),
  domainId: text,
  subSkillId: text,
  title: text,
  summary: upTo(400),
  keyPoints: z.array(upTo(180)).min(1),
  sections: z.array(LessonSectionSchema).min(1),
  checkQuestionIds: z.array(z.string()).length(3),
  sources: z.array(SourceSchema).min(1),
});

/**
 * A glossary term. Its `term` and every alias are underlined wherever they appear in question and lesson text, and
 * tapping one shows the definition. Aliases are other spellings of the same thing ("MCP", "tool calling").
 */
export const GlossaryTermSchema = z.object({
  id: z.string().regex(/^g-[a-z0-9-]+$/),
  term: text,
  aliases: z.array(text).default([]),
  definition: upTo(240),
  /** Shown when the term is opened: how it shows up in exam scenarios. */
  whyItMatters: upTo(220).optional(),
  /** One concrete use. */
  example: upTo(200).optional(),
  source: SourceSchema,
});
export const GlossaryFileSchema = z.array(GlossaryTermSchema);

/**
 * The official course, section by section (content/course.json). Each module is taught by one lesson; the section quiz
 * draws on every question linked to those lessons. Takeaways are the section's own recap.
 */
export const CourseSectionSchema = z.object({
  id: slug,
  number: z.number().int().positive(),
  title: text,
  summary: upTo(400),
  modules: z.array(z.object({ title: upTo(80), lessonId: z.string() })).min(1),
  takeaways: z.array(z.object({ title: upTo(160), body: upTo(400) })).min(1),
});
export const CourseFileSchema = z.array(CourseSectionSchema);

/**
 * An area test takers report the exam leans on (content/focus.json). Each one drills its own hand-picked questions,
 * which may come from any domain.
 */
export const FocusAreaSchema = z.object({
  id: slug,
  title: upTo(60),
  /** What the exam asks about it, in a sentence or two. */
  summary: upTo(240),
  questionIds: z.array(z.string()).min(1),
});
export const FocusFileSchema = z.array(FocusAreaSchema);

export type ChoiceId = z.infer<typeof ChoiceIdSchema>;
export type Chosen = z.infer<typeof ChosenSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type Diagram = z.infer<typeof DiagramSchema>;
export type SubSkill = z.infer<typeof SubSkillSchema>;
export type Domain = z.infer<typeof DomainSchema>;
export type Choice = z.infer<typeof ChoiceSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Card = z.infer<typeof CardSchema>;
export type LessonSection = z.infer<typeof LessonSectionSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type GlossaryTerm = z.infer<typeof GlossaryTermSchema>;
export type CourseSection = z.infer<typeof CourseSectionSchema>;
export type FocusArea = z.infer<typeof FocusAreaSchema>;

export interface Content {
  domains: Domain[];
  questions: Question[];
  cards: Card[];
  lessons: Lesson[];
  glossary: GlossaryTerm[];
  course: CourseSection[];
  focus: FocusArea[];
  domainById: Map<string, Domain>;
  questionById: Map<string, Question>;
  cardById: Map<string, Card>;
  lessonById: Map<string, Lesson>;
  termById: Map<string, GlossaryTerm>;
}
