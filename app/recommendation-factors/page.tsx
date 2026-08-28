import { RecommendationFactorsPage } from "@/components/RecommendationFactorsPage";

export const metadata = {
  title: "Why Am I Seeing This? — StellarSwipe",
  description:
    "The factors and weights the recommendation engine uses to personalise your signal feed.",
};

export default function RecommendationFactorsRoute() {
  return (
    <main className="p-4">
      <RecommendationFactorsPage />
    </main>
  );
}
