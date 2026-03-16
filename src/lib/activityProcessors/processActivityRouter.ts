import { processSleepActivity } from "./sleepProcessor";
import { processFeedingActivity } from "./feedingProcessor";
import { processDiaperActivity } from "./diaperProcessor";
import { processPlayActivity } from "./playProcessor";
import { processBathActivity } from "./bathProcessor";
import { processMedicineActivity } from "./medicineProcessor";
import { processTemperatureActivity } from "./temperatureProcessor";
import { processNapActivity } from "./napProcessor";
import { processPumpingActivity } from "./pumpingProcessor";
import { processGrowthActivity } from "./growthProcessor";

export async function processActivity(activity: any) {

  switch (activity.type) {

    case "sleep":
      return processSleepActivity(activity);

    case "feeding":
      return processFeedingActivity(activity);

    case "diaper":
      return processDiaperActivity(activity);

    case "play":
      return processPlayActivity(activity);

    case "bath":
      return processBathActivity(activity);

    case "medicine":
      return processMedicineActivity(activity);

    case "temperature":
      return processTemperatureActivity(activity);

    case "nap":
      return processNapActivity(activity);

    case "pumping":
      return processPumpingActivity(activity);

    case "growth":
      return processGrowthActivity(activity.metadata);

    default:
      console.warn("Unknown activity type:", activity.type);
      return null;
  }
}