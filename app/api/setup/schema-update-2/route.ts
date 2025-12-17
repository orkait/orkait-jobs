import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
    try {
        await query(`
      ALTER TABLE applications 
      ADD COLUMN IF NOT EXISTS portfolio_links TEXT[];
    `);
        return NextResponse.json({ success: true, message: "Schema updated: added portfolio_links" });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to update schema" }, { status: 500 });
    }
}
