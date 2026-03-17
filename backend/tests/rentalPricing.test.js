import test from "node:test";
import assert from "node:assert/strict";

import { computeReservationPricing, daysInclusiveLocal } from "../utils/rentalPricing.js";

test("daysInclusiveLocal counts inclusive calendar days (local)", () => {
  assert.equal(daysInclusiveLocal("2026-03-01", "2026-03-01"), 1);
  assert.equal(daysInclusiveLocal("2026-03-01", "2026-03-02"), 2);
  assert.equal(daysInclusiveLocal("2026-03-01", "2026-03-03"), 3);
  assert.equal(daysInclusiveLocal("2026-03-01", "2026-03-04"), 4);
});

test("computeReservationPricing includes first 3 days in base price", () => {
  const basePrice = 500;

  const p3 = computeReservationPricing({ basePrice, pickupDate: "2026-03-01", returnDate: "2026-03-03" });
  assert.equal(p3.totalReservedDays, 3);
  assert.equal(p3.extraDays, 0);
  assert.equal(p3.total, 500);

  const p4 = computeReservationPricing({ basePrice, pickupDate: "2026-03-01", returnDate: "2026-03-04" });
  assert.equal(p4.totalReservedDays, 4);
  assert.equal(p4.extraDays, 1);
  assert.equal(p4.total, 550);
});

test("computeReservationPricing matches example 500 + 3 extras = 650", () => {
  const basePrice = 500;
  // Standard included days = 3; "3 more days" => totalReservedDays = 6
  const pricing = computeReservationPricing({ basePrice, pickupDate: "2026-03-01", returnDate: "2026-03-06" });
  assert.equal(pricing.totalReservedDays, 6);
  assert.equal(pricing.extraDays, 3);
  assert.equal(pricing.total, 650);
});

