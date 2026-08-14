import { createTripAction } from "@/app/actions";
import { TripForm } from "@/components/TripForm";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "New trip · Wanderless" };

export default function NewTripPage() {
  return (
    <>
      <PageHeader
        title="New trip"
        lede="Only the name is required. Dates and destinations can come later — a trip with nothing but a name is still a useful place to hang research."
        breadcrumb={{ href: "/trips", label: "Trips" }}
      />
      <div className="max-w-[46rem]">
        <TripForm action={createTripAction} submitLabel="Create trip" cancelHref="/trips" />
      </div>
    </>
  );
}
