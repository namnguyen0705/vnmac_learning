using Microsoft.AspNetCore.Http;

namespace vnmac_elearning.Api.Infrastructure;

public sealed record ServiceError(string Key, string Message, int StatusCode);

public sealed class ServiceException(ServiceError error) : Exception(error.Message)
{
    public ServiceError Error { get; } = error;

    public string Key => Error.Key;

    public int StatusCode => Error.StatusCode;
}

public sealed record ServiceErrorResponse(string Key, string Message);

public static class ServiceErrors
{
    public static readonly ServiceError InvalidProvince = new(
        "user.invalid_province",
        "Tỉnh/Thành phố không hợp lệ.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AuthInvalidFullName = new(
        "auth.invalid_full_name",
        "Ho ten phai co it nhat 4 ky tu.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AuthInvalidPhoneNumber = new(
        "auth.invalid_phone_number",
        "So dien thoai phai gom tu 9 den 11 chu so.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AuthInvalidCaptchaToken = new(
        "auth.invalid_captcha_token",
        "CaptchaToken khong hop le. Dung gia tri 'demo-pass' de thu nghiem API.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AuthInvalidOtpCode = new(
        "auth.invalid_otp_code",
        "OTP khong hop le. Dung ma '246810' de thu nghiem API.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AuthInvalidUsername = new(
        "auth.invalid_username",
        "Username la bat buoc.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AuthInvalidEmail = new(
        "auth.invalid_email",
        "Email khong hop le.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AuthInvalidPassword = new(
        "auth.invalid_password",
        "Password la bat buoc.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AuthWeakPassword = new(
        "auth.weak_password",
        "Password phai co it nhat 8 ky tu.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AuthCurrentPasswordIncorrect = new(
        "auth.current_password_incorrect",
        "Mat khau hien tai khong dung.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AuthAvatarInvalid = new(
        "auth.avatar_invalid",
        "Anh dai dien khong hop le hoac vuot qua dung luong cho phep.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AuthInvalidCredentials = new(
        "auth.invalid_credentials",
        "Username hoac password khong dung.",
        StatusCodes.Status401Unauthorized);

    public static readonly ServiceError AuthEmailNotVerified = new(
        "auth.email_not_verified",
        "Tai khoan chua xac thuc email.",
        StatusCodes.Status403Forbidden);

    public static readonly ServiceError AuthAccountLocked = new(
        "auth.account_locked",
        "Tai khoan da bi khoa.",
        StatusCodes.Status403Forbidden);

    public static readonly ServiceError AuthCurrentUserNotFound = new(
        "auth.current_user_not_found",
        "Khong tim thay nguoi dung hien tai.",
        StatusCodes.Status401Unauthorized);

    public static readonly ServiceError AuthRefreshTokenRequired = new(
        "auth.refresh_token_required",
        "Refresh token la bat buoc.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AuthInvalidRefreshToken = new(
        "auth.invalid_refresh_token",
        "Refresh token khong hop le.",
        StatusCodes.Status401Unauthorized);

    public static readonly ServiceError AuthExpiredRefreshToken = new(
        "auth.expired_refresh_token",
        "Refresh token da het han.",
        StatusCodes.Status401Unauthorized);

    public static readonly ServiceError AuthRevokedRefreshToken = new(
        "auth.revoked_refresh_token",
        "Refresh token da bi thu hoi.",
        StatusCodes.Status401Unauthorized);

    public static readonly ServiceError AuthLogoutRefreshTokenInvalid = new(
        "auth.logout_refresh_token_invalid",
        "Refresh token dang xuat khong hop le.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AuthUsernameAlreadyExists = new(
        "auth.username_already_exists",
        "Username da ton tai.",
        StatusCodes.Status409Conflict);

    public static readonly ServiceError AuthEmailAlreadyExists = new(
        "auth.email_already_exists",
        "Email da ton tai.",
        StatusCodes.Status409Conflict);

    public static readonly ServiceError AuthPhoneNumberAlreadyExists = new(
        "auth.phone_number_already_exists",
        "So dien thoai da ton tai.",
        StatusCodes.Status409Conflict);

