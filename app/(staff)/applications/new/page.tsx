import { ApplicationForm } from '@/components/forms/application-form';
import { PageHeader } from '@/components/page-header';

export default function NewApplicationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Applications"
        title="Capture new application"
        description="Record a prospect on behalf of the applicant, capture TPN screening consent, and hand the new application off to the review flow."
      />
      <ApplicationForm />
    </div>
  );
}
