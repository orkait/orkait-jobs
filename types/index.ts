import { applications } from "@prisma/client";

export interface ApplicationWithJob extends applications {
    job_title?: string;
    // Add other joined fields if any
}
