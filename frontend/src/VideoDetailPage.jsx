import React, { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function VideoDetailPage() {
  const { id } = useParams(); 
  const [exercises, setExercises] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isLoadingExercise, setIsLoadingExercise] = useState(true);
  
  const [youtubeId, setYoutubeId] = useState(""); 
  const [exerciseId, setExerciseId] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTranscript, setRecordingTranscript] = useState("");
  const [audioBlob, setAudioBlob] = useState(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);

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

      } catch (err) {
        console.error("❌ Error fetching exercise details:", err);
      } finally {
        setIsLoadingExercise(false);
      }
    };

    fetchExerciseDetails();
  }, [id]); 

  
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


  const submitAnswer = async () => {
    if (!currentQuestion) return;
    if (!recordingTranscript.trim()) {
      alert("Chưa có transcript từ giọng nói, hãy nói lại!");
      return;
    }

    setIsProcessing(true);
    try {
        const formData = new FormData();
        formData.append("question_id", String(currentQuestion.id)); 
        formData.append("user_answer", recordingTranscript.trim());
        formData.append("exercise_id", String(exerciseId)); 

        console.log("📤 Submitting FormData:", {
          question_id: currentQuestion.id,
          user_answer: recordingTranscript.trim(),
          exercise_id: exerciseId,
        });

        const res = await axios.post(`${BACKEND_URL}/api/speaking/evaluate`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
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
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setCurrentQuestion(exercises[nextIdx]);
      setEvaluationResult(null);
      setRecordingTranscript("");
      setAudioBlob(null);
    } else {
      alert("🎉 Bạn đã hoàn thành tất cả câu hỏi!");
    }
  };

  /** ================== UI ================== */
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

          {/* ✅ FIXED YouTube Player */}
          <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", borderRadius: "8px" }}>
            {youtubeId ? (
              <iframe
                // Sử dụng state 'youtubeId' đã được fetch về
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&enablejsapi=1`}
                title="YouTube Video Player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: "none",
                  borderRadius: "8px",
                  pointerEvents: "auto",
                  zIndex: 1,
                }}
              ></iframe>
            ) : (
              !isLoadingExercise && <p>Không tìm thấy ID video YouTube.</p>
            )}
          </div>

          <div
            style={{
              marginTop: "15px",
              background: "#f8f9fa",
              padding: "15px",
              borderRadius: "8px",
            }}
          >
            <h4>📖 Hướng dẫn xem video</h4>
            <ul>
              <li>Nhấn ▶️ để phát video</li>
              <li>⏸️ để tạm dừng</li>
              <li>🔄 để xem lại</li>
            </ul>
          </div>
        </div>

        {/* RIGHT PANEL (Giữ nguyên) */}
        <div style={{ flex: "1", minWidth: "350px" }}>
          <h3>Bài tập Speaking</h3>

          {isLoadingExercise ? (
            <p>⏳ Đang tải bài tập...</p>
          ) : currentQuestion ? (
            <div
              style={{
                background: "#fff",
                borderRadius: "8px",
                padding: "20px",
              }}
            >
              <h4>Câu hỏi {currentIndex + 1}:</h4>
              <p
                style={{
                  background: "#f8f9fa",
                  padding: "10px",
                  borderRadius: "6px",
                }}
              >
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
                    <p
                      style={{
                        fontStyle: "italic",
                        background: "#f8f9fa",
                        padding: "10px",
                        borderRadius: "6px",
                      }}
                    >
                      "{recordingTranscript}"
                    </p>

                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        justifyContent: "center",
                        marginTop: "10px",
                      }}
                    >
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
                <div
                  style={{
                    marginTop: "20px",
                    background: "#f8f9fa",
                    padding: "15px",
                    borderRadius: "8px",
                  }}
                >
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
            <p>{isLoadingExercise ? "" : "❌ Không tìm thấy câu hỏi cho bài tập này."}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default VideoDetailPage;