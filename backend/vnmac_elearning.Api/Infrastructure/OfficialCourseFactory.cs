using vnmac_elearning.Api.Domain;

namespace vnmac_elearning.Api.Infrastructure;

internal static class OfficialCourseFactory
{
    public static Course Build(string courseId)
    {
        const string eoreSectionId = "section-eore";
        const string sbcSectionId = "section-sbc";
        const string finalSectionId = "section-final-assessment";

        return new Course
        {
            Id = courseId,
            Title = "Giáo dục phòng tránh bom mìn (EORE) & Truyền thông thay đổi hành vi (SBC)",
            Description = "Khóa học e-Learning giúp người học nhận diện vật nổ, thực hành hành vi an toàn và truyền đạt thông điệp phòng tránh bom mìn phù hợp trong cộng đồng.",
            Status = CourseStatus.Published,
            Sections =
            [
                new CourseSection
                {
                    Id = eoreSectionId,
                    CourseId = courseId,
                    Title = "Phần 1 - Giáo dục phòng tránh tai nạn bom mìn vật nổ (EORE)",
                    Description = "Nhận diện vật nổ, tránh hành vi nguy hiểm, thực hiện hành vi an toàn, đánh dấu và báo cáo đúng cách.",
                    Order = 1,
                    Lessons =
                    [
                        BuildVideoLesson(courseId, eoreSectionId, "lesson-1-1", "Bài 1.1 - Nhận diện vật nổ", 1, "Trong cuộc sống hằng ngày, chúng ta có thể gặp những vật lạ nguy hiểm. Bài học này giúp bạn nhận biết và xử lý an toàn.", "Nhận biết - Tránh xa - Báo ngay.", ["Nhận biết một số loại vật nổ thường gặp", "Phân biệt vật nguy hiểm, không chắc và an toàn", "Biết cách xử lý đúng khi gặp vật lạ"], ["Không chạm vào vật lạ", "Tránh xa ngay lập tức", "Báo cho người có trách nhiệm"], BuildQuestions("l11", [1, 2, 3, 4, 5])),
                        BuildInteractiveLesson(courseId, eoreSectionId, "lesson-1-2", "Bài 1.2 - Hành vi nguy hiểm", 2, "Nhiều tai nạn xảy ra do hành vi thiếu an toàn. Bài học này giúp bạn nhận biết và tránh các hành vi nguy hiểm.", ["Nhận biết các hành vi nguy hiểm liên quan đến vật nổ", "Hiểu hậu quả có thể xảy ra", "Tránh các hành vi sai trong thực tế"], BuildQuestions("l12", [11, 12, 13, 14, 15])),
                        BuildInteractiveLesson(courseId, eoreSectionId, "lesson-1-3", "Bài 1.3 - Hành vi an toàn", 3, "Khi gặp vật lạ, bạn cần làm gì để an toàn?", ["Biết cách xử lý an toàn", "Ghi nhớ 4 bước cơ bản", "Áp dụng trong thực tế"], BuildQuestions("l13", [21, 22, 23, 24, 25])),
                        BuildInteractiveLesson(courseId, eoreSectionId, "lesson-1-4", "Bài 1.4 - Đánh dấu & báo cáo", 4, "Khi phát hiện vật nổ, bạn cần cảnh báo và báo cáo đúng cách.", ["Biết cách cảnh báo khu vực nguy hiểm", "Biết cách báo đúng người", "Tránh gây nguy hiểm cho người khác"], BuildQuestions("l14", [31, 32, 33, 34, 35]))
                    ]
                },
                new CourseSection
                {
                    Id = sbcSectionId,
                    CourseId = courseId,
                    Title = "Phần 2 - Truyền thông thay đổi hành vi (SBC)",
                    Description = "Hướng dẫn cách nói ngắn, rõ, phù hợp từng nhóm đối tượng và dẫn dắt thảo luận cộng đồng.",
                    Order = 2,
                    Lessons =
                    [
                        BuildInteractiveLesson(courseId, sbcSectionId, "lesson-2-1", "Bài 2.1 - Thông điệp hiệu quả", 1, "Nói đúng cách giúp người dân dễ hiểu và làm theo.", ["Biết cách nói thông điệp ngắn, rõ, dễ nhớ", "Tránh nói dài, khó hiểu"], BuildQuestions("l21", [41, 42, 43, 44, 45])),
                        BuildInteractiveLesson(courseId, sbcSectionId, "lesson-2-2", "Bài 2.2 - Đối tượng & thông điệp", 2, "Mỗi người cần cách nói khác nhau.", ["Biết nói phù hợp từng đối tượng", "Không dùng một cách nói cho tất cả"], BuildQuestions("l22", [46, 47, 48, 49, 50])),
                        BuildInteractiveLesson(courseId, sbcSectionId, "lesson-2-3", "Bài 2.3 - Tổ chức thảo luận cộng đồng", 3, "Một buổi nói chuyện tốt giúp thay đổi hành vi.", ["Biết cách tổ chức buổi truyền thông", "Biết cách dẫn dắt người dân"], BuildQuestions("l23", [41, 43, 45, 49, 50]))
                    ]
                },
                new CourseSection
                {
                    Id = finalSectionId,
                    CourseId = courseId,
                    Title = "Phần 3 - Bài kiểm tra cuối khóa",
                    Description = "Bài kiểm tra tổng hợp EORE và SBC. Người học cần đạt 100% để hoàn thành khóa học và nhận chứng chỉ.",
                    Order = 3,
                    Lessons =
                    [
                        new Lesson
                        {
                            Id = "lesson-final-quiz",
                            CourseId = courseId,
                            SectionId = finalSectionId,
                            Title = "Bài kiểm tra cuối khóa",
                            Type = LessonType.Quiz,
                            Order = 1,
                            DurationMinutes = 7,
                            Topic = "Phần 3 - Bài kiểm tra cuối khóa",
                            Difficulty = LessonDifficulty.Advanced,
                            PublicationStatus = LessonPublicationStatus.Published,
                            ThumbnailUrl = $"https://picsum.photos/seed/{Uri.EscapeDataString("lesson-final-quiz")}/240/160",
                            CreatedAt = new DateTimeOffset(2026, 5, 20, 8, 30, 0, TimeSpan.Zero),
                            UpdatedAt = new DateTimeOffset(2026, 5, 20, 8, 30, 0, TimeSpan.Zero),
                            StatusLabel = "Đạt 100% để hoàn thành khóa học",
                            Assessment = BuildOfficialFinalAssessment()
                        }
                    ]
                }
            ],
            Quizzes =
            [
                new CourseQuiz
                {
                    Id = "quiz-final",
                    CourseId = courseId,
                    SectionId = finalSectionId,
                    AssessmentLessonId = "lesson-final-quiz",
                    Title = "Bài kiểm tra cuối khóa",
                    Description = "12 câu hỏi tổng hợp về nhận diện, hành vi an toàn, đánh dấu báo cáo và truyền thông thay đổi hành vi.",
                    Order = 1
                }
            ]
        };
    }

    private static Lesson BuildVideoLesson(
        string courseId,
        string sectionId,
        string lessonId,
        string title,
        int order,
        string intro,
        string highlight,
        string[] objectives,
        string[] checkpoints,
        IReadOnlyCollection<LessonQuestion> questions)
    {
        var lesson = new Lesson
        {
            Id = lessonId,
            CourseId = courseId,
            SectionId = sectionId,
            Title = title,
            Type = LessonType.Interactive,
            Order = order,
            DurationMinutes = 5,
            StatusLabel = "Làm đúng 100% để mở bài tiếp theo",
            Content = BuildLessonContent(lessonId),
            VideoContent = new VideoContent
            {
                Intro = intro,
                VideoUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
                PosterUrl = $"https://picsum.photos/seed/{Uri.EscapeDataString(lessonId)}/960/540",
                Objectives = [.. objectives],
                Checkpoints = [.. checkpoints],
                TranscriptHighlight = highlight
            }
        };

        ApplyAdminMetadata(lesson);
        return lesson;
    }

    private static Lesson BuildInteractiveLesson(string courseId, string sectionId, string lessonId, string title, int order, string intro, string[] objectives, IReadOnlyCollection<LessonQuestion> questions)
    {
        var lesson = new Lesson
        {
            Id = lessonId,
            CourseId = courseId,
            SectionId = sectionId,
            Title = title,
            Type = LessonType.Interactive,
            Order = order,
            DurationMinutes = 5,
            StatusLabel = "Làm đúng 100% để mở bài tiếp theo",
            Content = BuildLessonContent(lessonId),
            VideoContent = new VideoContent
            {
                Intro = intro,
                VideoUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
                PosterUrl = $"https://picsum.photos/seed/{Uri.EscapeDataString(lessonId)}/960/540",
                Objectives = [.. objectives],
                Checkpoints = ["Học đi đôi với thực hành", "Có phản hồi ngay lập tức", "Được làm lại không giới hạn"],
                TranscriptHighlight = "Hoàn thành hoạt động thực hành và bài kiểm tra với 100% câu trả lời đúng."
            }
        };

        ApplyAdminMetadata(lesson);
        return lesson;
    }

