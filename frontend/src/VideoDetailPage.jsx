import React, { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import YouTube from "react-youtube"; // Đảm bảo bạn đã chạy: npm install react-youtube

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function VideoDetailPage() {
  const { id } = useParams();
  
  // --- STATE DỮ LIỆU ---
  const [exercises, setExercises] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isLoadingExercise, setIsLoadingExercise] = useState(true);
  
  const [youtubeId, setYoutubeId] = useState("");
  const [exerciseId, setExerciseId] = useState(null);

  // --- STATE UI & LOGIC ---
  const [videoEnded, setVideoEnded] = useState(false); // Đánh dấu đã xem xong video chưa
  const [showQuestionText, setShowQuestionText] = useState(false); // Ẩn/Hiện text câu hỏi
  
  // --- STATE GHI ÂM ---
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTranscript, setRecordingTranscript] = useState("");
  const [audioBlob, setAudioBlob] = useState(null);

  // --- STATE KẾT QUẢ ---
  const [isProcessing, setIsProcessing] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);

  // --- REFS ---
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);

  // ==========================================================
  // 🔊 HÀM ĐỌC VĂN BẢN (Text-to-Speech) - CHẬM & RÕ
  // ==========================================================
  const speakQuestion = (text) => {
    if (!window.speechSynthesis) return;
    
    // 1. Dừng giọng đọc cũ (nếu có)
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // ✅ CẤU HÌNH GIỌNG ĐỌC
    utterance.lang = "en-US"; 
    utterance.rate = 0.7;     // 🐢 Tốc độ 0.7 (Chậm, phù hợp luyện nghe)
    utterance.pitch = 1;      // Cao độ bình thường
    utterance.volume = 1;     // Âm lượng to nhất

    // 2. Thử tìm giọng Google US English (nếu trình duyệt hỗ trợ)
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => v.name.includes("Google US English") || v.name.includes("Samantha")
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    // 3. Phát âm thanh
    window.speechSynthesis.speak(utterance);
  };

  // ==========================================================
  // 📥 FETCH DATA
  // ==========================================================
  useEffect(() => {
    const fetchExerciseDetails = async () => {
      try {
        setIsLoadingExercise(true);
        const res = await axios.get(`${BACKEND_URL}/api/listening/exercises/${id}`);
        const videoIdFromApi = res.data.source?.youtube_video_id || "";
        const questionsFromApi = res.data.content?.questions || [];

        setExerciseId(res.data.id);
        setYoutubeId(videoIdFromApi);
        setExercises(questionsFromApi);
        setCurrentQuestion(questionsFromApi[0] || null);
        
        // Reset trạng thái khi vào trang mới
        setVideoEnded(false);
        setShowQuestionText(false); 

      } catch (err) {
        console.error("❌ Error fetching exercise details:", err);
      } finally {
        setIsLoadingExercise(false);
      }
    };

    fetchExerciseDetails();
  }, [id]);

  // ==========================================================
  // 🎬 XỬ LÝ VIDEO YOUTUBE
  // ==========================================================
  const onVideoEnd = () => {
    console.log("🎬 Video finished!");
    setVideoEnded(true);

    // Sau khi video kết thúc 500ms -> Máy tự đọc câu hỏi đầu tiên
    setTimeout(() => {
      if (currentQuestion) {
        console.log("🔊 Auto playing audio...");
        speakQuestion(currentQuestion.question);
      }
    }, 500);
  };

  const youtubeOpts = {
    height: '390',
    width: '100%',
    playerVars: {
      autoplay: 0, // Không tự chạy video khi mới vào trang
    },
  };

  // ==========================================================
  // 🎤 XỬ LÝ GHI ÂM (STT)
  // ==========================================================
  const startRecording = async () => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Trình duyệt không hỗ trợ SpeechRecognition (hãy dùng Chrome/Edge)");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;

      let finalTranscript = "";

      recognition.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalTranscript += t + " ";
          else interim += t;
        }
        setRecordingTranscript(finalTranscript + interim);
      };

      recognition.onstart = () => setIsTranscribing(true);
      recognition.onend = () => setIsTranscribing(false);

      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        recognition.stop();
      };

      mediaRecorder.start();
      recognition.start();
      setIsRecording(true);
    } catch (err) {
      console.error("🎙️ Microphone error:", err);
      alert("Không thể truy cập micro. Hãy kiểm tra cài đặt trình duyệt.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (recognitionRef.current) recognitionRef.current.stop();
  };

  const recordAgain = () => {
    setAudioBlob(null);
    setRecordingTranscript("");
    setEvaluationResult(null);
    setShowQuestionText(false); // Ẩn text lại nếu muốn thử lại từ đầu
  };

  // ==========================================================
  // 📤 NỘP BÀI & CHUYỂN CÂU
  // ==========================================================
  const submitAnswer = async () => {
    if (!currentQuestion) return;
    if (!recordingTranscript.trim()) {
      alert("Chưa có nội dung trả lời, vui lòng nói lại!");
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("question_id", String(currentQuestion.id));
      formData.append("user_answer", recordingTranscript.trim());
      formData.append("exercise_id", String(exerciseId));

      const res = await axios.post(`${BACKEND_URL}/api/speaking/evaluate`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      setEvaluationResult(res.data);
      setShowQuestionText(true); // ✅ QUAN TRỌNG: Hiện text câu hỏi sau khi nộp bài

    } catch (err) {
      console.error("❌ Evaluate error:", err);
      setEvaluationResult({
        general: "error",
        score: 0,
        feedback: "Có lỗi khi chấm điểm.",
        suggestion: "Vui lòng thử lại.",
      });
      setShowQuestionText(true); // Vẫn hiện text nếu lỗi để người dùng biết
    } finally {
      setIsProcessing(false);
    }
  };

  const nextQuestion = () => {
    if (currentIndex + 1 < exercises.length) {
      const nextIdx = currentIndex + 1;
      const nextQ = exercises[nextIdx];

      setCurrentIndex(nextIdx);
      setCurrentQuestion(nextQ);
      
      // Reset trạng thái
      setEvaluationResult(null);
      setRecordingTranscript("");
      setAudioBlob(null);
      setShowQuestionText(false); // Ẩn text của câu mới
      
      // ✅ Tự động đọc câu hỏi mới sau 500ms
      setTimeout(() => {
        speakQuestion(nextQ.question);
      }, 500); 

    } else {
      alert("🎉 Chúc mừng! Bạn đã hoàn thành bài tập.");
    }
  };

  // Helper style button
  const btnStyle = (bg, color = "white") => ({
    backgroundColor: bg,
    color: color,
    padding: "10px 20px",
    borderRadius: "50px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
  });

  // ==========================================================
  // 🖥️ RENDER UI
  // ==========================================================
  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        
        {/* === CỘT TRÁI: VIDEO & HƯỚNG DẪN === */}
        <div style={{ flex: "1", minWidth: "300px" }}>
          <Link to="/videos" style={{ textDecoration: "none", color: "#007bff", fontWeight: "bold" }}>
            ← Quay lại danh sách
          </Link>

          <h3 style={{ marginTop: "20px" }}>Video Listening</h3>

          {/* YouTube Player */}
          <div style={{ borderRadius: "8px", overflow: "hidden", background: "#000" }}>
            {youtubeId ? (
              <YouTube 
                videoId={youtubeId} 
                opts={youtubeOpts} 
                onEnd={onVideoEnd} // Sự kiện khi video hết
              />
            ) : (
              !isLoadingExercise && <p>Không tìm thấy Video.</p>
            )}
          </div>

          {/* ✅ KHU VỰC HƯỚNG DẪN (GIỮ NGUYÊN) */}
          <div
            style={{
              marginTop: "15px",
              background: "#f8f9fa",
              padding: "15px",
              borderRadius: "8px",
              border: "1px solid #e9ecef"
            }}
          >
            <h4>📖 Hướng dẫn tương tác</h4>
            <ul style={{ paddingLeft: "20px", lineHeight: "1.6", color: "#555" }}>
              <li>Xem <strong>toàn bộ video</strong> để mở khóa bài tập.</li>
              <li>Sau khi video kết thúc, hệ thống sẽ <strong>tự động đọc câu hỏi</strong>.</li>
              <li>Bạn sẽ <strong>không nhìn thấy chữ</strong> của câu hỏi khi đang nghe (luyện phản xạ).</li>
              <li>Bấm <strong>Ghi âm</strong> để trả lời câu hỏi vừa nghe.</li>
              <li>Sau khi <strong>Nộp bài</strong>, nội dung câu hỏi và kết quả chấm điểm sẽ hiện ra.</li>
            </ul>
          </div>
        </div>

        {/* === CỘT PHẢI: BÀI TẬP SPEAKING === */}
        <div style={{ flex: "1", minWidth: "350px" }}>
          <h3>Bài tập Speaking</h3>

          {isLoadingExercise ? (
            <p>⏳ Đang tải bài tập...</p>
          ) : currentQuestion ? (
            
            // Logic: Chỉ hiện bài tập khi video đã xem xong (videoEnded = true)
            videoEnded ? (
              <div style={{ background: "#fff", borderRadius: "8px", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                
                <h4>Câu hỏi {currentIndex + 1}:</h4>
                
                {/* LOGIC HIỂN THỊ CÂU HỎI: Ẩn Text / Hiện Text */}
                <div style={{
                    background: showQuestionText ? "#e3f2fd" : "#f1f3f5",
                    color: showQuestionText ? "#0d47a1" : "#666",
                    padding: "20px",
                    borderRadius: "8px",
                    minHeight: "80px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    fontSize: "18px",
                    fontWeight: "500",
                    border: showQuestionText ? "1px solid #90caf9" : "1px dashed #ccc"
                }}>
                  {showQuestionText ? (
                     <span>{currentQuestion.question}</span>
                  ) : (
                     <>
                       <span style={{fontSize: "40px", marginBottom: "10px"}}>🎧</span>
                       <span>Đang phát câu hỏi... (Nghe kỹ nhé!)</span>
                       <small style={{fontWeight: "normal", marginTop: "5px"}}>Trả lời xong sẽ hiện văn bản.</small>
                     </>
                  )}
                </div>
                
                {/* Nút nghe lại thủ công */}
                <div style={{textAlign: 'center', marginTop: 10}}>
                   <button 
                        onClick={() => speakQuestion(currentQuestion.question)}
                        style={{ fontSize: "14px", cursor: "pointer", background: "none", border: "1px solid #ccc", padding: "5px 10px", borderRadius: "20px", color: "#555"}}
                    >
                        🔊 Nghe lại (Tốc độ chậm)
                    </button>
                </div>

                {/* Khu vực Ghi âm */}
                <div style={{ marginTop: "30px", textAlign: 'center' }}>
                  {!audioBlob ? (
                    <>
                      {!isRecording ? (
                        <button onClick={startRecording} style={btnStyle("#dc3545")}>
                          🎤 Bắt đầu trả lời
                        </button>
                      ) : (
                        <button onClick={stopRecording} style={btnStyle("#6c757d")}>
                          ⏹️ Dừng ghi âm
                        </button>
                      )}
                      {isTranscribing && <p style={{fontSize: '0.9em', color: '#666', marginTop: 10}}>📝 Đang chuyển giọng nói thành văn bản...</p>}
                    </>
                  ) : (
                    <div>
                        <p style={{ color: "#28a745", fontWeight: 'bold' }}>✅ Đã ghi âm xong!</p>
                        <p style={{ fontStyle: "italic", background: "#f8f9fa", padding: "10px", borderRadius: "6px", border: "1px solid #eee" }}>
                            "{recordingTranscript}"
                        </p>

                        <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "15px" }}>
                            <button onClick={submitAnswer} disabled={isProcessing} style={btnStyle("#007bff")}>
                            {isProcessing ? "⏳ Đang chấm..." : "📤 Nộp bài & Xem kết quả"}
                            </button>
                            <button onClick={recordAgain} style={btnStyle("#ffc107", "#000")}>
                            🔄 Làm lại
                            </button>
                        </div>
                    </div>
                  )}
                </div>

                {/* Khu vực Kết quả */}
                {evaluationResult && (
                  <div style={{ marginTop: "25px", background: "#f1f8e9", padding: "20px", borderRadius: "8px", border: "1px solid #c5e1a5" }}>
                    <h4 style={{marginTop: 0, color: "#2e7d32"}}>Kết quả chấm điểm: {evaluationResult.score}/100</h4>
                    
                    <p><strong>📝 Feedback:</strong> {evaluationResult.feedback}</p>
                    {evaluationResult.suggestion && <p>💡 <strong>Gợi ý cải thiện:</strong> {evaluationResult.suggestion}</p>}
                    
                    {/* Nút Next Question */}
                    <div style={{textAlign: 'right', marginTop: '20px'}}>
                        <button onClick={nextQuestion} style={btnStyle("#17a2b8")}>
                        Câu tiếp theo 👉
                        </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
                <div style={{padding: "40px 20px", textAlign: 'center', background: '#f8f9fa', borderRadius: 8, border: "1px solid #ddd"}}>
                    <div style={{fontSize: "40px", marginBottom: "10px"}}>🔒</div>
                    <h3>Bài tập đang bị khóa</h3>
                    <p style={{color: "#666"}}>Vui lòng xem hết video để mở khóa câu hỏi đầu tiên.</p>
                </div>
            )
          ) : (
            <p>{isLoadingExercise ? "" : "❌ Không tìm thấy dữ liệu câu hỏi."}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default VideoDetailPage;