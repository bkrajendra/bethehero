"use client";
import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEventAction } from "./actions";

export function CreateEventDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createEventAction(formData);
      if (res.error) setError(res.error);
      else setOpen(false);
    });
  }

  const fields = [
    { name: "name",                    label: "Event Name" },
    { name: "venue",                   label: "Venue" },
    { name: "address",                 label: "Address" },
    { name: "organiserName",           label: "Organiser Name" },
    { name: "bloodBankName",           label: "Blood Bank Name" },
    { name: "organiserSignatoryName",  label: "Organiser Signatory Name" },
    { name: "organiserSignatoryTitle", label: "Organiser Signatory Title" },
    { name: "bloodBankSignatoryName",  label: "Blood Bank Signatory Name" },
    { name: "bloodBankSignatoryTitle", label: "Blood Bank Signatory Title" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="bg-[#c8102e] hover:bg-[#a50d27] text-white">+ Create Event</Button>} />
      <DialogContent className="bg-white border border-gray-100 text-gray-900 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Create New Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map(f => (
            <div key={f.name} className="space-y-1">
              <Label className="text-gray-700 text-sm">{f.label} *</Label>
              <Input name={f.name} required className="border-gray-200 text-gray-900" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-gray-700 text-sm">Start *</Label>
              <Input name="startAt" type="datetime-local" required className="border-gray-200 text-gray-900" />
            </div>
            <div className="space-y-1">
              <Label className="text-gray-700 text-sm">End *</Label>
              <Input name="endAt" type="datetime-local" required className="border-gray-200 text-gray-900" />
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" disabled={isPending} className="w-full bg-[#c8102e] hover:bg-[#a50d27] text-white">
            {isPending ? "Creating…" : "Create Event"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
