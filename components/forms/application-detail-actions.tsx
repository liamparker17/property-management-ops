'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Stage =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'VETTING'
  | 'APPROVED'
  | 'DECLINED'
  | 'CONVERTED'
  | 'WITHDRAWN';

type Decision = 'PENDING' | 'APPROVED' | 'DECLINED';

type TpnStatus = 'NOT_STARTED' | 'REQUESTED' | 'RECEIVED' | 'FAILED' | 'WAIVED';
type TpnRecommendation = 'PASS' | 'CAUTION' | 'DECLINE' | 'UNKNOWN' | null;

export type ApplicationActionSnapshot = {
  id: string;
  stage: Stage;
  decision: Decision;
  decisionReason: string | null;
  decidedAt: string | null;
  assignedReviewerId: string | null;
  reviewerName: string | null;
  convertedTenantId: string | null;
  requestedMoveIn: string | null;
  applicant: {
    firstName: string;
    lastName: string;
    tpnConsentGiven: boolean;
    tpnConsentAt: string | null;
  };
  tpnCheck: {
    status: TpnStatus;
    recommendation: TpnRecommendation;
    summary: string | null;
    requestedAt: string | null;
    receivedAt: string | null;
    reportBlobKey: string | null;
    reportPayload: unknown;
    waivedReason: string | null;
    waivedById: string | null;
  } | null;
};

type Props = {
  mode: 'overview' | 'tpn';
  application: ApplicationActionSnapshot;
  currentUser: { id: string; name: string | null; email: string | null };
};

export function ApplicationDetailActions({ mode, application }: Props) {
  if (mode === 'overview') {
    return <DecisionActions application={application} />;
  }
  return <TpnActions application={application} />;
}

function approveDisabledReason(application: ApplicationActionSnapshot): string | null {
  if (['APPROVED', 'DECLINED', 'CONVERTED', 'WITHDRAWN'].includes(application.stage)) {
    return `Application is ${application.stage.toLowerCase()}.`;
  }
  const tpn = application.tpnCheck;
  if (!tpn) return 'TPN check required before approval.';
  if (tpn.status === 'WAIVED') return null;
  if (tpn.status === 'NOT_STARTED' || tpn.status === 'REQUESTED' || tpn.status === 'FAILED') {
    return 'TPN report must be received first.';
  }
  if (tpn.recommendation === 'DECLINE') {
    return 'TPN recommendation is DECLINE.';
  }
  return null;
}

function DecisionActions({ application }: { application: ApplicationActionSnapshot }) {
  const approveBlock = approveDisabledReason(application);
  const declineDisabled = ['DECLINED', 'CONVERTED', 'WITHDRAWN'].includes(application.stage);
  const withdrawDisabled = ['CONVERTED', 'WITHDRAWN'].includes(application.stage);

  const requireOverride =
    application.tpnCheck?.status === 'RECEIVED' && application.tpnCheck.recommendation === 'CAUTION';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Decisions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ApproveAction
          applicationId={application.id}
          disabledReason={approveBlock}
          requireOverride={requireOverride}
        />
        <DeclineAction applicationId={application.id} disabled={declineDisabled} />
        <WithdrawAction applicationId={application.id} disabled={withdrawDisabled} />
      </CardContent>
    </Card>
  );
}

type SubmitState = {
  pending: boolean;
  error: string | null;
};

const initialSubmitState: SubmitState = { pending: false, error: null };

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; error: string | null }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = json?.error?.message ?? 'Request failed';
      return { ok: false, error: message };
    }
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: (err as Error).message ?? 'Network error' };
  }
}

