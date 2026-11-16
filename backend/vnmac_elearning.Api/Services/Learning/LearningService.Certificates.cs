using System.Globalization;
using System.Text;
using System.Xml;
using Microsoft.EntityFrameworkCore;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed partial class LearningService
{
    public LearnerCertificatesResponse GetCertificates(string userId)
    {
        _ = GetLearner(userId);
        var certificates = GetLearnerCoursesInternal(userId)
            .Select(course => GetCertificate(userId, course.Id))
            .OrderBy(item => item.CourseTitle)
            .ToArray();
        SaveChangesIfNeeded();

        return new LearnerCertificatesResponse
        {
            UserId = userId,
            Certificates = certificates
        };
    }

    public CertificateResponse GetCertificate(string userId, string courseId)
    {
        var course = GetLearnerCourseInternal(userId, courseId);
        var orderedLessons = GetOrderedLessons(course);
        var visibleLessons = GetVisibleLessons(course, orderedLessons);
        var orderedQuizzes = GetOrderedQuizzes(course);
        EnsureLearnerExists(userId);
        EnsureCertificateIssuedInternal(userId, course);
        SaveChangesIfNeeded();

        var certificate = dbContext.Certificates.SingleOrDefault(item => item.UserId == userId && item.CourseId == courseId);
        if (certificate is not null && HasCurrentCertificate(userId,course))
        {
            return new CertificateResponse
            {
                UserId = userId,
                CourseId = courseId,
                CourseTitle = course.Title,
                IsEligible = true,
                OutstandingRequirements = [],
                Certificate = certificate
            };
        }

        var outstanding = new List<string>();
        if (UsesManualCertificate(course)) outstanding.Add("Kiểm tra và xác nhận thông tin tại màn hoàn thành khóa học trước khi nhận chứng chỉ.");
        if (!course.CertificateEnabled) outstanding.Add("Chương trình chưa bật cấp chứng chỉ cho đối tượng học viên này.");
        if (CalculateContentCompletionPercentInternal(userId, visibleLessons) < 100)
        {
            outstanding.Add("Hoàn thành 100% nội dung khóa học.");
        }

        if (!HasPassedAllCourseQuizzesInternal(userId, orderedQuizzes, orderedLessons))
        {
            outstanding.Add("Đạt ngưỡng điểm yêu cầu của tất cả bài kiểm tra trong khóa học.");
        }

        SaveChangesIfNeeded();

        return new CertificateResponse
        {
            UserId = userId,
            CourseId = courseId,
            CourseTitle = course.Title,
            IsEligible = false,
            OutstandingRequirements = outstanding,
            Certificate = null
        };
    }

    public CertificateVerificationResponse VerifyCertificate(string certificateId)
    {
        var certificate = dbContext.Certificates.SingleOrDefault(item =>
            item.CertificateId == certificateId);

        if (certificate is null)
        {
            return new CertificateVerificationResponse
            {
                IsValid = false,
                Message = "Khong tim thay chung nhan."
            };
        }

        var learner = dbContext.Users.Single(user => user.Id == certificate.UserId);
        return new CertificateVerificationResponse
        {
            IsValid = true,
            Message = "Chung nhan hop le.",
            LearnerName = string.IsNullOrEmpty(certificate.FullNameSnapshot) ? learner.FullName : certificate.FullNameSnapshot,
            CourseId = certificate.CourseId,
            CourseTitle = dbContext.Courses.Single(course => course.Id == certificate.CourseId).Title,
            CertificateId = certificate.CertificateId,
            IssuedDate = certificate.IssuedDate
        };
    }

    public int CalculateCompletionPercent(string userId)
    {
        var result = GetLearnerCoursesInternal(userId)
            .Select(course =>
            {
                var orderedLessons = GetOrderedLessons(course);
                var visibleLessons = GetVisibleLessons(course, orderedLessons);
                var orderedQuizzes = GetOrderedQuizzes(course);
                return CalculateOverallCompletionPercentInternal(userId, visibleLessons, orderedQuizzes, orderedLessons);
            })
            .DefaultIfEmpty(0)
            .Max();
        SaveChangesIfNeeded();
        return result;
    }

    public int CalculateStudyTimeMinutes(string userId)
    {
        return CalculateStudyTimeMinutesInternal(userId);
    }

    public bool HasPassedAllQuizzes(string userId)
    {
        var result = GetLearnerCoursesInternal(userId)
            .Select(course =>
            {
                var orderedLessons = GetOrderedLessons(course);
                return HasPassedAllCourseQuizzesInternal(userId, GetOrderedQuizzes(course), orderedLessons);
            })
            .DefaultIfEmpty(false)
            .Any(value => value);

        SaveChangesIfNeeded();
        return result;
    }

    public string GetStalledLessonId(string userId)
    {
        var result = GetLearnerCoursesInternal(userId)
            .Select(course => GetNextLessonIdInternal(userId, GetVisibleLessons(course, GetOrderedLessons(course))))
            .FirstOrDefault(lessonId => !string.IsNullOrWhiteSpace(lessonId))
            ?? string.Empty;
        SaveChangesIfNeeded();
        return result;
    }

    public IReadOnlyCollection<LearnerEnrollmentSummary> GetEnrollmentSummaries(string userId)
    {
        _ = GetLearner(userId);
        var courses = GetLearnerCoursesInternal(userId)
            .Select(course => BuildEnrollmentSummary(userId, course))
            .OrderByDescending(course => course.LastAccessedAt ?? course.EnrolledAt)
            .ThenBy(course => course.Title)
            .ToArray();
        SaveChangesIfNeeded();
        return courses;
    }

}
