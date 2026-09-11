import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  BookOpen,
  Crown,
  Download,
  FileUp,
  GraduationCap,
  Users,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { AcademicService } from "@/services/academic.service";

type AdminStats = {
  total_users: number;
  active_learners: number;
  quiz_completions: number;
  materials_downloaded: number;
  materials_uploaded: number;
  premium_users: number;
};

const ALL = "all";

export function OverviewStats() {
  const [universityId, setUniversityId] = useState<string>(ALL);
  const [programmeId, setProgrammeId] = useState<string>(ALL);

  const universities = useQuery({
    queryKey: ["admin-stats-universities"],
    queryFn: () => AcademicService.listUniversities(),
  });

  const faculties = useQuery({
    queryKey: ["admin-stats-faculties"],
    queryFn: () => AcademicService.listFaculties(),
  });

  const programmes = useQuery({
    queryKey: ["admin-stats-programmes"],
    queryFn: () => AcademicService.listProgrammes(),
  });

  const visibleProgrammes = useMemo(() => {
    const all = programmes.data ?? [];
    if (universityId === ALL) return all;
    const facultyIds = new Set(
      (faculties.data ?? [])
        .filter((f) => f.university_id === universityId)
        .map((f) => f.id),
    );
    return all.filter((p) => facultyIds.has(p.faculty_id));
  }, [programmes.data, faculties.data, universityId]);

  const stats = useQuery({
    queryKey: ["admin-stats", universityId, programmeId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_stats", {
        _university_id: universityId === ALL ? null : universityId,
        _programme_id: programmeId === ALL ? null : programmeId,
      });
      if (error) throw error;
      return data as unknown as AdminStats;
    },
  });

  const cards = stats.data
    ? [
        {
          label: "Total users",
          value: stats.data.total_users,
          icon: Users,
        },
        {
          label: "Active learners (7d)",
          value: stats.data.active_learners,
          icon: GraduationCap,
        },
        {
          label: "Quiz completions",
          value: stats.data.quiz_completions,
          icon: BookOpen,
        },
        {
          label: "Materials downloaded",
          value: stats.data.materials_downloaded,
          icon: Download,
        },
        {
          label: "Materials uploaded",
          value: stats.data.materials_uploaded,
          icon: FileUp,
        },
        {
          label: "Premium users",
          value: stats.data.premium_users,
          icon: Crown,
        },
      ]
    : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <Select
          value={universityId}
          onValueChange={(value) => {
            setUniversityId(value);
            setProgrammeId(ALL);
          }}
        >
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="All universities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All universities</SelectItem>
            {(universities.data ?? []).map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.short_name ?? u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={programmeId} onValueChange={setProgrammeId}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="All programmes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All programmes</SelectItem>
            {visibleProgrammes.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {stats.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : stats.isError ? (
        <p className="text-sm text-muted-foreground">
          Could not load stats right now. Please try again.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cards.map((card) => (
            <div key={card.label} className="rounded-xl border border-border p-4">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <card.icon className="size-3.5" />
                {card.label}
              </p>
              <p className="mt-2 text-2xl font-bold">
                {card.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
