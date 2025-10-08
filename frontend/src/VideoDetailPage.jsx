import React, { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";

function VideoDetailPage() {
  const { id } = useParams();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scoringResult, setScoringResult] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [exercise, setExercise] = useState(null);
  const [isLoadingExercise, setIsLoadingExercise] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const iframeRef = useRef(null);

  // Fetch exercise data from API
  useEffect(() => {
    const fetchExercise = async () => {
      setIsLoadingExercise(true);
      try {
        const response = await axios.get(`http://localhost:8000/exercises/exercises_by_video/${id}`);
        const exercises = response.data;
        
        if (exercises && exercises.length > 0) {
          // Get the first exercise for now (you can add logic to select specific exercise)
          const firstExercise = exercises[0];
          setExercise({
            id: firstExercise.id,
            question: firstExercise.content.question || "Hãy mô tả về nội dung video này bằng tiếng Anh",
            instruction: firstExercise.content.instruction || "Ghi âm câu trả lời của bạn bằng tiếng Anh. Hãy nói rõ ràng và tự nhiên.",
            expectedKeywords: firstExercise.content.expectedKeywords || ["video", "content", "story"],
            exerciseType: firstExercise.exercise_type,
            source: firstExercise.source
          });
        } else {
          // Fallback to default exercise if no exercises found
          setExercise({
            id: 1,
            question: "Hãy mô tả về nhân vật chính trong video này bằng tiếng Anh",
            instruction: "Ghi âm câu trả lời của bạn bằng tiếng Anh. Hãy nói rõ ràng và tự nhiên.",
            expectedKeywords: ["character", "main", "video", "story"],
            exerciseType: "speaking",
            source: null
          });
        }
      } catch (error) {
        console.error("Error fetching exercise:", error);
        // Fallback to default exercise on error
        setExercise({
          id: 1,
          question: "Hãy mô tả về nhân vật chính trong video này bằng tiếng Anh",
          instruction: "Ghi âm câu trả lời của bạn bằng tiếng Anh. Hãy nói rõ ràng và tự nhiên.",
          expectedKeywords: ["character", "main", "video", "story"],
          exerciseType: "speaking",
          source: null
        });
      } finally {
        setIsLoadingExercise(false);
      }
    };

    fetchExercise();
  }, [id]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const submitAudio = async () => {
    if (!audioBlob) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      formData.append('exercise_id', exercise.id);
      formData.append('user_id', 1); // Replace with actual user ID

      const response = await axios.post('http://localhost:8000/exercises/score_speaking/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setScoringResult(response.data);
      setTranscript(response.data.transcript || "");
    } catch (error) {
      console.error("Error scoring audio:", error);
      setScoringResult({
        score: 0,
        feedback: "Có lỗi xảy ra khi chấm điểm. Vui lòng thử lại.",
        transcript: ""
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const recordAgain = () => {
    setAudioBlob(null);
    setScoringResult(null);
    setTranscript("");
  };

  const startVideo = () => {
    setIsVideoPlaying(true);
    // YouTube iframe API would be used here in a real implementation
    // For now, we'll just update the state
    console.log("Starting video...");
  };

  const replayVideo = () => {
    setIsVideoPlaying(false);
    // Reset video to beginning
    console.log("Replaying video...");
    // In a real implementation, this would reset the video to the beginning
    setTimeout(() => {
      setIsVideoPlaying(true);
    }, 100);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
        <Link 
          to="/" 
          style={{
            backgroundColor: "#007bff",
            color: "white",
            textDecoration: "none",
            padding: "10px 20px",
            borderRadius: "5px",
            border: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
            fontWeight: "500"
          }}
        >
          ← Quay lại
        </Link>
      </div>

      <div style={{ display: "flex", gap: "20px" }}>
        {/* Left Panel - Video */}
        <div style={{ flex: "1", minWidth: "500px" }}>
          <h3 style={{ marginBottom: "15px", color: "#333" }}>Video</h3>
          <div style={{ 
            backgroundColor: "#f5f5f5", 
            borderRadius: "8px", 
            padding: "10px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}>
        <iframe
              width="100%"
          height="315"
          src={`https://www.youtube.com/embed/${id}`}
          title="YouTube video player"
          frameBorder="0"
          allowFullScreen
              style={{ borderRadius: "4px" }}
        ></iframe>
      </div>

          {/* Video Controls */}
          <div style={{ marginTop: "15px" }}>
            <h4 style={{ marginBottom: "10px", color: "#555" }}>Điều khiển</h4>
            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                onClick={startVideo}
                style={{
                  backgroundColor: isVideoPlaying ? "#6c757d" : "#007bff",
                  color: "white",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  cursor: isVideoPlaying ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14px",
                  fontWeight: "500"
                }}
                disabled={isVideoPlaying}
              >
                {isVideoPlaying ? "⏸️ Đang phát" : "▶️ Start"}
              </button>
              <button 
                onClick={replayVideo}
                style={{
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14px",
                  fontWeight: "500"
                }}
              >
                🔄 Phát lại
              </button>
            </div>
            
            {/* Video Status */}
            {isVideoPlaying && (
              <div style={{ 
                marginTop: "10px", 
                padding: "8px 12px", 
                backgroundColor: "#d4edda", 
                border: "1px solid #c3e6cb",
                borderRadius: "4px",
                color: "#155724",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                🎬 Video đang phát
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Speaking Exercise */}
        <div style={{ flex: "1", minWidth: "400px" }}>
          <h3 style={{ marginBottom: "15px", color: "#333" }}>Bài tập Speaking</h3>
          
          <div style={{ 
            backgroundColor: "#f8f9fa", 
            borderRadius: "8px", 
            padding: "20px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}>
            {isLoadingExercise ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <div style={{ 
                  fontSize: "18px", 
                  color: "#666",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px"
                }}>
                  ⏳ Đang tải bài tập...
                </div>
              </div>
            ) : exercise ? (
              <>
                <div style={{ marginBottom: "20px" }}>
                  <h4 style={{ color: "#333", marginBottom: "10px" }}>Câu hỏi:</h4>
                  <p style={{ 
                    backgroundColor: "white", 
                    padding: "15px", 
                    borderRadius: "5px",
                    border: "1px solid #ddd",
                    lineHeight: "1.5"
                  }}>
                    {exercise.question}
                  </p>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <h4 style={{ color: "#333", marginBottom: "10px" }}>Hướng dẫn:</h4>
                  <p style={{ color: "#666", fontSize: "14px" }}>
                    {exercise.instruction}
                  </p>
                </div>

                {/* Recording Section */}
                <div style={{ marginBottom: "20px" }}>
                  <h4 style={{ color: "#333", marginBottom: "10px" }}>Ghi âm câu trả lời:</h4>
                  
                  {!audioBlob ? (
                    <div style={{ textAlign: "center" }}>
                      {!isRecording ? (
                        <button
                          onClick={startRecording}
                          style={{
                            backgroundColor: "#dc3545",
                            color: "white",
                            border: "none",
                            padding: "15px 30px",
                            borderRadius: "50px",
                            fontSize: "16px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            margin: "0 auto"
                          }}
                        >
                          🎤 Bắt đầu ghi âm
                        </button>
                      ) : (
                        <div>
                          <div style={{ 
                            color: "#dc3545", 
                            fontSize: "18px", 
                            marginBottom: "10px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "10px"
                          }}>
                            🔴 Đang ghi âm...
                          </div>
                          <button
                            onClick={stopRecording}
                            style={{
                              backgroundColor: "#6c757d",
                              color: "white",
                              border: "none",
                              padding: "10px 20px",
                              borderRadius: "5px",
                              cursor: "pointer"
                            }}
                          >
                            ⏹️ Dừng ghi âm
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ 
                        color: "#28a745", 
                        marginBottom: "10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px"
                      }}>
                        ✅ Đã ghi âm xong
                      </div>
                      <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                        <button
                          onClick={submitAudio}
                          disabled={isProcessing}
                          style={{
                            backgroundColor: isProcessing ? "#6c757d" : "#007bff",
                            color: "white",
                            border: "none",
                            padding: "10px 20px",
                            borderRadius: "5px",
                            cursor: isProcessing ? "not-allowed" : "pointer"
                          }}
                        >
                          {isProcessing ? "⏳ Đang chấm điểm..." : "📤 Gửi để chấm điểm"}
                        </button>
                        <button
                          onClick={recordAgain}
                          style={{
                            backgroundColor: "#ffc107",
                            color: "black",
                            border: "none",
                            padding: "10px 20px",
                            borderRadius: "5px",
                            cursor: "pointer"
                          }}
                        >
                          🔄 Ghi âm lại
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Results Section */}
                {scoringResult && (
                  <div style={{ 
                    backgroundColor: "white", 
                    padding: "15px", 
                    borderRadius: "5px",
                    border: "1px solid #ddd",
                    marginTop: "20px"
                  }}>
                    <h4 style={{ color: "#333", marginBottom: "15px" }}>Kết quả chấm điểm:</h4>
                    
                    <div style={{ marginBottom: "15px" }}>
                      <div style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center",
                        marginBottom: "10px"
                      }}>
                        <span style={{ fontWeight: "bold" }}>Điểm số:</span>
                        <span style={{ 
                          fontSize: "24px", 
                          fontWeight: "bold",
                          color: scoringResult.score >= 70 ? "#28a745" : scoringResult.score >= 50 ? "#ffc107" : "#dc3545"
                        }}>
                          {scoringResult.score}/100
                        </span>
                      </div>
                    </div>

                    {transcript && (
                      <div style={{ marginBottom: "15px" }}>
                        <h5 style={{ color: "#333", marginBottom: "8px" }}>Transcript của bạn:</h5>
                        <div style={{ 
                          backgroundColor: "#f8f9fa", 
                          padding: "10px", 
                          borderRadius: "4px",
                          fontStyle: "italic",
                          border: "1px solid #e9ecef"
                        }}>
                          "{transcript}"
                        </div>
                      </div>
                    )}

                    <div>
                      <h5 style={{ color: "#333", marginBottom: "8px" }}>Nhận xét:</h5>
                      <div style={{ 
                        backgroundColor: "#e7f3ff", 
                        padding: "10px", 
                        borderRadius: "4px",
                        border: "1px solid #b3d9ff"
                      }}>
                        {scoringResult.feedback}
                      </div>
                    </div>

                    <div style={{ marginTop: "15px", textAlign: "center" }}>
                      <button
                        onClick={recordAgain}
                        style={{
                          backgroundColor: "#17a2b8",
                          color: "white",
                          border: "none",
                          padding: "10px 20px",
                          borderRadius: "5px",
                          cursor: "pointer"
                        }}
                      >
                        🎤 Thử lại
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <div style={{ 
                  fontSize: "16px", 
                  color: "#dc3545",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px"
                }}>
                  ❌ Không thể tải bài tập
                </div>
                <p style={{ color: "#666", marginTop: "10px" }}>
                  Vui lòng thử lại sau
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoDetailPage;
