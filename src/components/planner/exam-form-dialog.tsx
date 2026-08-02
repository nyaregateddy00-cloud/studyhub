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
import { todayISO } from "@/lib/planner/utils";
import type { NewExamInput } from "@/lib/planner/types";

export function ExamFormDialog({ onCreate }: { onCreate: (input: NewExamInput) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");

  function reset() {
    setTitle("");
    setSubject("");
    setTime("");
    setLocation("");
  }

  function submit() {
    if (!title.trim()) return;
    onCreate({
      title,
      subject: subject || null,
      date,
      time: time || null,
      location: location || null,
    });
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 size-4" /> Add exam
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add an upcoming exam</DialogTitle>
          <DialogDescription>Track exam dates so countdowns stay accurate.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label htmlFor="exam-title">Exam</Label>
            <Input
              id="exam-title"
              value={title}
              maxLength={140}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Organic Chemistry Midterm"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="exam-subject">Subject</Label>
              <Input
                id="exam-subject"
                value={subject}
                maxLength={60}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Chemistry"
              />
            </div>
            <div>
              <Label htmlFor="exam-location">Location</Label>
              <Input
                id="exam-location"
                value={location}
                maxLength={80}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Hall B"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="exam-date">Date</Label>
              <Input
                id="exam-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="exam-time">Time</Label>
              <Input
                id="exam-time"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!title.trim()}>
            Add exam
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
