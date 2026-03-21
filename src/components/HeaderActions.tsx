"use client"
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";
import { useAnalysisStore } from "@/store/useAnalysisStore";

export default function HeaderActions() {
  const { history } = useAnalysisStore();

  return (
    <div className="absolute right-0 top-0">
      <Link
        href="/history"
        className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors"
      >
        <History className="w-3.5 h-3.5" />
        분석 기록
        {history.length > 0 && (
          <Badge variant="secondary" className="text-[10px] py-0 h-4 px-1.5 ml-0.5">
            {history.length}
          </Badge>
        )}
      </Link>
    </div>
  );
}