    private static LessonContent? BuildLessonContent(string lessonId)
    {
        return lessonId switch
        {
            "lesson-1-1" => new LessonContent
            {
                Summary = "Bài học giúp người học nhận biết một số loại bom, mìn, đạn pháo và vật nổ thường gặp trong đời sống hằng ngày.",
                CoreMessage = "Nhận biết - Tránh xa - Báo ngay",
                MainContentType = "Video hoặc slide",
                Steps = BuildLessonSteps(lessonId),
                Objectives =
                [
                    "Nhận biết một số loại bom, mìn, đạn pháo và vật nổ thường gặp.",
                    "Hiểu rằng vật nổ có thể xuất hiện trên ruộng, trong rừng, ven đường, dưới nước hoặc khu dân cư.",
                    "Nhận biết vật đã gỉ sét, biến dạng vẫn có thể rất nguy hiểm.",
                    "Khi không chắc chắn, phải coi vật đó là nguy hiểm."
                ],
                MainPoints =
                [
                    "Vật nổ có thể còn sót lại sau chiến tranh ở nhiều địa điểm khác nhau.",
                    "Vật gỉ sét, móp méo, biến dạng vẫn có thể phát nổ.",
                    "Không cần xác định chính xác loại vật; nếu nghi ngờ phải tránh xa và báo ngay."
                ],
                InteractionTypes = ["Kéo - thả", "Chọn đáp án"],
                Activities =
                [
                    new LessonContentActivity
                    {
                        Type = "Kéo - thả",
                        Title = "Phân loại vật thể",
                        Instruction = "Kéo hình ảnh vào ba nhóm phù hợp.",
                        Items = ["Bom, mìn, đạn pháo", "Vật kim loại gỉ sét hoặc biến dạng", "Vật sinh hoạt an toàn"],
                        Targets = ["Nguy hiểm", "Không chắc", "An toàn"],
                        Feedback = "Khi không chắc chắn, hãy coi vật đó là nguy hiểm và tránh xa."
                    }
                ],
                ReinforcementPoints =
                [
                    "Không chạm vào vật lạ.",
                    "Tránh xa ngay lập tức.",
                    "Báo cho người có trách nhiệm."
                ],
                Quiz = new LessonContentQuiz
                {
                    QuestionCount = 5,
                    PassScore = 100,
                    Description = "5 câu hỏi kiểm tra về nhận diện vật nổ và nguyên tắc xử lý khi không chắc chắn."
                },
                Completion = new LessonCompletionContent
                {
                    Title = "Hoàn thành Bài 1.1",
                    Message = "Bạn đã nắm nguyên tắc nhận biết, tránh xa và báo ngay.",
                    NextActionLabel = "Sang bài 1.2"
                }
            },
            "lesson-1-2" => new LessonContent
            {
                Summary = "Bài học chỉ ra những hành vi dễ gây tai nạn khi gặp vật lạ hoặc vật nghi là bom mìn, vật nổ.",
                CoreMessage = "Không chạm - Không thử - Không mang về",
                MainContentType = "Video hoặc slide",
                Steps = BuildLessonSteps(lessonId),
                Objectives =
                [
                    "Nhận biết các hành vi nguy hiểm liên quan đến vật nổ.",
                    "Hiểu vì sao vật nhỏ, vật cũ hoặc vật đã gỉ vẫn có thể gây tai nạn.",
                    "Biết cách xử lý tình huống khi phát hiện vật kim loại lạ trong rừng hoặc ngoài đồng."
                ],
                MainPoints =
                [
                    "Không chạm hoặc nhặt vật lạ.",
                    "Không đào bới, đập, chọc hoặc thử vật.",
                    "Không mang vật về nhà hoặc bán phế liệu.",
                    "Không rủ người khác đến xem hoặc đứng gần để chụp ảnh.",
                    "Không cho rằng vật nhỏ hoặc vật cũ sẽ an toàn."
                ],
                InteractionTypes = ["Đúng - sai", "Chọn đáp án", "Xử lý tình huống thực tế"],
                Activities =
                [
                    new LessonContentActivity
                    {
                        Type = "Đúng - sai",
                        Title = "Phân loại hành động",
                        Instruction = "Chọn hành động đúng hoặc sai khi gặp vật lạ.",
                        Items = ["Nhặt vật lên xem", "Tránh xa và báo người lớn", "Đập thử vật", "Rủ người khác đến xem"],
                        Targets = ["Đúng", "Sai"],
                        Feedback = "Mọi hành động chạm, thử, mang về hoặc tụ tập xem đều làm tăng nguy cơ tai nạn."
                    },
                    new LessonContentActivity
                    {
                        Type = "Xử lý tình huống thực tế",
                        Title = "Vật kim loại lạ ngoài đồng",
                        Instruction = "Chọn cách xử lý khi phát hiện vật kim loại lạ trong rừng hoặc ngoài đồng.",
                        Items = ["Dừng lại", "Tránh xa", "Cảnh báo người xung quanh", "Báo người có trách nhiệm"],
                        Targets = ["Hành vi an toàn"],
                        Feedback = "Cách an toàn là không chạm, rời khỏi khu vực và báo ngay."
                    }
                ],
                ReinforcementPoints =
                [
                    "Không thử vật lạ bằng bất kỳ cách nào.",
                    "Không mang vật nghi nguy hiểm về nhà.",
                    "Nhắc người xung quanh tránh xa."
                ],
                Quiz = new LessonContentQuiz
                {
                    QuestionCount = 5,
                    PassScore = 100,
                    Description = "5 câu hỏi kiểm tra nhận diện hành vi nguy hiểm và lựa chọn hành vi an toàn."
                },
                Completion = new LessonCompletionContent
                {
                    Title = "Hoàn thành Bài 1.2",
                    Message = "Bạn đã biết các hành vi cần tránh khi gặp vật lạ.",
                    NextActionLabel = "Sang bài 1.3"
                }
            },
            "lesson-1-3" => new LessonContent
            {
                Summary = "Bài học hướng dẫn quy trình xử lý an toàn khi phát hiện vật nghi là bom mìn, vật nổ.",
                CoreMessage = "Không chạm - Tránh xa - Đánh dấu - Báo ngay",
                MainContentType = "Video hoặc slide",
                Steps = BuildLessonSteps(lessonId),
                Objectives =
                [
                    "Ghi nhớ bốn bước xử lý an toàn khi phát hiện vật nghi nguy hiểm.",
                    "Sắp xếp đúng thứ tự hành động trong các tình huống thực tế.",
                    "Có thể thực hiện đúng quy trình tại gần nhà, trên đường đi hoặc khu vực sản xuất."
                ],
                MainPoints =
                [
                    "Không chạm vào vật nghi nguy hiểm.",
                    "Tránh xa khu vực có nguy cơ.",
                    "Đánh dấu hoặc cảnh báo từ khoảng cách an toàn.",
                    "Báo ngay cho chính quyền địa phương hoặc lực lượng có trách nhiệm."
                ],
                InteractionTypes = ["Sắp xếp thứ tự hành động", "Chọn đáp án", "Xử lý tình huống thực tế"],
                Activities =
                [
                    new LessonContentActivity
                    {
                        Type = "Sắp xếp thứ tự hành động",
                        Title = "Quy trình an toàn",
                        Instruction = "Sắp xếp đúng thứ tự hành động khi phát hiện vật lạ.",
                        Items = ["Không chạm", "Tránh xa", "Đánh dấu", "Báo ngay"],
                        Targets = ["Bước 1", "Bước 2", "Bước 3", "Bước 4"],
                        Feedback = "Thứ tự đúng giúp giảm nguy cơ cho bản thân và cộng đồng."
                    }
                ],
                ReinforcementPoints =
                [
                    "Không quay lại khu vực nguy hiểm.",
                    "Cảnh báo người xung quanh tránh xa.",
                    "Báo ngay khi đã ở vị trí an toàn."
                ],
                Quiz = new LessonContentQuiz
                {
                    QuestionCount = 5,
                    PassScore = 100,
                    Description = "5 câu hỏi kiểm tra thứ tự hành động và quy trình xử lý an toàn."
                },
                Completion = new LessonCompletionContent
                {
                    Title = "Hoàn thành Bài 1.3",
                    Message = "Bạn đã ghi nhớ quy trình xử lý an toàn khi phát hiện vật nghi nguy hiểm.",
                    NextActionLabel = "Sang bài 1.4"
                }
            },
            "lesson-1-4" => new LessonContent
            {
                Summary = "Bài học hướng dẫn cách đánh dấu khu vực nguy hiểm và báo cáo đúng người, đúng cách.",
                CoreMessage = "Đánh dấu an toàn - Cảnh báo - Báo ngay",
                MainContentType = "Video hoặc slide",
                Steps = BuildLessonSteps(lessonId),
                Objectives =
                [
                    "Biết cách đánh dấu khu vực nguy hiểm từ khoảng cách an toàn.",
                    "Biết dùng cành cây, dây hoặc vật có sẵn để cảnh báo mà không tiếp cận vật.",
                    "Biết cảnh báo người xung quanh và báo cho lực lượng có trách nhiệm."
                ],
                MainPoints =
                [
                    "Đánh dấu khu vực nguy hiểm từ khoảng cách an toàn.",
                    "Không tiến lại gần hoặc chạm vào vật để đánh dấu.",
                    "Có thể dùng cành cây, dây hoặc vật có sẵn để cảnh báo.",
                    "Cảnh báo người xung quanh tránh xa.",
                    "Báo ngay cho chính quyền địa phương hoặc lực lượng có trách nhiệm."
                ],
                InteractionTypes = ["Nhấp chọn vị trí an toàn", "Chọn đáp án", "Xử lý tình huống thực tế"],
                Activities =
                [
                    new LessonContentActivity
                    {
                        Type = "Nhấp chọn vị trí an toàn",
                        Title = "Chọn vị trí đánh dấu",
                        Instruction = "Chọn vị trí có thể đánh dấu hoặc cảnh báo mà không tiến lại gần vật nghi nguy hiểm.",
                        Items = ["Vị trí xa vật, dễ nhìn", "Sát cạnh vật", "Đường người dân thường đi qua"],
                        Targets = ["An toàn", "Không an toàn"],
                        Feedback = "Chỉ đánh dấu từ xa, rõ ràng, không chạm vào vật."
                    },
                    new LessonContentActivity
                    {
                        Type = "Chọn đáp án",
                        Title = "Báo cho ai",
                        Instruction = "Chọn người hoặc đơn vị cần báo khi phát hiện vật lạ.",
                        Items = ["Chính quyền địa phương", "Lực lượng có trách nhiệm", "Bạn bè đến xem"],
                        Targets = ["Cần báo", "Không phù hợp"],
                        Feedback = "Cần báo cho chính quyền địa phương hoặc lực lượng có trách nhiệm."
                    }
                ],
                ReinforcementPoints =
                [
                    "Đánh dấu từ xa, không chạm vào vật.",
                    "Cảnh báo người khác tránh xa.",
                    "Báo ngay cho đúng người có trách nhiệm."
                ],
                Quiz = new LessonContentQuiz
                {
                    QuestionCount = 5,
                    PassScore = 100,
                    Description = "5 câu hỏi kiểm tra cách đánh dấu an toàn và báo cáo đúng người."
                },
                Completion = new LessonCompletionContent
                {
                    Title = "Hoàn thành Bài 1.4",
                    Message = "Bạn đã biết cách cảnh báo khu vực nguy hiểm và báo cáo đúng cách.",
                    NextActionLabel = "Sang bài 2.1"
                }
            },
            "lesson-2-1" => new LessonContent
            {
                Summary = "Bài học hướng dẫn cách xây dựng thông điệp truyền thông ngắn gọn, rõ ràng và hướng đến hành động.",
                CoreMessage = "Thông điệp ngắn - Rõ - Dễ làm theo",
                MainContentType = "Video hoặc slide",
                Steps = BuildLessonSteps(lessonId),
                Objectives =
                [
                    "Biết đặc điểm của một thông điệp truyền thông hiệu quả.",
                    "Phân biệt cách nói dài, khó hiểu với cách nói ngắn, rõ và trực tiếp.",
                    "Ghép thông điệp phù hợp với tình huống truyền thông."
                ],
                MainPoints =
                [
                    "Thông điệp cần ngắn gọn.",
                    "Thông điệp cần rõ ràng, dễ hiểu, dễ ghi nhớ.",
                    "Thông điệp cần hướng trực tiếp đến hành động cần thực hiện.",
                    "Cách nói chưa phù hợp: Các vật thể nguy hiểm tiềm ẩn nguy cơ cao.",
                    "Cách nói phù hợp: Không chạm vào vật lạ."
                ],
                InteractionTypes = ["Chọn đáp án", "Ghép đối tượng với thông điệp"],
                Activities =
                [
                    new LessonContentActivity
                    {
                        Type = "Chọn đáp án",
                        Title = "So sánh thông điệp",
                        Instruction = "Chọn thông điệp ngắn, rõ và dễ làm theo hơn.",
                        Items = ["Các vật thể nguy hiểm tiềm ẩn nguy cơ cao", "Không chạm vào vật lạ"],
                        Targets = ["Phù hợp", "Chưa phù hợp"],
                        Feedback = "Thông điệp tốt nên nói thẳng hành động an toàn cần làm."
                    },
                    new LessonContentActivity
                    {
                        Type = "Ghép đối tượng với thông điệp",
                        Title = "Thông điệp theo tình huống",
                        Instruction = "Ghép thông điệp phù hợp với từng tình huống truyền thông.",
                        Items = ["Không chạm vào vật lạ", "Tránh xa và báo ngay", "Báo chính quyền khi phát hiện vật nghi nguy hiểm"],
                        Targets = ["Phát hiện vật lạ", "Cảnh báo cộng đồng", "Báo cáo"],
                        Feedback = "Mỗi tình huống cần một thông điệp cụ thể, dễ nhớ."
                    }
                ],
                ReinforcementPoints =
                [
                    "Nói ngắn gọn.",
                    "Dùng từ đơn giản.",
                    "Nói rõ hành động cần làm."
                ],
                Quiz = new LessonContentQuiz
                {
                    QuestionCount = 5,
                    PassScore = 100,
                    Description = "5 câu hỏi kiểm tra cách nhận biết và xây dựng thông điệp hiệu quả."
                },
                Completion = new LessonCompletionContent
                {
                    Title = "Hoàn thành Bài 2.1",
                    Message = "Bạn đã biết cách chọn thông điệp ngắn, rõ và dễ hành động.",
                    NextActionLabel = "Sang bài 2.2"
                }
            },
            "lesson-2-2" => new LessonContent
            {
                Summary = "Bài học nhấn mạnh không thể dùng một cách truyền đạt cho mọi đối tượng.",
                CoreMessage = "Đúng người nghe - Đúng cách nói",
                MainContentType = "Video hoặc slide",
                Steps = BuildLessonSteps(lessonId),
                Objectives =
                [
                    "Nhận biết các nhóm đối tượng chính trong truyền thông cộng đồng.",
                    "Biết điều chỉnh cách nói cho trẻ em, người lớn và người dân địa phương.",
                    "Ghép từng nhóm đối tượng với thông điệp phù hợp."
                ],
                MainPoints =
                [
                    "Không thể dùng một cách truyền đạt cho mọi đối tượng.",
                    "Với trẻ em, cần nói đơn giản, trực tiếp: Không được chạm, rất nguy hiểm.",
                    "Với người lớn, cần nhấn mạnh trách nhiệm báo cho chính quyền hoặc lực lượng chức năng.",
                    "Với người dân địa phương, cần dùng ví dụ gần gũi với đời sống của họ."
                ],
                InteractionTypes = ["Ghép đối tượng với thông điệp", "Chọn đáp án"],
                Activities =
                [
                    new LessonContentActivity
                    {
                        Type = "Ghép đối tượng với thông điệp",
                        Title = "Chọn cách nói phù hợp",
                        Instruction = "Ghép từng nhóm đối tượng với cách nói phù hợp.",
                        Items = ["Không được chạm, rất nguy hiểm", "Báo cho chính quyền hoặc lực lượng chức năng", "Ví dụ gắn với nơi sản xuất, đường đi, khu dân cư"],
                        Targets = ["Trẻ em", "Người lớn", "Người dân địa phương"],
                        Feedback = "Thông điệp hiệu quả cần phù hợp với người nghe."
                    }
                ],
                ReinforcementPoints =
                [
                    "Trẻ em cần ngôn ngữ đơn giản và trực tiếp.",
                    "Người lớn cần hiểu trách nhiệm báo cáo.",
                    "Người dân địa phương cần ví dụ gần gũi, dễ liên hệ."
                ],
                Quiz = new LessonContentQuiz
                {
                    QuestionCount = 5,
                    PassScore = 100,
                    Description = "5 câu hỏi kiểm tra cách điều chỉnh thông điệp theo nhóm đối tượng."
                },
                Completion = new LessonCompletionContent
                {
                    Title = "Hoàn thành Bài 2.2",
                    Message = "Bạn đã biết chọn cách truyền đạt phù hợp với từng nhóm người nghe.",
                    NextActionLabel = "Sang bài 2.3"
                }
            },
            "lesson-2-3" => new LessonContent
            {
                Summary = "Bài học hướng dẫn tổ chức một buổi truyền thông cộng đồng theo bốn bước và khuyến khích người dân tham gia.",
                CoreMessage = "Hỏi - Lắng nghe - Thảo luận - Kết luận",
                MainContentType = "Video hoặc slide",
                Steps = BuildLessonSteps(lessonId),
                Objectives =
                [
                    "Biết bốn bước tổ chức một buổi truyền thông cộng đồng.",
                    "Biết đặt câu hỏi, lắng nghe và dùng tình huống gần gũi.",
                    "Biết xử lý khi người dân mất tập trung hoặc không muốn tham gia."
                ],
                MainPoints =
                [
                    "Buổi truyền thông gồm bốn bước: Giới thiệu, Đặt câu hỏi, Thảo luận, Kết luận.",
                    "Không chỉ nói một chiều.",
                    "Đặt câu hỏi để người dân tham gia.",
                    "Lắng nghe ý kiến và mối lo của người dân.",
                    "Sử dụng tình huống, ví dụ gần gũi.",
                    "Khuyến khích người dân tự đưa ra hành vi an toàn."
                ],
                InteractionTypes = ["Sắp xếp thứ tự hành động", "Xử lý tình huống thực tế", "Chọn đáp án"],
                Activities =
                [
                    new LessonContentActivity
                    {
                        Type = "Sắp xếp thứ tự hành động",
                        Title = "Bốn bước thảo luận",
                        Instruction = "Sắp xếp đúng thứ tự tổ chức một buổi thảo luận cộng đồng.",
                        Items = ["Giới thiệu", "Đặt câu hỏi", "Thảo luận", "Kết luận"],
                        Targets = ["Bước 1", "Bước 2", "Bước 3", "Bước 4"],
                        Feedback = "Một buổi truyền thông tốt cần dẫn dắt rõ ràng và có kết luận hành động."
                    },
                    new LessonContentActivity
                    {
                        Type = "Xử lý tình huống thực tế",
                        Title = "Người dân mất tập trung",
                        Instruction = "Chọn cách xử lý khi người dân mất tập trung hoặc không muốn tham gia.",
                        Items = ["Đặt câu hỏi gần gũi", "Lắng nghe mối lo", "Dùng ví dụ thực tế", "Tiếp tục nói một chiều"],
                        Targets = ["Phù hợp", "Chưa phù hợp"],
                        Feedback = "Câu hỏi và ví dụ gần gũi giúp người dân tham gia chủ động hơn."
                    }
                ],
                ReinforcementPoints =
                [
                    "Không truyền thông một chiều.",
                    "Đặt câu hỏi để người dân tham gia.",
                    "Kết luận bằng hành vi an toàn cụ thể."
                ],
                Quiz = new LessonContentQuiz
                {
                    QuestionCount = 5,
                    PassScore = 100,
                    Description = "5 câu hỏi kiểm tra quy trình tổ chức thảo luận và xử lý tình huống cộng đồng."
                },
                Completion = new LessonCompletionContent
                {
                    Title = "Hoàn thành Bài 2.3",
                    Message = "Bạn đã biết cách tổ chức thảo luận cộng đồng theo hướng có sự tham gia.",
                    NextActionLabel = "Làm bài kiểm tra cuối khóa"
                }
            },
            _ => null
        };
    }

