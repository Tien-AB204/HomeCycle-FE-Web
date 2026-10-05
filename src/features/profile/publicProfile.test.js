import assert from "node:assert/strict";
import test from "node:test";
import {
  composeBusinessAddress,
  formatStarRating,
  getBusinessModelLabel,
  getProfileDisplayName,
  normalizePublicProfile,
} from "./publicProfile.js";

test("detects the profile kind from the response shape", () => {
  const business = normalizePublicProfile({
    userId: "u1",
    username: "shop",
    businessName: "Cửa hàng A",
    businessModel: "Enterprise",
    activePostCount: -2,
  });
  assert.equal(business.kind, "business");
  assert.equal(getProfileDisplayName(business), "Cửa hàng A");
  assert.equal(business.activePostCount, 0);
  assert.equal(getBusinessModelLabel(business.businessModel), "Doanh nghiệp");
  assert.equal(getBusinessModelLabel(0), "Hộ kinh doanh");
  assert.equal(getBusinessModelLabel(9), "Không xác định");

  const personal = normalizePublicProfile({ data: { UserId: "u2", Username: "an", FullName: "Nguyễn An" } });
  assert.equal(personal.kind, "personal");
  assert.equal(personal.userId, "u2");
  assert.equal(getProfileDisplayName(personal), "Nguyễn An");

  const unknown = normalizePublicProfile({ userId: "u3", username: "x", displayStarRating: 0 });
  assert.equal(unknown.kind, "unknown");
  assert.equal(unknown.displayStarRating, null);
});

test("business address does not repeat ward or city", () => {
  assert.equal(
    composeBusinessAddress({
      businessAddress: "12 Lê Lợi, Phường Bến Nghé",
      ward: "Phường Bến Nghé",
      city: "TP. Hồ Chí Minh",
    }),
    "12 Lê Lợi, Phường Bến Nghé, TP. Hồ Chí Minh",
  );
  assert.equal(formatStarRating(4.25), "★ 4.3");
  assert.equal(formatStarRating(null), "Chưa có đánh giá");
});
