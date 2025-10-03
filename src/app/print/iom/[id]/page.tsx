export const dynamic = 'force-dynamic';

import { getPublicIOMById } from "@/lib/iom";
import IOMPrintView from "@/components/IOMPrintView";
import { notFound } from "next/navigation";

interface PublicIOMPageProps {
  params: {
    id: string;
  };
  searchParams: {
    token?: string;
  };
}

export default async function PublicIOMPage({
  params,
  searchParams,
}: PublicIOMPageProps) {
  const iom = await getPublicIOMById(params.id);

  // Basic security check: if the IOM requires a token, it must match.
  if (!iom || (iom.pdfToken && iom.pdfToken !== searchParams.token)) {
    notFound();
  }

  return <IOMPrintView iom={iom} />;
}