    private static List<LessonContentStep> BuildLessonSteps(string lessonId)
    {
        var steps = BuildDefaultLessonSteps();
        var scenario = GetLessonStepScenario(lessonId);
        if (scenario is null)
        {
            return steps;
        }

        var intro = GetStep(steps, "intro");
        intro.Title = scenario.Title;
        intro.Subtitle = "GIỚI THIỆU BÀI HỌC";
        intro.Body = scenario.IntroBody;
        intro.MediaType = "image";
        intro.MediaUrl = DemoImageUrl(lessonId, "intro");
        intro.MediaAlt = $"Minh họa {scenario.Title}";
        intro.ObjectiveImageUrl = DemoImageUrl(lessonId, "objective");
        intro.ObjectiveImageAlt = $"Mục tiêu {scenario.Title}";
        intro.ExplanationTitle = "Mục tiêu bài học";
        intro.Explanation = scenario.CoreMessage;
        intro.Points = [.. scenario.Objectives];
        intro.Tips = [scenario.CoreMessage];

        var video = GetStep(steps, "video");
        video.Title = "Xem video";
        video.Subtitle = "Nội dung chính";
        video.Body = scenario.VideoCaption;
        video.MediaType = "video";
        video.MediaUrl = string.Empty;
        video.PosterUrl = DemoImageUrl(lessonId, "video-poster");
        video.MediaAlt = $"Video {scenario.Title}";
        video.ObjectiveImageUrl = DemoImageUrl(lessonId, "video-sidebar");
        video.ObjectiveImageAlt = $"Nội dung chính {scenario.Title}";
        video.ExplanationTitle = "Nội dung chính";
        video.Explanation = scenario.VideoExplanation;
        video.AlertText = scenario.VideoAlert;
        video.Points = [.. scenario.VideoPoints];
        video.Tips = [scenario.CoreMessage];

        var activity = GetStep(steps, "activity");
        activity.Title = scenario.ActivityTitle;
        activity.Subtitle = scenario.ActivitySubtitle;
        activity.Instruction = scenario.ActivityInstruction;
        activity.AlertText = scenario.ActivityAlert;
        activity.PrimaryActionLabel = "Kiểm tra";
        activity.SecondaryActionLabel = "Tiếp tục";
        activity.MediaType = "image";
        activity.ObjectiveImageUrl = DemoImageUrl(lessonId, "activity-side");
        activity.ObjectiveImageAlt = $"Minh họa hoạt động {scenario.Title}";
        activity.ExplanationTitle = "Gợi ý thực hành";
        activity.Explanation = scenario.ActivityInstruction;
        activity.Targets = scenario.ActivityQuestions.Select(item => item.Prompt).ToList();
        activity.Items = scenario.ActivityQuestions.SelectMany(item => item.Answers).Select(item => item.Label).ToList();
        activity.DragQuestions = scenario.ActivityQuestions;
        activity.Tips = [.. scenario.Tips];
        activity.Feedback = scenario.ActivityFeedback;

        var reinforce = GetStep(steps, "reinforce");
        reinforce.Title = scenario.ReinforceTitle;
        reinforce.Subtitle = scenario.ReinforceSubtitle;
        reinforce.Body = scenario.ReinforceHtml;
        reinforce.MediaType = "image";
        reinforce.ObjectiveImageUrl = DemoImageUrl(lessonId, "tips");
        reinforce.ObjectiveImageAlt = $"Mẹo nhớ {scenario.Title}";
        reinforce.ExplanationTitle = "Mẹo nhớ";
        reinforce.Explanation = scenario.CoreMessage;
        reinforce.Points = [.. scenario.ReinforcePoints];
        reinforce.Tips = [.. scenario.Tips];
        reinforce.Feedback = scenario.ReinforceFeedback;

        var check = GetStep(steps, "check");
        check.Title = "Kiểm tra cuối bài";
        check.Subtitle = "Chọn câu trả lời đúng nhất.";
        check.Body = scenario.CheckQuestion.Prompt;
        check.AlertText = "Đạt 100% để hoàn thành bài học";
        check.MediaType = "image";
        check.MediaUrl = DemoImageUrl(lessonId, "check");
        check.MediaAlt = $"Câu hỏi kiểm tra {scenario.Title}";
        check.ExplanationTitle = "Thông tin bài kiểm tra";
        check.Explanation = $"Bài kiểm tra nhanh của {scenario.Title}.";
        check.Options = scenario.CheckQuestion.Options.Select(item => item.Label).ToList();
        check.Questions = BuildLessonContentCheckQuestions(scenario);
        check.Feedback = scenario.CheckFeedback;

        var complete = GetStep(steps, "complete");
        complete.Title = "Hoàn thành";
        complete.Subtitle = "Chúc mừng!";
        complete.Body = $"Bạn đã hoàn thành {scenario.Title}.";
        complete.PrimaryActionLabel = scenario.NextActionLabel;
        complete.SecondaryActionLabel = "Xem lại nội dung";
        complete.MediaType = "image";
        complete.MediaUrl = DemoImageUrl(lessonId, "complete");
        complete.MediaAlt = $"Hoàn thành {scenario.Title}";
        complete.ExplanationTitle = "Kết quả bài học";
        complete.Explanation = scenario.CompletionResult;
        complete.AlertText = "Đạt yêu cầu";
        complete.Points = [scenario.CompletionMessage, scenario.CoreMessage];
        complete.Tips = ["Học lại bài học", "Xem lại nội dung", scenario.NextActionLabel];

        return steps;
    }

    private static LessonContentStep GetStep(List<LessonContentStep> steps, string key)
    {
        return steps.Single(step => string.Equals(step.Key, key, StringComparison.OrdinalIgnoreCase));
    }

    private static string DemoImageUrl(string lessonId, string slot)
    {
        return $"https://picsum.photos/seed/vnmac-{Uri.EscapeDataString(lessonId)}-{Uri.EscapeDataString(slot)}/960/540";
    }

