import assert from "node:assert/strict";
import test from "node:test";
import {
  getNeighborId,
  getNextAfterReview,
  getProfileId,
  getQueuePosition,
} from "./verificationQueue.js";

const ids = ["a", "b", "c"];

test("reads the profile id from either profile type", () => {
  assert.equal(getProfileId({ businessProfileId: "b1" }), "b1");
  assert.equal(getProfileId({ personalProfileId: "p1" }), "p1");
  assert.equal(getProfileId({}), "");
});

test("moves to the previous or next profile in the shown order", () => {
  assert.equal(getQueuePosition(ids, "b"), 2);
  assert.equal(getQueuePosition(ids, "x"), 0);
  assert.equal(getNeighborId(ids, "b", 1), "c");
  assert.equal(getNeighborId(ids, "b", -1), "a");
  assert.equal(getNeighborId(ids, "c", 1), null);
  assert.equal(getNeighborId(ids, "x", 1), "a");
  assert.equal(getNeighborId(ids, "x", -1), "c");
  assert.equal(getNeighborId([], "a", 1), null);
});

test("picks the next profile to review after a decision", () => {
  assert.equal(getNextAfterReview(ids, "a"), "b");
  assert.equal(getNextAfterReview(ids, "b"), "c");
  assert.equal(getNextAfterReview(ids, "c"), "b");
  assert.equal(getNextAfterReview(["a"], "a"), null);
  assert.equal(getNextAfterReview(ids, "x"), "a");
});
