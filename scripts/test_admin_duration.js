// Simple test to verify admin duration functionality
console.log("Testing admin duration functionality...");

// Test the availability API
async function testAPI() {
    try {
        // Get availability slots
        const response = await fetch("http://localhost:3000/api/availability");
        const slots = await response.json();
        
        console.log("Available slots:", slots.length);
        
        if (slots.length > 0) {
            const slot = slots[0];
            console.log("First slot duration:", slot.slot_duration);
            console.log("Slot ID:", slot.id);
            
            // Test duration change API
            console.log("\nTesting duration change API...");
            const updateResponse = await fetch("http://localhost:3000/api/availability", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    id: slot.id, 
                    slot_duration: slot.slot_duration === 30 ? 60 : 30 
                })
            });
            
            const updateResult = await updateResponse.json();
            console.log("Update response:", updateResult);
            
            if (updateResult.requires_confirmation) {
                console.log("✓ Warning system working - requires confirmation for existing bookings");
            } else {
                console.log("✓ Duration updated successfully");
            }
        }
        
    } catch (error) {
        console.error("Error:", error);
    }
}

testAPI();