    private static LessonStepScenario? GetLessonStepScenario(string lessonId)
    {
        return lessonId switch
        {
            "lesson-1-1" => new LessonStepScenario
            {
                Title = "Nhận diện vật nổ",
                CoreMessage = "Nhận biết - Tránh xa - Báo ngay",
                IntroBody = "Trong cuộc sống hằng ngày, người học có thể gặp bom, mìn, đạn pháo hoặc vật kim loại lạ còn sót lại. Bài này giúp nhận biết dấu hiệu nguy hiểm và xử lý an toàn khi chưa chắc chắn.",
                Objectives =
                [
                    "Nhận biết một số loại vật nổ thường gặp.",
                    "Phân biệt vật nguy hiểm, không chắc và an toàn.",
                    "Luôn coi vật lạ là nguy hiểm khi chưa xác định được."
                ],
                VideoCaption = "Vật nổ có thể còn sót lại trên ruộng, trong rừng, ven đường, dưới nước hoặc ngay gần khu dân cư.",
                VideoExplanation = "Nhấn mạnh dấu hiệu nhận biết và nguyên tắc xử lý khi gặp vật nghi là bom mìn, vật nổ.",
                VideoAlert = "Hãy luôn cảnh giác! Khi không chắc chắn, hãy coi vật đó là nguy hiểm.",
                VideoPoints =
                [
                    "Bom, mìn, đạn pháo có thể còn sót lại sau chiến tranh.",
                    "Vật gỉ sét, móp méo vẫn có thể phát nổ.",
                    "Không cần xác định chính xác loại vật mới tránh xa.",
                    "Khi nghi ngờ, phải báo ngay cho người có trách nhiệm."
                ],
                ActivityTitle = "Phân loại vật thể",
                ActivitySubtitle = "Kéo từng vật vào nhóm phù hợp.",
                ActivityInstruction = "Quan sát từng vật, kéo vào nhóm Nguy hiểm, Không chắc hoặc An toàn.",
                ActivityAlert = "Khi không chắc chắn -> coi là nguy hiểm.",
                ActivityFeedback = "Chính xác. Vật nổ và vật kim loại lạ cần được xem là nguy hiểm, tránh xa và báo ngay.",
                ActivityQuestions =
                [
                    DragQuestion("l11-danger", 1, "Nguy hiểm", "Vật nổ chắc chắn hoặc có dấu hiệu rất nguy hiểm.", "red",
                        ("bom-pha", "Bom phá", "Có hình dạng giống bom đạn còn sót lại."),
                        ("min-chong-tang", "Mìn chống tăng", "Vật nổ dạng tròn, tuyệt đối không chạm."),
                        ("luu-dan", "Lựu đạn", "Vật nổ nhỏ nhưng rất nguy hiểm."),
                        ("dan-coi", "Đạn cối", "Đạn chưa nổ có thể phát nổ bất cứ lúc nào.")),
                    DragQuestion("l11-uncertain", 2, "Không chắc", "Vật lạ khó nhận biết, cần thận trọng.", "amber",
                        ("vat-la-gi-set", "Vật kim loại gỉ sét", "Không rõ nguồn gốc nên phải coi là nguy hiểm.")),
                    DragQuestion("l11-safe", 3, "An toàn", "Vật dụng thông thường, dễ nhận biết.", "green",
                        ("da", "Đá", "Vật tự nhiên quen thuộc."),
                        ("lon-nuoc", "Lon nước", "Vật dụng sinh hoạt đã nhận biết rõ."),
                        ("chai-nhua", "Chai nhựa", "Rác sinh hoạt thông thường."))
                ],
                ReinforceTitle = "Củng cố nhận diện",
                ReinforceSubtitle = "Ghi nhớ dấu hiệu nguy hiểm và cách xử lý.",
                ReinforceHtml = "<h2>Ghi nhớ quan trọng</h2><ul><li>Không chạm vào vật lạ.</li><li>Tránh xa ngay lập tức.</li><li>Báo cho người lớn hoặc người có trách nhiệm.</li></ul><p>Khi không chắc chắn, luôn coi vật đó là nguy hiểm.</p>",
                ReinforcePoints = ["Không chạm", "Tránh xa", "Báo ngay"],
                Tips = ["Nhận biết vật lạ", "Tránh xa khu vực nguy hiểm", "Báo ngay cho người có trách nhiệm"],
                ReinforceFeedback = "Bạn đã hoàn thành phần nhận diện.\nHãy tiếp tục kiểm tra lại nguyên tắc an toàn.",
                CheckQuestion = CheckQuestion("l11-check-1", "Bạn thấy một vật kim loại lạ trong ruộng, bạn nên làm gì?",
                    "Đây là hành vi an toàn. Cần tránh xa và báo ngay cho người có trách nhiệm.",
                    ("A", "Nhặt lên xem", false),
                    ("B", "Mang về nhà", false),
                    ("C", "Tránh xa và báo cho người lớn / người có trách nhiệm", true)),
                CheckFeedback = "Tránh xa và báo ngay là lựa chọn đúng khi gặp vật kim loại lạ.",
                CompletionMessage = "Bạn đã nắm được cách nhận diện vật nguy hiểm và phản ứng an toàn.",
                CompletionResult = "Hoàn thành bài nhận diện vật nổ với nguyên tắc cốt lõi.",
                NextActionLabel = "Sang bài 1.2"
            },
            "lesson-1-2" => new LessonStepScenario
            {
                Title = "Hành vi nguy hiểm",
                CoreMessage = "Không chạm - Không thử - Không mang về",
                IntroBody = "Bài học tập trung chỉ ra những hành vi dễ gây tai nạn như chạm, nhặt, đào bới, đập thử, mang vật lạ về nhà hoặc rủ người khác đến xem.",
                Objectives =
                [
                    "Nhận biết các hành vi nguy hiểm khi gặp vật lạ.",
                    "Hiểu vì sao vật nhỏ, cũ hoặc gỉ sét vẫn nguy hiểm.",
                    "Biết từ chối và ngăn người khác thực hiện hành vi sai."
                ],
                VideoCaption = "Nhiều tai nạn xảy ra không phải vì thiếu thông tin, mà vì tò mò, chủ quan hoặc thử chạm vào vật lạ.",
                VideoExplanation = "Làm rõ các hành vi sai thường gặp và hậu quả có thể xảy ra trong thực tế.",
                VideoAlert = "Không thử bất kỳ cách nào! Một hành động nhỏ có thể gây tai nạn nghiêm trọng.",
                VideoPoints =
                [
                    "Không chạm hoặc nhặt vật lạ.",
                    "Không đào bới, đập, chọc hoặc thử vật.",
                    "Không mang vật về nhà hoặc bán phế liệu.",
                    "Không rủ người khác đến xem hoặc đứng gần chụp ảnh."
                ],
                ActivityTitle = "Phân loại hành động",
                ActivitySubtitle = "Kéo hành động vào nhóm đúng.",
                ActivityInstruction = "Đọc từng hành động và phân loại là an toàn, nguy hiểm hoặc cần nhắc nhở.",
                ActivityAlert = "Tò mò với vật lạ là nguyên nhân dễ dẫn tới tai nạn.",
                ActivityFeedback = "Đúng rồi. Các hành động chạm, thử, mang về hoặc tụ tập xem đều phải tránh.",
                ActivityQuestions =
                [
                    DragQuestion("l12-safe", 1, "Hành vi an toàn", "Cách xử lý nên làm khi phát hiện vật lạ.", "green",
                        ("dung-lai", "Dừng lại và tránh xa", "Không tiếp tục đi vào khu vực nguy hiểm."),
                        ("bao-nguoi-lon", "Báo người có trách nhiệm", "Thông tin cho người lớn hoặc chính quyền.")),
                    DragQuestion("l12-danger", 2, "Hành vi nguy hiểm", "Hành vi có thể gây tai nạn.", "red",
                        ("nhat-len", "Nhặt vật lạ lên xem", "Tiếp xúc trực tiếp với vật nghi nguy hiểm."),
                        ("dap-thu", "Đập thử vật", "Tác động lực có thể làm vật phát nổ."),
                        ("mang-ve", "Mang về nhà hoặc bán phế liệu", "Di chuyển vật nguy hiểm vào khu dân cư."),
                        ("chup-anh", "Đứng gần để chụp ảnh", "Đứng quá gần khu vực nguy hiểm.")),
                    DragQuestion("l12-remind", 3, "Cần nhắc nhở", "Suy nghĩ chủ quan cần được sửa ngay.", "amber",
                        ("vat-nho-an-toan", "Vật nhỏ chắc không sao", "Vật nhỏ vẫn có thể rất nguy hiểm."),
                        ("ru-ban-xem", "Rủ bạn đến xem", "Tụ tập làm tăng nguy cơ cho nhiều người."))
                ],
                ReinforceTitle = "Củng cố hành vi đúng",
                ReinforceSubtitle = "Nhớ những việc tuyệt đối không làm.",
                ReinforceHtml = "<h2>Không làm 3 việc</h2><ol><li>Không chạm hoặc nhặt vật lạ.</li><li>Không thử, đập, chọc hoặc đào bới.</li><li>Không mang vật về nhà hay bán phế liệu.</li></ol><p>Nếu thấy người khác định làm, hãy nhắc họ tránh xa.</p>",
                ReinforcePoints = ["Không chạm", "Không thử", "Không mang về"],
                Tips = ["Dừng lại", "Tránh xa", "Nhắc người khác không đến gần", "Báo ngay"],
                ReinforceFeedback = "Bạn đã nhận diện được hành vi nguy hiểm.\nHãy dùng kiến thức này để nhắc người xung quanh.",
                CheckQuestion = CheckQuestion("l12-check-1", "Một người bạn muốn nhặt vật lạ đem về bán phế liệu, bạn nên làm gì?",
                    "Cần ngăn lại, giữ khoảng cách an toàn và báo cho người có trách nhiệm.",
                    ("A", "Đồng ý vì có thể bán được tiền", false),
                    ("B", "Ngăn bạn lại, tránh xa và báo người có trách nhiệm", true),
                    ("C", "Đứng gần xem bạn nhặt", false)),
                CheckFeedback = "Không mang vật lạ về nhà hay bán phế liệu. Hãy ngăn lại và báo ngay.",
                CompletionMessage = "Bạn đã biết các hành vi cần tránh khi gặp vật nghi nguy hiểm.",
                CompletionResult = "Hoàn thành bài hành vi nguy hiểm.",
                NextActionLabel = "Sang bài 1.3"
            },
            "lesson-1-3" => new LessonStepScenario
            {
                Title = "Hành vi an toàn",
                CoreMessage = "Không chạm - Tránh xa - Đánh dấu - Báo ngay",
                IntroBody = "Bài học hướng dẫn quy trình xử lý an toàn khi phát hiện vật nghi là bom mìn, vật nổ trong các tình huống gần nhà, trên đường đi hoặc tại khu vực sản xuất.",
                Objectives =
                [
                    "Ghi nhớ 4 bước xử lý an toàn.",
                    "Sắp xếp đúng thứ tự hành động trong tình huống thực tế.",
                    "Biết thực hiện quy trình mà không tự đặt mình vào nguy hiểm."
                ],
                VideoCaption = "Quy trình an toàn bắt đầu bằng việc không chạm, sau đó rời khỏi khu vực, cảnh báo và báo cho người có trách nhiệm.",
                VideoExplanation = "Trình bày 4 bước xử lý an toàn và lý do cần làm đúng thứ tự.",
                VideoAlert = "Làm đúng thứ tự giúp bảo vệ bản thân trước, sau đó bảo vệ cộng đồng.",
                VideoPoints =
                [
                    "Không chạm vào vật nghi nguy hiểm.",
                    "Tránh xa khu vực có nguy cơ.",
                    "Đánh dấu hoặc cảnh báo từ khoảng cách an toàn.",
                    "Báo ngay cho chính quyền hoặc lực lượng có trách nhiệm."
                ],
                ActivityTitle = "Sắp xếp quy trình an toàn",
                ActivitySubtitle = "Kéo từng hành động vào đúng bước.",
                ActivityInstruction = "Sắp xếp thứ tự xử lý khi phát hiện vật lạ gần nhà, trên đường hoặc ngoài ruộng.",
                ActivityAlert = "Bảo vệ bản thân trước khi cảnh báo người khác.",
                ActivityFeedback = "Đúng thứ tự: Không chạm, Tránh xa, Đánh dấu, Báo ngay.",
                ActivityQuestions =
                [
                    DragQuestion("l13-step-1", 1, "Bước 1", "Hành động đầu tiên.", "green",
                        ("khong-cham", "Không chạm", "Không tiếp xúc với vật nghi nguy hiểm.")),
                    DragQuestion("l13-step-2", 2, "Bước 2", "Rời khỏi vùng nguy hiểm.", "green",
                        ("tranh-xa", "Tránh xa", "Di chuyển ra xa theo đường an toàn.")),
                    DragQuestion("l13-step-3", 3, "Bước 3", "Cảnh báo từ xa.", "amber",
                        ("danh-dau", "Đánh dấu", "Đánh dấu khu vực từ khoảng cách an toàn.")),
                    DragQuestion("l13-step-4", 4, "Bước 4", "Thông báo đúng người.", "blue",
                        ("bao-ngay", "Báo ngay", "Báo cho chính quyền hoặc lực lượng có trách nhiệm."))
                ],
                ReinforceTitle = "Củng cố quy trình",
                ReinforceSubtitle = "Nhớ đúng thứ tự hành động.",
                ReinforceHtml = "<h2>4 bước an toàn</h2><p><strong>Không chạm</strong> trước, sau đó <strong>tránh xa</strong>, <strong>đánh dấu</strong> từ xa và <strong>báo ngay</strong>.</p><p>Không quay lại khu vực nguy hiểm khi chưa có lực lượng chuyên trách.</p>",
                ReinforcePoints = ["Không chạm", "Tránh xa", "Đánh dấu", "Báo ngay"],
                Tips = ["Bước 1: Không chạm", "Bước 2: Tránh xa", "Bước 3: Đánh dấu từ xa", "Bước 4: Báo ngay"],
                ReinforceFeedback = "Bạn đã sắp xếp đúng quy trình an toàn.\nHãy áp dụng đúng thứ tự trong thực tế.",
                CheckQuestion = CheckQuestion("l13-check-1", "Khi phát hiện vật nghi là bom mìn, hành động đầu tiên là gì?",
                    "Không chạm là bước đầu tiên để tránh kích hoạt vật nguy hiểm.",
                    ("A", "Không chạm vào vật", true),
                    ("B", "Đánh dấu ngay sát vật", false),
                    ("C", "Gọi mọi người lại xem", false)),
                CheckFeedback = "Bước đầu tiên luôn là không chạm vào vật nghi nguy hiểm.",
                CompletionMessage = "Bạn đã ghi nhớ quy trình xử lý an toàn khi phát hiện vật lạ.",
                CompletionResult = "Hoàn thành bài hành vi an toàn.",
                NextActionLabel = "Sang bài 1.4"
            },
            "lesson-1-4" => new LessonStepScenario
            {
                Title = "Đánh dấu và báo cáo",
                CoreMessage = "Đánh dấu từ xa - Cảnh báo - Báo đúng người",
                IntroBody = "Bài học hướng dẫn cách đánh dấu khu vực nguy hiểm từ khoảng cách an toàn, cảnh báo người xung quanh và báo cho chính quyền địa phương hoặc lực lượng có trách nhiệm.",
                Objectives =
                [
                    "Biết đánh dấu khu vực nguy hiểm từ khoảng cách an toàn.",
                    "Không tiến lại gần hoặc chạm vào vật để đánh dấu.",
                    "Biết báo đúng người, đúng nơi khi phát hiện vật lạ."
                ],
                VideoCaption = "Đánh dấu chỉ an toàn khi thực hiện từ xa, rõ ràng và không làm người đánh dấu phải đến gần vật nguy hiểm.",
                VideoExplanation = "Nêu cách cảnh báo khu vực nguy hiểm và kênh báo cáo phù hợp.",
                VideoAlert = "Không đánh dấu bằng cách lại gần vật. Luôn giữ khoảng cách an toàn.",
                VideoPoints =
                [
                    "Đánh dấu từ khoảng cách an toàn.",
                    "Dùng cành cây, dây hoặc vật có sẵn để cảnh báo.",
                    "Cảnh báo người xung quanh tránh xa.",
                    "Báo ngay cho chính quyền địa phương hoặc lực lượng có trách nhiệm."
                ],
                ActivityTitle = "Chọn vị trí đánh dấu",
                ActivitySubtitle = "Kéo lựa chọn vào nhóm phù hợp.",
                ActivityInstruction = "Phân loại vị trí hoặc người cần báo khi phát hiện vật lạ.",
                ActivityAlert = "Đánh dấu phải giúp người khác tránh xa mà không làm bạn đến gần vật.",
                ActivityFeedback = "Đúng rồi. Đánh dấu từ xa và báo đúng người là cách xử lý an toàn.",
                ActivityQuestions =
                [
                    DragQuestion("l14-safe-mark", 1, "An toàn để đánh dấu", "Cách cảnh báo từ xa.", "green",
                        ("danh-dau-tu-xa", "Đặt dấu cảnh báo từ xa", "Cảnh báo rõ nhưng không tiến gần vật."),
                        ("dung-day-canh-bao", "Dùng dây/cành cây sẵn có", "Chỉ dùng khi vẫn giữ khoảng cách an toàn.")),
                    DragQuestion("l14-unsafe-mark", 2, "Không an toàn", "Hành động làm tăng nguy cơ.", "red",
                        ("cam-co-sat-vat", "Cắm cờ sát vật", "Tiến quá gần vật nguy hiểm."),
                        ("di-chuyen-vat", "Di chuyển vật để đánh dấu", "Tuyệt đối không chạm hoặc dịch chuyển vật.")),
                    DragQuestion("l14-report", 3, "Cần báo", "Người hoặc đơn vị cần thông tin.", "blue",
                        ("chinh-quyen", "Chính quyền địa phương", "Kênh báo cáo phù hợp."),
                        ("luc-luong", "Lực lượng có trách nhiệm", "Đơn vị xử lý vật nổ chuyên trách."))
                ],
                ReinforceTitle = "Củng cố đánh dấu",
                ReinforceSubtitle = "Đánh dấu đúng cách để bảo vệ cộng đồng.",
                ReinforceHtml = "<h2>Đánh dấu an toàn</h2><ul><li>Giữ khoảng cách an toàn.</li><li>Cảnh báo rõ ràng để người khác tránh xa.</li><li>Báo đúng người, không tự xử lý vật.</li></ul>",
                ReinforcePoints = ["Đánh dấu từ xa", "Cảnh báo xung quanh", "Báo đúng người"],
                Tips = ["Đừng lại gần để đánh dấu", "Cảnh báo người xung quanh", "Báo chính quyền hoặc lực lượng trách nhiệm"],
                ReinforceFeedback = "Bạn đã biết cách đánh dấu và báo cáo an toàn.\nHãy luôn giữ khoảng cách trước khi cảnh báo.",
                CheckQuestion = CheckQuestion("l14-check-1", "Cách đánh dấu nào là an toàn khi phát hiện vật nghi nguy hiểm?",
                    "Đánh dấu phải thực hiện từ khoảng cách an toàn và không chạm vào vật.",
                    ("A", "Đến sát vật để cắm cờ", false),
                    ("B", "Di chuyển vật ra chỗ dễ thấy", false),
                    ("C", "Cảnh báo từ xa và báo chính quyền địa phương", true)),
                CheckFeedback = "Đánh dấu từ xa và báo đúng người là lựa chọn an toàn.",
                CompletionMessage = "Bạn đã biết cách cảnh báo khu vực nguy hiểm và báo cáo đúng cách.",
                CompletionResult = "Hoàn thành bài đánh dấu và báo cáo.",
                NextActionLabel = "Sang bài 2.1"
            },
            "lesson-2-1" => new LessonStepScenario
            {
                Title = "Thông điệp hiệu quả",
                CoreMessage = "Ngắn gọn - Rõ ràng - Dễ nhớ - Hướng hành động",
                IntroBody = "Bài học hướng dẫn cách xây dựng thông điệp truyền thông ngắn gọn, dễ hiểu, dễ ghi nhớ và hướng trực tiếp đến hành động cần thực hiện.",
                Objectives =
                [
                    "Biết tiêu chí của thông điệp truyền thông hiệu quả.",
                    "Phân biệt thông điệp dài, khó hiểu với thông điệp ngắn, rõ.",
                    "Ghép thông điệp phù hợp với tình huống truyền thông."
                ],
                VideoCaption = "Một thông điệp tốt không chỉ đúng, mà còn phải dễ hiểu và khiến người nghe biết cần làm gì ngay.",
                VideoExplanation = "So sánh cách nói chưa phù hợp và cách nói phù hợp trong truyền thông phòng tránh bom mìn.",
                VideoAlert = "Thông điệp càng rõ hành động, người nghe càng dễ làm theo.",
                VideoPoints =
                [
                    "Thông điệp cần ngắn gọn.",
                    "Thông điệp cần rõ ràng và dễ hiểu.",
                    "Thông điệp cần dễ ghi nhớ.",
                    "Thông điệp cần hướng trực tiếp đến hành động."
                ],
                ActivityTitle = "Ghép thông điệp",
                ActivitySubtitle = "Kéo thông điệp vào nhóm phù hợp.",
                ActivityInstruction = "So sánh cách nói dài - ngắn và chọn thông điệp phù hợp với tình huống.",
                ActivityAlert = "Ưu tiên câu ngắn, trực tiếp, có hành động cụ thể.",
                ActivityFeedback = "Đúng rồi. Thông điệp hiệu quả phải giúp người nghe biết ngay việc cần làm.",
                ActivityQuestions =
                [
                    DragQuestion("l21-good", 1, "Phù hợp", "Ngắn gọn, rõ hành động.", "green",
                        ("khong-cham", "Không chạm vào vật lạ", "Trực tiếp và dễ nhớ."),
                        ("tranh-xa-bao-ngay", "Tránh xa và báo ngay", "Có hành động cụ thể.")),
                    DragQuestion("l21-weak", 2, "Chưa phù hợp", "Dài, khó hiểu hoặc thiếu hành động.", "amber",
                        ("nguy-co-cao", "Các vật thể nguy hiểm tiềm ẩn nguy cơ cao", "Khó hiểu với nhiều người nghe."),
                        ("can-than", "Mọi người cần nâng cao ý thức", "Chưa nói rõ phải làm gì.")),
                    DragQuestion("l21-context", 3, "Tình huống báo cáo", "Thông điệp dùng khi cần báo chính quyền.", "blue",
                        ("bao-chinh-quyen", "Báo chính quyền khi thấy vật nghi nguy hiểm", "Đúng với tình huống báo cáo."))
                ],
                ReinforceTitle = "Củng cố thông điệp",
                ReinforceSubtitle = "Viết sao cho người nghe dễ làm theo.",
                ReinforceHtml = "<h2>Công thức thông điệp</h2><p><strong>Ngắn gọn</strong>, <strong>rõ ràng</strong>, <strong>dễ nhớ</strong> và <strong>hướng hành động</strong>.</p><p>Ví dụ tốt: Không chạm vào vật lạ.</p>",
                ReinforcePoints = ["Ngắn", "Rõ", "Dễ nhớ", "Có hành động"],
                Tips = ["Dùng từ đơn giản", "Nói thẳng hành động cần làm", "Tránh câu dài và trừu tượng"],
                ReinforceFeedback = "Bạn đã phân biệt được thông điệp hiệu quả.\nHãy tiếp tục luyện ghép thông điệp theo tình huống.",
                CheckQuestion = CheckQuestion("l21-check-1", "Thông điệp nào phù hợp hơn khi truyền thông cho người dân?",
                    "Thông điệp ngắn, rõ hành động sẽ dễ nhớ và dễ làm theo hơn.",
                    ("A", "Các vật thể nguy hiểm tiềm ẩn nguy cơ cao", false),
                    ("B", "Không chạm vào vật lạ", true),
                    ("C", "Cần nâng cao nhận thức cộng đồng", false)),
                CheckFeedback = "Không chạm vào vật lạ là thông điệp ngắn, rõ và hướng hành động.",
                CompletionMessage = "Bạn đã biết xây dựng thông điệp truyền thông dễ hiểu và hiệu quả.",
                CompletionResult = "Hoàn thành bài thông điệp hiệu quả.",
                NextActionLabel = "Sang bài 2.2"
            },
            "lesson-2-2" => new LessonStepScenario
            {
                Title = "Đối tượng và thông điệp",
                CoreMessage = "Đúng người nghe - Đúng cách nói - Đúng hành động",
                IntroBody = "Bài học nhấn mạnh không thể dùng một cách truyền đạt cho mọi đối tượng. Trẻ em, người lớn và người dân địa phương cần cách nói khác nhau.",
                Objectives =
                [
                    "Nhận biết các nhóm đối tượng chính trong truyền thông.",
                    "Điều chỉnh cách nói cho trẻ em, người lớn và người dân địa phương.",
                    "Ghép từng nhóm đối tượng với thông điệp phù hợp."
                ],
                VideoCaption = "Cùng một nội dung an toàn có thể cần cách diễn đạt khác nhau tùy người nghe.",
                VideoExplanation = "Giới thiệu cách lựa chọn ngôn ngữ và ví dụ theo từng nhóm đối tượng.",
                VideoAlert = "Thông điệp chỉ hiệu quả khi người nghe hiểu và thấy liên quan đến mình.",
                VideoPoints =
                [
                    "Trẻ em cần câu ngắn, trực tiếp.",
                    "Người lớn cần hiểu trách nhiệm báo cáo.",
                    "Người dân địa phương cần ví dụ gần gũi với đời sống.",
                    "Không dùng một cách nói cho tất cả."
                ],
                ActivityTitle = "Ghép đối tượng với thông điệp",
                ActivitySubtitle = "Kéo cách nói vào đúng nhóm người nghe.",
                ActivityInstruction = "Chọn thông điệp phù hợp cho trẻ em, người lớn và người dân địa phương.",
                ActivityAlert = "Hãy nghĩ người nghe là ai trước khi chọn cách nói.",
                ActivityFeedback = "Đúng rồi. Cách nói phù hợp giúp thông điệp dễ hiểu và dễ làm theo hơn.",
                ActivityQuestions =
                [
                    DragQuestion("l22-child", 1, "Trẻ em", "Cần câu ngắn, trực tiếp.", "green",
                        ("tre-em-khong-cham", "Không được chạm, rất nguy hiểm", "Dễ hiểu và trực tiếp.")),
                    DragQuestion("l22-adult", 2, "Người lớn", "Nhấn mạnh trách nhiệm báo cáo.", "blue",
                        ("nguoi-lon-bao-cao", "Báo cho chính quyền hoặc lực lượng chức năng", "Phù hợp với vai trò người lớn.")),
                    DragQuestion("l22-local", 3, "Người dân địa phương", "Dùng ví dụ gần gũi.", "amber",
                        ("dia-phuong-vi-du", "Nếu thấy vật lạ ở ruộng hoặc ven đường, tránh xa và báo ngay", "Gắn với bối cảnh sinh hoạt."))
                ],
                ReinforceTitle = "Củng cố cách nói",
                ReinforceSubtitle = "Người nghe khác nhau cần cách truyền đạt khác nhau.",
                ReinforceHtml = "<h2>Chọn cách nói theo đối tượng</h2><ul><li>Trẻ em: ngắn, rõ, trực tiếp.</li><li>Người lớn: nhấn mạnh trách nhiệm báo cáo.</li><li>Người dân địa phương: dùng ví dụ gần gũi.</li></ul>",
                ReinforcePoints = ["Trẻ em: nói đơn giản", "Người lớn: nhấn mạnh trách nhiệm", "Địa phương: ví dụ gần gũi"],
                Tips = ["Xác định người nghe", "Chọn từ dễ hiểu", "Gắn thông điệp với hành động cụ thể"],
                ReinforceFeedback = "Bạn đã biết điều chỉnh thông điệp theo đối tượng.\nHãy tiếp tục luyện chọn cách nói phù hợp.",
                CheckQuestion = CheckQuestion("l22-check-1", "Với trẻ em, cách nói nào phù hợp nhất?",
                    "Trẻ em cần câu ngắn, trực tiếp và dễ hiểu.",
                    ("A", "Không được chạm, rất nguy hiểm", true),
                    ("B", "Các vật thể nguy hiểm có nguy cơ cao", false),
                    ("C", "Cần nâng cao trách nhiệm cộng đồng", false)),
                CheckFeedback = "Với trẻ em, hãy nói đơn giản và trực tiếp.",
                CompletionMessage = "Bạn đã biết chọn thông điệp phù hợp cho từng nhóm người nghe.",
                CompletionResult = "Hoàn thành bài đối tượng và thông điệp.",
                NextActionLabel = "Sang bài 2.3"
            },
            "lesson-2-3" => new LessonStepScenario
            {
                Title = "Tổ chức thảo luận cộng đồng",
                CoreMessage = "Gợi mở - Lắng nghe - Thảo luận - Kết luận",
                IntroBody = "Bài học hướng dẫn tổ chức một buổi truyền thông cộng đồng theo bốn bước: giới thiệu, đặt câu hỏi, thảo luận và kết luận.",
                Objectives =
                [
                    "Biết 4 bước tổ chức thảo luận cộng đồng.",
                    "Biết đặt câu hỏi để người dân tham gia.",
                    "Biết xử lý khi người dân mất tập trung hoặc không muốn tham gia."
                ],
                VideoCaption = "Một buổi truyền thông hiệu quả không chỉ nói một chiều mà cần đặt câu hỏi, lắng nghe và cùng kết luận hành vi an toàn.",
                VideoExplanation = "Mô tả vai trò của người điều phối và cách khuyến khích người dân tham gia.",
                VideoAlert = "Đừng chỉ nói một chiều. Hãy để người dân cùng tham gia tìm hành vi an toàn.",
                VideoPoints =
                [
                    "Giới thiệu mục tiêu buổi trao đổi.",
                    "Đặt câu hỏi để người dân tham gia.",
                    "Lắng nghe ý kiến và mối lo của người dân.",
                    "Kết luận bằng hành vi an toàn cụ thể."
                ],
                ActivityTitle = "Sắp xếp buổi thảo luận",
                ActivitySubtitle = "Kéo hoạt động vào đúng bước tổ chức.",
                ActivityInstruction = "Sắp xếp các hoạt động điều phối theo trình tự một buổi truyền thông cộng đồng.",
                ActivityAlert = "Thảo luận tốt cần có sự tham gia của người dân.",
                ActivityFeedback = "Đúng rồi. Buổi thảo luận nên đi từ giới thiệu, đặt câu hỏi, thảo luận đến kết luận.",
                ActivityQuestions =
                [
                    DragQuestion("l23-intro", 1, "Giới thiệu", "Mở đầu buổi trao đổi.", "blue",
                        ("gioi-thieu-muc-tieu", "Nêu mục tiêu buổi nói chuyện", "Giúp người dân biết nội dung chính.")),
                    DragQuestion("l23-question", 2, "Đặt câu hỏi", "Kích hoạt sự tham gia.", "green",
                        ("hoi-tinh-huong", "Hỏi người dân từng gặp vật lạ ở đâu", "Gợi mở bằng tình huống gần gũi.")),
                    DragQuestion("l23-discuss", 3, "Thảo luận", "Lắng nghe và trao đổi.", "amber",
                        ("lang-nghe-y-kien", "Lắng nghe ý kiến và mối lo", "Tôn trọng trải nghiệm của người dân.")),
                    DragQuestion("l23-conclude", 4, "Kết luận", "Chốt hành vi an toàn.", "green",
                        ("ket-luan-hanh-vi", "Cùng chốt: không chạm, tránh xa, báo ngay", "Kết thúc bằng hành động cụ thể."))
                ],
                ReinforceTitle = "Củng cố điều phối",
                ReinforceSubtitle = "Tạo buổi thảo luận có sự tham gia.",
                ReinforceHtml = "<h2>4 bước thảo luận</h2><ol><li>Giới thiệu.</li><li>Đặt câu hỏi.</li><li>Thảo luận.</li><li>Kết luận.</li></ol><p>Hãy dùng tình huống gần gũi và khuyến khích người dân tự đưa ra hành vi an toàn.</p>",
                ReinforcePoints = ["Giới thiệu", "Đặt câu hỏi", "Thảo luận", "Kết luận"],
                Tips = ["Không nói một chiều", "Đặt câu hỏi gần gũi", "Lắng nghe mối lo", "Kết luận bằng hành vi an toàn"],
                ReinforceFeedback = "Bạn đã nắm được cách tổ chức thảo luận cộng đồng.\nHãy dùng câu hỏi để người dân cùng tham gia.",
                CheckQuestion = CheckQuestion("l23-check-1", "Khi người dân mất tập trung trong buổi truyền thông, bạn nên làm gì?",
                    "Câu hỏi gần gũi và tình huống thực tế giúp kéo người dân quay lại tham gia.",
                    ("A", "Tiếp tục nói một chiều thật nhanh", false),
                    ("B", "Đặt câu hỏi gần gũi và lắng nghe ý kiến", true),
                    ("C", "Kết thúc ngay mà không thảo luận", false)),
                CheckFeedback = "Hãy đặt câu hỏi, lắng nghe và dùng ví dụ gần gũi để duy trì sự tham gia.",
                CompletionMessage = "Bạn đã biết tổ chức một buổi thảo luận cộng đồng có sự tham gia.",
                CompletionResult = "Hoàn thành bài tổ chức thảo luận cộng đồng.",
                NextActionLabel = "Làm bài kiểm tra cuối khóa"
            },
            _ => null
        };
    }

