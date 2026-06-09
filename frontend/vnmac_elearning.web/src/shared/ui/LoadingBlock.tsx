import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export function LoadingBlock({ label = "Đang tải dữ liệu..." }: { label?: string }) {
  return (
    <Card className="border-slate-200 shadow-none">
      <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
        <Spinner className="size-6" />
        <p className="text-sm font-medium text-slate-600">{label}</p>
      </CardContent>
    </Card>
  );
}
