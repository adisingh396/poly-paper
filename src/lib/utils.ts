// Join truthy class fragments. Shared across every restyled component.
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
