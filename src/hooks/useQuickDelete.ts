import axios, { AxiosError } from "axios";

/**
 * Deletes an activity by ID
 * Used for Undo actions and manual deletions
 */
export async function quickDelete(activityId: string): Promise<{ success: boolean }> {
  const url = `/api/activities/${activityId}`;

  console.log("[Axios] Calling:", url);

  try {
    const res = await axios.delete<{ success: boolean }>(url);

    // ✅ Validate response shape
    if (!res.data || typeof res.data.success !== "boolean") {
      console.error("[Axios] Invalid response at:", url, res.data);
      throw new Error("Invalid server response");
    }

    return res.data;

  } catch (err: unknown) {
    const error = err as AxiosError<any>;

    // 🔍 Extract meaningful message
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "Failed to delete activity";

    console.error("[Axios] Error at:", url, {
      status: error.response?.status,
      data: error.response?.data,
      message,
    });

    // ❗ Re-throw clean error for UI layer
    throw new Error(message);
  }
}