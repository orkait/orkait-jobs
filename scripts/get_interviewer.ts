import { prisma } from "../lib/prisma";

async function main() {
  const interviewer = await prisma.interviewers.findFirst();
  console.log("Interviewer:", interviewer ? interviewer.id : "Not found");
  
  console.log("Available Prisma models:", Object.keys(prisma));
  
  if (!prisma.booking_links) {
    console.error("prisma.booking_links is UNDEFINED!");
  } else {
    console.log("prisma.booking_links is defined.");
  }
  

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
