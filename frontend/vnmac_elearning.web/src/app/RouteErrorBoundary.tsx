import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function RouteErrorBoundary() {
  const error = useRouteError();

  const title = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : "Unexpected Application Error";
  const description =
    error instanceof Error
      ? error.message
      : isRouteErrorResponse(error)
        ? error.data?.message ?? "Khong the tai duoc trang hien tai."
        : "Da co loi khong mong muon xay ra tren frontend.";

  return (
    <div className="page-shell">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <div className="mb-2 inline-flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
            <AlertTriangle className="size-6" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button type="button" onClick={() => window.location.reload()}>
            Tai lai trang
          </Button>
          <Button asChild type="button" variant="outline">
            <a href="/">Ve trang chu</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
