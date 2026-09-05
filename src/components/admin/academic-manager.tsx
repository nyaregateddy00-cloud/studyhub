import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AcademicService, PROGRAMME_LEVELS } from "@/services/academic.service";

type TableName = "universities" | "faculties" | "programmes" | "units";

type EditState = { table: TableName; id: string; primary: string; secondary: string } | null;

function Column({
  title,
  count,
  hint,
  children,
}: {
  title: string;
  count?: number;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card/40 p-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">{title}</Label>
        {typeof count === "number" ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {count}
          </span>
        ) : null}
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {children}
    </section>
  );
}

/** Staff CRUD over the university → faculty → programme → unit hierarchy. */
export function AcademicManager() {
  const queryClient = useQueryClient();
  const [universityId, setUniversityId] = useState<string | null>(null);
  const [facultyId, setFacultyId] = useState<string | null>(null);
  const [programmeId, setProgrammeId] = useState<string | null>(null);
  const [uniSearch, setUniSearch] = useState("");
  const [edit, setEdit] = useState<EditState>(null);

  const [uniName, setUniName] = useState("");
  const [uniShort, setUniShort] = useState("");
  const [uniCounty, setUniCounty] = useState("");
  const [facName, setFacName] = useState("");
  const [progName, setProgName] = useState("");
  const [progLevel, setProgLevel] = useState("bachelors");
  const [unitCode, setUnitCode] = useState("");
  const [unitName, setUnitName] = useState("");
  const [unitYear, setUnitYear] = useState("");
  const [unitSemester, setUnitSemester] = useState("");

  const universities = useQuery({
    queryKey: ["universities"],
    queryFn: () => AcademicService.listUniversities(),
  });
  const faculties = useQuery({
    queryKey: ["faculties", universityId],
    enabled: Boolean(universityId),
    queryFn: () => AcademicService.listFaculties(universityId),
  });
  const programmes = useQuery({
    queryKey: ["programmes", facultyId],
    enabled: Boolean(facultyId),
    queryFn: () => AcademicService.listProgrammes(facultyId),
  });
  const units = useQuery({
    queryKey: ["units", programmeId],
    enabled: Boolean(programmeId),
    queryFn: () => AcademicService.listUnits(programmeId),
  });

  const filteredUniversities = useMemo(() => {
    const term = uniSearch.trim().toLowerCase();
    const rows = universities.data ?? [];
    if (!term) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(term) ||
        (row.short_name ?? "").toLowerCase().includes(term) ||
        (row.county ?? "").toLowerCase().includes(term),
    );
  }, [universities.data, uniSearch]);

  function refresh(keys: string[]) {
    keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  }

  const addUniversity = useMutation({
    mutationFn: () =>
      AcademicService.createUniversity({
        name: uniName.trim(),
        short_name: uniShort.trim() || undefined,
        county: uniCounty.trim() || undefined,
      }),
    onSuccess: () => {
      setUniName("");
      setUniShort("");
      setUniCounty("");
      refresh(["universities"]);
      toast.success("University added");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addFaculty = useMutation({
    mutationFn: () =>
      AcademicService.createFaculty({ university_id: universityId!, name: facName.trim() }),
    onSuccess: () => {
      setFacName("");
      refresh(["faculties"]);
      toast.success("School added");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addProgramme = useMutation({
    mutationFn: () =>
      AcademicService.createProgramme({
        faculty_id: facultyId!,
        name: progName.trim(),
        level: progLevel,
      }),
    onSuccess: () => {
      setProgName("");
      refresh(["programmes"]);
      toast.success("Programme added");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addUnit = useMutation({
    mutationFn: () =>
      AcademicService.createUnit({
        programme_id: programmeId!,
        code: unitCode.trim().toUpperCase(),
        name: unitName.trim(),
        year_of_study: unitYear ? Number(unitYear) : null,
        semester: unitSemester ? Number(unitSemester) : null,
      }),
    onSuccess: () => {
      setUnitCode("");
      setUnitName("");
      refresh(["units"]);
      toast.success("Unit added");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveEdit = useMutation({
    mutationFn: async () => {
      if (!edit) return;
      const patch =
        edit.table === "units"
          ? { code: edit.secondary.trim().toUpperCase(), name: edit.primary.trim() }
          : edit.table === "universities" || edit.table === "faculties"
            ? { name: edit.primary.trim(), short_name: edit.secondary.trim() || null }
            : { name: edit.primary.trim(), code: edit.secondary.trim() || null };
      await AcademicService.update(edit.table, edit.id, patch);
    },
    onSuccess: () => {
      const table = edit?.table;
      setEdit(null);
      if (table) refresh([table]);
      toast.success("Saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeRow = useMutation({
    mutationFn: (input: { table: TableName; id: string }) =>
      AcademicService.remove(input.table, input.id),
    onSuccess: (_data, input) => {
      refresh([input.table]);
      toast.success("Removed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function renderRow(options: {
    table: TableName;
    id: string;
    label: string;
    meta?: string;
    primary: string;
    secondary: string;
    active?: boolean;
    onSelect?: () => void;
  }) {
    const editing = edit?.table === options.table && edit.id === options.id;
    return (
      <li
        key={options.id}
        className={`flex items-center gap-2 px-3 py-2 text-sm ${options.active ? "bg-muted" : ""}`}
      >
        {editing ? (
          <>
            <Input
              value={edit!.secondary}
              className="h-8 w-24"
              placeholder={options.table === "units" ? "Code" : "Short"}
              onChange={(event) => setEdit({ ...edit!, secondary: event.target.value })}
            />
            <Input
              value={edit!.primary}
              className="h-8 flex-1"
              onChange={(event) => setEdit({ ...edit!, primary: event.target.value })}
            />
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Save"
              disabled={saveEdit.isPending || !edit!.primary.trim()}
              onClick={() => saveEdit.mutate()}
            >
              <Check className="size-4" />
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label="Cancel" onClick={() => setEdit(null)}>
              <X className="size-4" />
            </Button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="flex-1 truncate text-left hover:underline"
              onClick={options.onSelect}
            >
              {options.label}
              {options.meta ? (
                <span className="ml-2 text-xs text-muted-foreground">{options.meta}</span>
              ) : null}
            </button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${options.label}`}
              onClick={() =>
                setEdit({
                  table: options.table,
                  id: options.id,
                  primary: options.primary,
                  secondary: options.secondary,
                })
              }
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${options.label}`}
              onClick={() => {
                if (window.confirm(`Delete "${options.label}"? Everything under it is removed too.`))
                  removeRow.mutate({ table: options.table, id: options.id });
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        )}
      </li>
    );
  }

  if (universities.isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Column title="Universities" count={filteredUniversities.length}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={uniSearch}
            placeholder="Search universities"
            className="pl-9"
            onChange={(event) => setUniSearch(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            value={uniName}
            maxLength={140}
            placeholder="New university name"
            className="min-w-40 flex-1"
            onChange={(event) => setUniName(event.target.value)}
          />
          <Input
            value={uniShort}
            maxLength={20}
            placeholder="Short"
            className="w-24"
            onChange={(event) => setUniShort(event.target.value)}
          />
          <Input
            value={uniCounty}
            maxLength={60}
            placeholder="County"
            className="w-28"
            onChange={(event) => setUniCounty(event.target.value)}
          />
          <Button
            size="icon"
            disabled={!uniName.trim() || addUniversity.isPending}
            onClick={() => addUniversity.mutate()}
            aria-label="Add university"
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {filteredUniversities.map((row) =>
            renderRow({
              table: "universities",
              id: row.id,
              label: row.name,
              meta: [row.short_name, row.county].filter(Boolean).join(" · "),
              primary: row.name,
              secondary: row.short_name ?? "",
              active: universityId === row.id,
              onSelect: () => {
                setUniversityId(row.id);
                setFacultyId(null);
                setProgrammeId(null);
              },
            }),
          )}
        </ul>
      </Column>

      <Column
        title="Schools / Faculties"
        count={universityId ? (faculties.data?.length ?? 0) : undefined}
        hint={universityId ? undefined : "Pick a university first."}
      >
        {universityId ? (
          <>
            <div className="flex gap-2">
              <Input
                value={facName}
                maxLength={140}
                placeholder="School of Computing and Informatics"
                onChange={(event) => setFacName(event.target.value)}
              />
              <Button
                size="icon"
                disabled={!facName.trim() || addFaculty.isPending}
                onClick={() => addFaculty.mutate()}
                aria-label="Add school"
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {(faculties.data ?? []).map((row) =>
                renderRow({
                  table: "faculties",
                  id: row.id,
                  label: row.name,
                  primary: row.name,
                  secondary: row.short_name ?? "",
                  active: facultyId === row.id,
                  onSelect: () => {
                    setFacultyId(row.id);
                    setProgrammeId(null);
                  },
                }),
              )}
            </ul>
          </>
        ) : null}
      </Column>

      <Column
        title="Programmes"
        count={facultyId ? (programmes.data?.length ?? 0) : undefined}
        hint={facultyId ? undefined : "Pick a school first."}
      >
        {facultyId ? (
          <>
            <div className="flex gap-2">
              <Input
                value={progName}
                maxLength={140}
                placeholder="BSc Computer Science"
                onChange={(event) => setProgName(event.target.value)}
              />
              <Select value={progLevel} onValueChange={setProgLevel}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROGRAMME_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="icon"
                disabled={!progName.trim() || addProgramme.isPending}
                onClick={() => addProgramme.mutate()}
                aria-label="Add programme"
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {(programmes.data ?? []).map((row) =>
                renderRow({
                  table: "programmes",
                  id: row.id,
                  label: row.name,
                  meta: row.level,
                  primary: row.name,
                  secondary: row.code ?? "",
                  active: programmeId === row.id,
                  onSelect: () => setProgrammeId(row.id),
                }),
              )}
            </ul>
          </>
        ) : null}
      </Column>

      <Column
        title="Units"
        count={programmeId ? (units.data?.length ?? 0) : undefined}
        hint={programmeId ? undefined : "Pick a programme first."}
      >
        {programmeId ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Input
                value={unitCode}
                maxLength={30}
                placeholder="ICS 2101"
                className="w-28"
                onChange={(event) => setUnitCode(event.target.value)}
              />
              <Input
                value={unitName}
                maxLength={140}
                placeholder="Introduction to Programming"
                className="min-w-40 flex-1"
                onChange={(event) => setUnitName(event.target.value)}
              />
              <Select value={unitYear} onValueChange={setUnitYear}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      Year {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={unitSemester} onValueChange={setUnitSemester}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Sem" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3].map((sem) => (
                    <SelectItem key={sem} value={String(sem)}>
                      Sem {sem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="icon"
                disabled={!unitCode.trim() || !unitName.trim() || addUnit.isPending}
                onClick={() => addUnit.mutate()}
                aria-label="Add unit"
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {(units.data ?? []).map((row) =>
                renderRow({
                  table: "units",
                  id: row.id,
                  label: `${row.code} — ${row.name}`,
                  meta: [
                    row.year_of_study ? `Y${row.year_of_study}` : null,
                    row.semester ? `S${row.semester}` : null,
                  ]
                    .filter(Boolean)
                    .join(" "),
                  primary: row.name,
                  secondary: row.code,
                }),
              )}
            </ul>
          </>
        ) : null}
      </Column>
    </div>
  );
}
