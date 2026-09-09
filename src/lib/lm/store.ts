import type { Inspection } from "./types";

const KEY = "slmi_inspections_v1";

function read(): Inspection[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as Inspection[];
  } catch {
    return [];
  }
}

function write(list: Inspection[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("slmi:inspections"));
}

export function listInspections(): Inspection[] {
  return read().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getInspection(id: string): Inspection | undefined {
  return read().find((i) => i.id === id);
}

export function saveInspection(inspection: Inspection) {
  const list = read().filter((i) => i.id !== inspection.id);
  list.push(inspection);
  write(list);
}

export function deleteInspection(id: string) {
  write(read().filter((i) => i.id !== id));
}

export function nextInspectionId(): string {
  const year = new Date().getFullYear();
  const n = read().length + 1;
  return `LM-${year}-${String(n).padStart(4, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