    private static LessonContentDragQuestion DragQuestion(
        string id,
        int order,
        string prompt,
        string description,
        string tone,
        params (string Id, string Label, string Description)[] answers)
    {
        return new LessonContentDragQuestion
        {
            Id = id,
            Order = order,
            Prompt = prompt,
            Description = description,
            Tone = tone,
            Answers = answers
                .Select((answer, index) => new LessonContentDragAnswer
                {
                    Id = answer.Id,
                    Order = index + 1,
                    Label = answer.Label,
                    Description = answer.Description
                })
                .ToList()
        };
    }

    private static LessonContentCheckQuestion CheckQuestion(
        string id,
        string prompt,
        string feedback,
        params (string Code, string Label, bool IsCorrect)[] options)
    {
        return new LessonContentCheckQuestion
        {
            Id = id,
            Order = 1,
            Prompt = prompt,
            Feedback = feedback,
            Explanation = feedback,
            Options = options
                .Select((option, index) => new LessonContentCheckOption
                {
                    Id = $"{id}-{option.Code.ToLowerInvariant()}",
                    Code = option.Code,
                    Order = index + 1,
                    Label = option.Label,
                    IsCorrect = option.IsCorrect
                })
                .ToList()
        };
    }

    private static List<LessonContentCheckQuestion> BuildLessonContentCheckQuestions(LessonStepScenario scenario)
    {
        var coreMessage = string.IsNullOrWhiteSpace(scenario.CoreMessage)
            ? "Không chạm - Tránh xa - Báo ngay"
            : scenario.CoreMessage;
        var firstTip = scenario.Tips.FirstOrDefault() ?? "Tránh xa khu vực nguy hiểm";
        var secondTip = scenario.Tips.Skip(1).FirstOrDefault() ?? "Báo ngay cho người có trách nhiệm";

        var questions = new List<LessonContentCheckQuestion>
        {
            scenario.CheckQuestion,
            CheckQuestion(
                $"{scenario.CheckQuestion.Id}-demo-2",
                $"Thông điệp chính của bài \"{scenario.Title}\" là gì?",
                $"Hãy ghi nhớ thông điệp: {coreMessage}.",
                ("A", coreMessage, true),
                ("B", "Tự kiểm tra vật lạ trước khi báo", false),
                ("C", "Đợi người khác xử lý thay mình", false)),
            CheckQuestion(
                $"{scenario.CheckQuestion.Id}-demo-3",
                "Khi chưa chắc chắn một vật hoặc tình huống có an toàn không, bạn nên làm gì?",
                "Khi không chắc chắn, hãy chọn phương án an toàn nhất và tránh rủi ro.",
                ("A", "Coi là nguy hiểm và giữ khoảng cách an toàn", true),
                ("B", "Lại gần để quan sát kỹ hơn", false),
                ("C", "Chạm thử thật nhẹ để kiểm tra", false)),
            CheckQuestion(
                $"{scenario.CheckQuestion.Id}-demo-4",
                "Hành động nào giúp bảo vệ bản thân và cộng đồng tốt nhất?",
                "Hành động an toàn cần bảo vệ bản thân trước, sau đó cảnh báo và báo cho người có trách nhiệm.",
                ("A", $"{firstTip}; {secondTip}", true),
                ("B", "Rủ nhiều người đến xem cho rõ", false),
                ("C", "Tự xử lý để tiết kiệm thời gian", false)),
            CheckQuestion(
                $"{scenario.CheckQuestion.Id}-demo-5",
                "Sau khi học xong phần này, điều quan trọng nhất là gì?",
                "Người học cần áp dụng đúng hành vi an toàn trong tình huống thực tế.",
                ("A", "Ghi nhớ và làm đúng hành vi an toàn", true),
                ("B", "Chỉ nhớ tên bài học là đủ", false),
                ("C", "Làm theo đám đông nếu mọi người tò mò", false))
        };

        for (var index = 0; index < questions.Count; index++)
        {
            questions[index].Order = index + 1;
        }

        return questions;
    }

