import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCourseById } from "../api/learner";
import type { CourseTreeResponse } from "../types/api";

export function useLearnerCourse(userId: string, courseId: string) {
  const queryClient = useQueryClient();
  const published = queryClient.getQueryState<CourseTreeResponse[]>(["courses", "published", userId]);

  return useQuery({
    queryKey: ["courses", "detail", userId, courseId],
    queryFn: () => getCourseById(courseId),
    enabled: Boolean(userId && courseId),
    initialData: () => published?.data?.find((course) => course.id === courseId),
    initialDataUpdatedAt: published?.dataUpdatedAt,
  });
}
