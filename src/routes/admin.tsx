import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const CarWashApp = lazy(() => import("@/carwash/CarWashApp"));

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Panel Super Admin — CarWash Pro" },
      {
        name: "description",
        content: "Panel de administración de negocios, planes y suscripciones de CarWash Pro.",
      },
      { property: "og:title", content: "Panel Super Admin — CarWash Pro" },
      {
        property: "og:description",
        content: "Administra negocios, planes y suscripciones de CarWash Pro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminRoute,
});

function AdminRoute() {
  return (
    <ClientOnly fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
        <CarWashApp />
      </Suspense>
    </ClientOnly>
  );
}
