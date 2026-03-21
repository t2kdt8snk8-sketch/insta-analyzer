"use client"
import { useAnalysisStore, HistoryItem } from "@/store/useAnalysisStore";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { History, Trash2, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useState } from "react";

function formatDate(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ko });
  } catch {
    return iso;
  }
}

function HistoryRow({
  item,
  onLoad,
  onDelete,
}: {
  item: HistoryItem;
  onLoad: () => void;
  onDelete: () => void;
}) {
  const profile = item.data?.profile;
  const report = item.data?.report;
  const va = item.data?.visual_analysis;

  return (
    <div className="flex items-start gap-3 py-3 px-1 group hover:bg-muted/40 rounded-lg transition-colors">
      {/* 프로필 이미지 */}
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold overflow-hidden">
        {profile?.profile_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.profile_image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span>{item.username.slice(0, 1).toUpperCase()}</span>
        )}
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate">@{item.username}</span>
          {va?.visual_identity?.score != null && (
            <Badge variant="outline" className="text-[10px] py-0 h-4 shrink-0">
              일관성 {va.visual_identity.score}/10
            </Badge>
          )}
        </div>

        {/* 수치 */}
        <div className="flex gap-3 text-[11px] text-muted-foreground">
          {profile?.followers_count != null && (
            <span>팔로워 {Number(profile.followers_count).toLocaleString()}</span>
          )}
          {profile?.posts_count != null && (
            <span>게시물 {profile.posts_count}</span>
          )}
        </div>

        {/* AI 요약 */}
        {report?.summary && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {report.summary}
          </p>
        )}

        <p className="text-[10px] text-muted-foreground/60">{formatDate(item.analyzed_at)}</p>
      </div>

      {/* 액션 버튼 */}
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button size="sm" variant="default" className="h-7 text-xs px-2" onClick={onLoad}>
          <ExternalLink className="w-3 h-3 mr-1" />
          보기
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-muted-foreground hover:text-destructive" onClick={onDelete}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

export default function HistoryPanel() {
  const { history, loadFromHistory, removeFromHistory, clearHistory } = useAnalysisStore();
  const [open, setOpen] = useState(false);

  function handleLoad(item: HistoryItem) {
    loadFromHistory(item);
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="sm" className="h-8 px-3 text-xs gap-1.5" />}>
        <History className="w-3.5 h-3.5" />
        분석 기록
        {history.length > 0 && (
          <Badge variant="secondary" className="text-[10px] py-0 h-4 px-1.5 ml-0.5">
            {history.length}
          </Badge>
        )}
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:w-[420px] p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">분석 기록</SheetTitle>
            {history.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-destructive px-2"
                onClick={() => {
                  if (confirm("모든 기록을 삭제할까요?")) clearHistory();
                }}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                전체 삭제
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {history.length > 0
              ? `최근 ${history.length}개 분석 저장됨 · 새로고침해도 유지됩니다`
              : "아직 분석 기록이 없습니다"}
          </p>
        </SheetHeader>

        {history.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-3 text-muted-foreground">
            <History className="w-10 h-10 opacity-20" />
            <p className="text-sm">계정을 분석하면 여기에 자동으로 저장됩니다.</p>
          </div>
        ) : (
          <>
            {/* 요약 테이블 헤더 */}
            <div className="px-5 pt-3">
              <div className="grid text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-1"
                style={{ gridTemplateColumns: "1fr auto" }}>
                <span>계정</span>
                <span>액션</span>
              </div>
              <Separator className="mt-2" />
            </div>

            <ScrollArea className="flex-1 px-3">
              <div className="py-2 space-y-0.5">
                {history.map((item) => (
                  <HistoryRow
                    key={item.id}
                    item={item}
                    onLoad={() => handleLoad(item)}
                    onDelete={() => removeFromHistory(item.id)}
                  />
                ))}
              </div>
            </ScrollArea>

            {/* 하단 비교 힌트 */}
            <div className="px-5 py-3 border-t bg-muted/30">
              <p className="text-[11px] text-muted-foreground text-center">
                항목을 클릭하면 해당 분석 결과를 불러옵니다
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
