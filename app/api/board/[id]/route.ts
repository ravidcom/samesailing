import { getBoardData } from "@/lib/boardData";

/** Backs the Passengers screen's in-place sailing switcher - the initial
 * render is server-rendered per the URL's sailing id (app/sailing/[id]/board
 * /page.tsx), but switching to a different one of your own sailings without
 * navigating needs a way to fetch that other sailing's board data from the
 * client. Same underlying data as the page itself, and just as public
 * (get_sailing_passengers() is anonymous/cached - see lib/sailingPassengers.ts). */
export async function GET(_req: Request, ctx: RouteContext<"/api/board/[id]">) {
  const { id } = await ctx.params;
  const data = await getBoardData(id);
  if (!data) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(data);
}
