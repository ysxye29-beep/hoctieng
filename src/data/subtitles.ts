export interface SubtitleLine {
  id: number
  startTime: number
  endTime: number
  text: string        // nội dung gốc
  translation: string // dịch tiếng Việt
}

// Mock data 8 câu - tự động dùng cho mọi video
// (sau này sẽ fetch từ YouTube captions API)
export const getMockSubtitles = (language: string): SubtitleLine[] => {
  if (language === 'zh-CN' || language === 'zh') {
    return [
      { id:1, startTime:3,  endTime:6,  text:"大家好，欢迎来到今天的节目。",     translation:"Xin chào mọi người, chào mừng đến với chương trình hôm nay." },
      { id:2, startTime:7,  endTime:11, text:"今天我们来聊一聊学习中文的方法。", translation:"Hôm nay chúng ta sẽ nói về phương pháp học tiếng Trung." },
      { id:3, startTime:12, endTime:16, text:"第一个方法是每天听中文播客。",     translation:"Phương pháp đầu tiên là nghe podcast tiếng Trung mỗi ngày." },
      { id:4, startTime:17, endTime:21, text:"你可以在上班的路上听。",           translation:"Bạn có thể nghe trên đường đi làm." },
      { id:5, startTime:22, endTime:26, text:"第二个方法是跟中国人说话。",       translation:"Phương pháp thứ hai là nói chuyện với người Trung Quốc." },
      { id:6, startTime:27, endTime:31, text:"不要害怕犯错误。",               translation:"Đừng sợ mắc lỗi." },
      { id:7, startTime:32, endTime:36, text:"犯错误是学习的一部分。",           translation:"Mắc lỗi là một phần của việc học." },
      { id:8, startTime:37, endTime:41, text:"加油！你一定可以学好中文的。",     translation:"Cố lên! Bạn nhất định có thể học tốt tiếng Trung." },
    ]
  }
  // English default
  return [
    { id:1, startTime:3,  endTime:7,  text:"Welcome to today's English learning session.",  translation:"Chào mừng đến với buổi học tiếng Anh hôm nay." },
    { id:2, startTime:8,  endTime:12, text:"Today we will practice listening and writing.",  translation:"Hôm nay chúng ta sẽ luyện nghe và viết." },
    { id:3, startTime:13, endTime:17, text:"This is a great way to improve your skills.",   translation:"Đây là cách tuyệt vời để cải thiện kỹ năng của bạn." },
    { id:4, startTime:18, endTime:22, text:"Listen carefully and type what you hear.",       translation:"Lắng nghe cẩn thận và gõ những gì bạn nghe được." },
    { id:5, startTime:23, endTime:27, text:"Don't worry if you make mistakes.",             translation:"Đừng lo lắng nếu bạn mắc lỗi." },
    { id:6, startTime:28, endTime:32, text:"Mistakes help you learn faster.",               translation:"Lỗi giúp bạn học nhanh hơn." },
    { id:7, startTime:33, endTime:37, text:"Try to listen at least three times.",           translation:"Hãy cố gắng nghe ít nhất ba lần." },
    { id:8, startTime:38, endTime:42, text:"Great job! Keep up the good work.",             translation:"Làm tốt lắm! Hãy tiếp tục cố gắng." },
  ]
}