    public static readonly ServiceError AuthVerificationTokenRequired = new(
        "auth.verification_token_required",
        "Token xac thuc email la bat buoc.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AuthVerificationTokenInvalid = new(
        "auth.verification_token_invalid",
        "Token xac thuc email khong hop le.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AuthVerificationTokenExpired = new(
        "auth.verification_token_expired",
        "Token xac thuc email da het han.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AuthVerificationTokenConsumed = new(
        "auth.verification_token_consumed",
        "Token xac thuc email da duoc su dung.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError CoursesPublishedCourseNotFound = new(
        "courses.published_course_not_found",
        "Khong tim thay khoa hoc da publish.",
        StatusCodes.Status404NotFound);

    public static readonly ServiceError CoursesCourseNotFound = new(
        "courses.course_not_found",
        "Khong tim thay khoa hoc.",
        StatusCodes.Status404NotFound);

    public static readonly ServiceError LearningLearnerNotFound = new(
        "learning.learner_not_found",
        "Khong tim thay hoc vien.",
        StatusCodes.Status404NotFound);

    public static readonly ServiceError LearningLessonNotFound = new(
        "learning.lesson_not_found",
        "Khong tim thay bai hoc.",
        StatusCodes.Status404NotFound);

    public static readonly ServiceError LearningQuizNotFound = new(
        "learning.quiz_not_found",
        "Khong tim thay bai quiz.",
        StatusCodes.Status404NotFound);

    public static readonly ServiceError LearningCourseNotEnrolled = new(
        "learning.course_not_enrolled",
        "Hoc vien chua dang ky khoa hoc nay.",
        StatusCodes.Status404NotFound);

    public static readonly ServiceError LearningLessonLocked = new(
        "learning.lesson_locked",
        "Bai hoc chua duoc mo khoa.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError LearningQuizLocked = new(
        "learning.quiz_locked",
        "Bai quiz chua duoc mo khoa.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError LearningLessonNotVideo = new(
        "learning.lesson_not_video",
        "Bai hoc hien tai khong phai video.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError LearningLessonNotInteractive = new(
        "learning.lesson_not_interactive",
        "Bai hoc hien tai khong phai noi dung tuong tac.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError LearningLessonNotQuiz = new(
        "learning.lesson_not_quiz",
        "Bai hoc hien tai khong phai quiz.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError LearningLessonNotScorm = new(
        "learning.lesson_not_scorm",
        "Bai hoc hien tai khong phai SCORM module.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError LearningScormPackageMissing = new(
        "learning.scorm_package_missing",
        "Lesson SCORM chua duoc cau hinh package.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError LearningScormSessionNotFound = new(
        "learning.scorm_session_not_found",
        "Khong tim thay phien SCORM.",
        StatusCodes.Status404NotFound);

