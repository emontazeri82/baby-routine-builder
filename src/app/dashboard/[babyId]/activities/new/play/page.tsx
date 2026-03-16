"use client";

import { useState } from "react";
import BaseActivityLayout from "@/components/activity/BaseActivityLayout";

export default function PlayPage() {

  const [playType, setPlayType] = useState("tummy_time");
  const [location, setLocation] = useState("indoor");
  const [intensity, setIntensity] = useState("moderate");
  const [mood, setMood] = useState("happy");

  const [skills, setSkills] = useState<string[]>([]);

  const toggleSkill = (skill: string) => {
    setSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const metadata = {
    playType,
    location,
    intensity,
    mood,
    skills
  };

  return (
    <BaseActivityLayout activityName="Play" metadata={metadata}>

      {/* PLAY TYPE */}
      <div>
        <label className="block text-sm font-medium mb-1">Play Type</label>
        <select
          value={playType}
          onChange={(e) => setPlayType(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="tummy_time">Tummy Time</option>
          <option value="toy_play">Toy Play</option>
          <option value="reading">Reading</option>
          <option value="sensory">Sensory Play</option>
          <option value="music">Music Play</option>
          <option value="movement">Movement Play</option>
        </select>
      </div>

      {/* LOCATION */}
      <div>
        <label className="block text-sm font-medium mb-1">Location</label>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="indoor">Indoor</option>
          <option value="outdoor">Outdoor</option>
          <option value="park">Park</option>
          <option value="playroom">Playroom</option>
          <option value="stroller">Stroller</option>
        </select>
      </div>

      {/* INTENSITY */}
      <div>
        <label className="block text-sm font-medium mb-1">Intensity</label>
        <select
          value={intensity}
          onChange={(e) => setIntensity(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="calm">Calm</option>
          <option value="moderate">Moderate</option>
          <option value="active">Active</option>
        </select>
      </div>

      {/* BABY MOOD */}
      <div>
        <label className="block text-sm font-medium mb-1">Baby Mood</label>
        <select
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="happy">Happy</option>
          <option value="neutral">Neutral</option>
          <option value="excited">Excited</option>
          <option value="fussy">Fussy</option>
          <option value="tired">Tired</option>
        </select>
      </div>

      {/* SKILLS PRACTICED */}
      <div>
        <label className="block text-sm font-medium mb-2">Skills Practiced</label>

        <div className="flex flex-wrap gap-2">
          {["motor", "cognitive", "social", "language", "sensory"].map(skill => (
            <button
              type="button"
              key={skill}
              onClick={() => toggleSkill(skill)}
              className={`px-3 py-1 border rounded text-sm ${
                skills.includes(skill)
                  ? "bg-black text-white"
                  : "bg-white"
              }`}
            >
              {skill}
            </button>
          ))}
        </div>
      </div>

    </BaseActivityLayout>
  );
}