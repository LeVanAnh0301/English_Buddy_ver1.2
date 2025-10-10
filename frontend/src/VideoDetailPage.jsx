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
  const [recordingTranscript, setRecordingTranscript] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const iframeRef = useRef(null);
  const recognitionRef = useRef(null);

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
      // Check if speech recognition is supported
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("Trình duyệt của bạn không hỗ trợ speech recognition. Vui lòng sử dụng Chrome hoặc Edge.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Initialize speech recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US'; // Set to English for better recognition

      let finalTranscript = '';

      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsTranscribing(true);
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update transcript in real-time
        setRecordingTranscript(finalTranscript + interimTranscript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsTranscribing(false);
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsTranscribing(false);
        setRecordingTranscript(finalTranscript.trim());
      };

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        
        // Stop speech recognition
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      };

      // Start both media recording and speech recognition
      mediaRecorder.start();
      recognition.start();
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
    
    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const submitAudio = async () => {
    if (!audioBlob || !exercise) return;

    setIsProcessing(true);
    try {
      // Use the new speaking answer scoring API
      const response = await axios.post('http://localhost:8000/exercises/score_speaking_answer/', {
        question: exercise.question,
        expected_keywords: exercise.expectedKeywords || [],
        user_answer: recordingTranscript || ""
      });

      setScoringResult(response.data);
      setTranscript(recordingTranscript || "");
    } catch (error) {
      console.error("Error scoring audio:", error);
      setScoringResult({
        score: 0,
        feedback: "Có lỗi xảy ra khi chấm điểm. Vui lòng thử lại.",
        transcript: recordingTranscript || "",
        keyword_matches: [],
        missing_keywords: exercise?.expectedKeywords || [],
        grammar_score: 0,
        fluency_score: 0,
        suggestions: ["Thử lại", "Nói rõ hơn", "Sử dụng từ khóa liên quan"]
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const recordAgain = () => {
    setAudioBlob(null);
    setScoringResult(null);
    setTranscript("");
    setRecordingTranscript("");
    setIsTranscribing(false);
    
    // Stop any ongoing speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // Video control functions - commented out since we're using native YouTube controls
  // const startVideo = () => {
  //   setIsVideoPlaying(true);
  //   console.log("Starting video...");
  // };

  // const replayVideo = () => {
  //   setIsVideoPlaying(false);
  //   console.log("Replaying video...");
  //   setTimeout(() => {
  //     setIsVideoPlaying(true);
  //   }, 100);
  // };

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
        <Link 
          to="/videos" 
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

          {/* Video Instructions */}
          <div style={{ marginTop: "15px" }}>
            <h4 style={{ marginBottom: "10px", color: "#555" }}>Hướng dẫn xem video</h4>
            <div style={{ 
              backgroundColor: "#f8f9fa", 
              padding: "15px", 
              borderRadius: "8px",
              border: "1px solid #e9ecef"
            }}>
              <div style={{ 
                display: "flex", 
                alignItems: "flex-start", 
                gap: "12px",
                marginBottom: "12px"
              }}>
                <div style={{ 
                  fontSize: "18px", 
                  color: "#007bff",
                  marginTop: "2px"
                }}>▶️</div>
                <div>
                  <strong style={{ color: "#333", fontSize: "14px" }}>Phát video:</strong>
                  <p style={{ 
                    color: "#666", 
                    fontSize: "13px", 
                    margin: "4px 0 0 0",
                    lineHeight: "1.4"
                  }}>
                    Nhấn vào nút play ở giữa video để bắt đầu xem
                  </p>
                </div>
              </div>
              
              <div style={{ 
                display: "flex", 
                alignItems: "flex-start", 
                gap: "12px",
                marginBottom: "12px"
              }}>
                <div style={{ 
                  fontSize: "18px", 
                  color: "#28a745",
                  marginTop: "2px"
                }}>⏸️</div>
                <div>
                  <strong style={{ color: "#333", fontSize: "14px" }}>Tạm dừng:</strong>
                  <p style={{ 
                    color: "#666", 
                    fontSize: "13px", 
                    margin: "4px 0 0 0",
                    lineHeight: "1.4"
                  }}>
                    Nhấn vào video đang phát để tạm dừng, nhấn lại để tiếp tục
                  </p>
                </div>
              </div>
              
              <div style={{ 
                display: "flex", 
                alignItems: "flex-start", 
                gap: "12px",
                marginBottom: "12px"
              }}>
                <div style={{ 
                  fontSize: "18px", 
                  color: "#ffc107",
                  marginTop: "2px"
                }}>🔄</div>
                <div>
                  <strong style={{ color: "#333", fontSize: "14px" }}>Phát lại:</strong>
                  <p style={{ 
                    color: "#666", 
                    fontSize: "13px", 
                    margin: "4px 0 0 0",
                    lineHeight: "1.4"
                  }}>
                    Kéo thanh tiến trình về đầu video để xem lại từ đầu
                  </p>
                </div>
              </div>
              
              <div style={{ 
                display: "flex", 
                alignItems: "flex-start", 
                gap: "12px"
              }}>
                <div style={{ 
                  fontSize: "18px", 
                  color: "#6c757d",
                  marginTop: "2px"
                }}>🔊</div>
                <div>
                  <strong style={{ color: "#333", fontSize: "14px" }}>Điều chỉnh âm lượng:</strong>
                  <p style={{ 
                    color: "#666", 
                    fontSize: "13px", 
                    margin: "4px 0 0 0",
                    lineHeight: "1.4"
                  }}>
                    Sử dụng thanh âm lượng ở góc dưới bên phải video
                  </p>
                </div>
              </div>
            </div>
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
                          {isTranscribing && (
                            <div style={{ 
                              color: "#007bff", 
                              fontSize: "14px", 
                              marginBottom: "10px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px"
                            }}>
                              🎤 Đang chuyển đổi giọng nói thành văn bản...
                            </div>
                          )}
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
                        marginBottom: "15px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px"
                      }}>
                        ✅ Đã ghi âm xong
                      </div>
                      
                      {/* Transcript Text Box */}
                      {recordingTranscript && (
                        <div style={{ marginBottom: "20px" }}>
                          <h5 style={{ 
                            color: "#333", 
                            marginBottom: "8px", 
                            textAlign: "left",
                            fontSize: "14px",
                            fontWeight: "600"
                          }}>
                            📝 Transcript của bạn:
                          </h5>
                          <div style={{
                            backgroundColor: "#f8f9fa",
                            border: "1px solid #e9ecef",
                            borderRadius: "6px",
                            padding: "12px",
                            textAlign: "left",
                            minHeight: "60px",
                            fontSize: "14px",
                            lineHeight: "1.5",
                            color: "#495057",
                            fontStyle: "italic",
                            whiteSpace: "pre-wrap",
                            wordWrap: "break-word"
                          }}>
                            "{recordingTranscript}"
                          </div>
                          <p style={{
                            fontSize: "12px",
                            color: "#6c757d",
                            marginTop: "6px",
                            textAlign: "left"
                          }}>
                            💡 Transcript được tạo tự động từ giọng nói của bạn
                          </p>
                        </div>
                      )}
                      
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

                    {/* Detailed scoring breakdown */}
                    <div style={{ marginBottom: "15px" }}>
                      <h5 style={{ color: "#333", marginBottom: "8px" }}>Chi tiết điểm:</h5>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "14px" }}>
                        <div style={{ 
                          backgroundColor: "#f8f9fa", 
                          padding: "8px", 
                          borderRadius: "4px",
                          border: "1px solid #e9ecef"
                        }}>
                          <strong>Ngữ pháp:</strong> {scoringResult.grammar_score || 0}/20
                        </div>
                        <div style={{ 
                          backgroundColor: "#f8f9fa", 
                          padding: "8px", 
                          borderRadius: "4px",
                          border: "1px solid #e9ecef"
                        }}>
                          <strong>Độ trôi chảy:</strong> {scoringResult.fluency_score || 0}/10
                        </div>
                      </div>
                    </div>

                    {/* Keyword analysis */}
                    {scoringResult.keyword_matches && scoringResult.keyword_matches.length > 0 && (
                      <div style={{ marginBottom: "15px" }}>
                        <h5 style={{ color: "#333", marginBottom: "8px" }}>Từ khóa đã sử dụng:</h5>
                        <div style={{ 
                          backgroundColor: "#d4edda", 
                          padding: "10px", 
                          borderRadius: "4px",
                          border: "1px solid #c3e6cb"
                        }}>
                          {scoringResult.keyword_matches.map((keyword, index) => (
                            <span key={index} style={{ 
                              backgroundColor: "#28a745", 
                              color: "white", 
                              padding: "2px 6px", 
                              borderRadius: "3px", 
                              marginRight: "5px",
                              fontSize: "12px"
                            }}>
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {scoringResult.missing_keywords && scoringResult.missing_keywords.length > 0 && (
                      <div style={{ marginBottom: "15px" }}>
                        <h5 style={{ color: "#333", marginBottom: "8px" }}>Từ khóa cần sử dụng:</h5>
                        <div style={{ 
                          backgroundColor: "#f8d7da", 
                          padding: "10px", 
                          borderRadius: "4px",
                          border: "1px solid #f5c6cb"
                        }}>
                          {scoringResult.missing_keywords.slice(0, 5).map((keyword, index) => (
                            <span key={index} style={{ 
                              backgroundColor: "#dc3545", 
                              color: "white", 
                              padding: "2px 6px", 
                              borderRadius: "3px", 
                              marginRight: "5px",
                              fontSize: "12px"
                            }}>
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

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

                    <div style={{ marginBottom: "15px" }}>
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

                    {/* Suggestions */}
                    {scoringResult.suggestions && scoringResult.suggestions.length > 0 && (
                      <div style={{ marginBottom: "15px" }}>
                        <h5 style={{ color: "#333", marginBottom: "8px" }}>Gợi ý cải thiện:</h5>
                        <ul style={{ 
                          backgroundColor: "#fff3cd", 
                          padding: "10px 20px", 
                          borderRadius: "4px",
                          border: "1px solid #ffeaa7",
                          margin: 0
                        }}>
                          {scoringResult.suggestions.map((suggestion, index) => (
                            <li key={index} style={{ marginBottom: "4px", fontSize: "14px" }}>
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

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
