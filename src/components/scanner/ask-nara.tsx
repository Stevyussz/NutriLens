"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowUp, MessageCircle, X } from "lucide-react";
import { requestApi } from "@/core/browser-api";
import { naraAnswerSchema, type NaraAnswer } from "@/core/nara-schema";
import { Button } from "../ui/button";
import { NaraThinking } from "./nara-thinking";
const suggestions = [
  "Kalau habis satu botol?",
  "Jadi, mending beli atau ganti?",
  "Natrium itu apa?",
];
type Turn = { question: string; answer: NaraAnswer };
export function AskNara({ historyId }: { historyId?: string }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [retryQuestion, setRetryQuestion] = useState("");
  const answerRef = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const ask = useMutation({
    mutationFn: (text: string) =>
      requestApi("/api/ask-nara", naraAnswerSchema, {
        method: "POST",
        body: JSON.stringify({
          historyId,
          question: text,
          previousTopics: turns.at(-1)?.answer.topics ?? [],
        }),
      }),
    onSuccess: (answer, text) => {
      setTurns((old) => [...old.slice(-5), { question: text, answer }]);
      setQuestion("");
      setRetryQuestion("");
    },
    onError: (_error, text) => setRetryQuestion(text),
  });
  useEffect(() => {
    if (turns.length) answerRef.current?.focus({ preventScroll: true });
  }, [turns]);
  const submit = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length >= 3 && !ask.isPending) ask.mutate(trimmed);
  };
  return (
    <section className="ask-nara" aria-labelledby="nara-title">
      <div className="nara-intro">
        <div>
          <h2 id="nara-title">Masih penasaran? Tanya Nara.</h2>
          <p>
            Teman baca label Anda. Tanya soal porsi, gula, atau arti angka di
            hasil ini.
          </p>
        </div>
        <Button
          ref={trigger}
          variant="secondary"
          aria-expanded={open}
          aria-controls="nara-conversation"
          disabled={!historyId}
          onClick={() => setOpen(!open)}
        >
          <MessageCircle size={18} aria-hidden="true" />
          {open ? "Tutup percakapan" : "Tanya Nara"}
        </Button>
      </div>
      {!historyId && (
        <p>
          Simpan hasil ke riwayat terlebih dahulu agar Nara memakai bacaan yang
          sama.
        </p>
      )}
      {open && (
        <div id="nara-conversation" className="nara-conversation">
          <p className="nara-context">
            Percakapan memakai hasil scan ini dan profil saat scan. Tidak
            disimpan sebagai chat di aplikasi. Pertanyaan bebas dapat diproses
            penyedia AI.
          </p>
          {turns.map((turn, i) => (
            <article className="nara-turn" key={`${i}-${turn.question}`}>
              <h3>{turn.question}</h3>
              <div
                ref={i === turns.length - 1 ? answerRef : undefined}
                tabIndex={-1}
                className="nara-answer"
                aria-label="Jawaban Nara"
              >
                <strong>Nara</strong>
                {turn.answer.paragraphs.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
                <small>
                  {turn.answer.mode === "AI_GUIDED"
                    ? "Konteks dipilih AI · angka mengikuti bacaan tersimpan"
                    : turn.answer.mode === "LIMITED"
                      ? "Konteks belum cukup · coba pertanyaan lebih spesifik tentang label"
                      : "Dari bacaan label dan aturan profil"}
                </small>
              </div>
            </article>
          ))}
          {ask.isPending && (
            <>
              <p className="nara-pending-question">{ask.variables}</p>
              <NaraThinking task="question" compact />
            </>
          )}
          {ask.error && (
            <div role="alert" className="nara-question-error">
              <p>{ask.error.message} Pertanyaan Anda tetap tersedia.</p>
              <Button
                variant="ghost"
                disabled={ask.isPending}
                onClick={() => submit(retryQuestion)}
              >
                Coba lagi
              </Button>
            </div>
          )}
          <div className="nara-suggestions" aria-label="Ide pertanyaan">
            {suggestions.map((q) => (
              <button
                key={q}
                type="button"
                disabled={ask.isPending}
                onClick={() => submit(q)}
              >
                {q}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(question);
            }}
            className="nara-composer"
          >
            <label htmlFor="nara-question">Pertanyaan tentang label ini</label>
            <div>
              <textarea
                id="nara-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Misalnya, kalau diminum habis berapa gulanya?"
                disabled={ask.isPending}
                required
                minLength={3}
              />
              <Button
                type="submit"
                disabled={ask.isPending || question.trim().length < 3}
                aria-label="Kirim pertanyaan ke Nara"
              >
                <ArrowUp size={20} aria-hidden="true" />
              </Button>
            </div>
            <span>
              {question.length}/500 · Penjelasan label, bukan konsultasi medis.
            </span>
          </form>
          <button
            className="nara-close"
            type="button"
            onClick={() => {
              setOpen(false);
              trigger.current?.focus();
            }}
          >
            <X size={16} aria-hidden="true" /> Tutup percakapan
          </button>
        </div>
      )}
    </section>
  );
}
