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
  const [showVideoOverlay, setShowVideoOverlay] = useState(false); // ✅ STATE MỚI: Để che video lại
  
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
  const playerRef = useRef(null); 

  // ==========================================================
  // 🔊 HÀM ĐỌC VĂN BẢN (Text-to-Speech) - CHẬM & RÕ
  // ==========================================================

const speakQuestion = (text) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.85;  
  utterance.pitch = 1.1;  
  utterance.volume = 1;

  const setVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    
    const preferredVoices = [
      "Google US English",
      "Samantha",
      "Karen",
      "Microsoft Zira - English (United States)",
      "Microsoft David - English (United States)",
      "Alex"
    ];

    let selectedVoice = null;
    for (let name of preferredVoices) {
      selectedVoice = voices.find(v => v.name.includes(name));
      if (selectedVoice) break;
    }

    // Nếu không tìm thấy, dùng giọng en-US đầu tiên
    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang.startsWith("en-US"));
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log("🎤 Using voice:", selectedVoice.name);
    }

    window.speechSynthesis.speak(utterance);
  };

  // Xử lý trường hợp voices chưa load
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    setVoice();
  } else {
    window.speechSynthesis.onvoiceschanged = setVoice;
  }
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
        
        setVideoEnded(false);
        setShowQuestionText(false); 
        setShowVideoOverlay(false); // Reset overlay

      } catch (err) {
        console.error("❌ Error fetching exercise details:", err);
      } finally {
        setIsLoadingExercise(false);
      }
    };

    fetchExerciseDetails();
  }, [id]);

  // ==========================================================
  // 🎬 XỬ LÝ VIDEO YOUTUBE (LOGIC CHE PHỦ)
  // ==========================================================
  
  const onPlayerReady = (event) => {
    playerRef.current = event.target;
  };

  const onVideoEnd = () => {
    if (videoEnded) return;

    console.log("🎬 Video finished!");
    setVideoEnded(true);
    setShowVideoOverlay(true); // ✅ Bật tấm màn che lên ngay lập tức

    setTimeout(() => {
      if (currentQuestion) {
        speakQuestion(currentQuestion.question);
      }
    }, 500);
  };

  // ✅ Hàm để xem lại video (Reset Overlay và tua về đầu)
  const handleReplayVideo = () => {
    if (playerRef.current) {
        setShowVideoOverlay(false); // Tắt màn che
        setVideoEnded(false);       // Reset trạng thái kết thúc
        playerRef.current.seekTo(0); // Tua về 0
        playerRef.current.playVideo(); // Chạy lại
    }
  };

  // 3. EFFECT: Kiểm tra thời gian video liên tục
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (playerRef.current && !videoEnded && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const currentTime = playerRef.current.getCurrentTime();
          const duration = playerRef.current.getDuration();

          // Nếu duration > 0 và còn <= 3 giây nữa là hết bài
          if (duration > 0 && (duration - currentTime) <= 3) {
            console.log("🛑 Stopping video 3s early & masking...");
            playerRef.current.pauseVideo(); // Dừng video
            onVideoEnd(); // Gọi hàm kết thúc
          }
        } catch (error) {}
      }
    }, 500);

    return () => clearInterval(checkInterval);
  }, [videoEnded]); 

  const youtubeOpts = {
    height: '390',
    width: '100%',
    playerVars: {
      autoplay: 0, 
      rel: 0, 
    },
  };

  // ==========================================================
  // 🎤 XỬ LÝ GHI ÂM (STT)
  // ==========================================================
  const startRecording = async () => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Trình duyệt không hỗ trợ SpeechRecognition");
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
      alert("Không thể truy cập micro.");
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
    setShowQuestionText(false); 
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
      setShowQuestionText(true); 

    } catch (err) {
      console.error("❌ Evaluate error:", err);
      setEvaluationResult({
        general: "error",
        score: 0,
        feedback: "Có lỗi khi chấm điểm.",
        suggestion: "Vui lòng thử lại.",
      });
      setShowQuestionText(true); 
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
      
      setEvaluationResult(null);
      setRecordingTranscript("");
      setAudioBlob(null);
      setShowQuestionText(false); 
      
      setTimeout(() => {
        speakQuestion(nextQ.question);
      }, 500); 

    } else {
      alert("🎉 Chúc mừng! Bạn đã hoàn thành bài tập.");
    }
  };

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

          {/* Wrapper cho Video và Overlay */}
          <div style={{ position: "relative", borderRadius: "8px", overflow: "hidden", background: "#000", height: "390px" }}>
            
            {/* 1. YouTube Player */}
            {youtubeId ? (
              <YouTube 
                videoId={youtubeId} 
                opts={youtubeOpts} 
                onReady={onPlayerReady} 
              />
            ) : (
              !isLoadingExercise && <p style={{color: 'white', padding: 20}}>Không tìm thấy Video.</p>
            )}

            {/* 2. ✅ OVERLAY CHE PHỦ (Hiện ra khi video kết thúc/ngắt sớm) */}
            {showVideoOverlay && (
              <div style={{
                position: "absolute",
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.9)", // Màu nền đen che video
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                zIndex: 10 // Đè lên iframe youtube
              }}>
                <div style={{fontSize: "50px"}}>✅</div>
                <h3>Hoàn thành video!</h3>
                <p>Hãy chuyển sang phần bài tập bên cạnh.</p>
                <button 
                  onClick={handleReplayVideo}
                  style={{
                    marginTop: "10px",
                    padding: "8px 16px",
                    background: "transparent",
                    border: "1px solid white",
                    color: "white",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                >
                  🔄 Xem lại video
                </button>
              </div>
            )}

          </div>

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
            
            videoEnded ? (
              <div style={{ background: "#fff", borderRadius: "8px", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                
                <h4>Câu hỏi {currentIndex + 1}:</h4>
                
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
                
                <div style={{textAlign: 'center', marginTop: 10}}>
                   <button 
                        onClick={() => speakQuestion(currentQuestion.question)}
                        style={{ fontSize: "14px", cursor: "pointer", background: "none", border: "1px solid #ccc", padding: "5px 10px", borderRadius: "20px", color: "#555"}}
                    >
                        🔊 Nghe lại (Tốc độ chậm)
                    </button>
                </div>

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

                {evaluationResult && (
                  <div style={{ marginTop: "25px", background: "#f1f8e9", padding: "20px", borderRadius: "8px", border: "1px solid #c5e1a5" }}>
                    <h4 style={{marginTop: 0, color: "#2e7d32"}}>Kết quả chấm điểm: {evaluationResult.score}/100</h4>
                    
                    <p><strong>📝 Feedback:</strong> {evaluationResult.feedback}</p>
                    {evaluationResult.suggestion && <p>💡 <strong>Gợi ý cải thiện:</strong> {evaluationResult.suggestion}</p>}
                    
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