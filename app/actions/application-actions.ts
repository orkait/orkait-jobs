"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateApplicationStatus(id: number, status: string) {
    try {
        await prisma.applications.update({
            where: { id },
            data: { status },
        });
        revalidatePath("/admin/applications");
        return { success: true };
    } catch (error) {
        console.error("Failed to update status:", error);
        return { success: false, error: "Failed to update status" };
    }
}

export async function toggleApplicationBookmark(id: number, currentStatus: boolean | null) {
    try {
        await prisma.applications.update({
            where: { id },
            data: { is_bookmarked: !currentStatus },
        });
        revalidatePath("/admin/applications");
        return { success: true };
    } catch (error) {
        console.error("Failed to toggle bookmark:", error);
        return { success: false, error: "Failed to toggle bookmark" };
    }
}

export async function createApplication(data: FormData) {
    try {
        const name = data.get("name") as string;
        const email = data.get("email") as string;
        const phone = data.get("phone") as string;
        const resumeUrl = data.get("resume_url") as string;
        const jobId = data.get("job_id") ? parseInt(data.get("job_id") as string) : null;

        if (!name || !email || !resumeUrl) {
            return { success: false, error: "Missing required fields" };
        }

        await prisma.applications.create({
            data: {
                name,
                email,
                phone,
                resume_url: resumeUrl,
                job_id: jobId,
                status: "pending"
            }
        });
        
        revalidatePath("/admin/applications");
        return { success: true };
    } catch (error) {
        console.error("Failed to create application:", error);
        return { success: false, error: "Failed to create application" };
    }
}