function ApproveAction({
  applicationId,
  disabledReason,
  requireOverride,
}: {
  applicationId: string;
  disabledReason: string | null;
  requireOverride: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<SubmitState>(initialSubmitState);
  const [overrideReason, setOverrideReason] = useState('');
  const [note, setNote] = useState('');

  const overrideTooShort = requireOverride && overrideReason.trim().length < 10;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (overrideTooShort) {
      setState({ pending: false, error: 'Override reason must be at least 10 characters.' });
      return;
    }
    setState({ pending: true, error: null });
    const payload: Record<string, unknown> = { decision: 'APPROVED' };
    if (overrideReason.trim()) payload.overrideReason = overrideReason.trim();
    if (note.trim()) payload.note = note.trim();
    const result = await postJson(`/api/applications/${applicationId}/approve`, payload);
    if (!result.ok) {
      setState({ pending: false, error: result.error });
      return;
    }
    setState(initialSubmitState);
    setOverrideReason('');
    setNote('');
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-1.5">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button className="w-full" disabled={Boolean(disabledReason)}>
              Approve
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve application</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            {requireOverride ? (
              <div className="space-y-1.5">
                <Label htmlFor="overrideReason">Override reason (required)</Label>
                <Textarea
                  id="overrideReason"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="TPN flagged caution — record why approval is still safe (min 10 chars)."
                  rows={4}
                  required
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="approve-note">Internal note (optional)</Label>
              <Textarea
                id="approve-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
            {state.error ? (
              <p className="text-sm text-destructive">{state.error}</p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={state.pending || overrideTooShort}>
                {state.pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Confirm approval
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {disabledReason ? (
        <p className="text-xs text-muted-foreground">{disabledReason}</p>
      ) : null}
    </div>
  );
}

function DeclineAction({
  applicationId,
  disabled,
}: {
  applicationId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<SubmitState>(initialSubmitState);
  const [reason, setReason] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 1 || trimmed.length > 1000) {
      setState({ pending: false, error: 'Reason is required (1-1000 chars).' });
      return;
    }
    setState({ pending: true, error: null });
    const result = await postJson(`/api/applications/${applicationId}/decline`, {
      decision: 'DECLINED',
      reason: trimmed,
    });
    if (!result.ok) {
      setState({ pending: false, error: result.error });
      return;
    }
    setState(initialSubmitState);
    setReason('');
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="w-full" disabled={disabled}>
            Decline
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decline application</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="decline-reason">Reason (required)</Label>
            <Textarea
              id="decline-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
            />
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={state.pending}>
              {state.pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Confirm decline
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WithdrawAction({
  applicationId,
  disabled,
}: {
  applicationId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<SubmitState>(initialSubmitState);
  const [reason, setReason] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 1) {
      setState({ pending: false, error: 'Reason is required.' });
      return;
    }
    setState({ pending: true, error: null });
    const result = await postJson(`/api/applications/${applicationId}/withdraw`, {
      reason: trimmed,
    });
    if (!result.ok) {
      setState({ pending: false, error: result.error });
      return;
    }
    setState(initialSubmitState);
    setReason('');
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" className="w-full" disabled={disabled}>
            Withdraw
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdraw application</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="withdraw-reason">Reason</Label>
            <Textarea
              id="withdraw-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
            />
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={state.pending}>
              {state.pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Confirm withdraw
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TpnActions({ application }: { application: ApplicationActionSnapshot }) {
  const consentNeeded = application.applicant.tpnConsentGiven === false;
  const tpnStatus = application.tpnCheck?.status ?? 'NOT_STARTED';
  const requestDisabled = consentNeeded || tpnStatus === 'REQUESTED';
  const showRetry = tpnStatus === 'FAILED';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">TPN actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {consentNeeded ? <CaptureConsentForm applicationId={application.id} /> : null}
        <RequestTpnButton
          applicationId={application.id}
          disabled={requestDisabled}
          label={showRetry ? 'Retry TPN check' : 'Request TPN check'}
        />
        <WaiveTpnAction applicationId={application.id} />
      </CardContent>
    </Card>
  );
}

function CaptureConsentForm({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [signedName, setSignedName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [state, setState] = useState<SubmitState>(initialSubmitState);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!agreed) {
      setState({ pending: false, error: 'Tick the consent confirmation to continue.' });
      return;
    }
    if (!signedName.trim()) {
      setState({ pending: false, error: 'Signed name is required.' });
      return;
    }
    setState({ pending: true, error: null });
    const result = await postJson(`/api/applications/${applicationId}/consent`, {
      consentGiven: true,
      signedName: signedName.trim(),
      capturedAt: new Date().toISOString(),
    });
    if (!result.ok) {
      setState({ pending: false, error: result.error });
      return;
    }
    setState(initialSubmitState);
    setSignedName('');
    setAgreed(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <div className="text-sm font-medium text-foreground">Capture consent</div>
      <div className="space-y-1.5">
        <Label htmlFor="signedName">Signed name</Label>
        <Input
          id="signedName"
          value={signedName}
          onChange={(e) => setSignedName(e.target.value)}
          required
        />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5"
          required
        />
        <span>Applicant consents to a TPN credit check.</span>
      </label>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" size="sm" disabled={state.pending}>
        {state.pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
        Save consent
      </Button>
    </form>
  );
}

function RequestTpnButton({
  applicationId,
  disabled,
  label,
}: {
  applicationId: string;
  disabled: boolean;
  label: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<SubmitState>(initialSubmitState);

  async function onClick() {
    setState({ pending: true, error: null });
    const result = await postJson(`/api/applications/${applicationId}/tpn/request`, {});
    if (!result.ok) {
      setState({ pending: false, error: result.error });
      return;
    }
    setState(initialSubmitState);
    router.refresh();
  }

  return (
    <div className="space-y-1.5">
      <Button
        type="button"
        className="w-full"
        onClick={onClick}
        disabled={disabled || state.pending}
      >
        {state.pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
        {label}
      </Button>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
    </div>
  );
}

function WaiveTpnAction({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [state, setState] = useState<SubmitState>(initialSubmitState);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (reason.trim().length < 10) {
      setState({ pending: false, error: 'Reason must be at least 10 characters.' });
      return;
    }
    setState({ pending: true, error: null });
    const result = await postJson(`/api/applications/${applicationId}/tpn/waive`, {
      reason: reason.trim(),
    });
    if (!result.ok) {
      setState({ pending: false, error: result.error });
      return;
    }
    setState(initialSubmitState);
    setReason('');
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" className="w-full">
            Waive TPN check
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Waive TPN check</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="waive-reason">Reason (min 10 chars)</Label>
            <Textarea
              id="waive-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
            />
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={state.pending}>
              {state.pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Waive check
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ApplicationDocumentsPanel({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [state, setState] = useState<SubmitState>(initialSubmitState);
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setState({ pending: false, error: 'Choose a file.' });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setState({ pending: false, error: 'Maximum file size is 20MB.' });
      return;
    }
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setState({ pending: false, error: 'Only PDF, PNG, JPEG, or WEBP files are allowed.' });
      return;
    }
    setState({ pending: true, error: null });
    const data = new FormData();
    data.append('file', file);
    if (description.trim()) data.append('description', description.trim());
    try {
      const res = await fetch(`/api/applications/${applicationId}/documents`, {
        method: 'POST',
        body: data,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({ pending: false, error: json?.error?.message ?? 'Upload failed' });
        return;
      }
      setState(initialSubmitState);
      setDescription('');
      setFile(null);
      router.refresh();
    } catch (err) {
      setState({ pending: false, error: (err as Error).message ?? 'Upload failed' });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload document</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="application-doc">File (PDF, PNG, JPEG, WEBP — max 20MB)</Label>
            <Input
              id="application-doc"
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="application-doc-description">Description (optional)</Label>
            <Input
              id="application-doc-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <Button type="submit" disabled={state.pending}>
            {state.pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Upload
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ApplicationNotesPanel({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [state, setState] = useState<SubmitState>(initialSubmitState);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = body.trim();
    if (trimmed.length < 1 || trimmed.length > 4000) {
      setState({ pending: false, error: 'Note must be 1-4000 characters.' });
      return;
    }
    setState({ pending: true, error: null });
    const result = await postJson(`/api/applications/${applicationId}/notes`, { body: trimmed });
    if (!result.ok) {
      setState({ pending: false, error: result.error });
      return;
    }
    setState(initialSubmitState);
    setBody('');
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add note</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="application-note">Note</Label>
            <Textarea
              id="application-note"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              required
            />
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <Button type="submit" disabled={state.pending}>
            {state.pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Save note
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