    public static readonly ServiceError LearningScormSessionInactive = new(
        "learning.scorm_session_inactive",
        "Phien SCORM khong con hoat dong.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError LearningScormElementRequired = new(
        "learning.scorm_element_required",
        "Ten phan tu SCORM la bat buoc.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AdminCourseTitleRequired = new(
        "admin.course_title_required",
        "Tieu de khoa hoc la bat buoc.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AdminSectionTitleRequired = new(
        "admin.section_title_required",
        "Tieu de phan hoc la bat buoc.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AdminLessonTitleRequired = new(
        "admin.lesson_title_required",
        "Tieu de bai hoc la bat buoc.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AdminLessonQuizSeparated = new(
        "admin.lesson_quiz_separated",
        "Quiz da duoc tach rieng. Khong tao quiz trong module bai hoc.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AdminQuizTitleRequired = new(
        "admin.quiz_title_required",
        "Tieu de bai quiz la bat buoc.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AdminScormPackageRequired = new(
        "admin.scorm_package_required",
        "Lesson SCORM phai co cau hinh package.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AdminScormPackageIdentifierRequired = new(
        "admin.scorm_package_identifier_required",
        "SCORM package identifier la bat buoc.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AdminScormPackageEntryPathRequired = new(
        "admin.scorm_package_entry_path_required",
        "SCORM package entry path la bat buoc.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AdminScormScoRequired = new(
        "admin.scorm_sco_required",
        "SCORM package phai co it nhat 1 SCO hoac asset.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AdminScormScoInvalid = new(
        "admin.scorm_sco_invalid",
        "Cau hinh SCO SCORM khong hop le.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AdminScormLaunchScoInvalid = new(
        "admin.scorm_launch_sco_invalid",
        "Launch SCO khong ton tai trong package.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AdminQuestionTextRequired = new(
        "admin.question_text_required",
        "Noi dung cau hoi la bat buoc.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AdminQuestionOptionsMinimum = new(
        "admin.question_options_minimum",
        "Cau hoi phai co it nhat 2 dap an.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AdminAssessmentLessonRequired = new(
        "admin.assessment_lesson_required",
        "Chi co the quan ly cau hoi cho lesson interactive hoac quiz.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AdminQuestionOwnerRequired = new(
        "admin.question_owner_required",
        "Cau hoi phai thuoc bai hoc interactive hoac bai quiz.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AdminQuestionOwnerConflict = new(
        "admin.question_owner_conflict",
        "Chi duoc truyen lessonId hoac quizId, khong duoc truyen dong thoi.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AdminQuestionCorrectOptionRequired = new(
        "admin.question_correct_option_required",
        "Cau hoi lua chon phai co it nhat 1 dap an dung.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AdminQuestionHotspotTargetRequired = new(
        "admin.question_hotspot_target_required",
        "Cau hoi hotspot phai co it nhat 1 diem chon.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AdminQuestionHotspotCorrectRequired = new(
        "admin.question_hotspot_correct_required",
        "Cau hoi hotspot phai co it nhat 1 diem dung.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AdminQuestionDragItemRequired = new(
        "admin.question_drag_item_required",
        "Cau hoi drag-drop phai co it nhat 1 item.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AdminQuestionDragTargetRequired = new(
        "admin.question_drag_target_required",
        "Cau hoi drag-drop phai co it nhat 1 target.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AdminQuestionDragPairRequired = new(
        "admin.question_drag_pair_required",
        "Cau hoi drag-drop phai co it nhat 1 cap dung.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AdminQuestionDragPairInvalid = new(
        "admin.question_drag_pair_invalid",
        "Cap ghep drag-drop khong hop le.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AdminCourseNotFound = new(
        "admin.course_not_found",
        "Khong tim thay khoa hoc.",
        StatusCodes.Status404NotFound);

    public static readonly ServiceError AdminSectionNotFound = new(
        "admin.section_not_found",
        "Khong tim thay phan hoc.",
        StatusCodes.Status404NotFound);

    public static readonly ServiceError AdminLessonNotFound = new(
        "admin.lesson_not_found",
        "Khong tim thay bai hoc.",
        StatusCodes.Status404NotFound);

    public static readonly ServiceError AdminQuestionNotFound = new(
        "admin.question_not_found",
        "Khong tim thay cau hoi.",
        StatusCodes.Status404NotFound);

    public static readonly ServiceError AdminQuizNotFound = new(
        "admin.quiz_not_found",
        "Khong tim thay bai quiz.",
        StatusCodes.Status404NotFound);

    public static readonly ServiceError AdminQuizLessonRequired = new(
        "admin.quiz_lesson_required",
        "Chi co the them cau hoi vao lesson quiz.",
        StatusCodes.Status400BadRequest);

    public static readonly ServiceError AdminUserNotFound = new(
        "admin.user_not_found",
        "Khong tim thay tai khoan nguoi dung.",
        StatusCodes.Status404NotFound);

    public static readonly ServiceError AdminRoleNotFound = new(
        "admin.role_not_found", "Không tìm thấy vai trò.", StatusCodes.Status404NotFound);
    public static readonly ServiceError AdminRoleInvalid = new(
        "admin.role_invalid", "Tên và mã vai trò là bắt buộc.", StatusCodes.Status400BadRequest);
    public static readonly ServiceError AdminRoleCodeExists = new(
        "admin.role_code_exists", "Mã vai trò đã tồn tại.", StatusCodes.Status409Conflict);
    public static readonly ServiceError AdminRoleCannotDelete = new(
        "admin.role_cannot_delete", "Không thể xóa vai trò hệ thống hoặc vai trò đang được sử dụng.", StatusCodes.Status409Conflict);

    public static readonly ServiceError AdminNotificationInvalid = new(
        "admin.notification_invalid",
        "Tieu de va noi dung thong bao la bat buoc.",
        StatusCodes.Status400BadRequest);
}
