import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MonitorPlay, RefreshCcw } from "lucide-react";
import { useAuth } from "../../app/auth";
import { launchScormLesson } from "../../shared/api/learner";
import { resolveApiUrl } from "../../shared/api/client";
import { formatDateTime, formatSeconds, humanizeEnum } from "../../shared/lib/format";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import { LearnerMetaChip, LearnerPanel, LearnerScreenTitle } from "../../shared/ui/learner-ui";
import { MessageBanner } from "../../shared/ui/MessageBanner";
import type { ScormLaunchResponse } from "../../shared/types/api";

export function ScormPlayerPage() {
  const { session } = useAuth();
  const { courseId = "", lessonId = "" } = useParams();
  const userId = session?.user.id ?? "";
  const [launch, setLaunch] = useState<ScormLaunchResponse | null>(null);

  const launchMutation = useMutation({
    mutationFn: () => launchScormLesson(userId, lessonId),
    onSuccess: (response) => {
      setLaunch(response);
    },
  });

  useEffect(() => {
    if (userId && lessonId && !launch && !launchMutation.isPending) {
      launchMutation.mutate();
    }
  }, [launch, launchMutation, lessonId, userId]);

  if (launchMutation.isPending && !launch) {
    return <LoadingBlock label="Đang tạo phiên học SCORM..." />;
  }

  if (launchMutation.isError || !launch) {
    return <MessageBanner tone="error">Không thể mở phiên học SCORM.</MessageBanner>;
  }

  return (
    <div className="grid gap-6">
      <LearnerScreenTitle index={3} title="Màn học bài" />

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <LearnerPanel className="overflow-hidden p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-2">
              <h3 className="text-[1.45rem] font-semibold text-slate-950">{launch.packageTitle}</h3>
              <div className="flex flex-wrap gap-2">
                <LearnerMetaChip>{humanizeEnum(launch.version)}</LearnerMetaChip>
                <LearnerMetaChip>{launch.scoTitle}</LearnerMetaChip>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-2xl" variant="outline">
                <Link to={`/app/courses/${courseId}/lessons/${lessonId}`}>
                  <ArrowLeft className="mr-2 size-4" />
                  Về bài học
                </Link>
              </Button>
              <Button
                className="rounded-2xl bg-[#163b7b] text-white hover:bg-[#0f2e63] hover:text-white"
                type="button"
                onClick={() => {
                  setLaunch(null);
                  launchMutation.mutate();
                }}
              >
                <RefreshCcw className="mr-2 size-4" />
                Tạo phiên mới
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
            <iframe
              className="min-h-[760px] w-full border-0"
              src={resolveApiUrl(launch.playerUrl)}
              title={launch.packageTitle}
            />
          </div>
        </LearnerPanel>

        <div className="grid gap-4">
          <LearnerPanel className="p-5">
            <h3 className="text-[1.2rem] font-semibold text-slate-950">Thông tin phiên học</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              <LearnerMetaChip>
                <MonitorPlay className="size-3.5" />
                {launch.registration.attemptCount} lần mở
              </LearnerMetaChip>
              <LearnerMetaChip>{humanizeEnum(launch.registration.completionStatus)}</LearnerMetaChip>
              <LearnerMetaChip>{humanizeEnum(launch.registration.successStatus)}</LearnerMetaChip>
            </div>

            <div className="mt-4 grid gap-2 text-sm text-slate-600">
              <p>Tổng thời gian: {formatSeconds(launch.registration.totalTimeSeconds)}</p>
              <p>Lần mở gần nhất: {formatDateTime(launch.registration.lastLaunchedAt)}</p>
              <p>Lần lưu gần nhất: {formatDateTime(launch.registration.lastCommittedAt)}</p>
            </div>
          </LearnerPanel>
        </div>
      </div>
    </div>
  );
}
