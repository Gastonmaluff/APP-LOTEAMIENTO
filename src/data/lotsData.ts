// Deprecated compatibility shim.
// The app now uses structuredLotsData.ts as the source of truth.
export {
  commonAreas,
  matchedIds,
  roads,
  structuredLotsData as lotsData,
  structuredLotsDataById as lotsDataById,
  unmatchedLots,
  vendibleLots
} from "./structuredLotsData";
