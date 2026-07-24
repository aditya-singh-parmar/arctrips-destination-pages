"use server";

import { getServiceSupabase } from "@/app/lib/supabase";

export type NotifyState = { status: "idle" | "success" | "error"; message?: string };

/**
 * Inserts a row into `notify_signups` (migration 0002, already applied).
 * Bound with `productLineSlug`/`citySlug` in the client component via
 * `.bind(null, productLineSlug, citySlug)` so the client only ever posts an
 * email, never the service-role client.
 */
export async function submitNotify(
  productLineSlug: string,
  citySlug: string,
  _prevState: NotifyState,
  formData: FormData,
): Promise<NotifyState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email || !email.includes("@")) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return { status: "error", message: "Signups aren't available right now, try again later." };
  }

  const { error } = await supabase.from("notify_signups").insert({
    email,
    product_line_slug: productLineSlug,
    city_slug: citySlug,
  });

  if (error) {
    return { status: "error", message: "Something went wrong, try again." };
  }
  return { status: "success" };
}
