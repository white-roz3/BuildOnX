'use client';

import { useParams } from 'next/navigation';
import { API_URL } from '@/lib/api';

export default function EmbedPage() {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <iframe
      src={`${API_URL}/api/projects/${slug}/preview`}
      className="w-full h-screen border-0"
      title="Embedded project"
    />
  );
}

