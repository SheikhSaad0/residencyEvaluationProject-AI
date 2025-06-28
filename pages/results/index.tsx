// pages/results/index.tsx
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function ResultsIndex() {
  const router = useRouter();

  useEffect(() => {
    router.push('/');
  }, [router]);

  return null;
}