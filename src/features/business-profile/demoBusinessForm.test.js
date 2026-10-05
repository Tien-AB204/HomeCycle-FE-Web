import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_BUSINESS_SAMPLES } from "../../constants/demoBusinessSample.js";
import { buildDemoBusinessForm } from "./demoBusinessForm.js";

test("business samples fill the onboarding form without touching identity fields", () => {
  const scanned = { fullName: "Trần Thị B", identityNumber: "001", accountName: "TRẦN THỊ B" };

  DEMO_BUSINESS_SAMPLES.forEach((sample) => {
    const form = buildDemoBusinessForm(scanned, sample);

    assert.equal(form.fullName, "Trần Thị B");
    assert.equal(form.identityNumber, "001");
    assert.equal(form.accountName, "TRẦN THỊ B");
    assert.ok(form.businessName && form.taxCode && form.city && form.ward, sample.key);
    assert.ok(form.bankCode && form.accountNumber, sample.key);

    if (sample.model === "enterprise") {
      assert.equal(form.businessModel, "1");
      assert.ok(form.serviceAreaCity && form.serviceAreaWard, sample.key);
    } else {
      assert.equal(form.businessModel, "0");
      assert.equal(form.serviceAreaCity, "");
    }
  });
});
