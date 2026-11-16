using Microsoft.EntityFrameworkCore;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed partial class LearningService
{
    private static bool UsesManualCertificate(Course course) => course.Sections.SelectMany(s=>s.Lessons).Any(l=>l.Content?.Flow.Any(s=>s.Policy=="exam")==true);
    private bool HasCurrentCertificate(string userId,Course course) {
        var manual=UsesManualCertificate(course);
        return dbContext.Certificates.Any(c=>c.UserId==userId && c.CourseId==course.Id && (!manual || c.TemplateVersion.StartsWith("part2-")));
    }
    private Course CertificateCourse(string userId,string courseId) {
        var course=GetLearnerCourseInternal(userId,courseId);
        FlowRequire(GetLearner(userId).LearnerType==LearnerType.Collaborator && UsesManualCertificate(course),"Không tìm thấy chứng chỉ khóa đầy đủ cho tài khoản này.",404);
        return course;
    }
    private bool EligibleForCompletionCertificate(string userId,Course course) {
        var ordered=GetOrderedLessons(course);
        var final=ordered.SingleOrDefault(l=>l.Content?.Flow.Any(s=>s.Policy=="exam")==true);
        return final is not null && course.CertificateEnabled && AreAllContentLessonsCompletedInternal(userId,GetVisibleLessons(course,ordered)) && HasPassedAllCourseQuizzesInternal(userId,GetOrderedQuizzes(course),ordered)
            && dbContext.ProgressTrackings.Any(p=>p.UserId==userId && p.LessonId==final.Id && p.Status==LessonProgressStatus.Completed);
    }
    public object GetCompletionCertificate(string userId,string courseId) {
        var course=CertificateCourse(userId,courseId);var learner=GetLearner(userId);
        var certificate=dbContext.Certificates.SingleOrDefault(c=>c.UserId==userId&&c.CourseId==courseId&&c.TemplateVersion.StartsWith("part2-"));
        var eligible=EligibleForCompletionCertificate(userId,course);SaveChangesIfNeeded();
        return new { Eligible=eligible, Issued=certificate is not null, CertificateId=certificate?.CertificateId,
            FullName=certificate?.FullNameSnapshot ?? learner.FullName, Address=certificate?.AddressSnapshot ?? (string.IsNullOrWhiteSpace(learner.Address)?learner.Province:learner.Address),
            TemplateVersion=certificate?.TemplateVersion ?? PartTwoCertificateTemplate.Version,
            TemplateLabel="Mẫu chứng chỉ tạm thời", IssuedAt=certificate?.IssuedDate };
    }
    public object ConfirmCompletionCertificate(string userId,string courseId,ConfirmCompletionCertificateRequest request) {
        var course=CertificateCourse(userId,courseId);
        var final=GetOrderedLessons(course).Single(l=>l.Content?.Flow.Any(s=>s.Policy=="exam")==true);
        using var transaction=BeginFlowTransaction(userId,final.Id);
        FlowRequire(EligibleForCompletionCertificate(userId,course),"Bạn cần học đủ nội dung và đạt ít nhất 12/15 câu kiểm tra cuối khóa.");
        var existing=dbContext.Certificates.SingleOrDefault(c=>c.UserId==userId&&c.CourseId==courseId);
        if(existing?.TemplateVersion.StartsWith("part2-")==true) { transaction.Commit();return GetCompletionCertificate(userId,courseId); }
        FlowRequire(request.Confirmed,"Hãy xác nhận thông tin đã chính xác.");
        FlowRequire(request.TemplateVersion==PartTwoCertificateTemplate.Version,"Mẫu chứng chỉ đã thay đổi. Hãy tải lại và kiểm tra thông tin.",409);
        var name=request.FullName.Trim();var address=string.Join(" ",request.Address.Split((char[]?)null,StringSplitOptions.RemoveEmptyEntries));
        var fields=new Dictionary<string,string>();
        if(name.Length==0)fields["fullName"]="Vui lòng nhập họ và tên.";
        else if(name.Length>120||name.Any(char.IsControl))fields["fullName"]="Họ và tên không quá 120 ký tự và không có ký tự điều khiển.";
        if(address.Length==0)fields["address"]="Vui lòng nhập địa chỉ.";
        else if(address.Length>300||address.Any(char.IsControl))fields["address"]="Địa chỉ không quá 300 ký tự và không có ký tự điều khiển.";
        if(fields.Count>0)throw new ServiceException(new ServiceError("certificate.invalid_profile",string.Join(" ",fields.Values),400));
        var learner=GetLearner(userId);learner.FullName=name;learner.Address=address;
        var issued=DateTimeOffset.UtcNow;
        var id="RP-"+issued.ToString("yyyyMMdd")+"-"+Guid.NewGuid().ToString("N")[..12].ToUpperInvariant();
        var certificate=existing??new Certificate{UserId=userId,CourseId=courseId};
        if(existing is null)dbContext.Certificates.Add(certificate);
        certificate.CertificateId=id;certificate.IssuedDate=issued;certificate.FullNameSnapshot=name;certificate.AddressSnapshot=address;
        certificate.TemplateVersion=PartTwoCertificateTemplate.Version;certificate.DocumentSvg=PartTwoCertificateTemplate.Render(name,address,id,issued);certificate.QrCode="verify:"+id;
        dbContext.SaveChanges();transaction.Commit();return GetCompletionCertificate(userId,courseId);
    }
    public string GetCompletionCertificateDocument(string userId,string courseId) {
        _=CertificateCourse(userId,courseId);
        var certificate=dbContext.Certificates.SingleOrDefault(c=>c.UserId==userId&&c.CourseId==courseId&&c.TemplateVersion.StartsWith("part2-"));
        FlowRequire(certificate is not null && !string.IsNullOrEmpty(certificate.DocumentSvg),"Chứng chỉ chưa được cấp.",404);
        return certificate!.DocumentSvg;
    }
}