    private sealed class LessonStepScenario
    {
        public string Title { get; init; } = string.Empty;
        public string CoreMessage { get; init; } = string.Empty;
        public string IntroBody { get; init; } = string.Empty;
        public string[] Objectives { get; init; } = [];
        public string VideoCaption { get; init; } = string.Empty;
        public string VideoExplanation { get; init; } = string.Empty;
        public string VideoAlert { get; init; } = string.Empty;
        public string[] VideoPoints { get; init; } = [];
        public string ActivityTitle { get; init; } = string.Empty;
        public string ActivitySubtitle { get; init; } = string.Empty;
        public string ActivityInstruction { get; init; } = string.Empty;
        public string ActivityAlert { get; init; } = string.Empty;
        public string ActivityFeedback { get; init; } = string.Empty;
        public List<LessonContentDragQuestion> ActivityQuestions { get; init; } = [];
        public string ReinforceTitle { get; init; } = string.Empty;
        public string ReinforceSubtitle { get; init; } = string.Empty;
        public string ReinforceHtml { get; init; } = string.Empty;
        public string[] ReinforcePoints { get; init; } = [];
        public string[] Tips { get; init; } = [];
        public string ReinforceFeedback { get; init; } = string.Empty;
        public LessonContentCheckQuestion CheckQuestion { get; init; } = new();
        public string CheckFeedback { get; init; } = string.Empty;
        public string CompletionMessage { get; init; } = string.Empty;
        public string CompletionResult { get; init; } = string.Empty;
        public string NextActionLabel { get; init; } = string.Empty;
    }

    private static List<LessonContentStep> BuildDefaultLessonSteps()
    {
        return
        [
            new LessonContentStep
            {
                Key = "intro",
                Order = 1,
                Label = "Giới thiệu",
                ScreenType = "Giới thiệu bài học và mục tiêu",
                Description = "Mở đầu bài học, giới thiệu bối cảnh và mục tiêu cần đạt.",
                ProgressPercent = 0
            },
            new LessonContentStep
            {
                Key = "video",
                Order = 2,
                Label = "Video",
                ScreenType = "Nội dung chính bằng video hoặc slide",
                Description = "Trình bày nội dung chính bằng hình ảnh trực quan, ngôn ngữ đơn giản.",
                ProgressPercent = 25
            },
            new LessonContentStep
            {
                Key = "activity",
                Order = 3,
                Label = "Kéo thả",
                ScreenType = "Hoạt động nhận dạng hoặc thực hành tương tác",
                Description = "Người học thực hành phân biệt hành vi đúng - sai hoặc xử lý tình huống.",
                ProgressPercent = 70
            },
            new LessonContentStep
            {
                Key = "reinforce",
                Order = 4,
                Label = "Củng cố",
                ScreenType = "Phản hồi và củng cố nội dung",
                Description = "Tóm tắt thông điệp quan trọng, phản hồi ngay để người học ghi nhớ.",
                ProgressPercent = 70
            },
            new LessonContentStep
            {
                Key = "check",
                Order = 5,
                Label = "Kiểm tra",
                ScreenType = "Bài kiểm tra cuối bài",
                Description = "Mô tả phần kiểm tra cuối bài trong cấu trúc nội dung; câu hỏi thật chưa tạo trong DB.",
                ProgressPercent = 90
            },
            new LessonContentStep
            {
                Key = "complete",
                Order = 6,
                Label = "Hoàn thành",
                ScreenType = "Màn hình hoàn thành",
                Description = "Xác nhận hoàn thành bài học và hướng người học sang bước tiếp theo.",
                ProgressPercent = 100
            }
        ];
    }

