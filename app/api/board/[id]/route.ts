import { getBoardData } from "@/lib/boardData";
import { getVerifiedRequestUser } from "@/lib/supabase/serverAuth";
import { canViewSailingMembers } from "@/lib/sailingPassengers";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** Backs the Passengers screen's in-place sailing switcher - switching to a
 * different one of your own sailings without navigating needs a way to
 * fetch that other sailing's board data from the client. Member/admin
 * only, exactly like the page itself: 401 without a valid session, 403 for
 * a signed-in user who isn't aboard that sailing. Never cacheable. */
export async function GET(_req: Request, ctx: RouteContext<"/api/board/[id]">) {
  const { id } = await ctx.params;
  const viewer = await getVerifiedRequestUser();
  if (!viewer) return Response.json({ error: "sign in required" }, { status: 401, headers: NO_STORE });
  if (!(await canViewSailingMembers(viewer.supabase, viewer.userId, id))) {
    return Response.json({ error: "not a member of this sailing" }, { status: 403, headers: NO_STORE });
  }
  const data = await getBoardData(id, viewer.supabase);
  if (!data) return Response.json({ error: "not found" }, { status: 404, headers: NO_STORE });
  return Response.json(data, { headers: NO_STORE });
}
