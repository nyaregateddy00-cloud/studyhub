import { useQuery } from "@tanstack/react-query";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AcademicService } from "@/services/academic.service";

export type AcademicSelection = {
  universityId: string | null;
  facultyId: string | null;
  programmeId: string | null;
  unitId: string | null;
};

export const emptyAcademicSelection: AcademicSelection = {
  universityId: null,
  facultyId: null,
  programmeId: null,
  unitId: null,
};

const ANY = "__any__";

/**
 * Cascading university → faculty → programme → unit picker. Used both on the
 * upload form (as metadata) and on the library (as filters), so each level
 * clears the ones below it when it changes.
 */
export function AcademicPicker({
  value,
  onChange,
  compact = false,
}: {
  value: AcademicSelection;
  onChange: (next: AcademicSelection) => void;
  compact?: boolean;
}) {
  const universities = useQuery({
    queryKey: ["universities"],
    queryFn: () => AcademicService.listUniversities(),
    staleTime: 10 * 60_000,
  });
  const faculties = useQuery({
    queryKey: ["faculties", value.universityId],
    enabled: Boolean(value.universityId),
    queryFn: () => AcademicService.listFaculties(value.universityId),
    staleTime: 10 * 60_000,
  });
  const programmes = useQuery({
    queryKey: ["programmes", value.facultyId],
    enabled: Boolean(value.facultyId),
    queryFn: () => AcademicService.listProgrammes(value.facultyId),
    staleTime: 10 * 60_000,
  });
  const units = useQuery({
    queryKey: ["units", value.programmeId],
    enabled: Boolean(value.programmeId),
    queryFn: () => AcademicService.listUnits(value.programmeId),
    staleTime: 10 * 60_000,
  });

  const levels = [
    {
      id: "university",
      label: "University",
      current: value.universityId,
      options: (universities.data ?? []).map((row) => ({ id: row.id, label: row.name })),
      disabled: false,
      apply: (id: string | null) => ({ ...emptyAcademicSelection, universityId: id }),
    },
    {
      id: "faculty",
      label: "School / Faculty",
      current: value.facultyId,
      options: (faculties.data ?? []).map((row) => ({ id: row.id, label: row.name })),
      disabled: !value.universityId,
      apply: (id: string | null) => ({ ...value, facultyId: id, programmeId: null, unitId: null }),
    },
    {
      id: "programme",
      label: "Programme",
      current: value.programmeId,
      options: (programmes.data ?? []).map((row) => ({ id: row.id, label: row.name })),
      disabled: !value.facultyId,
      apply: (id: string | null) => ({ ...value, programmeId: id, unitId: null }),
    },
    {
      id: "unit",
      label: "Unit",
      current: value.unitId,
      options: (units.data ?? []).map((row) => ({
        id: row.id,
        label: `${row.code} — ${row.name}`,
      })),
      disabled: !value.programmeId,
      apply: (id: string | null) => ({ ...value, unitId: id }),
    },
  ];

  return (
    <div className={compact ? "grid gap-2 sm:grid-cols-4" : "grid gap-3 sm:grid-cols-2"}>
      {levels.map((level) => (
        <div key={level.id} className="space-y-1.5">
          {!compact && <Label>{level.label}</Label>}
          <Select
            value={level.current ?? ANY}
            disabled={level.disabled}
            onValueChange={(next) => onChange(level.apply(next === ANY ? null : next))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={level.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>
                {compact ? `Any ${level.label}` : "Not specified"}
              </SelectItem>
              {level.options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}
