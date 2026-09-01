/**
 * Seed Script — Legacy Property Items (Phase 13)
 * ==============================================
 * Inserts the legacy PropertyItem demo data (prop-blr-001, prop-hyd-002,
 * prop-pun-003) into the Supabase `property_items` table. The nested JSONB
 * fields (land_details, building, documents, verification_history,
 * assigned_officer) are stored as-is from the existing mock data.
 *
 * Usage:
 *   npx tsx supabase/seed/seed_property_items.ts
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL
 * to be set in the environment.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { MOCK_PROPERTIES } from '@/data/mockProperties';
import type { PropertyItem } from '@/types';

async function main() {
  const supabase = createServerSupabaseClient();

  console.log('Seeding property_items from legacy mock data...');

  for (const item of MOCK_PROPERTIES) {
    // The demo data already has coordinates and boundaryCoordinates as objects;
    // store them as JSONB in the database.
    const record = {
      id: item.id,
      ulpin: item.ulpin,
      property_id: item.propertyId,
      title: item.title,
      property_type: item.propertyType,
      primary_owner_name: item.primaryOwnerName,
      co_owners: item.coOwners || null,
      owner_contact_masked: item.ownerContactMasked,
      owner_aadhaar_masked: item.ownerAadhaarMasked,
      address: item.address,
      city: item.city,
      district: item.district,
      state: item.state,
      pincode: item.pincode,
      latitude: item.coordinates.lat,
      longitude: item.coordinates.lng,
      boundary_coordinates: item.boundaryCoordinates,
      adjacent_parcels: item.adjacentParcels || null,
      verification_status: item.verificationStatus,
      market_valuation_inr: item.marketValuationINR,
      government_valuation_inr: item.governmentValuationINR,
      featured_image_url: item.featuredImageUrl,
      aerial_image_url: item.aerialImageUrl || null,
      has_active_dispute: item.hasActiveDispute,
      land_details: item.landDetails,
      building: item.building || null,
      documents: item.documents,
      verification_history: item.verificationHistory,
      assigned_officer: item.assignedOfficer || null,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };

    const { error } = await supabase
      .from('property_items')
      .upsert(record, { onConflict: 'id', ignoreDuplicates: true });

    if (error) {
      console.error(`Failed to seed ${item.id}:`, error);
    } else {
      console.log(`  ✓ Seeded ${item.id} (${item.title})`);
    }
  }

  console.log('Property items seed complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
