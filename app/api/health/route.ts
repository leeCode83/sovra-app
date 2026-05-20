import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { redis } from "@/lib/redis";

export async function GET() {
  let dbStatus: "connected" | "error" = "error";
  let redisStatus: "connected" | "error" = "error";

  try {
    await db.select().from(users).limit(1);
    dbStatus = "connected";
  } catch { /* ignore */ }

  try {
    await redis.ping();
    redisStatus = "connected";
  } catch { /* ignore */ }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    db: dbStatus,
    redis: redisStatus,
  });
}