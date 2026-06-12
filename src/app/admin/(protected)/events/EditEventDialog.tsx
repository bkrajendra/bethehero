"use client";
import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateEventDetailsAction } from "./actions";

interface Event {
  id: string;
  name: string;
  venue: string;
  address: string;
  startAt: Date | string;
  endAt: Date | string;
  organiserName: string;
  bloodBankName: string;
  organiserSignatoryName: string;
  organiserSignatoryTitle: string;
  bloodBankSignatoryName: string;
  bloodBankSignatoryTitle: string;
}

function toDatetimeLocal(date: Date | string) {
  // Format in IST so the datetime-local input shows the correct local time
  const iso = new Date(date).toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" });
  // sv-SE gives "YYYY-MM-DD HH:MM:SS" — trim seconds and replace space with T
  return iso.slice(0, 16).replace(" ", "T");
}

export function EditEventDialog({ event }: { event: Event }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateEventDetailsAction(event.id, formData);
      if (res.error) setError(res.error);
      else setOpen(false);
    });
  }

  const fields: { name: keyof Event; label: string }[] = [
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
      <DialogTrigger render={
        <Button variant="outline" size="sm" className="border-gray-200 text-gray-600 hover:bg-gray-50">
          Edit
        </Button>
      } />
      <DialogContent className="bg-white border border-gray-100 text-gray-900 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Edit Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map(f => (
            <div key={f.name} className="space-y-1">
              <Label className="text-gray-700 text-sm">{f.label} *</Label>
              <Input name={f.name} required defaultValue={String(event[f.name] ?? "")}
                className="border-gray-200 text-gray-900" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-gray-700 text-sm">Start *</Label>
              <Input name="startAt" type="datetime-local" required
                defaultValue={toDatetimeLocal(event.startAt)}
                className="border-gray-200 text-gray-900" />
            </div>
            <div className="space-y-1">
              <Label className="text-gray-700 text-sm">End *</Label>
              <Input name="endAt" type="datetime-local" required
                defaultValue={toDatetimeLocal(event.endAt)}
                className="border-gray-200 text-gray-900" />
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" disabled={isPending} className="w-full bg-[#c8102e] hover:bg-[#a50d27] text-white">
            {isPending ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
