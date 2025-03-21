// Keep track of generated IDs to ensure uniqueness
export const generatedIds = new Set<string>();

/**
 * Creates a unique identifier by combining timestamp and random string
 * Ensures uniqueness by checking against previously generated IDs
 */
export function createUID(): string {
  let id: string;
  do {
    // Generate a more unique ID by combining timestamp and random string
    id = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  } while (generatedIds.has(id));
  
  // Add the ID to the set of generated IDs
  generatedIds.add(id);
  return id;
}
