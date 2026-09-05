import { supabase } from "@/integrations/supabase/client";
import type { Row } from "@/services/types";

export type University = Row<"universities">;
export type Faculty = Row<"faculties">;
export type Programme = Row<"programmes">;
export type Unit = Row<"units">;

/** Resource kinds a student can upload to the library. */
export const RESOURCE_TYPES = [
  { value: "lecture_notes", label: "Lecture notes" },
  { value: "past_paper", label: "Past paper" },
  { value: "cat", label: "CAT" },
  { value: "assignment", label: "Assignment" },
  { value: "project", label: "Project" },
  { value: "lab_report", label: "Lab report" },
  { value: "summary", label: "Summary" },
  { value: "other", label: "Other" },
] as const;

export const PROGRAMME_LEVELS = [
  { value: "certificate", label: "Certificate" },
  { value: "diploma", label: "Diploma" },
  { value: "bachelors", label: "Bachelors" },
  { value: "masters", label: "Masters" },
  { value: "phd", label: "PhD" },
] as const;

export function resourceTypeLabel(value: string | null | undefined) {
  return RESOURCE_TYPES.find((type) => type.value === value)?.label ?? "Resource";
}

/**
 * Academic hierarchy: university → faculty/school → programme → unit.
 * Reads are public; writes are restricted to staff by row-level security.
 */
export const AcademicService = {
  async listUniversities(): Promise<University[]> {
    const { data, error } = await supabase
      .from("universities")
      .select("*")
      .order("is_other", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async listFaculties(universityId?: string | null): Promise<Faculty[]> {
    let query = supabase.from("faculties").select("*").order("name");
    if (universityId) query = query.eq("university_id", universityId);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async listProgrammes(facultyId?: string | null): Promise<Programme[]> {
    let query = supabase.from("programmes").select("*").order("name");
    if (facultyId) query = query.eq("faculty_id", facultyId);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async listUnits(programmeId?: string | null): Promise<Unit[]> {
    let query = supabase.from("units").select("*").order("code");
    if (programmeId) query = query.eq("programme_id", programmeId);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async createUniversity(input: { name: string; short_name?: string; county?: string }) {
    const { error } = await supabase.from("universities").insert(input);
    if (error) throw error;
  },

  async createFaculty(input: { university_id: string; name: string; short_name?: string }) {
    const { error } = await supabase.from("faculties").insert(input);
    if (error) throw error;
  },

  async createProgramme(input: {
    faculty_id: string;
    name: string;
    code?: string;
    level?: string;
  }) {
    const { error } = await supabase.from("programmes").insert(input);
    if (error) throw error;
  },

  async createUnit(input: {
    programme_id: string;
    code: string;
    name: string;
    year_of_study?: number | null;
    semester?: number | null;
  }) {
    const { error } = await supabase.from("units").insert(input);
    if (error) throw error;
  },

  async update(
    table: "universities" | "faculties" | "programmes" | "units",
    id: string,
    patch: Record<string, unknown>,
  ) {
    const { error } = await supabase
      .from(table)
      .update(patch as never)
      .eq("id", id);
    if (error) throw error;
  },

  async remove(table: "universities" | "faculties" | "programmes" | "units", id: string) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw error;
  },
};
