import { z } from "zod";

type TColor = "blue" | "green" | "red" | "yellow" | "purple" | "orange" | "gray";

export const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startDate: z.custom<Date>((val): val is Date => val instanceof Date && !isNaN((val as Date).getTime()), "Start date is required"),
  startTime: z.custom<{ hour: number; minute: number }>(
    val => !!val && typeof val === "object" && typeof (val as any).hour === "number" && typeof (val as any).minute === "number",
    "Start time is required"
  ),
  endDate: z.custom<Date>((val): val is Date => val instanceof Date && !isNaN((val as Date).getTime()), "End date is required"),
  endTime: z.custom<{ hour: number; minute: number }>(
    val => !!val && typeof val === "object" && typeof (val as any).hour === "number" && typeof (val as any).minute === "number",
    "End time is required"
  ),
  color: z.custom<TColor>(
    val => typeof val === "string" && ["blue", "green", "red", "yellow", "purple", "orange", "gray"].includes(val as string),
    "Color is required"
  ),
  reminders: z.object({
    useDefault: z.boolean(),
    overrides: z.array(z.object({
      method: z.enum(['email', 'popup']),
      minutes: z.number().min(0).max(40320), // Max 4 weeks in minutes
    })).optional(),
  }).optional(),
});

export type TEventFormData = z.infer<typeof eventSchema>;
