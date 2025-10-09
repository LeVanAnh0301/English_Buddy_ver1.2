import React, { useEffect, useMemo, useRef, useState } from "react";

// --- Khởi tạo Speech Recognition API ---
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false; // chỉ nhận dạng 1 lần
  recognition.lang = "en-US";
  recognition.interimResults = false;
} else {
  console.error("Trình duyệt không hỗ trợ Web Speech API.");
}

// --- Hàm tạo diff (so sánh phát âm) ---
const generateAlignment = (target, recognized) => {
  const t = target.toLowerCase().trim();
  const r = recognized.toLowerCase().trim();
  if (!t) return [];
  if (!r) return t.split("").map((char) => ({ op: "delete", target: char }));

  const dp = Array(t.length + 1)
    .fill(null)
    .map(() => Array(r.length + 1).fill(0));

  for (let i = 1; i <= t.length; i++) {
    for (let j = 1; j <= r.length; j++) {
      if (t[i - 1] === r[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const alignment = [];
  let i = t.length,
    j = r.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && t[i - 1] === r[j - 1]) {
      alignment.unshift({ op: "equal", target: target[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      alignment.unshift({ op: "delete", target: target[i - 1] });
      i--;
    } else {
      break;
    }
  }

  const perfectMatch = t === r;
  if (perfectMatch) return alignment;

  return alignment.map((seg) =>
    seg.op !== "equal"
      ? { ...seg, op: "replace", recog: "âm sai/thiếu" }
      : seg
  );
};

// --- CSS nội tuyến toàn cục ---
function GlobalStyles() {
  return (
    <style>{`
      :root {
        --primary-color: #007bff;
        --success-color: #28a745;
        --danger-color: #dc3545;
        --light-gray: #f8f9fa;
        --dark-gray: #343a40;
        --text-color: #212529;
      }
      .word-page {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
        padding: 2rem;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        min-height: 100vh;
        background-color: #f0f2f5;
      }
      .word-container {
        background: white;
        padding: 2rem 2.5rem;
        border-radius: 16px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        width: 100%;
        max-width: 700px;
      }
      .title {
        text-align: center;
        color: var(--dark-gray);
        margin-bottom: 0.5rem;
      }
      .subtitle {
        text-align: center;
        color: #6c757d;
        margin-bottom: 2rem;
      }
      .controls-row {
        display: flex;
        gap: 1rem;
        align-items: center;
        margin-bottom: 1.5rem;
      }
      .text-input {
        flex-grow: 1;
        padding: 0.75rem 1rem;
        font-size: 1rem;
        border: 1px solid #ced4da;
        border-radius: 8px;
      }
      .btn-record, .btn-stop {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        cursor: pointer;
      }
      .btn-record { background-color: var(--primary-color); }
      .btn-stop { background-color: var(--danger-color); }
      .btn-record:hover { background-color: #0056b3; }
      .btn-stop:hover { background-color: #c82333; }
      button:disabled {
        background-color: #6c757d;
        cursor: not-allowed;
      }
      .error-text {
        color: var(--danger-color);
        text-align: center;
        margin: 1rem 0;
      }
      .processing-indicator {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin: 2rem 0;
        color: #6c757d;
        transition: opacity 0.3s ease;
      }
      .spinner {
        border: 4px solid rgba(0, 0, 0, 0.1);
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border-left-color: var(--primary-color);
        margin-bottom: 1rem;
        animation: spin 1s ease infinite;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .result-card {
        margin-top: 2rem;
        padding: 1.5rem;
        border-radius: 12px;
        background: var(--light-gray);
        border: 1px solid #e9ecef;
      }
      .kv {
        display: flex;
        justify-content: space-between;
        padding: 0.5rem 0;
        border-bottom: 1px solid #dee2e6;
      }
      .kv:last-child { border-bottom: none; }
      .alignment {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #dee2e6;
      }
      .alignment-title {
          font-weight: 600;
          color: #495057;
          margin-bottom: 0.5rem;
          text-align: center;
      }
      .diff-view {
        font-size: 2rem;
        font-weight: bold;
        text-align: center;
        letter-spacing: 2px;
        padding: 1rem;
      }
      .diff-view .equal {
        color: var(--success-color);
      }
      .diff-view .replace, .diff-view .delete {
        color: var(--danger-color);
        text-decoration: underline wavy var(--danger-color) 2px;
        text-underline-offset: 4px;
      }
      .dict-card {
        margin-top: 2rem;
        border: 1px solid #e9ecef;
        border-radius: 12px;
        overflow: hidden;
      }
      .dict-header {
        background-color: var(--light-gray);
        padding: 0.75rem 1.25rem;
        font-weight: bold;
        color: var(--text-color);
      }
      .dict-body {
        padding: 1.25rem;
      }
      .dict-head {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }
      .dict-word {
        font-size: 1.5rem;
        font-weight: bold;
      }
      .dict-phonetic {
        color: #6c757d;
      }
      /* --- STYLE MỚI CHO PHẦN DỊCH --- */
      .translation-section {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px dashed #ced4da;
      }
      .translation-text {
        color: var(--primary-color);
        font-style: italic;
      }
      .translation-loading {
        font-style: italic;
        color: #6c757d;
      }
    `}</style>
  );
}

// --- Component chính ---
function WordSpeakingPage() {
  const [targetWord, setTargetWord] = useState("apple");
  const [recording, setRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const targetWordRef = useRef(targetWord);
  targetWordRef.current = targetWord;

  const handleStartRecording = () => {
    if (!SpeechRecognition) {
      setError("Trình duyệt của bạn không hỗ trợ nhận dạng giọng nói.");
      return;
    }
    if (!targetWord.trim()) {
      setError("Vui lòng nhập từ cần luyện.");
      return;
    }
    setError("");
    setResult(null);
    setRecording(true);
    recognition.start();
  };

  const handleStopRecording = () => {
    setIsProcessing(true);
    recognition.stop();
  };
  
  useEffect(() => {
    if (!recognition) return;

    recognition.onresult = (event) => {
      const recognizedText = event.results[0][0].transcript;
      const cleanTarget = targetWordRef.current.trim();
      
      const alignment = generateAlignment(cleanTarget, recognizedText);
      const correctChars = alignment.filter((s) => s.op === "equal").length;
      const similarity =
        cleanTarget.length > 0
          ? (correctChars / cleanTarget.length) * 100
          : 0;

      setResult({
        target_word: cleanTarget,
        recognized_text: recognizedText,
        alignment,
        similarity,
        feedback: similarity > 80 ? "Phát âm rất tốt!" : "Cần luyện tập thêm.",
        score: Math.round(similarity),
      });
    };

    recognition.onend = () => {
      setIsProcessing(false);
      setRecording(false);
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech") {
        setError("Không phát hiện được giọng nói. Vui lòng thử lại.");
      } else {
        setError(`Lỗi nhận dạng: ${event.error}`);
      }
      setIsProcessing(false);
      setRecording(false);
    };

    return () => {
      if (recognition && recognition.abort) recognition.abort();
    };
  }, []);

  const diffView = useMemo(() => {
    if (!result) return null;
    const alignment = result.alignment || [];
    return (
      <div className="diff-view">
        {alignment.map((seg, idx) => (
          <span
            key={idx}
            className={seg.op}
            title={seg.op === "equal" ? "" : "Lỗi phát âm tại đây"}
          >
            {seg.target}
          </span>
        ))}
      </div>
    );
  }, [result]);

  const recordButtonText = isProcessing
    ? "Đang xử lý..."
    : recording
    ? "■ Dừng"
    : "● Thu âm";

  return (
    <div className="word-page">
      <GlobalStyles />
      <div className="word-container">
        <h2 className="title">Luyện nói từng từ</h2>
        <p className="subtitle">
          Nhập một từ tiếng Anh, ghi âm và nhận phản hồi ngay lập tức.
        </p>

        <div className="controls-row">
          <input
            value={targetWord}
            onChange={(e) => setTargetWord(e.target.value)}
            placeholder="Nhập từ cần luyện (vd: apple)"
            className="text-input"
            disabled={recording || isProcessing}
          />
          <button
            className={recording ? "btn-stop" : "btn-record"}
            onClick={recording ? handleStopRecording : handleStartRecording}
            disabled={isProcessing}
          >
            {recordButtonText}
          </button>
        </div>

        {error && <div className="error-text">{error}</div>}

        {isProcessing && (
          <div className="processing-indicator">
            <div className="spinner"></div>
            <p>Đang phân tích giọng nói...</p>
          </div>
        )}

        <DictionaryInfo targetWord={targetWord} />

        {!isProcessing && result && (
          <div className="result-card">
            <div className="kv">
              <span>Từ mục tiêu:</span>
              <strong>{result.target_word}</strong>
            </div>
            <div className="kv">
              <span>Bạn đã đọc:</span>
              <strong>
                {result.recognized_text || "(không nhận dạng được)"}
              </strong>
            </div>
            <div className="kv">
              <span>Độ chính xác:</span>
              <strong>{Math.round(result.similarity)}%</strong>
            </div>
            <div className="kv">
              <span>Nhận xét:</span>
              <span>{result.feedback}</span>
            </div>

            <div className="alignment">
              <div className="alignment-title">Phân tích phát âm:</div>
              {diffView}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Component hiển thị thông tin từ điển ---
function DictionaryInfo({ targetWord }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  // --- STATE MỚI CHO VIỆC DỊCH ---
  const [translation, setTranslation] = useState("");
  const [translationLoading, setTranslationLoading] = useState(false);

  useEffect(() => {
    const trimmedWord = targetWord ? targetWord.trim() : "";
    if (!trimmedWord) {
      setData(null);
      setErr("");
      setTranslation("");
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    setLoading(true);
    setErr("");
    
    fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
        trimmedWord
      )}`,
      { signal }
    )
      .then(async (r) => {
        if (!r.ok) throw new Error("Không tìm thấy từ điển");
        const json = await r.json();
        setData(json[0]);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setErr(e.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [targetWord]);
  
  useEffect(() => {
    const trimmedWord = targetWord ? targetWord.trim() : "";
    if (!trimmedWord) {
      setTranslation("");
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    setTranslationLoading(true);
    
    fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmedWord)}&langpair=en|vi`, { signal })
      .then(res => res.json())
      .then(translationData => {
        if (translationData.responseData) {
          setTranslation(translationData.responseData.translatedText);
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error("Lỗi dịch:", err);
        }
      })
      .finally(() => {
        setTranslationLoading(false);
      });

    return () => controller.abort();
  }, [targetWord]);


  if (!targetWord || !targetWord.trim()) return null;

  return (
    <div className="dict-card">
      <div className="dict-header">Thông tin từ điển</div>
      {loading && (
        <div
          className="dict-loading"
          style={{ padding: "1rem", textAlign: "center" }}
        >
          Đang tải...
        </div>
      )}
      {err && (
        <div
          className="dict-error"
          style={{
            padding: "1rem",
            textAlign: "center",
            color: "var(--danger-color)",
          }}
        >
          {err}
        </div>
      )}
      {data && !loading && !err && (
        <div className="dict-body">
          <div className="dict-head">
            <div className="dict-word">{data.word}</div>
            {data.phonetics?.find((p) => p.text)?.text && (
              <div className="dict-phonetic">
                /
                {data.phonetics
                  .find((p) => p.text)
                  .text.replace(/\//g, "")}
                /
              </div>
            )}
            {data.phonetics?.find((p) => p.audio)?.audio && (
              <audio
                controls
                src={data.phonetics.find((p) => p.audio).audio}
                style={{ height: 28, maxWidth: "150px" }}
              />
            )}
          </div>

          {data.meanings?.slice(0, 1).map((m, idx) => (
            <div key={idx} className="dict-meaning">
              <div className="part-of-speech">{m.partOfSpeech}</div>
              {m.definitions?.[0]?.definition && (
                <div className="definition">{m.definitions[0].definition}</div>
              )}
              {m.definitions?.[0]?.example && (
                <div className="example">
                  <strong>Ví dụ:</strong>{" "}
                  <em>"{m.definitions[0].example}"</em>
                </div>
              )}
              
              {/* --- HIỂN THỊ PHẦN DỊCH TIẾNG VIỆT --- */}
              <div className="translation-section">
                {translationLoading && <div className="translation-loading">Đang dịch...</div>}
                {translation && !translationLoading && (
                  <div className="translation-text">
                    <strong>Dịch:</strong> {translation}
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default WordSpeakingPage;

