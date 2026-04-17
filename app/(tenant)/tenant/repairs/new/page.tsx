import { NewRepairForm } from '../new-form';

export const dynamic = 'force-dynamic';

export default function NewRepairPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New repair request</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe the issue. Your property manager will see this and update you.
        </p>
      </div>
      <NewRepairForm />
    </div>
  );
}
