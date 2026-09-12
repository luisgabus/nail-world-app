import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const CarWashApp = lazy(() => import("@/carwash/CarWashApp"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CarWash Pro — Gestión de lavaderos" },
      {
        name: "description",
        content:
          "Gestión inteligente de lavaderos de vehículos: operatividad rápida, liquidaciones, tickets e inteligencia de negocio.",
      },
      { property: "og:title", content: "CarWash Pro — Gestión de lavaderos" },
      {
        property: "og:description",
        content:
          "Operación diaria, liquidación de operarios, cierres de caja y tickets para tu lavadero.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <ClientOnly fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
        <CarWashApp />
      </Suspense>
    </ClientOnly>
  );
}
