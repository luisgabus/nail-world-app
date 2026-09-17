import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const CarWashApp = lazy(() => import("@/carwash/CarWashApp"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nail World — Gestión de Salones" },
      {
        name: "description",
        content:
          "Gestión inteligente de Salones: operatividad rápida, liquidaciones, tickets e inteligencia de negocio.",
      },
      { property: "og:title", content: "Nail World — Gestión de Salones" },
      {
        property: "og:description",
        content:
          "Operación diaria, liquidación de Especialistas, cierres de caja y tickets para tu Salón.",
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
