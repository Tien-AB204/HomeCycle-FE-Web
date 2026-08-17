import {
  FUNCTIONALITY_BY_DAMAGE_LEVEL,
  LEGACY_DAMAGE_LEVEL_ALIASES,
} from "../constants/postFormOptions.js";

export const BUSINESS_SURVEY_DAMAGE_LEVELS = Object.freeze([
  { value: 0, postValue: "None", label: "Không hư hỏng" },
  {
    value: 1,
    postValue: "Cosmetic_Damage",
    label: "Trầy xước ngoại quan",
  },
  { value: 2, postValue: "Minor_Damage", label: "Hư hỏng nhẹ" },
  { value: 4, postValue: "Severe_Damage", label: "Hư hỏng nặng" },
]);

export const BUSINESS_SURVEY_FUNCTIONALITY_STATUSES = Object.freeze([
  { value: 0, postValue: "FullyFunctional", label: "Hoạt động đầy đủ" },
  {
    value: 1,
    postValue: "PartiallyFunctional",
    label: "Hoạt động một phần",
  },
  { value: 2, postValue: "NonFunctional", label: "Không hoạt động" },
]);

const LEGACY_DAMAGE_NUMBER_ALIASES = Object.freeze({
  3: 4,
  5: 4,
});

const normalizeKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const damageValueByPostValue = new Map(
  BUSINESS_SURVEY_DAMAGE_LEVELS.map((option) => [
    normalizeKey(option.postValue),
    option.value,
  ]),
);

const damageOptionByValue = new Map(
  BUSINESS_SURVEY_DAMAGE_LEVELS.map((option) => [option.value, option]),
);

Object.entries(LEGACY_DAMAGE_LEVEL_ALIASES).forEach(
  ([legacyValue, currentValue]) => {
    damageValueByPostValue.set(
      normalizeKey(legacyValue),
      damageValueByPostValue.get(normalizeKey(currentValue)),
    );
  },
);

const getRawValue = (item) =>
  typeof item === "object" && item !== null
    ? item.value ?? item.id ?? item.name
    : item;

const normalizeDamageValue = (item) => {
  const rawValue = getRawValue(item);

  if (
    rawValue === null ||
    rawValue === undefined ||
    String(rawValue).trim() === ""
  ) {
    return undefined;
  }

  const numericValue = Number(rawValue);

  if (Number.isInteger(numericValue)) {
    return LEGACY_DAMAGE_NUMBER_ALIASES[numericValue] ?? numericValue;
  }

  return damageValueByPostValue.get(normalizeKey(rawValue));
};

export const getBusinessSurveyDamagePostValue = (item) =>
  damageOptionByValue.get(normalizeDamageValue(item))?.postValue || "";

export const normalizeBusinessSurveyDamageLevels = (values) => {
  const selectedValues = new Set(
    (Array.isArray(values) ? values : [])
      .map(normalizeDamageValue)
      .filter((value) => value !== undefined),
  );

  return BUSINESS_SURVEY_DAMAGE_LEVELS
    .map((option) => option.value)
    .filter((value) => selectedValues.has(value));
};

export const deriveBusinessSurveyFunctionalityStatuses = (damageLevels) => {
  const selectedPostValues = new Set(
    normalizeBusinessSurveyDamageLevels(damageLevels)
      .map(
        (damageValue) =>
          BUSINESS_SURVEY_DAMAGE_LEVELS.find(
            (option) => option.value === damageValue,
          )?.postValue,
      )
      .map((damageValue) => FUNCTIONALITY_BY_DAMAGE_LEVEL[damageValue])
      .filter(Boolean),
  );

  return BUSINESS_SURVEY_FUNCTIONALITY_STATUSES
    .filter((option) => selectedPostValues.has(option.postValue))
    .map((option) => option.value);
};
