"use client";

import BabyForm from "@/components/baby/BabyForm";
import { useRouter } from "next/navigation";

type Props = {
  babyId: string;
  initialData: {
    id: string;
    name: string;
    gender: string | null;
    birthDate: Date | string | null;
    photoUrl: string | null;
    month: string;
    day: string;
    year: string;
  };
};

export default function EditBabyFormClient({ babyId, initialData }: Props) {
  const router = useRouter();

  return (
    <BabyForm
      mode="edit"
      initialData={initialData}
      onSubmit={async (data) => {
        try {
          const formData = new FormData();
          formData.append("name", data.name);
          formData.append("gender", data.gender);
          formData.append("birthDate", data.birthDate);
      
          if (data.photoFile) {
            formData.append("photo", data.photoFile);
          }
      
          console.log("Updating baby:", babyId);
      
          const res = await fetch(`/api/babies/${babyId}`, {
            method: "PUT",
            body: formData,
          });
      
          if (!res.ok) {
            const text = await res.text();
            console.error("Update failed:", text);
            throw new Error("Failed to update baby");
          }
      
          console.log("Update success ✅");
      
          // 🔥 IMPORTANT: use replace (better UX)
          router.replace(`/dashboard/babies`);
      
        } catch (err) {
          console.error(err);
          alert("Update failed. Check console.");
        }
      }}
    />
  );
}
