import React, { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

function VideoDetailPage() {
  const { id } = useParams();

  const [exercises, setExercises] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isLoadingExercise, setIsLoadingExercise] = useState(true);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTranscript, setRecordingTranscript] = useState("");
  const [audioBlob, setAudioBlob] = useState(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);

  // Fetch all questions from listening exercise
  useEffect(() => {
    const fetchExercises = async () => {
      try {
        setIsLoadingExercise(true);
        const res = await axios.get(`${BACKEND_URL}/api/listening/exercises`);
        if (Array.isArray(res.data) && res.data.length > 0) {
          const first = res.data[0];
          const detail = await axios.get(`${BACKEND_URL}/api/listening/exercises/${first.id}`);
          setExercises(detail.data.content?.questions || []);
          setCurrentQuestion(detail.data.content?.questions?.[0] || null);
        }
      } catch (err) {
        console.error("❌ Error fetching exercises:", err);
      } finally {
        setIsLoadingExercise(false);
      }
    };
    fetchExercises();
  }, []);

  /** ========== Recording Section ========== */
  const startRecording = async () => {
    try {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Trình duyệt không hỗ trợ SpeechRecognition (hãy dùng Chrome/Edge)");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Init Speech Recognition
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
      alert("Không thể truy cập micro");
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
  };

  /** ========== Submit & Evaluate ========== */
  const submitAnswer = async () => {
    if (!currentQuestion) return;
    if (!recordingTranscript.trim()) {
      alert("Chưa có transcript từ giọng nói, hãy nói lại!");
      return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        question_id: String(currentQuestion.id || currentIndex),
        user_answer: recordingTranscript.trim(),
        exercise_id: String(id),
      };

      console.log("📤 Submitting:", payload);

      const res = await axios.post(`${BACKEND_URL}/api/speaking/evaluate`, payload);

      setEvaluationResult(res.data);
    } catch (err) {
      console.error("❌ Evaluate error:", err);
      setEvaluationResult({
        general: "incorrect",
        score: 0,
        feedback: "Không thể chấm điểm, hãy thử lại.",
        suggestion: "Đảm bảo bạn nói rõ và đúng câu hỏi.",
        details: { fluency: 0, pronunciation: 0, vocabulary: 0 },
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const nextQuestion = () => {
    if (currentIndex + 1 < exercises.length) {
      setCurrentIndex(currentIndex + 1);
      setCurrentQuestion(exercises[currentIndex + 1]);
      setEvaluationResult(null);
      setRecordingTranscript("");
      setAudioBlob(null);
    } else {
      alert("🎉 Bạn đã hoàn thành tất cả câu hỏi!");
    }
  };

  /** ========== UI ========== */
  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        {/* LEFT PANEL */}
        <div style={{ flex: "1", minWidth: "300px" }}>
          <Link
            to="/videos"
            style={{
              backgroundColor: "#007bff",
              color: "white",
              textDecoration: "none",
              padding: "8px 16px",
              borderRadius: "5px",
            }}
          >
            ← Quay lại
          </Link>
          <h3 style={{ marginTop: "20px" }}>Video</h3>
          <iframe
            width="100%"
            height="315"
            src={`https://www.youtube.com/embed/${id}`}
            title="YouTube player"
            frameBorder="0"
            allowFullScreen
            style={{ borderRadius: "8px" }}
          ></iframe>

          <div style={{ marginTop: "15px", background: "#f8f9fa", padding: "15px", borderRadius: "8px" }}>
            <h4>📖 Hướng dẫn xem video</h4>
            <ul>
              <li>Nhấn ▶️ để phát video</li>
              <li>⏸️ để tạm dừng</li>
              <li>🔄 để xem lại</li>
            </ul>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ flex: "1", minWidth: "350px" }}>
          <h3>Bài tập Speaking</h3>

          {isLoadingExercise ? (
            <p>⏳ Đang tải bài tập...</p>
          ) : currentQuestion ? (
            <div style={{ background: "#fff", borderRadius: "8px", padding: "20px" }}>
              <h4>Câu hỏi {currentIndex + 1}:</h4>
              <p style={{ background: "#f8f9fa", padding: "10px", borderRadius: "6px" }}>
                {currentQuestion.question || "Câu hỏi trống"}
              </p>

              {/* Recording */}
              <div style={{ marginTop: "20px" }}>
                {!audioBlob ? (
                  <>
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        style={{
                          backgroundColor: "#dc3545",
                          color: "white",
                          padding: "10px 20px",
                          borderRadius: "50px",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        🎤 Bắt đầu ghi âm
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        style={{
                          backgroundColor: "#6c757d",
                          color: "white",
                          padding: "10px 20px",
                          borderRadius: "5px",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        ⏹️ Dừng ghi âm
                      </button>
                    )}
                    {isTranscribing && <p>📝 Đang chuyển giọng nói thành văn bản...</p>}
                  </>
                ) : (
                  <div>
                    <p style={{ color: "#28a745" }}>✅ Đã ghi âm xong!</p>
                    <p style={{ fontStyle: "italic", background: "#f8f9fa", padding: "10px", borderRadius: "6px" }}>
                      "{recordingTranscript}"
                    </p>

                    <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "10px" }}>
                      <button
                        onClick={submitAnswer}
                        disabled={isProcessing}
                        style={{
                          backgroundColor: "#007bff",
                          color: "white",
                          padding: "10px 20px",
                          borderRadius: "5px",
                          border: "none",
                        }}
                      >
                        {isProcessing ? "⏳ Đang chấm điểm..." : "📤 Gửi để chấm điểm"}
                      </button>
                      <button
                        onClick={recordAgain}
                        style={{
                          backgroundColor: "#ffc107",
                          padding: "10px 20px",
                          border: "none",
                          borderRadius: "5px",
                        }}
                      >
                        🔄 Ghi lại
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Result */}
              {evaluationResult && (
                <div style={{ marginTop: "20px", background: "#f8f9fa", padding: "15px", borderRadius: "8px" }}>
                  <h4>Kết quả:</h4>
                  <p>
                    <strong>Điểm:</strong> {evaluationResult.score}/100
                  </p>
                  <p>
                    <strong>Đánh giá:</strong> {evaluationResult.general}
                  </p>
                  <p>
                    <strong>Phản hồi:</strong> {evaluationResult.feedback}
                  </p>
                  {evaluationResult.suggestion && (
                    <p>
                      💡 <strong>Gợi ý:</strong> {evaluationResult.suggestion}
                    </p>
                  )}
                  {evaluationResult.details && (
                    <div>
                      <strong>Chi tiết:</strong>
                      <ul>
                        <li>Fluency: {evaluationResult.details.fluency}</li>
                        <li>Pronunciation: {evaluationResult.details.pronunciation}</li>
                        <li>Vocabulary: {evaluationResult.details.vocabulary}</li>
                      </ul>
                    </div>
                  )}
                  <button
                    onClick={nextQuestion}
                    style={{
                      marginTop: "10px",
                      backgroundColor: "#17a2b8",
                      color: "white",
                      padding: "8px 16px",
                      border: "none",
                      borderRadius: "5px",
                    }}
                  >
                    👉 Câu tiếp theo
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p>❌ Không tìm thấy câu hỏi</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default VideoDetailPage;
