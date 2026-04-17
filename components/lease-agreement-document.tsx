import { FileText } from 'lucide-react';
import { renderLeaseAgreement, type LeaseTemplateData } from '@/lib/lease-template';

export function LeaseAgreementDocument({ data }: { data: LeaseTemplateData }) {
  const sections = renderLeaseAgreement(data);
  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b bg-muted/30 px-5 py-3">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Lease Agreement</span>
        <span className="ml-auto text-xs text-muted-foreground">Scroll to read</span>
      </div>
      <div className="max-h-[520px] overflow-y-auto px-6 py-6 font-serif leading-relaxed text-slate-800">
        <div className="text-center">
          <h2 className="text-xl font-bold uppercase tracking-wide">Residential Lease Agreement</h2>
          <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
            Republic of South Africa
          </p>
        </div>
        <div className="mt-6 space-y-5 text-sm">
          {sections.map((section) => (
            <section key={section.number}>
              <h3 className="font-semibold text-slate-900">
                {section.number}. {section.title}
              </h3>
              <div className="mt-1.5 space-y-2">
                {section.paragraphs.map((p, i) => (
                  <p key={i} className="text-justify">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-8 border-t pt-4 text-center text-xs italic text-muted-foreground">
          This agreement is governed by the laws of the Republic of South Africa.
        </p>
      </div>
    </div>
  );
}
