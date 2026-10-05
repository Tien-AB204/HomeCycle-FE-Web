import assert from "node:assert/strict";
import test from "node:test";
import { dedupeAddressText, joinAddressParts } from "./addressText.js";

test("joining skips parts already in the street address", () => {
  assert.equal(
    joinAddressParts([
      "65 Lê Lợi, Phường Bình Dương, Thành phố Hồ Chí Minh",
      "Phường Bình Dương",
      "",
      "Thành phố Hồ Chí Minh",
    ]),
    "65 Lê Lợi, Phường Bình Dương, Thành phố Hồ Chí Minh",
  );
  assert.equal(
    joinAddressParts(["65 Lê Lợi", "Phường Bình Dương", "Thành phố Hồ Chí Minh"]),
    "65 Lê Lợi, Phường Bình Dương, Thành phố Hồ Chí Minh",
  );
});

test("stored addresses drop repeated segments", () => {
  assert.equal(
    dedupeAddressText(
      "65 Lê Lợi, Phường Bình Dương, Thành phố Hồ Chí Minh, Phường Bình Dương, Thành phố Hồ Chí Minh",
    ),
    "65 Lê Lợi, Phường Bình Dương, Thành phố Hồ Chí Minh",
  );
  assert.equal(dedupeAddressText(null), "");
});