    private static void ApplyAdminMetadata(Lesson lesson)
    {
        var adminOrder = GetAdminOrder(lesson.Id);

        lesson.Topic = lesson.SectionId switch
        {
            "section-eore" => "Phần 1 - Giáo dục phòng tránh tai nạn bom mìn vật nổ (EORE)",
            "section-sbc" => "Phần 2 - Truyền thông thay đổi hành vi (SBC)",
            "section-final-assessment" => "Phần 3 - Bài kiểm tra cuối khóa",
            _ => "Phần học"
        };
        lesson.Difficulty = lesson.Id switch
        {
            "lesson-1-3" or "lesson-1-4" or "lesson-2-2" => LessonDifficulty.Intermediate,
            "lesson-2-1" or "lesson-2-3" => LessonDifficulty.Advanced,
            _ => LessonDifficulty.Basic
        };
        lesson.PublicationStatus = LessonPublicationStatus.Published;
        lesson.ThumbnailUrl = lesson.VideoContent?.PosterUrl ?? $"https://picsum.photos/seed/{Uri.EscapeDataString(lesson.Id)}/240/160";
        lesson.CreatedAt = new DateTimeOffset(2026, 5, Math.Clamp(12 + adminOrder, 1, 28), 8, 0, 0, TimeSpan.Zero);
        lesson.UpdatedAt = lesson.Id switch
        {
            "lesson-1-1" => new DateTimeOffset(2026, 5, 20, 10, 30, 0, TimeSpan.Zero),
            "lesson-1-2" => new DateTimeOffset(2026, 5, 18, 14, 15, 0, TimeSpan.Zero),
            "lesson-1-3" => new DateTimeOffset(2026, 5, 19, 9, 45, 0, TimeSpan.Zero),
            "lesson-1-4" => new DateTimeOffset(2026, 5, 17, 16, 20, 0, TimeSpan.Zero),
            "lesson-2-1" => new DateTimeOffset(2026, 5, 15, 11, 10, 0, TimeSpan.Zero),
            _ => new DateTimeOffset(2026, 5, 14, 9, 0, 0, TimeSpan.Zero)
        };
    }

    private static int GetAdminOrder(string lessonId)
    {
        return lessonId switch
        {
            "lesson-1-1" => 1,
            "lesson-1-2" => 2,
            "lesson-1-3" => 3,
            "lesson-1-4" => 4,
            "lesson-2-1" => 5,
            "lesson-2-2" => 6,
            "lesson-2-3" => 7,
            _ => 8
        };
    }

    private sealed record QuestionSpec(int Number, string Prompt, string[] Options, string[] CorrectOptions);

    private static readonly QuestionSpec[] OfficialQuestionBank =
    [
        new(1, "Bạn đang làm ruộng, thấy vật kim loại lạ, có người nói \"đạn cũ không nổ đâu\". Bạn làm gì?", ["Lại gần kiểm tra", "Tin họ và tiếp tục làm", "Tránh xa và báo cho người có trách nhiệm"], ["Tránh xa và báo cho người có trách nhiệm"]),
        new(2, "Dấu hiệu nào cho thấy vật có thể là vật nổ nguy hiểm?", ["Mới, sạch", "Gỉ sét, méo mó hoặc có hình dạng bất thường", "Nhỏ nhưng có chi tiết giống vật nổ"], ["Gỉ sét, méo mó hoặc có hình dạng bất thường"]),
        new(3, "Vật nổ có thể xuất hiện ở đâu?", ["Ruộng, rừng", "Ven đường, khu dân cư", "Bất kỳ đâu, kể cả nơi quen thuộc"], ["Bất kỳ đâu, kể cả nơi quen thuộc"]),
        new(4, "Bạn thấy vật giống đồ chơi nhưng bằng kim loại, nặng bất thường. Bạn nên:", ["Nhặt lên kiểm tra", "Đá thử xem có gì không", "Tránh xa và coi là nguy hiểm"], ["Tránh xa và coi là nguy hiểm"]),
        new(5, "Một vật bị chôn một phần dưới đất, bạn nên:", ["Đào lên xem", "Dẫm thử cho chắc", "Tránh xa và không tác động"], ["Tránh xa và không tác động"]),
        new(6, "Khi không chắc vật là gì, cách an toàn nhất là:", ["Kiểm tra kỹ hơn", "Chạm nhẹ xem phản ứng", "Coi đó là vật nguy hiểm và tránh xa"], ["Coi đó là vật nguy hiểm và tránh xa"]),
        new(7, "Trẻ em thấy một vật lạ và nghĩ là đồ chơi. Bạn nên:", ["Để các em tự chơi", "Nhắc các em tránh xa và giải thích nguy hiểm", "Đứng quan sát"], ["Nhắc các em tránh xa và giải thích nguy hiểm"]),
        new(8, "Vật nổ có thể phát nổ khi nào?", ["Chỉ khi có lửa", "Khi bị chạm, rung hoặc thay đổi môi trường", "Chỉ khi bị đập mạnh"], ["Khi bị chạm, rung hoặc thay đổi môi trường"]),
        new(9, "Sau mưa lũ, vật nổ có thể:", ["An toàn hơn", "Bị lộ ra và nguy hiểm hơn", "Không thay đổi"], ["Bị lộ ra và nguy hiểm hơn"]),
        new(10, "Bạn thấy một vật quen thuộc nhưng ở vị trí bất thường. Bạn nên:", ["Cho là an toàn", "Kiểm tra gần hơn", "Coi là có nguy cơ và tránh xa"], ["Coi là có nguy cơ và tránh xa"]),
        new(11, "Bạn của bạn nhặt vật lạ lên. Bạn nên:", ["Làm theo", "Cảnh báo họ dừng lại", "Đứng xem"], ["Cảnh báo họ dừng lại"]),
        new(12, "Một người rủ bạn đi đào vật lạ để bán sắt. Bạn:", ["Đồng ý", "Từ chối vì nguy hiểm", "Giúp họ đào"], ["Từ chối vì nguy hiểm"]),
        new(13, "Rủ nhiều người đến xem vật lạ là:", ["Bình thường", "Làm tăng nguy cơ tai nạn", "Giúp an toàn hơn"], ["Làm tăng nguy cơ tai nạn"]),
        new(14, "Dùng que chọc vào vật lạ có thể gây:", ["Không ảnh hưởng", "Kích nổ vật", "Làm vật an toàn hơn"], ["Kích nổ vật"]),
        new(15, "Bạn thấy người lớn đang xử lý vật lạ. Bạn nên:", ["Lại gần xem", "Giữ khoảng cách an toàn", "Giúp họ"], ["Giữ khoảng cách an toàn"]),
        new(16, "Đào hoặc di chuyển vật lạ là:", ["Cách xử lý đúng", "Hành vi rất nguy hiểm", "Không ảnh hưởng"], ["Hành vi rất nguy hiểm"]),
        new(17, "\"Thử xem có nổ không\" là hành vi:", ["Bình thường", "Rất nguy hiểm", "Có thể chấp nhận"], ["Rất nguy hiểm"]),
        new(18, "Nhặt vật lạ về bán có thể dẫn đến:", ["Có lợi kinh tế", "Tai nạn nghiêm trọng", "Không rủi ro"], ["Tai nạn nghiêm trọng"]),
        new(19, "Đứng gần để chụp ảnh vật lạ là:", ["An toàn", "Làm tăng nguy cơ phát nổ", "Không vấn đề"], ["Làm tăng nguy cơ phát nổ"]),
        new(20, "Vật nhỏ thì ít nguy hiểm hơn vật lớn:", ["Đúng", "Sai"], ["Sai"]),
        new(21, "Bạn phát hiện vật lạ, hành động đầu tiên là:", ["Dừng lại và không chạm vào vật", "Báo ngay", "Đánh dấu"], ["Dừng lại và không chạm vào vật"]),
        new(22, "Sau đó bạn nên:", ["Lại gần hơn", "Tránh xa khu vực", "Kiểm tra"], ["Tránh xa khu vực"]),
        new(23, "Bước tiếp theo là:", ["Báo cho người có trách nhiệm", "Bỏ qua", "Quay lại xem"], ["Báo cho người có trách nhiệm"]),
        new(24, "Trình tự đúng khi gặp vật nghi nguy hiểm là:", ["Báo -> lại gần -> kiểm tra", "Dừng lại -> tránh xa -> báo", "Tránh xa -> kiểm tra -> báo"], ["Dừng lại -> tránh xa -> báo"]),
        new(25, "Bạn có nên quay lại xem vật sau khi đã rời đi?", ["Có", "Không", "Chỉ khi có người đi cùng"], ["Không"]),
        new(26, "Khoảng cách an toàn là:", ["Đứng đủ nhìn rõ", "Càng xa càng tốt và không quay lại", "Vài bước là đủ"], ["Càng xa càng tốt và không quay lại"]),
        new(27, "Nếu vật nằm trên đường đi hàng ngày, bạn nên:", ["Đi đường khác và tránh xa", "Đi qua nhanh", "Dọn đi"], ["Đi đường khác và tránh xa"]),
        new(28, "Bạn nên làm gì với người xung quanh?", ["Cảnh báo họ tránh xa", "Rủ đến xem", "Không cần nói"], ["Cảnh báo họ tránh xa"]),
        new(29, "Bạn thấy trẻ em lại gần vật lạ, bạn:", ["Kệ", "Cảnh báo và đưa trẻ ra xa", "Đứng nhìn"], ["Cảnh báo và đưa trẻ ra xa"]),
        new(30, "Hành động nào là an toàn khi gặp vật lạ?", ["Tránh xa", "Báo cho người có trách nhiệm", "Chạm thử", "Đào lên"], ["Tránh xa", "Báo cho người có trách nhiệm"]),
        new(31, "Mục đích của việc đánh dấu là:", ["Cảnh báo người khác", "Trang trí", "Xác định sở hữu"], ["Cảnh báo người khác"]),
        new(32, "Khi đánh dấu, bạn có nên chạm vào vật không?", ["Có", "Không", "Tùy trường hợp"], ["Không"]),
        new(33, "Cách đánh dấu an toàn là:", ["Đứng xa và dùng vật có sẵn mà không tiếp cận gần", "Lại gần cắm dấu", "Cầm vật lên"], ["Đứng xa và dùng vật có sẵn mà không tiếp cận gần"]),
        new(34, "Bạn nên báo cho ai?", ["Người có trách nhiệm (chính quyền địa phương, lực lượng chức năng)", "Bạn bè", "Người qua đường"], ["Người có trách nhiệm (chính quyền địa phương, lực lượng chức năng)"]),
        new(35, "Không báo có thể dẫn đến:", ["Không ảnh hưởng", "Nguy cơ tai nạn cho người khác", "Tiết kiệm thời gian"], ["Nguy cơ tai nạn cho người khác"]),
        new(36, "Bạn nên đánh dấu ở đâu?", ["Xa vật, dễ nhìn", "Sát vật", "Không cần đánh dấu"], ["Xa vật, dễ nhìn"]),
        new(37, "Thời điểm báo là:", ["Ngay khi an toàn", "Khi rảnh", "Sau vài ngày"], ["Ngay khi an toàn"]),
        new(38, "Người khác không tin bạn, bạn nên:", ["Bỏ qua", "Giải thích và khuyến khích họ tránh xa", "Tranh cãi"], ["Giải thích và khuyến khích họ tránh xa"]),
        new(39, "Bạn không biết số điện thoại để báo, bạn nên:", ["Bỏ qua", "Hỏi chính quyền hoặc người có trách nhiệm", "Tự xử lý"], ["Hỏi chính quyền hoặc người có trách nhiệm"]),
        new(40, "Việc báo cáo giúp:", ["Xử lý vật an toàn", "Không cần thiết", "Làm mất thời gian"], ["Xử lý vật an toàn"]),
        new(41, "Người dân nói: \"Tôi thấy rồi, có sao đâu\". Bạn:", ["Đồng ý", "Giải thích rằng vật nổ có thể phát nổ bất ngờ", "Tranh cãi"], ["Giải thích rằng vật nổ có thể phát nổ bất ngờ"]),
        new(42, "Khi nói chuyện với trẻ em, bạn nên:", ["Dùng từ khó", "Dùng từ đơn giản, dễ hiểu", "Không cần giải thích"], ["Dùng từ đơn giản, dễ hiểu"]),
        new(43, "Người dân không chú ý, bạn nên:", ["Bỏ qua", "Đặt câu hỏi để thu hút họ", "Nói to hơn"], ["Đặt câu hỏi để thu hút họ"]),
        new(44, "Người dân nói: \"Tôi làm ở đây lâu rồi, không sao đâu\". Bạn:", ["Đồng ý", "Giải thích nguy cơ có thể xảy ra bất cứ lúc nào", "Bỏ đi"], ["Giải thích nguy cơ có thể xảy ra bất cứ lúc nào"]),
        new(45, "Khi truyền thông, bạn nên:", ["Chỉ nói", "Hỏi và lắng nghe", "Nói càng nhiều càng tốt"], ["Hỏi và lắng nghe"]),
        new(46, "Mục tiêu của truyền thông là:", ["Nói đủ nội dung", "Thay đổi hành vi an toàn", "Hoàn thành nhiệm vụ"], ["Thay đổi hành vi an toàn"]),
        new(47, "Người dân ngại báo vì sợ phiền, bạn:", ["Đồng ý", "Giải thích lợi ích của việc báo", "Bỏ qua"], ["Giải thích lợi ích của việc báo"]),
        new(48, "Cách truyền thông hiệu quả là:", ["Theo cách của mình", "Phù hợp với người nghe", "Nói giống nhau cho tất cả"], ["Phù hợp với người nghe"]),
        new(49, "Người dân không tin, bạn nên:", ["Bỏ", "Kiên nhẫn giải thích bằng ví dụ", "Ép họ nghe"], ["Kiên nhẫn giải thích bằng ví dụ"]),
        new(50, "Kết quả tốt nhất của truyền thông là:", ["Người dân nghe", "Người dân hiểu và thực hiện hành vi an toàn", "Nói xong nội dung"], ["Người dân hiểu và thực hiện hành vi an toàn"])
    ];

