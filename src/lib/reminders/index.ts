// Compatibility bridge:
// Keep the new "@/lib/reminders" entrypoint while preserving
// the original reminder behavior and response shapes.
export * from "./reminder.service";
export * from "./reminder.commands";
export * from "./reminder.reads";
export * from "./reminder.validation";
export * from "./reminder.errors";
export * from "./reminder.constants";
export * from "./reminder.types";
export * from "./reminder.utils";
export * from "./notification.engine";
export * from "./occurrence.service";
export * from "./reminder.queries";
export * from "./notification.service";
export * from "./notification.dispatcher";
