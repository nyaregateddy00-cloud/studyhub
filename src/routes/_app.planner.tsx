import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Loader2, Plus, Sparkles, Target, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AssignmentTracker } from "@/components/planner/assignment-tracker";
import { DailyPlanner } from "@/components/planner/daily-planner";
import { MonthlyCalendar } from "@/components/planner/monthly-calendar";
import { PlannerSidebar } from "@/components/planner/planner-sidebar";
import { UpcomingExams } from "@/components/planner/upcoming-exams";
import { WeeklyTimetable } from "@/components/planner/weekly-timetable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { pushNotification } from "@/lib/notifications";
import { usePlanner } from "@/lib/planner/use-planner";
import { generateRevisionPlan } from "@/services/ai.service";
import { AnalyticsService } from "@/services/analytics.service";
import { PlannerService } from "@/services/planner.service";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/planner")({
  head: () => ({
    meta: [
      { title: "Study Planner — StudyHub" },
      {
        name: "description",
        content: "Plan revision sessions, set study goals and let AI build a spaced revision plan.",
      },
      { property: "og:title", content: "Study Planner — StudyHub" },
      {
        property: "og:description",
        content: "Schedule sessions, track goals and auto-build revision plans.",
      },
    ],
  }),
  component: Planner,
});

const priorities = ["low", "medium", "high"] as const;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function offsetDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function Planner() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const buildPlan = useServerFn(generateRevisionPlan);
  const planner = usePlanner();

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [dueDate, setDueDate] = useState(todayISO());
  const [duration, setDuration] = useState(45);
  const [priority, setPriority] = useState<(typeof priorities)[number]>("medium");

  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState(300);

  const [subjects, setSubjects] = useState("");
  const [examDate, setExamDate] = useState("");
  const [hours, setHours] = useState(8);
  const [weaknesses, setWeaknesses] = useState("");
  const [planning, setPlanning] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["planner", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const [tasks, goals] = await Promise.all([
        PlannerService.listTasks(),
        PlannerService.listGoals(),
      ]);
      return { tasks: tasks ?? [], goals: goals ?? [] };
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["planner", user?.id] });

  const addTask = useMutation({
    mutationFn: () =>
      PlannerService.createTask({
        user_id: user!.id,
        title: title.trim(),
        subject: subject.trim() || null,
        due_date: dueDate || null,
        duration_minutes: duration,
        priority,
      }),
    onSuccess: async () => {
      setTitle("");
      setSubject("");
      toast.success("Session added to your planner");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleTask = useMutation({
    mutationFn: async (task: {
      id: string;
      completed: boolean;
      duration_minutes: number;
      subject: string | null;
    }) => {
      const completed = !task.completed;
      await PlannerService.updateTask(task.id, {
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      });
      if (completed) {
        try {
          await AnalyticsService.logStudyMinutes(user!.id, task.duration_minutes, task.subject);
        } catch {
          // Best-effort session log — matches the original's unchecked insert.
        }
        await pushNotification({
          userId: user!.id,
          title: "Session complete",
          body: `${task.duration_minutes} minutes logged. Nice work!`,
          type: "planner",
          link: "/planner",
        });
      }
    },
    onSuccess: refresh,
  });

  const removeTask = useMutation({
    mutationFn: (id: string) => PlannerService.deleteTask(id),
    onSuccess: refresh,
  });

  const addGoal = useMutation({
    mutationFn: () =>
      PlannerService.createGoal({
        user_id: user!.id,
        title: goalTitle.trim(),
        target_minutes: goalTarget,
      }),
    onSuccess: async () => {
      setGoalTitle("");
      toast.success("Goal created");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeGoal = useMutation({
    mutationFn: (id: string) => PlannerService.deleteGoal(id),
    onSuccess: refresh,
  });

  async function createAiPlan() {
    if (subjects.trim().length < 3) {
      toast.error("Tell the planner what you're revising first.");
      return;
    }
    setPlanning(true);
    try {
      const plan = await buildPlan({
        data: {
          subjects: subjects.trim(),
          examDate: examDate || undefined,
          hoursPerWeek: hours,
          weaknesses: weaknesses.trim() || undefined,
        },
      });
      const rows = plan.tasks.map((task) => ({
        user_id: user!.id,
        title: task.title,
        subject: task.subject,
        notes: task.notes,
        due_date: offsetDate(Math.max(0, Math.round(task.day_offset))),
        duration_minutes: Math.min(180, Math.max(15, Math.round(task.duration_minutes))),
        priority: task.priority,
      }));
      await PlannerService.createTasks(rows);
      await pushNotification({
        userId: user!.id,
        title: "Your AI revision plan is ready",
        body: `${rows.length} sessions scheduled — ${plan.title}`,
        type: "planner",
        link: "/planner",
      });
      toast.success(`${rows.length} sessions added`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not build the plan");
    } finally {
      setPlanning(false);
    }
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const today = todayISO();
  const upcoming = data.tasks.filter((task) => !task.completed);
  const done = data.tasks.filter((task) => task.completed);
  const grouped = upcoming.reduce<Record<string, typeof upcoming>>((acc, task) => {
    const key = task.due_date ?? "Unscheduled";
    acc[key] = acc[key] ? [...acc[key], task] : [task];
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Study planner</h1>
        <p className="mt-1 text-muted-foreground">
          Daily, weekly and monthly views, exams, assignments and your study streak — saved on this
          device, plus cloud sessions, goals and AI-built revision plans.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <Tabs defaultValue="daily">
            <TabsList className="h-auto flex-wrap justify-start gap-1">
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="exams">Exams</TabsTrigger>
              <TabsTrigger value="assignments">Assignments</TabsTrigger>
              <TabsTrigger value="schedule">Cloud sessions</TabsTrigger>
              <TabsTrigger value="goals">Goals</TabsTrigger>
              <TabsTrigger value="ai">AI revision plan</TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="mt-6">
              <DailyPlanner planner={planner} />
            </TabsContent>

            <TabsContent value="weekly" className="mt-6">
              <WeeklyTimetable planner={planner} />
            </TabsContent>

            <TabsContent value="monthly" className="mt-6">
              <MonthlyCalendar planner={planner} />
            </TabsContent>

            <TabsContent value="exams" className="mt-6">
              <UpcomingExams planner={planner} />
            </TabsContent>

            <TabsContent value="assignments" className="mt-6">
              <AssignmentTracker planner={planner} />
            </TabsContent>

            <TabsContent value="schedule" className="mt-6 space-y-6">
              <div className="surface-card grid gap-3 p-5 md:grid-cols-5">
                <div className="md:col-span-2">
                  <Label htmlFor="task-title">Session</Label>
                  <Input
                    id="task-title"
                    value={title}
                    maxLength={140}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Revise organic chemistry"
                  />
                </div>
                <div>
                  <Label htmlFor="task-subject">Subject</Label>
                  <Input
                    id="task-subject"
                    value={subject}
                    maxLength={60}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="Chemistry"
                  />
                </div>
                <div>
                  <Label htmlFor="task-date">Date</Label>
                  <Input
                    id="task-date"
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="task-priority">Priority</Label>
                  <Select
                    value={priority}
                    onValueChange={(value) => setPriority(value as typeof priority)}
                  >
                    <SelectTrigger id="task-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-4">
                  <Label htmlFor="task-duration">Minutes: {duration}</Label>
                  <Input
                    id="task-duration"
                    type="range"
                    min={15}
                    max={180}
                    step={5}
                    value={duration}
                    onChange={(event) => setDuration(Number(event.target.value))}
                  />
                </div>
                <Button
                  className="self-end"
                  disabled={!title.trim() || addTask.isPending}
                  onClick={() => addTask.mutate()}
                >
                  <Plus className="mr-1 size-4" /> Add
                </Button>
              </div>

              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(grouped).map(([date, tasks]) => (
                    <div key={date}>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="size-4 text-primary" />
                        <h2 className="text-sm font-semibold">{date === today ? "Today" : date}</h2>
                        <Badge variant="secondary">{tasks.length}</Badge>
                      </div>
                      <ul className="mt-3 space-y-2">
                        {tasks.map((task) => (
                          <li key={task.id} className="surface-card flex items-center gap-3 p-4">
                            <Checkbox
                              checked={task.completed}
                              onCheckedChange={() => toggleTask.mutate(task)}
                              aria-label={`Complete ${task.title}`}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{task.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {task.subject ?? "General"} · {task.duration_minutes} min
                              </p>
                            </div>
                            <Badge
                              className={cn(
                                task.priority === "high" && "bg-destructive/10 text-destructive",
                                task.priority === "medium" && "bg-warning/10 text-warning",
                              )}
                              variant="secondary"
                            >
                              {task.priority}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Delete session"
                              onClick={() => removeTask.mutate(task.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {done.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground">
                    Completed ({done.length})
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {done.slice(0, 12).map((task) => (
                      <li
                        key={task.id}
                        className="surface-card flex items-center gap-3 p-3 opacity-70"
                      >
                        <Checkbox checked onCheckedChange={() => toggleTask.mutate(task)} />
                        <span className="flex-1 truncate text-sm line-through">{task.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {task.duration_minutes}m
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </TabsContent>

            <TabsContent value="goals" className="mt-6 space-y-6">
              <div className="surface-card grid gap-3 p-5 md:grid-cols-4">
                <div className="md:col-span-2">
                  <Label htmlFor="goal-title">Goal</Label>
                  <Input
                    id="goal-title"
                    value={goalTitle}
                    maxLength={120}
                    onChange={(event) => setGoalTitle(event.target.value)}
                    placeholder="Finish pharmacology revision"
                  />
                </div>
                <div>
                  <Label htmlFor="goal-target">Target minutes</Label>
                  <Input
                    id="goal-target"
                    type="number"
                    min={30}
                    max={10000}
                    value={goalTarget}
                    onChange={(event) => setGoalTarget(Number(event.target.value))}
                  />
                </div>
                <Button
                  className="self-end"
                  disabled={!goalTitle.trim() || addGoal.isPending}
                  onClick={() => addGoal.mutate()}
                >
                  <Target className="mr-1 size-4" /> Set goal
                </Button>
              </div>

              {data.goals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No goals yet.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {data.goals.map((goal) => {
                    const pct = Math.min(
                      100,
                      Math.round((goal.progress_minutes / Math.max(goal.target_minutes, 1)) * 100),
                    );
                    return (
                      <div key={goal.id} className="surface-card p-5">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-semibold">{goal.title}</h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete goal"
                            onClick={() => removeGoal.mutate(goal.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                        <Progress value={pct} className="mt-4" />
                        <p className="mt-2 text-xs text-muted-foreground">
                          {goal.progress_minutes} / {goal.target_minutes} minutes ({pct}%)
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="ai" className="mt-6">
              <div className="surface-card space-y-4 p-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  <h2 className="text-lg font-semibold">Build an AI revision plan</h2>
                </div>
                <div>
                  <Label htmlFor="plan-subjects">What are you revising?</Label>
                  <Textarea
                    id="plan-subjects"
                    rows={3}
                    maxLength={2000}
                    value={subjects}
                    onChange={(event) => setSubjects(event.target.value)}
                    placeholder="Cell biology, genetics, statistics for biologists"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="plan-exam">Exam / deadline</Label>
                    <Input
                      id="plan-exam"
                      type="date"
                      value={examDate}
                      onChange={(event) => setExamDate(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="plan-hours">Hours per week: {hours}</Label>
                    <Input
                      id="plan-hours"
                      type="range"
                      min={1}
                      max={40}
                      value={hours}
                      onChange={(event) => setHours(Number(event.target.value))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="plan-weak">Weak areas (optional)</Label>
                  <Textarea
                    id="plan-weak"
                    rows={2}
                    maxLength={2000}
                    value={weaknesses}
                    onChange={(event) => setWeaknesses(event.target.value)}
                    placeholder="Struggling with hypothesis testing"
                  />
                </div>
                <Button onClick={createAiPlan} disabled={planning}>
                  {planning ? (
                    <Loader2 className="mr-1 size-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1 size-4" />
                  )}
                  Generate plan
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <PlannerSidebar planner={planner} />
      </div>
    </div>
  );
}
