using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public static class LearningFlowValidation
{
    public static List<LearningFlowStep> Validate(List<LearningFlowStep>? flow)
    {
        flow ??= [];
        Require(flow.Count == 0 || flow.Any(step => !step.IsHidden && step.Items.Any(item => !item.IsHidden)), "Bài học cần ít nhất một màn hình được hiển thị.");
        var ids = new HashSet<string>(StringComparer.Ordinal);
        foreach (var step in flow)
        {
            Require(!string.IsNullOrWhiteSpace(step.Id) && ids.Add(step.Id), "Mã màn hình trống hoặc trùng.");
            Require(step.Policy is "practice" or "quiz" or "answered" or "exam", "Chính sách đánh giá không hợp lệ.");
            Require(step.Items.Count > 0, "Màn hình phải có nội dung.");
            if (step.DrawRules is not null)
            {
                Require(step.Policy is "quiz" or "exam" && step.DrawRules.Count > 0, "Quy tắc rút đề chỉ dành cho kiểm tra.");
                Require(step.DrawRules.Select(r => r.Kind).Distinct().Count() == step.DrawRules.Count, "Loại câu rút đề không được trùng.");
                foreach (var rule in step.DrawRules)
                    Require(rule.Count > 0 && rule.Count <= step.Items.Count(i => !i.IsHidden && i.Kind == rule.Kind), "Không đủ câu để rút đề.");
            }
            if (step.Policy == "exam")
                Require(step.TimeLimitSeconds == 1200 && step.PassCount == 12 && step.Items.Count == 30 && step.Items.All(i => i.Kind == "choice" && !i.Multiple) && step.Items.GroupBy(i => i.GroupId).Count() == 6 && step.Items.GroupBy(i => i.GroupId).All(g => !string.IsNullOrEmpty(g.Key) && g.Count() == 5), "Bài cuối khóa cần 6 nhóm × 5 câu, 20 phút và ngưỡng 12/15.");
            foreach (var item in step.Items)
            {
                Require(!string.IsNullOrWhiteSpace(item.Id) && ids.Add(item.Id), "Mã nội dung trống hoặc trùng.");
                Require(item.Kind is "text" or "gallery" or "video" or "choice" or "classify" or "sort" or "hotspot" or "match" or "group", "Loại tương tác không hợp lệ.");
                Require(double.IsFinite(item.DurationSeconds) && item.DurationSeconds >= 0 && item.DurationSeconds <= 3600, "Thời lượng không hợp lệ.");
                var codes = item.Options.Select(x => x.Code).ToHashSet(StringComparer.Ordinal);
                Require(codes.Count == item.Options.Count && codes.All(x => !string.IsNullOrWhiteSpace(x)), "Mã lựa chọn trống hoặc trùng.");
                if (item.Kind is "match" or "group")
                {
                    var left = item.LeftItems ?? [];
                    Require(left.Count > 0 && left.Select(l => l.Code).Distinct().Count() == left.Count && left.All(l => !string.IsNullOrWhiteSpace(l.Code) && !l.Code.Contains(':')) && codes.All(c => !c.Contains(':')), "Các mục cần ghép không hợp lệ.");
                    Require(item.Options.Count >= 2 && item.CorrectCodes.Count == left.Count && left.All(l => item.CorrectCodes.Count(c => item.Options.Any(o => c == l.Code + ":" + o.Code)) == 1), "Cần đáp án cho từng mục ghép.");
                    if (item.Kind == "match") Require(item.CorrectCodes.Select(c => c.Split(':').Last()).Distinct().Count() == left.Count, "Mỗi mục nối cần một đích riêng.");
                }
                else Require(item.CorrectCodes.All(codes.Contains), "Đáp án không thuộc các lựa chọn.");
                if (item.Kind is "choice" or "classify" or "sort" or "hotspot")
                {
                    Require(item.Options.Count >= 2, "Tương tác cần ít nhất hai lựa chọn.");
                    Require(item.CorrectCodes.Count > 0 || !string.IsNullOrWhiteSpace(item.ReviewNote), "Thiếu đáp án hoặc ghi chú chờ duyệt.");
                    Require(item.Multiple || item.Kind == "sort" || item.CorrectCodes.Count <= 1, "Câu nhiều đáp án phải bật chọn nhiều.");
                    if (item.Kind == "sort") Require(item.CorrectCodes.Distinct().Count() == item.Options.Count, "Thứ tự phải chứa đủ các bước, không trùng.");
                }
                if (item.Kind == "hotspot")
                {
                    Require(item.Options.All(x => double.IsFinite(x.X) && double.IsFinite(x.Y) && x.X >= 0 && x.X <= 100 && x.Y >= 0 && x.Y <= 100 && x.Width > 0 && x.Width <= 100 && x.Height > 0 && x.Height <= 100), "Vùng nhấn phải nằm trên ảnh theo tọa độ phần trăm.");
                    Require(item.Options.All(x => x.Polygon.Count == 0 || x.Polygon.Count >= 3 && x.Polygon.All(p => double.IsFinite(p.X) && double.IsFinite(p.Y) && p.X >= 0 && p.X <= 100 && p.Y >= 0 && p.Y <= 100)), "Đường nhấn đa giác cần ít nhất ba điểm hợp lệ.");
                }
                foreach (var url in new[] { item.ImageUrl, item.VideoUrl, item.AudioUrl, item.CaptionUrl, item.FeedbackAudioUrl }.Concat(item.Options.SelectMany(x => new[] { x.ImageUrl, x.AudioUrl })))
                    Require(string.IsNullOrWhiteSpace(url) || (url.StartsWith('/') && !url.StartsWith("//")) || (Uri.TryCreate(url, UriKind.Absolute, out var uri) && uri.Scheme is "https" or "http"), "Đường dẫn tài sản không hợp lệ.");
            }
        }
        return flow;
    }

    private static void Require(bool condition, string message)
    {
        if (!condition) throw new ServiceException(new ServiceError("flow.invalid_content", message, 400));
    }
}
