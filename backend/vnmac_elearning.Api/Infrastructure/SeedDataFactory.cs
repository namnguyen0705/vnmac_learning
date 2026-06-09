using vnmac_elearning.Api.Domain;

namespace vnmac_elearning.Api.Infrastructure;

public static class SeedDataFactory
{
    private const string CourseId = "course-vnmac-elearning";
    private static readonly DateTimeOffset SeedTime = new(2026, 4, 13, 8, 0, 0, TimeSpan.Zero);

    public static SeedSnapshot Create()
    {
        return new SeedSnapshot(
            BuildUsers(),
            [BuildCourse()],
            BuildCourseEnrollments(),
            BuildProgressTrackings(),
            BuildQuizResults(),
            BuildQuizAttempts(),
            BuildInteractionAttempts(),
            BuildCertificates());
    }

    private static Course BuildCourse()
    {
        return new Course
        {
            Id = CourseId,
            Title = "Khóa học trực tuyến giáo dục phòng tránh tai nạn bom mìn, vật nổ",
            Description = "Khóa học trực tuyến giúp người học nhận biết nguy cơ bom mìn, vật nổ, thực hành hành vi an toàn và truyền thông cộng đồng.",
            Status = CourseStatus.Published,
            Sections =
            [
                new CourseSection
                {
                    Id = "section-awareness",
                    CourseId = CourseId,
                    Title = "Phần 1. Nhận biết nguy cơ",
                    Description = "Nhận diện vật thể nghi ngờ, dấu hiệu cảnh báo và khu vực có nguy cơ cao.",
                    Order = 1,
                    Lessons =
                    [
                        new Lesson
                        {
                            Id = "lesson-video-1",
                            CourseId = CourseId,
                            SectionId = "section-awareness",
                            Title = "Video: Nhận biết dấu hiệu cảnh báo bom mìn, vật nổ",
                            Type = LessonType.Video,
                            Order = 1,
                            DurationMinutes = 6,
                            StatusLabel = "Xem đủ 100% để mở bài tiếp theo",
                            VideoContent = new VideoContent
                            {
                                Intro = "Tổng quan về các dấu hiệu thường gặp của bom mìn, vật nổ trong cộng đồng.",
                                VideoUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
                                Objectives =
                                [
                                    "Nhận biết vật thể nghi ngờ trong sinh hoạt hằng ngày",
                                    "Phát hiện dấu hiệu cảnh báo tại khu vực có nguy cơ cao",
                                    "Ghi nhớ nguyên tắc không chạm, không di chuyển, không tò mò"
                                ],
                                Checkpoints =
                                [
                                    "Giữ khoảng cách với vật thể kim loại lạ",
                                    "Đánh dấu và báo cáo vật thể nghi ngờ",
                                    "Nhắc trẻ em và người xung quanh tránh lại gần"
                                ],
                                TranscriptHighlight = "Bất kỳ vật thể nghi ngờ nào cũng có thể gây nổ. Hãy tránh xa và báo ngay cho lực lượng chức năng."
                            }
                        },
                        new Lesson
                        {
                            Id = "lesson-interactive-1",
                            CourseId = CourseId,
                            SectionId = "section-awareness",
                            Title = "Tương tác: Chọn hành động an toàn",
                            Type = LessonType.Interactive,
                            Order = 2,
                            DurationMinutes = 8,
                            StatusLabel = "Hoàn thành tất cả hoạt động để tiếp tục",
                            Assessment = new LessonAssessment
                            {
                                LessonId = "lesson-interactive-1",
                                Intro = "Thực hành phản ứng an toàn trong các tình huống thường gặp tại thực địa.",
                                RetryHint = "Làm lại cho đến khi tất cả câu trả lời đều chính xác.",
                                PassScore = 100,
                                RandomizeQuestionOrder = false,
                                RandomizeOptionOrder = false,
                                Questions =
                                [
                                    new LessonQuestion
                                    {
                                        Id = "itf-1",
                                        LessonId = "lesson-interactive-1",
                                        Type = QuestionType.TrueFalse,
                                        Order = 1,
                                        Prompt = "Đúng hay sai?",
                                        Statement = "Nếu vật thể đã cũ và han gỉ thì có thể chạm vào an toàn.",
                                        Explanation = "Dù cũ hay han gỉ, vật nổ vẫn có thể phát nổ. Tuyệt đối không chạm vào.",
                                        Options =
                                        [
                                            new LessonQuestionOption { QuestionId = "itf-1", Code = "true", Label = "Đúng", Order = 1, IsCorrect = false },
                                            new LessonQuestionOption { QuestionId = "itf-1", Code = "false", Label = "Sai", Order = 2, IsCorrect = true }
                                        ]
                                    },
                                    new LessonQuestion
                                    {
                                        Id = "ihs-1",
                                        LessonId = "lesson-interactive-1",
                                        Type = QuestionType.Hotspot,
                                        Order = 2,
                                        Prompt = "Chạm vào vị trí an toàn nhất để đứng trước khi báo cáo vật thể nghi ngờ.",
                                        MediaTitle = "Sơ đồ an toàn tại hiện trường",
                                        Explanation = "Hãy chọn vị trí đứng đã được đánh dấu an toàn, cách xa vật thể nghi ngờ.",
                                        HotspotTargets =
                                        [
                                            new LessonQuestionHotspotTarget
                                            {
                                                QuestionId = "ihs-1",
                                                Code = "safe-report-zone",
                                                Label = "Vị trí báo cáo an toàn",
                                                Order = 1,
                                                Shape = HotspotShape.Rectangle,
                                                X = 72,
                                                Y = 18,
                                                Width = 16,
                                                Height = 18,
                                                Radius = 0,
                                                IsCorrect = true
                                            },
                                            new LessonQuestionHotspotTarget
                                            {
                                                QuestionId = "ihs-1",
                                                Code = "danger-zone",
                                                Label = "Sát vật thể nghi ngờ",
                                                Order = 2,
                                                Shape = HotspotShape.Rectangle,
                                                X = 34,
                                                Y = 44,
                                                Width = 18,
                                                Height = 20,
                                                Radius = 0,
                                                IsCorrect = false
                                            },
                                            new LessonQuestionHotspotTarget
                                            {
                                                QuestionId = "ihs-1",
                                                Code = "crowd-zone",
                                                Label = "Nơi đám đông đang tập trung",
                                                Order = 3,
                                                Shape = HotspotShape.Rectangle,
                                                X = 10,
                                                Y = 20,
                                                Width = 18,
                                                Height = 18,
                                                Radius = 0,
                                                IsCorrect = false
                                            }
                                        ]
                                    },
                                    new LessonQuestion
                                    {
                                        Id = "idd-1",
                                        LessonId = "lesson-interactive-1",
                                        Type = QuestionType.DragDrop,
                                        Order = 3,
                                        Prompt = "Ghép mỗi hành động an toàn với đúng bước xử lý.",
                                        Explanation = "Trước tiên tạo khoảng cách an toàn, sau đó báo cáo qua kênh chính thức.",
                                        DragItems =
                                        [
                                            new LessonQuestionDragItem { QuestionId = "idd-1", Code = "keep-distance", Label = "Giữ mọi người tránh xa vật thể", Order = 1 },
                                            new LessonQuestionDragItem { QuestionId = "idd-1", Code = "report-object", Label = "Báo cho lực lượng chức năng", Order = 2 }
                                        ],
                                        DragTargets =
                                        [
                                            new LessonQuestionDragTarget { QuestionId = "idd-1", Code = "step-1", Label = "Hành động ngay", Order = 1 },
                                            new LessonQuestionDragTarget { QuestionId = "idd-1", Code = "step-2", Label = "Hành động tiếp theo", Order = 2 }
                                        ],
                                        CorrectPairs =
                                        [
                                            new LessonQuestionDragPair { QuestionId = "idd-1", DragItemCode = "keep-distance", DragTargetCode = "step-1" },
                                            new LessonQuestionDragPair { QuestionId = "idd-1", DragItemCode = "report-object", DragTargetCode = "step-2" }
                                        ]
                                    }
                                ]
                            }
                        },
                        new Lesson
                        {
                            Id = "lesson-quiz-1",
                            CourseId = CourseId,
                            SectionId = "section-awareness",
                            Title = "Bài kiểm tra 1: Nhận biết nguy cơ",
                            Type = LessonType.Quiz,
                            Order = 3,
                            DurationMinutes = 5,
                            StatusLabel = "Đạt 100% để hoàn thành",
                            Assessment = new LessonAssessment
                            {
                                LessonId = "lesson-quiz-1",
                                Intro = "Trả lời đúng tất cả câu hỏi để mở Phần 2.",
                                RetryHint = "Làm lại cho đến khi đạt điểm yêu cầu.",
                                PassScore = 100,
                                RandomizeQuestionOrder = true,
                                RandomizeOptionOrder = true,
                                Questions =
                                [
                                    new LessonQuestion
                                    {
                                        Id = "q1",
                                        LessonId = "lesson-quiz-1",
                                        Type = QuestionType.MultipleChoice,
                                        Order = 1,
                                        Prompt = "Khi nhìn thấy một vật thể nghi ngờ, hành động đầu tiên an toàn nhất là gì?",
                                        Explanation = "Giữ khoảng cách và báo cáo luôn là cách phản ứng an toàn nhất.",
                                        Options =
                                        [
                                            new LessonQuestionOption { QuestionId = "q1", Code = "a", Label = "Chạm thử thật cẩn thận", Order = 1, IsCorrect = false },
                                            new LessonQuestionOption { QuestionId = "q1", Code = "b", Label = "Tránh xa và báo cáo ngay", Order = 2, IsCorrect = true },
                                            new LessonQuestionOption { QuestionId = "q1", Code = "c", Label = "Di chuyển nó ra mép đường", Order = 3, IsCorrect = false }
                                        ]
                                    },
                                    new LessonQuestion
                                    {
                                        Id = "q2",
                                        LessonId = "lesson-quiz-1",
                                        Type = QuestionType.MultipleChoice,
                                        Order = 2,
                                        Prompt = "Ai có nguy cơ cao nhất khi ở gần vật nổ chưa nổ?",
                                        Explanation = "Trẻ em thường hiếu kỳ và dễ lại gần vật thể nguy hiểm.",
                                        Options =
                                        [
                                            new LessonQuestionOption { QuestionId = "q2", Code = "a", Label = "Trẻ em hiếu kỳ", Order = 1, IsCorrect = true },
                                            new LessonQuestionOption { QuestionId = "q2", Code = "b", Label = "Chỉ lực lượng chuyên trách", Order = 2, IsCorrect = false },
                                            new LessonQuestionOption { QuestionId = "q2", Code = "c", Label = "Chỉ người làm việc văn phòng", Order = 3, IsCorrect = false }
                                        ]
                                    },
                                    new LessonQuestion
                                    {
                                        Id = "q3",
                                        LessonId = "lesson-quiz-1",
                                        Type = QuestionType.MultipleChoice,
                                        Order = 3,
                                        Prompt = "Bạn nên dùng cách nào để cảnh báo người khác?",
                                        Explanation = "Cần cảnh báo rõ ràng nhưng vẫn giữ khoảng cách an toàn.",
                                        Options =
                                        [
                                            new LessonQuestionOption { QuestionId = "q3", Code = "a", Label = "Dùng vật đánh dấu dễ nhìn và nhắc bằng lời", Order = 1, IsCorrect = true },
                                            new LessonQuestionOption { QuestionId = "q3", Code = "b", Label = "Dùng dụng cụ kim loại gõ vào vật thể", Order = 2, IsCorrect = false },
                                            new LessonQuestionOption { QuestionId = "q3", Code = "c", Label = "Đốt lửa để gây chú ý", Order = 3, IsCorrect = false }
                                        ]
                                    }
                                ]
                            }
                        }
                    ]
                },
                new CourseSection
                {
                    Id = "section-communication",
                    CourseId = CourseId,
                    Title = "Phần 2. Phản ứng an toàn và truyền thông cộng đồng",
                    Description = "Học cách báo tin, khoanh vùng và hướng dẫn cộng đồng ứng xử an toàn.",
                    Order = 2,
                    Lessons =
                    [
                        new Lesson
                        {
                            Id = "lesson-video-2",
                            CourseId = CourseId,
                            SectionId = "section-communication",
                            Title = "Video: Báo tin, cô lập hiện trường và truyền thông",
                            Type = LessonType.Video,
                            Order = 1,
                            DurationMinutes = 7,
                            StatusLabel = "Xem đủ 100% để mở bài tiếp theo",
                            VideoContent = new VideoContent
                            {
                                Intro = "Hướng dẫn cán bộ địa phương và tổ truyền thông cách báo tin, cảnh báo và giữ an toàn cho cộng đồng.",
                                VideoUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
                                Objectives =
                                [
                                    "Thực hiện đúng quy trình báo cáo",
                                    "Bảo vệ hiện trường cho đến khi lực lượng chuyên trách đến",
                                    "Truyền đạt thông tin rõ ràng, bình tĩnh"
                                ],
                                Checkpoints =
                                [
                                    "Không gây hoang mang",
                                    "Giữ trẻ em và người hiếu kỳ tránh xa",
                                    "Cung cấp vị trí và mô tả vật thể"
                                ],
                                TranscriptHighlight = "Báo cáo nhanh và truyền thông rõ ràng sẽ giảm nguy cơ cho mọi người xung quanh."
                            }
                        },
                        new Lesson
                        {
                            Id = "lesson-interactive-2",
                            CourseId = CourseId,
                            SectionId = "section-communication",
                            Title = "Tương tác: Báo tin sự việc",
                            Type = LessonType.Interactive,
                            Order = 2,
                            DurationMinutes = 8,
                            StatusLabel = "Hoàn thành tất cả hoạt động để tiếp tục",
                            Assessment = new LessonAssessment
                            {
                                LessonId = "lesson-interactive-2",
                                Intro = "Ôn lại quy trình truyền thông và báo cáo đúng sau khi phát hiện vật thể nghi ngờ.",
                                RetryHint = "Làm lại cho đến khi tất cả câu trả lời đều chính xác.",
                                PassScore = 100,
                                RandomizeQuestionOrder = false,
                                RandomizeOptionOrder = false,
                                Questions =
                                [
                                    new LessonQuestion
                                    {
                                        Id = "itf-3",
                                        LessonId = "lesson-interactive-2",
                                        Type = QuestionType.MultipleChoice,
                                        Order = 1,
                                        Prompt = "Chi tiết nào quan trọng nhất trong báo cáo đầu tiên?",
                                        Explanation = "Vị trí chính xác giúp lực lượng xử lý tiếp cận nhanh và an toàn.",
                                        Options =
                                        [
                                            new LessonQuestionOption { QuestionId = "itf-3", Code = "a", Label = "Màu ngôi nhà gần đó", Order = 1, IsCorrect = false },
                                            new LessonQuestionOption { QuestionId = "itf-3", Code = "b", Label = "Vị trí chính xác của vật thể", Order = 2, IsCorrect = true },
                                            new LessonQuestionOption { QuestionId = "itf-3", Code = "c", Label = "Có bao nhiêu người dân đang tò mò", Order = 3, IsCorrect = false }
                                        ]
                                    },
                                    new LessonQuestion
                                    {
                                        Id = "isc-1",
                                        LessonId = "lesson-interactive-2",
                                        Type = QuestionType.Scenario,
                                        Order = 2,
                                        Prompt = "Chọn cách xử lý phù hợp nhất trong tình huống sau.",
                                        ScenarioTitle = "Tình huống trên đường làng",
                                        ScenarioContext = "Một em nhỏ chỉ vào vật thể kim loại lạ gần lối đi đến trường, trong khi nhiều người lớn đang tụ tập xung quanh.",
                                        Explanation = "Cần đưa mọi người ra xa, giữ khoảng cách và báo cáo qua kênh chính thức.",
                                        Options =
                                        [
                                            new LessonQuestionOption { QuestionId = "isc-1", Code = "a", Label = "Nhờ một người lớn nhặt lên và mang đi chỗ khác", Order = 1, IsCorrect = false },
                                            new LessonQuestionOption { QuestionId = "isc-1", Code = "b", Label = "Yêu cầu mọi người lùi lại, đánh dấu khu vực và báo ngay", Order = 2, IsCorrect = true },
                                            new LessonQuestionOption { QuestionId = "isc-1", Code = "c", Label = "Đăng ảnh lên mạng trước để mọi người góp ý", Order = 3, IsCorrect = false }
                                        ]
                                    },
                                    new LessonQuestion
                                    {
                                        Id = "itf-4",
                                        LessonId = "lesson-interactive-2",
                                        Type = QuestionType.TrueFalse,
                                        Order = 3,
                                        Prompt = "Đúng hay sai?",
                                        Statement = "Bạn nên đăng ảnh lên mạng trước khi báo cho cơ quan chức năng.",
                                        Explanation = "Cần báo qua kênh chính thức trước và giữ mọi người tránh xa vật thể.",
                                        Options =
                                        [
                                            new LessonQuestionOption { QuestionId = "itf-4", Code = "true", Label = "Đúng", Order = 1, IsCorrect = false },
                                            new LessonQuestionOption { QuestionId = "itf-4", Code = "false", Label = "Sai", Order = 2, IsCorrect = true }
                                        ]
                                    }
                                ]
                            }
                        },
                        new Lesson
                        {
                            Id = "lesson-quiz-2",
                            CourseId = CourseId,
                            SectionId = "section-communication",
                            Title = "Bài kiểm tra 2: Báo tin an toàn",
                            Type = LessonType.Quiz,
                            Order = 3,
                            DurationMinutes = 5,
                            StatusLabel = "Đạt 100% để hoàn thành",
                            Assessment = new LessonAssessment
                            {
                                LessonId = "lesson-quiz-2",
                                Intro = "Đạt 100% bài kiểm tra này để được cấp chứng chỉ hoàn thành khóa học.",
                                RetryHint = "Làm lại cho đến khi đạt điểm yêu cầu.",
                                PassScore = 100,
                                RandomizeQuestionOrder = true,
                                RandomizeOptionOrder = true,
                                Questions =
                                [
                                    new LessonQuestion
                                    {
                                        Id = "q4",
                                        LessonId = "lesson-quiz-2",
                                        Type = QuestionType.MultipleChoice,
                                        Order = 1,
                                        Prompt = "Thông tin nào giúp lực lượng xử lý trước tiên?",
                                        Explanation = "Vị trí là thông tin quan trọng nhất để xử lý an toàn.",
                                        Options =
                                        [
                                            new LessonQuestionOption { QuestionId = "q4", Code = "a", Label = "Vị trí chính xác", Order = 1, IsCorrect = true },
                                            new LessonQuestionOption { QuestionId = "q4", Code = "b", Label = "Màu sắc yêu thích của người báo tin", Order = 2, IsCorrect = false },
                                            new LessonQuestionOption { QuestionId = "q4", Code = "c", Label = "Tin đồn trong thôn xóm", Order = 3, IsCorrect = false }
                                        ]
                                    },
                                    new LessonQuestion
                                    {
                                        Id = "q5",
                                        LessonId = "lesson-quiz-2",
                                        Type = QuestionType.MultipleChoice,
                                        Order = 2,
                                        Prompt = "Trong lúc chờ lực lượng chuyên trách, tổ cộng đồng nên làm gì?",
                                        Explanation = "Khoanh vùng và giữ khoảng cách sẽ giảm nguy cơ tai nạn.",
                                        Options =
                                        [
                                            new LessonQuestionOption { QuestionId = "q5", Code = "a", Label = "Giữ mọi người tránh xa khu vực", Order = 1, IsCorrect = true },
                                            new LessonQuestionOption { QuestionId = "q5", Code = "b", Label = "Di chuyển vật thể vào nơi cất giữ", Order = 2, IsCorrect = false },
                                            new LessonQuestionOption { QuestionId = "q5", Code = "c", Label = "Chụp ảnh tự sướng với vật thể", Order = 3, IsCorrect = false }
                                        ]
                                    },
                                    new LessonQuestion
                                    {
                                        Id = "q6",
                                        LessonId = "lesson-quiz-2",
                                        Type = QuestionType.MultipleChoice,
                                        Order = 3,
                                        Prompt = "Phong cách truyền thông nào là đúng?",
                                        Explanation = "Truyền thông rõ ràng, bình tĩnh giúp mọi người hành động an toàn mà không hoảng loạn.",
                                        Options =
                                        [
                                            new LessonQuestionOption { QuestionId = "q6", Code = "a", Label = "Rõ ràng và bình tĩnh", Order = 1, IsCorrect = true },
                                            new LessonQuestionOption { QuestionId = "q6", Code = "b", Label = "Loan tin thất thiệt thật lớn", Order = 2, IsCorrect = false },
                                            new LessonQuestionOption { QuestionId = "q6", Code = "c", Label = "Chia sẻ bài đăng chưa kiểm chứng trên mạng xã hội", Order = 3, IsCorrect = false }
                                        ]
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        };
    }

    private static List<User> BuildUsers()
    {
        return
        [
            new User
            {
                Id = "admin-1",
                Username = "admin",
                Email = "admin@vnmac.local",
                FullName = "Nguyễn Hoài An",
                PhoneNumber = "0901234567",
                CreatedAt = SeedTime.AddDays(-20),
                LastLogin = SeedTime.AddHours(-2),
                IsEmailVerified = true,
                EmailVerifiedAt = SeedTime.AddDays(-20),
                CreatedByAdmin = true,
                Role = UserRole.Admin,
                Province = "Quảng Trị",
                Group = "Quản trị hệ thống"
            },
            new User
            {
                Id = "content-1",
                Username = "content",
                Email = "content@vnmac.local",
                FullName = "Lê Minh Thảo",
                PhoneNumber = "0912345678",
                CreatedAt = SeedTime.AddDays(-18),
                LastLogin = SeedTime.AddHours(-3),
                IsEmailVerified = true,
                EmailVerifiedAt = SeedTime.AddDays(-18),
                CreatedByAdmin = true,
                Role = UserRole.ContentManager,
                Province = "Quảng Bình",
                Group = "Quản lý nội dung"
            },
            new User
            {
                Id = "viewer-1",
                Username = "viewer",
                Email = "viewer@vnmac.local",
                FullName = "Trần Văn Hân",
                PhoneNumber = "0923456789",
                CreatedAt = SeedTime.AddDays(-17),
                LastLogin = SeedTime.AddDays(-1),
                IsEmailVerified = true,
                EmailVerifiedAt = SeedTime.AddDays(-17),
                CreatedByAdmin = true,
                Role = UserRole.DataViewer,
                Province = "Huế",
                Group = "Theo dõi dữ liệu"
            },
            new User
            {
                Id = "learner-01",
                Username = "learner01",
                Email = "learner01@vnmac.local",
                FullName = "Võ Thu Hà",
                PhoneNumber = "0930000001",
                CreatedAt = SeedTime.AddDays(-10),
                LastLogin = SeedTime.AddHours(-6),
                IsEmailVerified = true,
                EmailVerifiedAt = SeedTime.AddDays(-10),
                CreatedByAdmin = false,
                Role = UserRole.Learner,
                Province = "Quảng Trị",
                Group = "Tổ truyền thông cộng đồng"
            },
            new User
            {
                Id = "learner-02",
                Username = "learner02",
                Email = "learner02@vnmac.local",
                FullName = "Phạm Đức Tài",
                PhoneNumber = "0930000002",
                CreatedAt = SeedTime.AddDays(-9),
                LastLogin = SeedTime.AddHours(-4),
                IsEmailVerified = true,
                EmailVerifiedAt = SeedTime.AddDays(-9),
                CreatedByAdmin = false,
                Role = UserRole.Learner,
                Province = "Quảng Bình",
                Group = "Cán bộ xã/phường"
            },
            new User
            {
                Id = "learner-03",
                Username = "learner03",
                Email = "learner03@vnmac.local",
                FullName = "Nguyễn Thanh Hiền",
                PhoneNumber = "0930000003",
                CreatedAt = SeedTime.AddDays(-8),
                LastLogin = SeedTime.AddHours(-8),
                IsEmailVerified = true,
                EmailVerifiedAt = SeedTime.AddDays(-8),
                CreatedByAdmin = false,
                Role = UserRole.Learner,
                Province = "Quảng Trị",
                Group = "Người dân"
            },
            new User
            {
                Id = "learner-04",
                Username = "learner04",
                Email = "learner04@vnmac.local",
                FullName = "Hoàng Minh Quân",
                PhoneNumber = "0930000004",
                CreatedAt = SeedTime.AddDays(-7),
                LastLogin = SeedTime.AddHours(-2),
                IsEmailVerified = true,
                EmailVerifiedAt = SeedTime.AddDays(-7),
                CreatedByAdmin = false,
                Role = UserRole.Learner,
                Province = "Hà Tĩnh",
                Group = "Cán bộ xã/phường"
            }
        ];
    }

    private static List<ProgressTracking> BuildProgressTrackings()
    {
        var lessonIds = OrderedLessonIds();
        var rows = new List<ProgressTracking>();

        rows.AddRange(BuildDefaultProgress("learner-01", lessonIds));
        rows.AddRange(BuildDefaultProgress("learner-02", lessonIds));
        rows.AddRange(BuildDefaultProgress("learner-03", lessonIds));
        rows.AddRange(BuildDefaultProgress("learner-04", lessonIds));

        ApplyCompletedLesson(rows, "learner-01", "lesson-video-1", 100, 6);
        ApplyInteractiveProgress(rows, "learner-01", "lesson-interactive-1", LessonProgressStatus.Completed, 2);
        ApplyCompletedLesson(rows, "learner-01", "lesson-quiz-1");
        ApplyCompletedLesson(rows, "learner-01", "lesson-video-2", 100, 7);
        ApplyInteractiveProgress(rows, "learner-01", "lesson-interactive-2", LessonProgressStatus.Completed, 1);
        ApplyCompletedLesson(rows, "learner-01", "lesson-quiz-2");

        ApplyCompletedLesson(rows, "learner-02", "lesson-video-1", 100, 6);
        ApplyInteractiveProgress(rows, "learner-02", "lesson-interactive-1", LessonProgressStatus.Completed, 1);
        ApplyCompletedLesson(rows, "learner-02", "lesson-quiz-1");
        ApplyCompletedLesson(rows, "learner-02", "lesson-video-2", 100, 7);
        ApplyInteractiveProgress(rows, "learner-02", "lesson-interactive-2", LessonProgressStatus.InProgress, 2);

        ApplyCompletedLesson(rows, "learner-03", "lesson-video-1", 100, 6);
        ApplyInteractiveProgress(rows, "learner-03", "lesson-interactive-1", LessonProgressStatus.Completed, 2);
        ApplyCompletedLesson(rows, "learner-03", "lesson-quiz-1");
        ApplyVideoInProgress(rows, "learner-03", "lesson-video-2", 40, 3);

        ApplyCompletedLesson(rows, "learner-04", "lesson-video-1", 100, 6);
        ApplyInteractiveProgress(rows, "learner-04", "lesson-interactive-1", LessonProgressStatus.Completed, 1);
        ApplyCompletedLesson(rows, "learner-04", "lesson-quiz-1");
        ApplyCompletedLesson(rows, "learner-04", "lesson-video-2", 100, 7);
        ApplyInteractiveProgress(rows, "learner-04", "lesson-interactive-2", LessonProgressStatus.Completed, 1);
        ApplyCompletedLesson(rows, "learner-04", "lesson-quiz-2");

        return rows;
    }

    private static List<QuizResult> BuildQuizResults()
    {
        return
        [
            new QuizResult { UserId = "learner-01", LessonId = "lesson-quiz-1", Score = 100, Attempts = 2, LastAttemptAt = SeedTime.AddDays(-2) },
            new QuizResult { UserId = "learner-01", LessonId = "lesson-quiz-2", Score = 100, Attempts = 1, LastAttemptAt = SeedTime.AddDays(-1) },
            new QuizResult { UserId = "learner-02", LessonId = "lesson-quiz-1", Score = 100, Attempts = 1, LastAttemptAt = SeedTime.AddDays(-3) },
            new QuizResult { UserId = "learner-02", LessonId = "lesson-quiz-2", Score = 0, Attempts = 0, LastAttemptAt = null },
            new QuizResult { UserId = "learner-03", LessonId = "lesson-quiz-1", Score = 100, Attempts = 2, LastAttemptAt = SeedTime.AddDays(-2) },
            new QuizResult { UserId = "learner-03", LessonId = "lesson-quiz-2", Score = 0, Attempts = 0, LastAttemptAt = null },
            new QuizResult { UserId = "learner-04", LessonId = "lesson-quiz-1", Score = 100, Attempts = 1, LastAttemptAt = SeedTime.AddDays(-1) },
            new QuizResult { UserId = "learner-04", LessonId = "lesson-quiz-2", Score = 100, Attempts = 1, LastAttemptAt = SeedTime.AddDays(-1) }
        ];
    }

    private static List<QuizAttempt> BuildQuizAttempts()
    {
        return
        [
            BuildQuizAttempt("learner-01", "lesson-quiz-1", 1, 67, ["q2"], SeedTime.AddDays(-4)),
            BuildQuizAttempt("learner-01", "lesson-quiz-1", 2, 100, [], SeedTime.AddDays(-2)),
            BuildQuizAttempt("learner-01", "lesson-quiz-2", 1, 100, [], SeedTime.AddDays(-1)),
            BuildQuizAttempt("learner-02", "lesson-quiz-1", 1, 100, [], SeedTime.AddDays(-3)),
            BuildQuizAttempt("learner-03", "lesson-quiz-1", 1, 67, ["q3"], SeedTime.AddDays(-4)),
            BuildQuizAttempt("learner-03", "lesson-quiz-1", 2, 100, [], SeedTime.AddDays(-2)),
            BuildQuizAttempt("learner-04", "lesson-quiz-1", 1, 100, [], SeedTime.AddDays(-2)),
            BuildQuizAttempt("learner-04", "lesson-quiz-2", 1, 100, [], SeedTime.AddDays(-1))
        ];
    }

    private static List<InteractionAttempt> BuildInteractionAttempts()
    {
        return
        [
            BuildInteractionAttempt("learner-01", "lesson-interactive-1", 1, false, [("itf-1", false), ("ihs-1", false), ("idd-1", true)]),
            BuildInteractionAttempt("learner-01", "lesson-interactive-1", 2, true, [("itf-1", true), ("ihs-1", true), ("idd-1", true)]),
            BuildInteractionAttempt("learner-01", "lesson-interactive-2", 1, true, [("itf-3", true), ("isc-1", true), ("itf-4", true)]),
            BuildInteractionAttempt("learner-02", "lesson-interactive-1", 1, true, [("itf-1", true), ("ihs-1", true), ("idd-1", true)]),
            BuildInteractionAttempt("learner-02", "lesson-interactive-2", 1, false, [("itf-3", true), ("isc-1", false), ("itf-4", false)]),
            BuildInteractionAttempt("learner-02", "lesson-interactive-2", 2, false, [("itf-3", true), ("isc-1", false), ("itf-4", false)]),
            BuildInteractionAttempt("learner-03", "lesson-interactive-1", 1, false, [("itf-1", true), ("ihs-1", false), ("idd-1", false)]),
            BuildInteractionAttempt("learner-03", "lesson-interactive-1", 2, true, [("itf-1", true), ("ihs-1", true), ("idd-1", true)]),
            BuildInteractionAttempt("learner-04", "lesson-interactive-1", 1, true, [("itf-1", true), ("ihs-1", true), ("idd-1", true)]),
            BuildInteractionAttempt("learner-04", "lesson-interactive-2", 1, true, [("itf-3", true), ("isc-1", true), ("itf-4", true)])
        ];
    }

    private static List<Certificate> BuildCertificates()
    {
        return
        [
            new Certificate
            {
                UserId = "learner-01",
                CourseId = CourseId,
                CertificateId = "CERT-0001-20260412",
                IssuedDate = SeedTime.AddDays(-1),
                QrCode = "verify:learner-01:CERT-0001-20260412"
            },
            new Certificate
            {
                UserId = "learner-04",
                CourseId = CourseId,
                CertificateId = "CERT-0004-20260412",
                IssuedDate = SeedTime.AddDays(-1),
                QrCode = "verify:learner-04:CERT-0004-20260412"
            }
        ];
    }

    private static List<CourseEnrollment> BuildCourseEnrollments()
    {
        return
        [
            new CourseEnrollment
            {
                UserId = "learner-01",
                CourseId = CourseId,
                EnrolledAt = SeedTime.AddDays(-10),
                StartedAt = SeedTime.AddDays(-10),
                CompletedAt = SeedTime.AddDays(-1),
                LastAccessedAt = SeedTime.AddHours(-6),
                Status = CourseEnrollmentStatus.Completed
            },
            new CourseEnrollment
            {
                UserId = "learner-02",
                CourseId = CourseId,
                EnrolledAt = SeedTime.AddDays(-9),
                StartedAt = SeedTime.AddDays(-9),
                CompletedAt = null,
                LastAccessedAt = SeedTime.AddHours(-4),
                Status = CourseEnrollmentStatus.InProgress
            },
            new CourseEnrollment
            {
                UserId = "learner-03",
                CourseId = CourseId,
                EnrolledAt = SeedTime.AddDays(-8),
                StartedAt = SeedTime.AddDays(-8),
                CompletedAt = null,
                LastAccessedAt = SeedTime.AddHours(-8),
                Status = CourseEnrollmentStatus.InProgress
            },
            new CourseEnrollment
            {
                UserId = "learner-04",
                CourseId = CourseId,
                EnrolledAt = SeedTime.AddDays(-7),
                StartedAt = SeedTime.AddDays(-7),
                CompletedAt = SeedTime.AddDays(-1),
                LastAccessedAt = SeedTime.AddHours(-2),
                Status = CourseEnrollmentStatus.Completed
            }
        ];
    }

    private static List<ProgressTracking> BuildDefaultProgress(string userId, IEnumerable<string> lessonIds)
    {
        return
        [
            .. lessonIds.Select(lessonId => new ProgressTracking
            {
                UserId = userId,
                LessonId = lessonId,
                Status = LessonProgressStatus.NotStarted,
                CompletionTime = null,
                WatchPercent = 0,
                WatchTimeMinutes = 0,
                InteractionAttempts = 0
            })
        ];
    }

    private static void ApplyCompletedLesson(List<ProgressTracking> rows, string userId, string lessonId, int watchPercent = 0, int watchTimeMinutes = 0)
    {
        var row = rows.Single(item => item.UserId == userId && item.LessonId == lessonId);
        row.Status = LessonProgressStatus.Completed;
        row.CompletionTime = SeedTime.AddHours(-12);
        row.WatchPercent = watchPercent;
        row.WatchTimeMinutes = watchTimeMinutes;
    }

    private static void ApplyVideoInProgress(List<ProgressTracking> rows, string userId, string lessonId, int watchPercent, int watchTimeMinutes)
    {
        var row = rows.Single(item => item.UserId == userId && item.LessonId == lessonId);
        row.Status = LessonProgressStatus.InProgress;
        row.WatchPercent = watchPercent;
        row.WatchTimeMinutes = watchTimeMinutes;
    }

    private static void ApplyInteractiveProgress(List<ProgressTracking> rows, string userId, string lessonId, LessonProgressStatus status, int attempts)
    {
        var row = rows.Single(item => item.UserId == userId && item.LessonId == lessonId);
        row.Status = status;
        row.InteractionAttempts = attempts;
        row.CompletionTime = status == LessonProgressStatus.Completed ? SeedTime.AddHours(-10) : null;
    }

    private static List<string> OrderedLessonIds()
    {
        return
        [
            "lesson-video-1",
            "lesson-interactive-1",
            "lesson-quiz-1",
            "lesson-video-2",
            "lesson-interactive-2",
            "lesson-quiz-2"
        ];
    }

    private static InteractionAttempt BuildInteractionAttempt(
        string userId,
        string lessonId,
        int attemptNumber,
        bool passed,
        IReadOnlyCollection<(string TaskId, bool Correct)> taskResults)
    {
        return new InteractionAttempt
        {
            UserId = userId,
            LessonId = lessonId,
            AttemptNumber = attemptNumber,
            Passed = passed,
            AttemptedAt = SeedTime.AddHours(-attemptNumber),
            QuestionResults =
            [
                .. taskResults.Select(result => new InteractionTaskResult
                {
                    TaskId = result.TaskId,
                    Correct = result.Correct,
                    Explanation = result.Correct ? "Chính xác." : "Hãy thử lại và chọn phương án an toàn nhất."
                })
                .Select(result => new InteractionAttemptResult
                {
                    UserId = userId,
                    LessonId = lessonId,
                    AttemptNumber = attemptNumber,
                    QuestionId = result.TaskId,
                    Correct = result.Correct,
                    Explanation = result.Explanation
                })
            ]
        };
    }

    private static QuizAttempt BuildQuizAttempt(
        string userId,
        string lessonId,
        int attemptNumber,
        int score,
        IReadOnlyCollection<string> wrongQuestionIds,
        DateTimeOffset attemptedAt)
    {
        return new QuizAttempt
        {
            UserId = userId,
            LessonId = lessonId,
            AttemptNumber = attemptNumber,
            Score = score,
            AttemptedAt = attemptedAt,
            WrongQuestions =
            [
                .. wrongQuestionIds.Select(questionId => new QuizAttemptWrongQuestion
                {
                    UserId = userId,
                    LessonId = lessonId,
                    AttemptNumber = attemptNumber,
                    QuestionId = questionId
                })
            ]
        };
    }
}

public sealed record SeedSnapshot(
    List<User> Users,
    List<Course> Courses,
    List<CourseEnrollment> CourseEnrollments,
    List<ProgressTracking> ProgressTrackings,
    List<QuizResult> QuizResults,
    List<QuizAttempt> QuizAttempts,
    List<InteractionAttempt> InteractionAttempts,
    List<Certificate> Certificates);
