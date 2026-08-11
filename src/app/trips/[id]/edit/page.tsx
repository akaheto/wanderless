import { notFound } from "next/navigation";
import { getTrip } from "@/lib/db/trips";
import { updateTripAction, deleteTripAction, setArchivedAction } from "@/app/actions";
import { TripForm } from "@/components/TripForm";
import { Button, Card, CardHeader, PageHeader } from "@/components/ui";

export default async function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const trip = Number.isFinite(id) ? await getTrip(id) : null;
  if (!trip) notFound();

  return (
    <>
      <PageHeader
        title={`Edit ${trip.name}`}
        breadcrumb={{ href: `/trips/${trip.id}`, label: trip.name }}
      />
      <div className="max-w-[46rem] space-y-5">
        <TripForm
          action={updateTripAction}
          trip={trip}
          submitLabel="Save changes"
          cancelHref={`/trips/${trip.id}`}
        />

        <Card>
          <CardHeader
            title="Archive or delete"
            note="Archiving keeps the trip and its research; deleting removes it and everything attached."
          />
          <div className="flex flex-wrap gap-2 px-4 py-4">
            <form action={setArchivedAction}>
              <input type="hidden" name="tripId" value={trip.id} />
              <input type="hidden" name="archived" value={trip.archived ? "0" : "1"} />
              <Button type="submit">{trip.archived ? "Unarchive trip" : "Archive trip"}</Button>
            </form>
            <form action={deleteTripAction}>
              <input type="hidden" name="tripId" value={trip.id} />
              <Button type="submit" variant="danger">
                Delete trip permanently
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </>
  );
}
