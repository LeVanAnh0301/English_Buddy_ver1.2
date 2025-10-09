import React, { useEffect, useMemo, useRef, useState } from "react";
import "./assets/WordSpeaking.css";

function WordSpeakingPage() {
  const [targetWord, setTargetWord] = useState("");
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const recorderRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    setError("");
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const localChunks = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) localChunks.push(e.data);
      };
      mr.onstop = () => {
        setChunks(localChunks);
      };
      mr.start();
      recorderRef.current = mr;
      setMediaRecorder(mr);
      setRecording(true);
    } catch (e) {
      setError("Không thể truy cập micro. Vui lòng cấp quyền.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  const submitAudio = async () => {
    if (!targetWord.trim()) {
      setError("Vui lòng nhập từ cần luyện.");
      return;
    }
    if (!chunks.length) {
      setError("Chưa có bản ghi âm. Hãy ghi âm trước.");
      return;
    }
    setError("");
    try {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const form = new FormData();
      form.append("audio", blob, "recording.webm");
      form.append("target_word", targetWord.trim());
      const resp = await fetch("/exercises/word_speaking_score/", {
        method: "POST",
        body: form,
      });
      if (!resp.ok) {
        throw new Error("Gửi âm thanh thất bại");
      }
      const data = await resp.json();
      setResult(data);
    } catch (e) {
      setError(e.message || "Có lỗi xảy ra");
    }
  };

  // Build simple diff spans using mistakes
  const diffView = useMemo(() => {
    if (!result) return null;
    const alignment = result.alignment || [];
    return (
      <div className="diff-view">
        {alignment.map((seg, idx) => {
          if (seg.op === "equal") {
            return <span key={idx} className="equal">{seg.target}</span>;
          }
          if (seg.op === "replace") {
            return <span key={idx} className="replace" title={`Bạn đọc: ${seg.recog || "(trống)"}`}>{seg.target}</span>;
          }
          if (seg.op === "delete") {
            return <span key={idx} className="delete" title="Thiếu âm">{seg.target}</span>;
          }
          if (seg.op === "insert") {
            return <span key={idx} className="insert" title={`Thừa âm: ${seg.recog}`}>•</span>;
          }
          return null;
        })}
      </div>
    );
  }, [result]);

  return (
    <div className="word-page">
      <div className="animated-bg" />
      <div className="word-container">
        <h2 className="title">Luyện nói từng từ</h2>
        <p className="subtitle">Nhập một từ tiếng Anh, ghi âm và nhận điểm phát âm.</p>
        <div className="controls-row">
          <input
            value={targetWord}
            onChange={(e) => setTargetWord(e.target.value)}
            placeholder="Nhập từ cần luyện (vd: apple)"
            className="text-input"
          />
          {!recording ? (
            <button className="btn-record" onClick={startRecording}>● Thu âm</button>
          ) : (
            <button className="btn-stop" onClick={stopRecording}>■ Dừng</button>
          )}
          <button className="btn-score" onClick={submitAudio}>Chấm điểm</button>
        </div>

        {error && <div className="error-text">{error}</div>}

        {/* Dictionary info */}
        <DictionaryInfo targetWord={targetWord} />

        {result && (
          <div className="result-card">
            <div className="kv"><span>Từ mục tiêu:</span><strong>{result.target_word}</strong></div>
            <div className="kv"><span>Nhận dạng:</span><strong>{(result.recognized_text && result.recognized_text.length) ? result.recognized_text : "(không nhận dạng được)"}</strong></div>
            <div className="kv"><span>Độ tương đồng:</span><strong>{Math.round(result.similarity * 100)}%</strong></div>
            <div className="kv"><span>Điểm:</span><strong>{result.score}</strong></div>
            <div className="kv"><span>Nhận xét:</span><span>{result.feedback}</span></div>

            <div className="alignment">
              <div className="alignment-title">Âm chính xác/sai lệch:</div>
              {diffView}
            </div>
          </div>
        )}

        {/* Contact moved to global Footer */}
      </div>
    </div>
  );
}

function DictionaryInfo({ targetWord }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!targetWord || targetWord.trim().length === 0) {
      setData(null);
      return;
    }
    let aborted = false;
    setLoading(true);
    setErr("");
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(targetWord.trim())}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Không tìm thấy từ điển");
        const json = await r.json();
        if (!aborted) setData(json[0]);
      })
      .catch((e) => !aborted && setErr(e.message))
      .finally(() => !aborted && setLoading(false));
    return () => { aborted = true; };
  }, [targetWord]);

  if (!targetWord) return null;
  return (
    <div className="dict-card">
      <div className="dict-header">Thông tin từ điển</div>
      {loading && <div className="dict-loading">Đang tải...</div>}
      {err && <div className="dict-error">{err}</div>}
      {data && (
        <div className="dict-body">
          <div className="dict-head">
            <div className="dict-word">{data.word}</div>
            {data.phonetics?.[0]?.text && <div className="dict-phonetic">/{data.phonetics[0].text.replace(/\//g, "")}/</div>}
            {data.phonetics?.[0]?.audio && (
              <audio controls src={data.phonetics[0].audio} style={{ height: 28 }} />
            )}
          </div>
          {data.meanings?.slice(0,1).map((m, idx) => (
            <div key={idx} className="dict-meaning">
              <div className="part-of-speech">{m.partOfSpeech}</div>
              {m.definitions?.[0]?.definition && <div className="definition">{m.definitions[0].definition}</div>}
              {m.definitions?.[0]?.example && <div className="example">Ví dụ: {m.definitions[0].example}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default WordSpeakingPage;


