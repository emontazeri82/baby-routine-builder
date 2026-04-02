import { generateOccurrencesForActiveReminders } from "./generateOccurrences";
import { dispatchDueOccurrences } from "./dispatchDueOccurrences";

export async function runReminderEngine(params: {
  babyId: string;
}) {
  const { babyId } = params;

  console.log("⚙️ Engine start", babyId);

  const gen = await generateOccurrencesForActiveReminders({
    babyId,
    horizonDays: 14,
    maxOccurrences: 50,
  });

  console.log("📦 Generated:", gen);

  const dispatch = await dispatchDueOccurrences({
    babyId,
  });

  console.log("📨 Dispatched:", dispatch);

  console.log("✅ Engine finished", babyId);
}