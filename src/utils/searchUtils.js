import { MAIN_CATEGORIES } from "../constants/filterOptions";

export const getCategoryFilterOptions = (category) => {
  switch (category) {
    case MAIN_CATEGORIES.APPLIANCE:
      return {
        materialTypes: [],
        coreMaterials: [],
        brands: [],
      };
    case MAIN_CATEGORIES.ELECTRONIC:
      return {
        materialTypes: [],
        coreMaterials: [],
        brands: [],
      };
    case MAIN_CATEGORIES.HOUSEHOLD:
      return {
        materialTypes: [],
        coreMaterials: [],
        brands: [],
      };
    default:
      return {
        materialTypes: [],
        coreMaterials: [],
        brands: [],
      };
  }
};

export const filterPosts = (posts, filters) => {
  let result = [...posts];

  if (filters.mainCategory) {
    result = result.filter((post) => post.category === filters.mainCategory);
  }

  if (filters.displayMode === "SELL_ONLY") {
    result = result.filter((post) => post.postType === "SELL");
  } else if (filters.displayMode === "BUY_ONLY") {
    result = result.filter((post) => post.postType === "BUY");
  }

  const normalizedKeyword = filters.submittedQuery?.trim().toLowerCase();
  if (normalizedKeyword) {
    result = result.filter((post) => {
      const haystack = [
        post.name,
        post.desc,
        post.owner,
        post.type,
        post.businessName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedKeyword);
    });
  }

  if (filters.selectedLogistics?.length > 0) {
    result = result.filter((post) =>
      filters.selectedLogistics.includes(post.logistics),
    );
  }

  if (filters.selectedConditions?.length > 0) {
    result = result.filter((post) =>
      filters.selectedConditions.includes(post.condition),
    );
  }

  if (filters.selectedProductTypeIds?.length > 0) {
    result = result.filter((post) =>
      filters.selectedProductTypeIds.includes(post.productTypeId),
    );
  }

  switch (filters.mainCategory) {
    case MAIN_CATEGORIES.APPLIANCE:
      if (filters.selectedSpaces?.length > 0) {
        result = result.filter((post) =>
          filters.selectedSpaces.includes(post.space),
        );
      }
      if (filters.selectedMaterials?.length > 0) {
        result = result.filter((post) =>
          filters.selectedMaterials.includes(post.material),
        );
      }
      break;
    case MAIN_CATEGORIES.ELECTRONIC:
      if (filters.selectedSubCats?.length > 0) {
        result = result.filter((post) =>
          filters.selectedSubCats.includes(post.subCat),
        );
      }
      if (filters.selectedTechIssues?.length > 0) {
        result = result.filter((post) =>
          filters.selectedTechIssues.includes(post.techIssue),
        );
      }
      break;
    case MAIN_CATEGORIES.HOUSEHOLD:
      if (filters.selectedMaterialTypes?.length > 0) {
        result = result.filter((post) =>
          filters.selectedMaterialTypes.includes(post.materialType),
        );
      }
      if (filters.selectedCoreMaterials?.length > 0) {
        result = result.filter((post) =>
          filters.selectedCoreMaterials.includes(post.coreMaterial),
        );
      }
      if (filters.selectedBrands?.length > 0) {
        result = result.filter((post) =>
          filters.selectedBrands.includes(post.brand),
        );
      }
      break;
    default:
      break;
  }

  return result;
};
