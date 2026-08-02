import { Plus } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NewTaskInput, Priority } from "@/lib/planner/types";

const priorities: Priority[] = ["low", "medium", "high"];

export function TaskFormDialog({
  date,
  trigger,
  onCreate,
}: {
  /** Pre-fills the date field; changes when the caller's context date changes. */
  date: string;
  trigger?: ReactNode;
  onCreate: (input: NewTaskInput) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [taskDate, setTaskDate] = useState(date);
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [priority, setPriority] = useState<Priority>("medium");

  useEffect(() => {
    if (open) setTaskDate(date);
  }, [open, date]);

  function reset() {
    setTitle("");
    setSubject("");
    setTime("");
    setDuration(30);
    setPriority("medium");
  }

  function submit() {
    if (!title.trim()) return;
    onCreate({
      title,
      subject: subject || null,
      date: taskDate,
      time: time || null,
      durationMinutes: duration,
      priority,
    });
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <Plus className="mr-1 size-4" /> Add task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a study task</DialogTitle>
          <DialogDescription>Schedule a task on your local planner.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label htmlFor="planner-task-title">Title</Label>
            <Input
              id="planner-task-title"
              value={title}
              maxLength={140}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Revise organic chemistry"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="planner-task-subject">Subject</Label>
              <Input
                id="planner-task-subject"
                value={subject}
                maxLength={60}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Chemistry"
              />
            </div>
            <div>
              <Label htmlFor="planner-task-priority">Priority</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as Priority)}>
                <SelectTrigger id="planner-task-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((item) => (
                    <SelectItem key={item} value={item} className="capitalize">
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="planner-task-date">Date</Label>
              <Input
                id="planner-task-date"
                type="date"
                value={taskDate}
                onChange={(event) => setTaskDate(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="planner-task-time">Time</Label>
              <Input
                id="planner-task-time"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="planner-task-duration">Minutes</Label>
              <Input
                id="planner-task-duration"
                type="number"
                min={5}
                max={480}
                step={5}
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!title.trim()}>
            Add task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
