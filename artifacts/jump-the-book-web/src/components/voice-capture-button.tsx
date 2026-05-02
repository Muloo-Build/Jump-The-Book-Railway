import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  getSpeechRecognitionCtor,
  type SpeechRecognitionLike,
} from "@/lib/speechRecognition";

interface Props {
  value: string;
  onChange: (next: string) => void;
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost" | "secondary";
  label?: string;
  appendMode?: boolean;
}

export default function VoiceCaptureButton({
  value,
  onChange,
  className,
  size = "icon",
  variant = "ghost",
  label,
  appendMode = true,
}: Props) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef<string>("");
  const valueRef = useRef<string>(value);
  const onChangeRef = useRef(onChange);
  const { toast } = useToast();

  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }
    setSupported(true);
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {}
      recognitionRef.current = null;
    };
  }, []);

  const start = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    // Guard against double-start (rapid clicks before listening state flips
    // would otherwise throw InvalidStateError on the underlying instance).
    if (listening || recognitionRef.current) return;
    try {
      const r = new Ctor();
      r.continuous = true;
      r.interimResults = true;
      r.lang = navigator.language || "en-US";
      r.maxAlternatives = 1;

      baseTextRef.current = appendMode
        ? valueRef.current.replace(/\s+$/, "")
        : "";

      r.onresult = (ev) => {
        let interim = "";
        let final = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const result = ev.results[i];
          const transcript = result[0]?.transcript ?? "";
          if (result.isFinal) final += transcript;
          else interim += transcript;
        }
        const sep = baseTextRef.current ? " " : "";
        const next = (
          baseTextRef.current +
          sep +
          (final + interim).replace(/\s+/g, " ")
        ).trimStart();
        if (final) {
          baseTextRef.current = (
            baseTextRef.current +
            sep +
            final.replace(/\s+/g, " ")
          ).trim();
        }
        onChangeRef.current(next);
      };

      r.onerror = (e) => {
        if (e.error === "no-speech" || e.error === "aborted") return;
        toast({
          title: "Voice capture error",
          description:
            e.error === "not-allowed"
              ? "Microphone permission denied."
              : `Could not transcribe (${e.error}).`,
          variant: "destructive",
        });
        setListening(false);
      };

      r.onend = () => {
        recognitionRef.current = null;
        setListening(false);
      };

      r.onstart = () => setListening(true);

      r.start();
      recognitionRef.current = r;
    } catch (err) {
      toast({
        title: "Voice capture unavailable",
        description: "Try Chrome, Edge, or Safari.",
        variant: "destructive",
      });
    }
  };

  const stop = () => {
    try {
      recognitionRef.current?.stop();
    } catch {}
  };

  if (!supported) return null;

  const Icon = listening ? MicOff : Mic;
  const aria = listening ? "Stop recording" : label ?? "Dictate";

  return (
    <Button
      type="button"
      size={size}
      variant={listening ? "default" : variant}
      onClick={listening ? stop : start}
      className={`${className ?? ""} ${
        listening
          ? "bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40"
          : ""
      }`}
      aria-label={aria}
      title={aria}
    >
      {listening ? (
        <span className="relative flex items-center gap-1.5">
          <span className="absolute -inset-1 rounded-full bg-red-500/30 animate-ping" />
          <Icon className="w-4 h-4 relative" />
          {label && size !== "icon" && (
            <span className="relative text-xs">Listening…</span>
          )}
        </span>
      ) : (
        <span className="flex items-center gap-1.5">
          <Icon className="w-4 h-4" />
          {label && size !== "icon" && <span className="text-xs">{label}</span>}
        </span>
      )}
    </Button>
  );
}
