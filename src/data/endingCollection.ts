export type EndingDefinition = {title: string; text: string};
type CompletedLife = {endingId?: string; runId?: string};

export function endingCollection(catalog: Record<string, EndingDefinition>, lives: CompletedLife[], current?: CompletedLife) {
  const completed = new Set([...lives, ...(current ? [current] : [])].map(life => life.endingId));
  return Object.entries(catalog).map(([id, ending]) => completed.has(id)
    ? {unlocked: true as const, id, title: ending.title, text: ending.text}
    : {unlocked: false as const});
}
