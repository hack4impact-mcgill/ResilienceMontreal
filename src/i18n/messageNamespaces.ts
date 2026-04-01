/**
 * List of JSON files under messages/{locale}/ (without .json).
 * Add a new filename here when you add a new feature namespace.
 */
export const MESSAGE_NAMESPACES = ["common", "navigation", "home"] as const;

export type MessageNamespace = (typeof MESSAGE_NAMESPACES)[number];
