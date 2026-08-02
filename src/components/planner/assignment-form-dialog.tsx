import { Plus } from "lucide-react";
import { useState } from "react";

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
import { todayISO } from "@/lib/planner/utils";
import type { NewAssignmentInput, Priority } from "@/lib/planner/types";

const priorities: Priority[] = ["low", "medium", "high"];

export function AssignmentFormDialog({
  onCreate,
}: {
  onCreate: (input: NewAssignmentInput) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [dueDate, setDueDate] = useState(todayISO());
  const [priority, setPriority] = useState<Priority>("medium");

  function reset() {
    setTitle("");
    setSubject("");
    setPriority("medium");
  }

  function submit() {
    if (!title.trim()) return;
    onCreate({ title, subject: subject || null, dueDate, priority });
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 size-4" /> Add assignment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Track an assignment</DialogTitle>
          <DialogDescription>Keep due dates and priority in one place.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label htmlFor="assignment-title">Assignment</Label>
            <Input
              id="assignment-title"
              value={title}
              maxLength={140}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Lab report — titration"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <Label htmlFor="assignment-subject">Subject</Label>
              <Input
                id="assignment-subject"
                value={subject}
                maxLength={60}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Chemistry"
              />
            </div>
            <div>
              <Label htmlFor="assignment-due">Due date</Label>
              <Input
                id="assignment-due"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="assignment-priority">Priority</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as Priority)}>
                <SelectTrigger id="assignment-priority">
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!title.trim()}>
            Add assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
