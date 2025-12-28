import { prisma } from "../lib/prisma";

async function setupDefaultConfig() {
    try {
        // Set default configurations
        await prisma.system_config.upsert({
            where: { key: "date_range_days" },
            update: {
                value: 7,
                description: "Number of days from today that users can select for booking"
            },
            create: {
                key: "date_range_days",
                value: 7,
                description: "Number of days from today that users can select for booking"
            }
        });


        console.log("Default configurations set up successfully!");
        
        // Display current configurations
        const configs = await prisma.system_config.findMany();
        console.log("\nCurrent configurations:");
        configs.forEach(config => {
            console.log(`- ${config.key}: ${config.value} (${config.description})`);
        });

    } catch (error) {
        console.error("Error setting up default config:", error);
    } finally {
        await prisma.$disconnect();
    }
}

setupDefaultConfig();