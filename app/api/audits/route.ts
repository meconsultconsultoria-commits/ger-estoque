import { desc } from "drizzle-orm";import { getDb } from "../../../db";import { audits } from "../../../db/schema";import { isAdmin } from "../../auth";
export async function GET(){const u=await isAdmin();if(!u)return Response.json([],{status:403});return Response.json(await getDb().select().from(audits).orderBy(desc(audits.id)).limit(200))}
