import { supabase } from "@/integrations/supabase/client";

function j(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const payload = await req.json();
    console.log("📝 Received booking payload:", payload);

    const { 
      customerInfo, 
      selectedStations, 
      selectedDate, 
      selectedSlot, 
      originalPrice, 
      discount, 
      finalPrice, 
      appliedCoupons,
      orderId,
      payment_mode = "venue"
    } = payload;

    // Validate required fields
    if (!customerInfo || !selectedStations || !selectedDate || !selectedSlot) {
      console.error("❌ Missing required booking data:", {
        hasCustomerInfo: !!customerInfo,
        hasSelectedStations: !!selectedStations,
        hasSelectedDate: !!selectedDate,
        hasSelectedSlot: !!selectedSlot
      });
      return j({ ok: false, error: "Missing required booking data" }, 400);
    }

    // Create customer if new
    let customerId = customerInfo.id;
    if (!customerId) {
      console.log("🔍 Searching for existing customer with phone:", customerInfo.phone);
      
      const { data: existingCustomer, error: searchError } = await supabase
        .from("customers")
        .select("id")
        .eq("phone", customerInfo.phone)
        .single();
      
      if (searchError && searchError.code !== "PGRST116") {
        console.error("❌ Customer search error:", searchError);
        return j({ ok: false, error: "Customer search failed" }, 500);
      }

      if (existingCustomer) {
        customerId = existingCustomer.id;
        console.log("✅ Found existing customer:", customerId);
      } else {
        console.log("👤 Creating new customer");
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .insert({
            name: customerInfo.name,
            phone: customerInfo.phone,
            email: customerInfo.email || null,
            is_member: false,
            loyalty_points: 0,
            total_spent: 0,
            total_play_time: 0,
          })
          .select("id")
          .single();
        
        if (customerError) {
          console.error("❌ Customer creation failed:", customerError);
          return j({ ok: false, error: "Failed to create customer" }, 500);
        }
        customerId = newCustomer.id;
        console.log("✅ New customer created:", customerId);
      }
    }

    // Validate booking slots for conflicts BEFORE creating
    for (const stationId of selectedStations) {
      const { data: hasOverlap, error: overlapError } = await (supabase as any).rpc('check_booking_overlap', {
        p_station_id: stationId,
        p_booking_date: selectedDate,
        p_start_time: selectedSlot.start_time,
        p_end_time: selectedSlot.end_time,
        p_exclude_booking_id: null,
      });

      if (overlapError) {
        console.error("Error checking booking overlap:", overlapError);
        // Continue - database trigger will catch it
      } else if (hasOverlap === true) {
        // Find the conflicting booking to provide better error message
        // Fetch all active bookings and filter in JavaScript to handle midnight properly
        const { data: allActiveBookings } = await supabase
          .from("bookings")
          .select(`
            id,
            booking_date,
            start_time,
            end_time,
            status,
            payment_txn_id,
            created_at,
            stations!inner(name)
          `)
          .eq("station_id", stationId)
          .eq("booking_date", selectedDate)
          .in("status", ["confirmed", "in-progress"])
          .order("created_at", { ascending: false });
        
        // Filter in JavaScript to properly handle midnight (00:00:00)
        // When end_time is 00:00:00, treat it as 24:00:00 (end of day) for comparison
        const slotStart = selectedSlot.start_time;
        const slotEnd = selectedSlot.end_time === '00:00:00' ? '24:00:00' : selectedSlot.end_time;
        
        const conflictingBooking = allActiveBookings?.find(b => {
          const bStart = b.start_time;
          const bEnd = b.end_time === '00:00:00' ? '24:00:00' : b.end_time;
          
          // Standard overlap check (now that midnight is normalized to 24:00:00)
          return (
            (bStart <= slotStart && bEnd > slotStart) ||  // Case 1: Existing starts during new
            (bStart < slotEnd && bEnd >= slotEnd) ||     // Case 2: Existing ends during new
            (bStart >= slotStart && bEnd <= slotEnd) ||  // Case 3: Existing contained in new
            (bStart <= slotStart && bEnd >= slotEnd)     // Case 4: New contained in existing
          );
        });

        const conflictDetails = conflictingBooking 
          ? `Conflicting booking: ID ${conflictingBooking.id}, Date: ${conflictingBooking.booking_date}, Time: ${conflictingBooking.start_time}-${conflictingBooking.end_time}, Status: ${conflictingBooking.status}, Station: ${(conflictingBooking.stations as any)?.name || 'Unknown'}`
          : 'Unable to retrieve conflicting booking details';

        console.error("❌ Booking conflict detected for station:", stationId, conflictDetails);
        return j({ 
          ok: false, 
          error: "Booking conflict", 
          details: `This time slot (${selectedSlot.start_time} - ${selectedSlot.end_time}) is already booked. Please select a different time. ${conflictDetails}` 
        }, 409); // 409 Conflict
      }
    }

    // Create booking records
    const couponCodes = appliedCoupons ? Object.values(appliedCoupons).join(",") : "";
    const rows = selectedStations.map((stationId: string) => ({
      station_id: stationId,
      customer_id: customerId,
      booking_date: selectedDate,
      start_time: selectedSlot.start_time, // Fixed field name
      end_time: selectedSlot.end_time, // Fixed field name
      duration: 60,
      status: "confirmed",
      original_price: originalPrice || 0,
      discount_percentage: discount > 0 ? (discount / originalPrice) * 100 : null,
      final_price: finalPrice || 0,
      coupon_code: couponCodes || null,
      payment_mode: payment_mode,
      payment_txn_id: orderId || null,
      notes: null,
    }));

    console.log("💾 Inserting booking records:", rows.length, "records");

    const { data: inserted, error: bookingError } = await supabase
      .from("bookings")
      .insert(rows)
      .select("id");

    if (bookingError) {
      console.error("❌ Booking creation failed:", bookingError);
      // Check if error is due to booking conflict
      if (bookingError.code === '23505' || bookingError.message?.includes('Booking conflict')) {
        return j({ 
          ok: false, 
          error: "Booking conflict", 
          details: "This time slot is already booked. Please select a different time." 
        }, 409); // 409 Conflict
      }
      return j({ ok: false, error: "Failed to create booking", details: bookingError.message }, 500);
    }

    console.log("✅ Booking created successfully:", inserted.length, "records");

    return j({ 
      ok: true, 
      bookingId: inserted[0].id,
      message: "Booking created successfully" 
    });

  } catch (error: any) {
    console.error("💥 Unexpected booking creation error:", error);
    return j({ 
      ok: false, 
      error: "Unexpected error occurred",
      details: error.message
    }, 500);
  }
}
