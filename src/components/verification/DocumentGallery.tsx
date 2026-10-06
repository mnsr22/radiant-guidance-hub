import { useEffect, useState } from 'react';
import { Download, ExternalLink, FileWarning, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { verificationApi } from '@/lib/api/verification-api';

type DocMeta = {
  kind?: string;
  documentId?: string;
  id?: string;
  mimeType?: string;
  originalName?: string;
  size?: number;
  url?: string;
};

const KIND_LABELS: Record<string, string> = {
  front: 'Front of document',
  back: 'Back of document',
  holdingProof: 'Holding the document (selfie)',
  selfie: 'Selfie',
};

const TYPE_LABELS: Record<string, string> = {
  nationalId: 'National ID',
  passport: 'Passport',
  drivingLicense: "Driving licence",
  driversLicense: "Driving licence",
};

/// Pulls the document list out of whatever shape the submission came in:
/// `{documents: {front: {...}, back: {...}}}` or `{documents: [...]}`.
export function extractDocuments(data: Record<string, unknown> | undefined): DocMeta[] {
  const raw = (data as any)?.documents;
  if (!raw) return [];
  const list: DocMeta[] = Array.isArray(raw)
    ? raw
    : Object.entries(raw).map(([kind, v]) => ({ kind, ...(v as object) }));
  const order = ['front', 'back', 'holdingProof', 'selfie'];
  return list
    .filter((d) => d && (d.documentId || d.id || d.url))
    .sort((a, b) => order.indexOf(a.kind ?? '') - order.indexOf(b.kind ?? ''));
}

export function documentTypeLabel(data: Record<string, unknown> | undefined) {
  const t = (data as any)?.documentType as string | undefined;
  return t ? TYPE_LABELS[t] ?? t : undefined;
}

function DocumentCard({ userId, doc }: { userId: string; doc: DocMeta }) {
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'ok'; url: string; type: string } | { status: 'error'; code: number }
  >({ status: 'loading' });

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    (async () => {
      if (doc.url) {
        setState({ status: 'ok', url: doc.url, type: doc.mimeType ?? 'image/jpeg' });
        return;
      }
      const id = doc.documentId ?? doc.id!;
      const res = await verificationApi.getDocumentImage(userId, id);
      if (cancelled) {
        if ('url' in res) URL.revokeObjectURL(res.url);
        return;
      }
      if ('url' in res) {
        objectUrl = res.url;
        setState({ status: 'ok', url: res.url, type: res.type || doc.mimeType || '' });
      } else {
        setState({ status: 'error', code: res.error });
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [userId, doc.documentId, doc.id, doc.url, doc.mimeType]);

  const label = KIND_LABELS[doc.kind ?? ''] ?? doc.kind ?? 'Document';
  const ext = (doc.mimeType?.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
  const fileName = `${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${userId}.${ext}`;
  const isImage = state.status === 'ok' && (state.type.startsWith('image/') || !state.type);

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">{label}</span>
        {doc.size ? <span className="text-xs text-muted-foreground">{Math.round(doc.size / 1024)} KB</span> : null}
      </div>
      <div className="flex aspect-[4/3] items-center justify-center bg-muted/40">
        {state.status === 'loading' && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
        {state.status === 'error' && (
          <div className="flex flex-col items-center gap-1 px-4 text-center text-xs text-muted-foreground">
            <FileWarning className="h-6 w-6" />
            {state.code === 404
              ? "Your server doesn't share this image yet."
              : state.code === 401 || state.code === 403
                ? 'Not allowed — sign in again.'
                : "Couldn't load the image."}
          </div>
        )}
        {state.status === 'ok' &&
          (isImage ? (
            <a href={state.url} target="_blank" rel="noreferrer" className="block h-full w-full">
              <img src={state.url} alt={label} className="h-full w-full object-contain" />
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">Preview not available — download to view</span>
          ))}
      </div>
      <div className="flex gap-2 p-2">
        <Button asChild size="sm" variant="outline" className="flex-1" disabled={state.status !== 'ok'}>
          <a
            href={state.status === 'ok' ? state.url : undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={state.status !== 'ok'}
          >
            <ExternalLink className="mr-1 h-4 w-4" /> Open
          </a>
        </Button>
        <Button asChild size="sm" className="flex-1" disabled={state.status !== 'ok'}>
          <a href={state.status === 'ok' ? state.url : undefined} download={fileName} aria-disabled={state.status !== 'ok'}>
            <Download className="mr-1 h-4 w-4" /> Download
          </a>
        </Button>
      </div>
    </div>
  );
}

export function DocumentGallery({ userId, docs }: { userId: string; docs: DocMeta[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {docs.map((d) => (
        <DocumentCard key={d.documentId ?? d.id ?? d.url ?? d.kind} userId={userId} doc={d} />
      ))}
    </div>
  );
}
