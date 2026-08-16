import assert from "node:assert/strict";
import test from "node:test";
import {
  getBusinessSurveySnapshot,
  isFreshBusinessSurveySnapshot,
  saveBusinessSurveySnapshot,
} from "./businessSurveySession.js";

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  removeItem(key) {
    this.values.delete(key);
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

test("keeps a fresh survey snapshot scoped to the current business user", () => {
  const originalWindow = globalThis.window;
  globalThis.window = {
    sessionStorage: new MemoryStorage(),
  };

  try {
    const survey = {
      targetCities: ["Thành phố Hồ Chí Minh"],
      productTypeIds: ["bed-type-id"],
    };

    saveBusinessSurveySnapshot("business-a", survey);

    const snapshot = getBusinessSurveySnapshot("business-a");

    assert.deepEqual(snapshot.survey, survey);
    assert.equal(getBusinessSurveySnapshot("business-b"), null);
    assert.equal(
      isFreshBusinessSurveySnapshot(snapshot, snapshot.savedAt + 30_000),
      true,
    );
    assert.equal(
      isFreshBusinessSurveySnapshot(snapshot, snapshot.savedAt + 61_000),
      false,
    );
  } finally {
    globalThis.window = originalWindow;
  }
});
