import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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

/** Staff CRUD over the university → faculty → programme → unit hierarchy. */
export function AcademicManager() {
  const queryClient = useQueryClient();
  const [universityId, setUniversityId] = useState<string | null>(null);
  const [facultyId, setFacultyId] = useState<string | null>(null);
  const [programmeId, setProgrammeId] = useState<string | null>(null);

  const [uniName, setUniName] = useState("");
  const [facName, setFacName] = useState("");
  const [progName, setProgName] = useState("");
  const [progLevel, setProgLevel] = useState("bachelors");
  const [unitCode, setUnitCode] = useState("");
  const [unitName, setUnitName] = useState("");

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

  function refresh(keys: string[]) {
    keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  }

  const addUniversity = useMutation({
    mutationFn: () => AcademicService.createUniversity({ name: uniName.trim() }),
    onSuccess: () => {
      setUniName("");
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
        code: unitCode.trim(),
        name: unitName.trim(),
      }),
    onSuccess: () => {
      setUnitCode("");
      setUnitName("");
      refresh(["units"]);
      toast.success("Unit added");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeRow = useMutation({
    mutationFn: (input: {
      table: "universities" | "faculties" | "programmes" | "units";
      id: string;
    }) => AcademicService.remove(input.table, input.id),
    onSuccess: (_data, input) => {
      refresh([input.table]);
      toast.success("Removed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (universities.isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-3">
        <Label>Universities</Label>
        <div className="flex gap-2">
          <Input
            value={uniName}
            maxLength={140}
            placeholder="New university name"
            onChange={(event) => setUniName(event.target.value)}
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
        <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {(universities.data ?? []).map((row) => (
            <li
              key={row.id}
              className={`flex items-center gap-2 px-3 py-2 text-sm ${
                universityId === row.id ? "bg-muted" : ""
              }`}
            >
              <button
                type="button"
                className="flex-1 text-left hover:underline"
                onClick={() => {
                  setUniversityId(row.id);
                  setFacultyId(null);
                  setProgrammeId(null);
                }}
              >
                {row.name}
              </button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${row.name}`}
                onClick={() => removeRow.mutate({ table: "universities", id: row.id })}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <Label>Schools / Faculties</Label>
        {!universityId ? (
          <p className="text-sm text-muted-foreground">Pick a university first.</p>
        ) : (
          <>
            <div className="flex gap-2">
              <Input
                value={facName}
                maxLength={140}
                placeholder="New school name"
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
            <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {(faculties.data ?? []).map((row) => (
                <li
                  key={row.id}
                  className={`flex items-center gap-2 px-3 py-2 text-sm ${
                    facultyId === row.id ? "bg-muted" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="flex-1 text-left hover:underline"
                    onClick={() => {
                      setFacultyId(row.id);
                      setProgrammeId(null);
                    }}
                  >
                    {row.name}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${row.name}`}
                    onClick={() => removeRow.mutate({ table: "faculties", id: row.id })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="space-y-3">
        <Label>Programmes</Label>
        {!facultyId ? (
          <p className="text-sm text-muted-foreground">Pick a school first.</p>
        ) : (
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
            <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {(programmes.data ?? []).map((row) => (
                <li
                  key={row.id}
                  className={`flex items-center gap-2 px-3 py-2 text-sm ${
                    programmeId === row.id ? "bg-muted" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="flex-1 text-left hover:underline"
                    onClick={() => setProgrammeId(row.id)}
                  >
                    {row.name}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${row.name}`}
                    onClick={() => removeRow.mutate({ table: "programmes", id: row.id })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="space-y-3">
        <Label>Units</Label>
        {!programmeId ? (
          <p className="text-sm text-muted-foreground">Pick a programme first.</p>
        ) : (
          <>
            <div className="flex gap-2">
              <Input
                value={unitCode}
                maxLength={30}
                placeholder="ICS 2101"
                className="w-32"
                onChange={(event) => setUnitCode(event.target.value)}
              />
              <Input
                value={unitName}
                maxLength={140}
                placeholder="Introduction to Programming"
                onChange={(event) => setUnitName(event.target.value)}
              />
              <Button
                size="icon"
                disabled={!unitCode.trim() || !unitName.trim() || addUnit.isPending}
                onClick={() => addUnit.mutate()}
                aria-label="Add unit"
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {(units.data ?? []).map((row) => (
                <li key={row.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className="flex-1">
                    <span className="font-medium">{row.code}</span> — {row.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${row.code}`}
                    onClick={() => removeRow.mutate({ table: "units", id: row.id })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