    private static IReadOnlyCollection<LessonQuestion> BuildQuestions(string prefix, int[] questionNumbers)
    {
        return questionNumbers
            .Select((number, index) => BuildQuestion($"{prefix}-q{number}", GetQuestionSpec(number), index + 1))
            .ToArray();
    }

    private static LessonAssessment BuildOfficialFinalAssessment()
    {
        const string lessonId = "lesson-final-quiz";
        return new LessonAssessment
        {
            LessonId = lessonId,
            Intro = "Bạn sẽ làm bài kiểm tra để hoàn thành khóa học. Hãy chọn câu trả lời đúng nhất.",
            RetryHint = "Bạn chưa đạt. Hãy xem lại bài học và thử lại.",
            PassScore = 100,
            QuestionLimit = 12,
            RandomizeQuestionOrder = false,
            RandomizeOptionOrder = false,
            Questions =
            [
                WithLesson(BuildExampleTrueFalseQuestion(), lessonId, 1),
                WithLesson(BuildExampleDragDropQuestion(), lessonId, 2),
                WithLesson(BuildExampleHotspotQuestion(), lessonId, 3),
                WithLesson(BuildExampleScenarioQuestion(), lessonId, 4),
                .. Enumerable.Range(1, 50)
                    .Select((number, index) => WithLesson(BuildQuestion($"fq-{number}", GetQuestionSpec(number), index + 5), lessonId, index + 5))
            ]
        };
    }

    private static LessonQuestion BuildExampleTrueFalseQuestion()
    {
        const string id = "fq-example-true-false";
        return new LessonQuestion
        {
            Id = id,
            Type = QuestionType.TrueFalse,
            Prompt = "Đúng hay sai?",
            Statement = "Khi phát hiện vật nghi là bom mìn, bạn nên giữ khoảng cách và báo cho người có trách nhiệm.",
            Explanation = "Đúng. Không chạm vào vật, tránh xa và báo ngay là cách xử lý an toàn.",
            Options =
            [
                new LessonQuestionOption { QuestionId = id, Code = "true", Label = "Đúng", Order = 1, IsCorrect = true },
                new LessonQuestionOption { QuestionId = id, Code = "false", Label = "Sai", Order = 2, IsCorrect = false }
            ]
        };
    }

    private static LessonQuestion BuildExampleDragDropQuestion()
    {
        const string id = "fq-example-drag-drop";
        return new LessonQuestion
        {
            Id = id,
            Type = QuestionType.DragDrop,
            Prompt = "Ghép từng hành động với nhóm phù hợp.",
            Explanation = "Tránh xa và báo ngay là hành động an toàn; chạm thử vào vật lạ là hành động nguy hiểm.",
            DragItems =
            [
                new LessonQuestionDragItem { QuestionId = id, Code = "keep-distance", Label = "Tránh xa vật lạ", Order = 1 },
                new LessonQuestionDragItem { QuestionId = id, Code = "report", Label = "Báo cho người có trách nhiệm", Order = 2 },
                new LessonQuestionDragItem { QuestionId = id, Code = "touch", Label = "Chạm thử vào vật lạ", Order = 3 }
            ],
            DragTargets =
            [
                new LessonQuestionDragTarget { QuestionId = id, Code = "safe", Label = "Hành động an toàn", Order = 1 },
                new LessonQuestionDragTarget { QuestionId = id, Code = "dangerous", Label = "Hành động nguy hiểm", Order = 2 }
            ],
            CorrectPairs =
            [
                new LessonQuestionDragPair { QuestionId = id, DragItemCode = "keep-distance", DragTargetCode = "safe" },
                new LessonQuestionDragPair { QuestionId = id, DragItemCode = "report", DragTargetCode = "safe" },
                new LessonQuestionDragPair { QuestionId = id, DragItemCode = "touch", DragTargetCode = "dangerous" }
            ]
        };
    }

    private static LessonQuestion BuildExampleHotspotQuestion()
    {
        const string id = "fq-example-hotspot";
        return new LessonQuestion
        {
            Id = id,
            Type = QuestionType.Hotspot,
            Prompt = "Chọn vị trí an toàn để đứng cảnh báo người khác.",
            MediaTitle = "Mô phỏng khu vực có vật nghi nguy hiểm ở chính giữa.",
            Explanation = "Vị trí an toàn nằm xa vật nghi nguy hiểm và ngoài khu vực cảnh báo.",
            HotspotTargets =
            [
                new LessonQuestionHotspotTarget
                {
                    QuestionId = id, Code = "near-object", Label = "Đứng sát vật lạ", Order = 1,
                    Shape = HotspotShape.Circle, X = 50, Y = 50, Radius = 12, IsCorrect = false
                },
                new LessonQuestionHotspotTarget
                {
                    QuestionId = id, Code = "safe-distance", Label = "Đứng ở khoảng cách an toàn", Order = 2,
                    Shape = HotspotShape.Circle, X = 82, Y = 22, Radius = 12, IsCorrect = true
                },
                new LessonQuestionHotspotTarget
                {
                    QuestionId = id, Code = "unsafe-path", Label = "Đứng trên lối đi gần vật", Order = 3,
                    Shape = HotspotShape.Circle, X = 35, Y = 72, Radius = 12, IsCorrect = false
                }
            ]
        };
    }

    private static LessonQuestion BuildExampleScenarioQuestion()
    {
        const string id = "fq-example-scenario";
        return new LessonQuestion
        {
            Id = id,
            Type = QuestionType.Scenario,
            Prompt = "Bạn sẽ xử lý như thế nào?",
            ScenarioTitle = "Tình huống trên đường về nhà",
            ScenarioContext = "Bạn thấy một vật kim loại lạ ven đường. Một người bạn định lại gần để chụp ảnh.",
            Explanation = "Cần ngăn bạn lại gần, cùng di chuyển ra xa và báo cho người có trách nhiệm.",
            Options =
            [
                new LessonQuestionOption { QuestionId = id, Code = "a", Label = "Đi cùng bạn lại gần để quan sát", Order = 1, IsCorrect = false },
                new LessonQuestionOption { QuestionId = id, Code = "b", Label = "Ngăn bạn lại, tránh xa và báo ngay", Order = 2, IsCorrect = true },
                new LessonQuestionOption { QuestionId = id, Code = "c", Label = "Bỏ đi mà không cảnh báo ai", Order = 3, IsCorrect = false }
            ]
        };
    }

    private static QuestionSpec GetQuestionSpec(int number)
    {
        return OfficialQuestionBank.Single(item => item.Number == number);
    }

    private static LessonQuestion BuildQuestion(string id, QuestionSpec spec, int order)
    {
        return new LessonQuestion
        {
            Id = id,
            Type = QuestionType.MultipleChoice,
            Order = order,
            Prompt = spec.Prompt,
            Explanation = $"Đáp án đúng: {string.Join("; ", spec.CorrectOptions)}.",
            Options =
            [
                .. spec.Options.Select((option, index) => new LessonQuestionOption
                {
                    QuestionId = id,
                    Code = ((char)('a' + index)).ToString(),
                    Label = option,
                    Order = index + 1,
                    IsCorrect = spec.CorrectOptions.Contains(option, StringComparer.Ordinal)
                })
            ]
        };
    }

    private static LessonAssessment BuildFinalAssessment()
    {
        return new LessonAssessment
        {
            LessonId = "lesson-final-quiz",
            Intro = "Bạn sẽ làm bài kiểm tra để hoàn thành khóa học. Hãy chọn câu trả lời đúng nhất.",
            RetryHint = "Bạn chưa đạt. Hãy xem lại bài học và thử lại.",
            PassScore = 100,
            RandomizeQuestionOrder = true,
            RandomizeOptionOrder = true,
            Questions =
            [
                WithLesson(Mc("fq-1", "Bạn thấy một vật kim loại lạ trong ruộng, bạn nên làm gì?", "Tránh xa và báo", ["Nhặt lên", "Mang về", "Tránh xa và báo"], "Không chạm, tránh xa và báo ngay."), "lesson-final-quiz", 1),
                WithLesson(Mc("fq-2", "Vật nào dưới đây có thể nguy hiểm?", "Đạn pháo chưa nổ", ["Đạn pháo chưa nổ", "Cái bát", "Quả bóng"], "Đạn pháo chưa nổ là vật nguy hiểm."), "lesson-final-quiz", 2),
                WithLesson(Mc("fq-3", "Hành động nào là nguy hiểm?", "Nhặt vật lạ", ["Tránh xa", "Nhặt vật lạ", "Báo người lớn"], "Nhặt vật lạ có thể gây nổ."), "lesson-final-quiz", 3),
                WithLesson(Tf("fq-4", "Bạn có nên rủ người khác đến xem vật lạ không?", false, "Rủ người khác đến gần làm tăng nguy cơ tai nạn."), "lesson-final-quiz", 4),
                WithLesson(Mc("fq-5", "Bước đầu tiên khi thấy vật lạ là gì?", "Không chạm", ["Không chạm", "Đánh dấu", "Báo"], "Không chạm là bước đầu tiên."), "lesson-final-quiz", 5),
                WithLesson(Mc("fq-6", "Sau khi tránh xa, bạn nên làm gì?", "Báo người có trách nhiệm", ["Bỏ qua", "Báo người có trách nhiệm", "Quay lại xem"], "Cần báo người có trách nhiệm khi đã an toàn."), "lesson-final-quiz", 6),
                WithLesson(Mc("fq-7", "Bạn nên đánh dấu vật lạ như thế nào?", "Đánh dấu từ xa", ["Đứng gần đánh dấu", "Đánh dấu từ xa", "Chạm vào"], "Đánh dấu từ xa, dễ nhìn và không tiếp cận vật lạ."), "lesson-final-quiz", 7),
                WithLesson(Mc("fq-8", "Bạn nên báo cho ai?", "Người có trách nhiệm", ["Bạn bè", "Người có trách nhiệm", "Không cần báo"], "Báo cho chính quyền địa phương hoặc lực lượng chức năng."), "lesson-final-quiz", 8),
                WithLesson(Mc("fq-9", "Thông điệp nào dễ hiểu nhất?", "Không chạm vào vật lạ", ["Các vật thể nguy hiểm tiềm ẩn nguy cơ cao", "Không chạm vào vật lạ", "Cần nâng cao nhận thức"], "Thông điệp ngắn, rõ và dễ nhớ."), "lesson-final-quiz", 9),
                WithLesson(Mc("fq-10", "Khi nói với trẻ em, bạn nên làm gì?", "Nói đơn giản, dễ hiểu", ["Dùng từ khó", "Nói đơn giản, dễ hiểu", "Không giải thích"], "Trẻ em cần cách nói đơn giản."), "lesson-final-quiz", 10),
                WithLesson(Mc("fq-11", "Khi người dân không chú ý, bạn nên làm gì?", "Đặt câu hỏi để họ tham gia", ["Bỏ qua", "Đặt câu hỏi để họ tham gia", "Nói to hơn"], "Câu hỏi giúp người dân tham gia thảo luận."), "lesson-final-quiz", 11),
                WithLesson(Mc("fq-12", "Mục tiêu của truyền thông là gì?", "Giúp người dân thay đổi hành vi", ["Nói cho đủ", "Giúp người dân thay đổi hành vi", "Kết thúc buổi nói chuyện"], "Truyền thông SBC hướng tới thay đổi hành vi an toàn."), "lesson-final-quiz", 12)
            ]
        };
    }

    private static LessonQuestion Mc(string id, string prompt, string correct, string[] options, string explanation)
    {
        return new LessonQuestion
        {
            Id = id,
            Type = QuestionType.MultipleChoice,
            Prompt = prompt,
            Explanation = explanation,
            Options =
            [
                .. options.Select((option, index) => new LessonQuestionOption
                {
                    QuestionId = id,
                    Code = ((char)('a' + index)).ToString(),
                    Label = option,
                    Order = index + 1,
                    IsCorrect = option == correct
                })
            ]
        };
    }

    private static LessonQuestion Tf(string id, string statement, bool correct, string explanation)
    {
        return new LessonQuestion
        {
            Id = id,
            Type = QuestionType.TrueFalse,
            Prompt = "Đúng hay sai?",
            Statement = statement,
            Explanation = explanation,
            Options =
            [
                new LessonQuestionOption { QuestionId = id, Code = "true", Label = "Đúng", Order = 1, IsCorrect = correct },
                new LessonQuestionOption { QuestionId = id, Code = "false", Label = "Sai", Order = 2, IsCorrect = !correct }
            ]
        };
    }

    private static LessonQuestion WithLesson(LessonQuestion question, string lessonId, int order)
    {
        question.LessonId = lessonId;
        question.Order = order;
        foreach (var option in question.Options)
        {
            option.QuestionId = question.Id;
        }

        return question;
    }
}
