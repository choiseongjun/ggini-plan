import reviews from '../data/reviewed-recipe-images.json';

// Explicit visual reviews, not an automatic food-image classifier. Keep the
// original candidates in the manifest so saved plans can also be corrected.
export function reviewedRecipeImages(foodCode?: string, previousPrimary?: string | null): string[] | undefined {
  const review = reviews.find((entry) => (entry.foodCode === foodCode && (previousPrimary === undefined || previousPrimary === entry.previousPrimary))
    || (!foodCode && !!previousPrimary && previousPrimary === entry.previousPrimary));
  return review?.approved;
}
