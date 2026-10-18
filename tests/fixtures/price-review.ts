import { normalizePhotoTranscription } from "../../src/core/ai/vision-contract";
export const priceReview = normalizePhotoTranscription(
  {
    productName: "Coffee Dolce Latte",
    brand: "Golda",
    category: "MINUMAN_KEMASAN",
    servingText: "200 ml",
    servingsPerContainerText: "1 Sajian Per Kemasan",
    basis: "PER_SERVING",
    basisText: "Per sajian",
    nutritionText: {
      caloriesKcal: "180 kkal",
      sugarGrams: "19 g",
      proteinGrams: "2 g",
      sodiumMg: "80 mg",
      saturatedFatGrams: "5 g",
      fiberGrams: null,
    },
    ingredientsText: "",
    unreadableFields: [],
  },
  [{ width: 1020, height: 1282 }],
);
