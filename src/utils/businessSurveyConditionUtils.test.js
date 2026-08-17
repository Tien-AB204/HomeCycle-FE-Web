import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveBusinessSurveyFunctionalityStatuses,
  getBusinessSurveyDamagePostValue,
  normalizeBusinessSurveyDamageLevels,
} from "./businessSurveyConditionUtils.js";

test("keeps only the four damage levels supported by post forms", () => {
  assert.deepEqual(
    normalizeBusinessSurveyDamageLevels([0, 1, 2, 4]),
    [0, 1, 2, 4],
  );
});

test("migrates legacy moderate and total-loss survey values to severe damage", () => {
  assert.deepEqual(
    normalizeBusinessSurveyDamageLevels([
      3,
      5,
      "Moderate_Damage",
      "Total_Loss",
    ]),
    [4],
  );
  assert.equal(getBusinessSurveyDamagePostValue(3), "Severe_Damage");
});

test("derives functionality statuses from selected damage levels", () => {
  assert.deepEqual(
    deriveBusinessSurveyFunctionalityStatuses([0, 1]),
    [0],
  );
  assert.deepEqual(
    deriveBusinessSurveyFunctionalityStatuses([2, 4]),
    [1, 2],
  );
  assert.deepEqual(
    deriveBusinessSurveyFunctionalityStatuses([0, 2, 4]),
    [0, 1, 2],
  );
});
