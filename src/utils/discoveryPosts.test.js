import assert from "node:assert/strict";
import test from "node:test";
import { filterDiscoveryPosts } from "./discoveryPosts.js";

const posts = [
  { postId: "1", ownerId: "ABC-123" },
  { postId: "2", ownerId: "other" },
];

test("hides the current user's posts unless they opt in", () => {
  assert.deepEqual(
    filterDiscoveryPosts(posts, " abc-123 ", false).map((post) => post.postId),
    ["2"],
  );
  assert.equal(filterDiscoveryPosts(posts, "abc-123", true).length, 2);
});

test("keeps every post for guests and tolerates missing lists", () => {
  assert.equal(filterDiscoveryPosts(posts, "", false).length, 2);
  assert.deepEqual(filterDiscoveryPosts(undefined, "abc-123", false), []);
});
